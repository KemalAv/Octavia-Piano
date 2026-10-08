/// <reference types="vite/client" />
import * as ort from 'onnxruntime-web';
import type { MidiNotePlaybackItem } from './types';
import type { FingeringPreferences, HandPose } from './fingeringApi';
import { INITIAL_PLAYBACK_DELAY_MS } from './midiParser';
import { keyX } from './components/handScene';

// Configure ONNX Runtime Web for static hosting (GitHub Pages / Vercel)
try {
  // Use single thread WASM to avoid SharedArrayBuffer requirements without COOP/COEP headers
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = true;
} catch {
  // Ignore if already set
}

interface EmbeddingsData {
  right: number[][];
  left: number[][];
}

let rightEncSession: ort.InferenceSession | null = null;
let rightDecSession: ort.InferenceSession | null = null;
let leftEncSession: ort.InferenceSession | null = null;
let leftDecSession: ort.InferenceSession | null = null;
let cachedEmbeddings: EmbeddingsData | null = null;

function getAssetUrl(path: string): string {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: { BASE_URL?: string } }).env : undefined;
  const base = metaEnv?.BASE_URL || '/';
  return (base.endsWith('/') ? base : base + '/') + path.replace(/^\//, '');
}

async function loadBuffer(path: string): Promise<ArrayBuffer> {
  const url = getAssetUrl(path);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load AI model file: ${path} (HTTP ${res.status})`);
  }
  return await res.arrayBuffer();
}

export async function initAiSessions(onProgress?: (stage: string) => void): Promise<{
  rightEnc: ort.InferenceSession;
  rightDec: ort.InferenceSession;
  leftEnc: ort.InferenceSession;
  leftDec: ort.InferenceSession;
  embeddings: EmbeddingsData;
}> {
  if (rightEncSession && rightDecSession && leftEncSession && leftDecSession && cachedEmbeddings) {
    return {
      rightEnc: rightEncSession,
      rightDec: rightDecSession,
      leftEnc: leftEncSession,
      leftDec: leftDecSession,
      embeddings: cachedEmbeddings,
    };
  }

  onProgress?.('Loading AI fingering models...');

  if (!cachedEmbeddings) {
    const embRes = await fetch(getAssetUrl('models/embeddings.json'));
    if (!embRes.ok) throw new Error('Failed to load embeddings lookup table.');
    cachedEmbeddings = (await embRes.json()) as EmbeddingsData;
  }

  const [rEncBuf, rDecBuf, lEncBuf, lDecBuf] = await Promise.all([
    rightEncSession ? Promise.resolve(null) : loadBuffer('models/right_encoder.onnx'),
    rightDecSession ? Promise.resolve(null) : loadBuffer('models/right_decoder_step.onnx'),
    leftEncSession ? Promise.resolve(null) : loadBuffer('models/left_encoder.onnx'),
    leftDecSession ? Promise.resolve(null) : loadBuffer('models/left_decoder_step.onnx'),
  ]);

  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: ['wasm'],
  };

  if (!rightEncSession && rEncBuf) {
    rightEncSession = await ort.InferenceSession.create(rEncBuf, sessionOptions);
  }
  if (!rightDecSession && rDecBuf) {
    rightDecSession = await ort.InferenceSession.create(rDecBuf, sessionOptions);
  }
  if (!leftEncSession && lEncBuf) {
    leftEncSession = await ort.InferenceSession.create(lEncBuf, sessionOptions);
  }
  if (!leftDecSession && lDecBuf) {
    leftDecSession = await ort.InferenceSession.create(lDecBuf, sessionOptions);
  }

  return {
    rightEnc: rightEncSession!,
    rightDec: rightDecSession!,
    leftEnc: leftEncSession!,
    leftDec: leftDecSession!,
    embeddings: cachedEmbeddings!,
  };
}

/**
 * Predicts finger numbers for a chronological sequence of notes for one hand
 */
async function predictHandNotes(
  handSide: 'left' | 'right',
  notes: MidiNotePlaybackItem[],
  encSession: ort.InferenceSession,
  decSession: ort.InferenceSession,
  embTable: number[][],
  onProgress?: (stage: string) => void
): Promise<(1 | 2 | 3 | 4 | 5)[]> {
  const S = notes.length;
  if (S === 0) return [];

  onProgress?.(`AI predicting ${handSide === 'right' ? 'right' : 'left'} hand (${S} notes)...`);

  // 1. Prepare input: [1, S, 1] normalized midi pitch
  const inputData = new Float32Array(S);
  for (let i = 0; i < S; i++) {
    inputData[i] = notes[i].midi / 127.0;
  }
  const notesTensor = new ort.Tensor('float32', inputData, [1, S, 1]);

  // 2. Run BiLSTM Encoder
  const encResult = await encSession.run({ notes: notesTensor });
  const encSeqTensor = encResult.enc_seq; // shape [1, S, 64]
  const encData = encSeqTensor.data as Float32Array;

  // 3. Autoregressive Decoder Step Loop
  let hData = new Float32Array(64);
  let cData = new Float32Array(64);
  let prevEmbData = new Float32Array(64); // initially zeros

  const rawFingers: number[] = [];

  for (let i = 0; i < S; i++) {
    const stepEncData = encData.subarray(i * 64, (i + 1) * 64);

    const stepEncTensor = new ort.Tensor('float32', stepEncData, [1, 1, 64]);
    const prevEmbTensor = new ort.Tensor('float32', prevEmbData, [1, 1, 64]);
    const hTensor = new ort.Tensor('float32', hData, [1, 1, 64]);
    const cTensor = new ort.Tensor('float32', cData, [1, 1, 64]);

    const stepResult = await decSession.run({
      enc_step: stepEncTensor,
      prev_emb: prevEmbTensor,
      h: hTensor,
      c: cTensor,
    });

    const logits = stepResult.logits.data as Float32Array; // shape [1, 5]
    hData = stepResult.next_h.data as Float32Array;
    cData = stepResult.next_c.data as Float32Array;

    // Argmax over 5 fingers
    let bestFinger = 0;
    let maxLogit = -Infinity;
    for (let f = 0; f < 5; f++) {
      if (logits[f] > maxLogit) {
        maxLogit = logits[f];
        bestFinger = f;
      }
    }

    rawFingers.push(bestFinger + 1); // 1..5

    // Feed chosen finger's embedding to next step
    prevEmbData = new Float32Array(embTable[bestFinger]);
  }

  // 4. Clean chord / simultaneous note finger collisions
  // In piano playing, notes at the exact same onset cannot be pressed by the same finger.
  // For Right Hand chords (sorted lowest to highest pitch): fingers must be strictly ascending (1 < 2 < 3...).
  // For Left Hand chords (sorted lowest to highest pitch): fingers must be strictly descending (5 > 4 > 3...).
  const resultFingers = [...rawFingers] as (1 | 2 | 3 | 4 | 5)[];
  let chordStart = 0;
  while (chordStart < S) {
    let chordEnd = chordStart + 1;
    while (chordEnd < S && Math.abs(notes[chordEnd].timeMs - notes[chordStart].timeMs) < 20) {
      chordEnd++;
    }

    const chordLen = chordEnd - chordStart;
    if (chordLen > 1) {
      // Notes in chordStart...chordEnd-1 are simultaneous
      const chordIndices: number[] = [];
      for (let k = chordStart; k < chordEnd; k++) chordIndices.push(k);
      // Sort chord indices by pitch ascending
      chordIndices.sort((a, b) => notes[a].midi - notes[b].midi);

      const assigned = chordIndices.map(idx => rawFingers[idx]);
      const hasDuplicate = new Set(assigned).size !== assigned.length;
      const isMonotonic = handSide === 'right'
        ? assigned.every((val, idx, arr) => idx === 0 || val > arr[idx - 1])
        : assigned.every((val, idx, arr) => idx === 0 || val < arr[idx - 1]);

      if (hasDuplicate || !isMonotonic) {
        // Fall back to clean anatomical chord spread
        // Right hand ascending pitch: 1, 2, 3, 4, 5
        // Left hand ascending pitch: 5, 4, 3, 2, 1
        const anatomicalRH = [1, 2, 3, 4, 5];
        const anatomicalLH = [5, 4, 3, 2, 1];
        const template = handSide === 'right' ? anatomicalRH : anatomicalLH;

        let fingerSpread: number[];
        if (chordLen === 2) {
          fingerSpread = handSide === 'right' ? [1, 5] : [5, 1];
        } else if (chordLen === 3) {
          fingerSpread = handSide === 'right' ? [1, 3, 5] : [5, 3, 1];
        } else if (chordLen === 4) {
          fingerSpread = handSide === 'right' ? [1, 2, 3, 5] : [5, 3, 2, 1];
        } else {
          fingerSpread = template.slice(0, chordLen);
        }

        for (let k = 0; k < chordLen; k++) {
          resultFingers[chordIndices[k]] = (fingerSpread[k] || (handSide === 'right' ? 1 : 5)) as 1|2|3|4|5;
        }
      }
    }

    chordStart = chordEnd;
  }

  return resultFingers;
}

/**
 * Computes 3D hand poses for the HandFingering3D visualization
 */
function generateHandPoses(
  notes: MidiNotePlaybackItem[]
): HandPose[] {
  const poses: HandPose[] = [];
  const byHand = {
    left: notes.filter(n => n.hand === 'left'),
    right: notes.filter(n => n.hand === 'right'),
  };

  for (const side of ['left', 'right'] as const) {
    const sideNotes = byHand[side];
    if (sideNotes.length === 0) continue;

    // Group into distinct onset times
    const onsetMap = new Map<number, MidiNotePlaybackItem[]>();
    for (const note of sideNotes) {
      const onsetSec = (note.timeMs - INITIAL_PLAYBACK_DELAY_MS) / 1000;
      const key = Math.round(onsetSec * 1000) / 1000;
      if (!onsetMap.has(key)) onsetMap.set(key, []);
      onsetMap.get(key)!.push(note);
    }

    const sortedOnsets = Array.from(onsetMap.keys()).sort((a, b) => a - b);
    for (const onset of sortedOnsets) {
      const chord = onsetMap.get(onset)!;
      // Use the lowest note for base reference
      const primaryNote = chord[0];
      const primaryFinger = primaryNote.finger || (side === 'right' ? 1 : 5);
      const primaryX = keyX(primaryNote.midi);

      // Natural finger rest spacing from thumb (finger 1): 0, 2.8, 5.0, 7.2, 9.4 cm
      // Key coordinate units are ~2.36 per key
      const offsetsFrom1 = [0, 2.36, 4.72, 7.08, 9.44];
      const refOffset = offsetsFrom1[primaryFinger - 1];

      // Calculate baseline resting positions for all 5 fingers centered on the pressed finger
      const positions: number[] = [];
      for (let f = 1; f <= 5; f++) {
        const offset = offsetsFrom1[f - 1] - refOffset;
        positions.push(primaryX + offset * (side === 'right' ? 1 : -1));
      }

      // If chord has specific fingers, snap their positions directly to their keys
      for (const n of chord) {
        if (n.finger && n.finger >= 1 && n.finger <= 5) {
          positions[n.finger - 1] = keyX(n.midi);
        }
      }

      poses.push({
        hand: side,
        onsetSeconds: onset,
        positions,
      });
    }
  }

  poses.sort((a, b) => a.onsetSeconds - b.onsetSeconds);
  return poses;
}

/**
 * Main prediction function: predicts fingers using Ramoneda's AI model
 */
export async function predictAiFingering(
  notes: MidiNotePlaybackItem[],
  preferences: FingeringPreferences,
  onProgress?: (stage: string) => void
): Promise<{
  notes: { midi: number; onsetSeconds: number; onsetTicks?: number; finger: number; hand: 'left' | 'right' }[];
  poses: HandPose[];
}> {
  if (notes.length === 0) {
    return { notes: [], poses: [] };
  }

  const sessions = await initAiSessions(onProgress);

  // 1. Hand Routing
  const routing = preferences.routing || 'auto';
  const splitMidi = preferences.splitMidi ?? 60;

  // Clone notes and assign hand
  const routedNotes: (MidiNotePlaybackItem & { index: number })[] = notes.map((n, i) => {
    let hand: 'left' | 'right';
    if (routing === 'right') {
      hand = 'right';
    } else if (routing === 'left') {
      hand = 'left';
    } else if (routing === 'split') {
      hand = n.midi < splitMidi ? 'left' : 'right';
    } else {
      // 'auto': preserve track hand if already set, or split by splitMidi
      hand = n.hand || (n.midi < splitMidi ? 'left' : 'right');
    }
    return { ...n, hand, index: i };
  });

  // 2. Separate notes by hand and sort chronologically (and ascending pitch for chords)
  const rightNotes = routedNotes
    .filter(n => n.hand === 'right')
    .sort((a, b) => a.timeMs !== b.timeMs ? a.timeMs - b.timeMs : a.midi - b.midi);

  const leftNotes = routedNotes
    .filter(n => n.hand === 'left')
    .sort((a, b) => a.timeMs !== b.timeMs ? a.timeMs - b.timeMs : a.midi - b.midi);

  // 3. Run predictions
  const [rightFingers, leftFingers] = await Promise.all([
    predictHandNotes('right', rightNotes, sessions.rightEnc, sessions.rightDec, sessions.embeddings.right, onProgress),
    predictHandNotes('left', leftNotes, sessions.leftEnc, sessions.leftDec, sessions.embeddings.left, onProgress),
  ]);

  // 4. Map fingers back to routed notes
  for (let i = 0; i < rightNotes.length; i++) {
    rightNotes[i].finger = rightFingers[i];
  }
  for (let i = 0; i < leftNotes.length; i++) {
    leftNotes[i].finger = leftFingers[i];
  }

  const allWithFingers: MidiNotePlaybackItem[] = [...rightNotes, ...leftNotes].sort((a, b) => a.index - b.index);

  // 5. Generate 3D hand poses
  const poses = generateHandPoses(allWithFingers);

  // 6. Format result matching NativeFingeringResult
  const outputNotes = allWithFingers.map(n => ({
    midi: n.midi,
    onsetSeconds: (n.timeMs - INITIAL_PLAYBACK_DELAY_MS) / 1000,
    onsetTicks: n.ticks,
    finger: n.finger || (n.hand === 'right' ? 1 : 5),
    hand: n.hand,
  }));

  onProgress?.('');

  return {
    notes: outputNotes,
    poses,
  };
}
