/// <reference types="vite/client" />
import type { MidiNotePlaybackItem } from './types';
import { INITIAL_PLAYBACK_DELAY_MS } from './midiParser';
import { parsePlaybackFile } from './songLoading';
import bundledWorkerSource from './public/pianoplayer-worker.js?raw';
import { predictAiFingering } from './aiFingering';

export interface FingeringPreferences {
  handSize: 'XXS'|'XS'|'S'|'M'|'L'|'XL'|'XXL';
  routing: 'auto'|'split'|'right'|'left';
  splitMidi: number;
  engine?: 'ai' | 'pianoplayer';
}
export interface HandPose { hand: 'left'|'right'; onsetSeconds: number; positions: number[]; }
export type NativeFingeringResult = ({ poses?: HandPose[]; warnings?: string[] } & (
  | { engine: 'pianoplayer-python'; format: 'musicxml'; xml: string }
  | { engine: 'pianoplayer-python' | 'ramoneda-ai'; format: 'midi'; notes: { midi: number; onsetSeconds: number; onsetTicks?: number; finger: number; hand: 'left' | 'right' }[] }));

const WORKER_VERSION = 'bootstrap-8';
function validatedWorkerSource(source: string): string {
  if (!source.includes(`OCTAVIA_WORKER_VERSION = '${WORKER_VERSION}'`) || /^\s*</.test(source)) {
    throw new Error('The server did not return a valid fingering worker. Reopen Octavia using its site link and try again.');
  }
  return source;
}
async function loadWorkerSource(signal?: AbortSignal): Promise<{url: string; source: string; bundled: boolean}> {
  const url=new URL(`/pianoplayer-worker.js?v=${WORKER_VERSION}`,globalThis.location.href).href;
  const controller=new AbortController();
  const cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted)controller.abort();
  const timer=setTimeout(()=>controller.abort(),30000);
  try {
    const response=await fetch(url,{credentials:'same-origin',cache:'no-cache',signal:controller.signal});
    if(!response.ok) {
      if(response.status===401||response.status===403) return {url,source:validatedWorkerSource(bundledWorkerSource),bundled:true};
      throw new Error(`Failed to download the fingering worker (HTTP ${response.status}).`);
    }
    const source=await response.text();
    return {url,source:validatedWorkerSource(source),bundled:false};
  } catch(error) {
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    if(controller.signal.aborted)throw new Error('The fingering worker download timed out after 30 seconds.');
    if(error instanceof TypeError) return {url,source:validatedWorkerSource(bundledWorkerSource),bundled:true};
    throw error instanceof Error ? error : new Error('Failed to download the fingering worker.');
  } finally {clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}

export async function requestPythonFingering(file: File, options: {signal?: AbortSignal; onProgress?: (stage: string) => void; preferences?: FingeringPreferences} = {}): Promise<NativeFingeringResult> {
  options.onProgress?.('Downloading fingering worker...');
  const [{url,source,bundled},bytes]=await Promise.all([loadWorkerSource(options.signal),file.arrayBuffer()]);
  if(options.signal?.aborted)throw new DOMException('Cancelled','AbortError');
  return new Promise((resolve, reject) => {
    let worker: Worker | undefined;
    let objectUrl: string | undefined;
    let settled = false;
    let attempt = 0;
    let computing = false;
    let stage = 'memulai worker';
    let timer: ReturnType<typeof setTimeout>;
    const stopWorker=()=>{worker?.terminate();if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=undefined;}};
    const finish = (error?: Error, result?: NativeFingeringResult) => {
      if (settled) return;
      settled = true; clearTimeout(timer); stopWorker();
      options.signal?.removeEventListener('abort', cancel);
      if (error) reject(error); else resolve(result!);
    };
    const cancel = () => finish(new DOMException('Cancelled', 'AbortError'));
    const deadline = (ms: number, message: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => finish(new Error(message)), ms);
    };
    const retry=()=>{
      if(computing||attempt>=1)return false;
      attempt++;stopWorker();
      options.onProgress?.('Retrying fingering engine startup (1/1)...');
      launch(!bundled);return true;
    };
    const launch=(direct=false)=>{
      if(settled)return;
      computing=false;stage='memulai worker';
      try {
        if(!direct){
          const base=new URL('/',url).href;
          objectUrl=URL.createObjectURL(new Blob([`self.OCTAVIA_ASSET_BASE = ${JSON.stringify(base)};\n`,source],{type:'text/javascript'}));
          try {worker=new Worker(objectUrl);} catch {stopWorker();worker=new Worker(url);}
        } else worker=new Worker(url);
      } catch(error){finish(new Error('The browser could not create a fingering worker: '+(error instanceof Error?error.message:String(error))));return;}
      const active=worker;
      deadline(90000,'The fingering engine made no loading progress for 90 seconds.');
      active.onmessage=({data})=>{
        if(active!==worker||settled)return;
        if(data.stage){
          stage=data.stage;computing=computing||!!data.computing;
          options.onProgress?.(data.stage);
          deadline(computing?120000:90000,computing?'The fingering engine made no progress for 120 seconds. Try again or check the hand assignment.':`The fingering engine stalled at ${stage} for 90 seconds.`);
          return;
        }
        if(data.error){if(data.retryable&&retry())return;finish(new Error(`Fingering failed at ${stage}: ${data.error}`));return;}
        const result=data.result;
        if(result?.engine!=='pianoplayer-python'||!['midi','musicxml'].includes(result.format)){finish(new Error('The Python fingering engine returned an invalid response.'));return;}
        finish(undefined,result);
      };
      active.onerror=event=>{
        if(active!==worker||settled)return;
        event.preventDefault?.();
        const detail=event.message||'The browser stopped the worker without providing error details.';
        if(retry())return;
        finish(new Error(`The fingering worker failed at ${stage}: ${detail}`));
      };
      active.onmessageerror=()=>{if(active===worker)finish(new Error('The fingering result could not be read. Try again.'));};
      try {const copy=bytes.slice(0);active.postMessage({name:file.name,bytes:copy,preferences:options.preferences},[copy]);}
      catch(error){finish(error instanceof Error?error:new Error('Failed to send the file to the fingering engine.'));}
    };
    options.signal?.addEventListener('abort',cancel,{once:true});
    if(options.signal?.aborted){cancel();return;}
    launch();
  });
}

const defaultMidiNames = new Map<number, string>();
const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
for (let i = 0; i < 128; i++) {
  defaultMidiNames.set(i, PITCH_CLASSES[i % 12] + (Math.floor(i / 12) - 1));
}

export async function requestNativeFingering(file: File, options: {signal?: AbortSignal; onProgress?: (stage: string) => void; preferences?: FingeringPreferences; notes?: MidiNotePlaybackItem[]} = {}): Promise<NativeFingeringResult> {
  if (file.size > 10 * 1024 * 1024) throw new Error('The maximum file size is 10 MiB.');
  if (options.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

  const prefs: FingeringPreferences = {
    handSize: options.preferences?.handSize || 'M',
    routing: 'auto',
    splitMidi: options.preferences?.splitMidi ?? 60,
    engine: options.preferences?.engine || 'pianoplayer'
  };
  const engine = prefs.engine;
  if (engine === 'ai') {
    try {
      options.onProgress?.('Parsing music file for AI fingering...');
      let notesToProcess: MidiNotePlaybackItem[] = options.notes || [];
      if (!notesToProcess.length) {
        const parsed = await parsePlaybackFile(file, defaultMidiNames);
        notesToProcess = parsed?.notes || [];
      }
      if (options.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (!notesToProcess.length) {
        return {
          engine: 'ramoneda-ai',
          format: 'midi',
          notes: [],
          poses: [],
          warnings: []
        };
      }
      const aiResult = await predictAiFingering(notesToProcess, prefs, options.onProgress);
      if (options.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      return {
        engine: 'ramoneda-ai',
        format: 'midi',
        notes: aiResult.notes,
        poses: aiResult.poses,
        warnings: []
      };
    } catch (err) {
      if (options.signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        throw err;
      }
      console.warn('AI fingering failed, falling back to Python worker:', err);
    }
  }

  return requestPythonFingering(file, { ...options, preferences: prefs });
}

export function applyNativeMidiFingering(notes: MidiNotePlaybackItem[], result: Extract<NativeFingeringResult, {format: 'midi'}>): MidiNotePlaybackItem[] {
  if (notes.length && (!result.notes || result.notes.length === 0)) {
    throw new Error('Hasil penjarian tidak cocok dengan file MIDI (tidak cocok).');
  }
  const buckets = new Map<string, typeof result.notes>();
  for (const row of result.notes) {
    if (!Number.isInteger(row.finger) || row.finger < 1 || row.finger > 5) throw new Error('The fingering engine returned an invalid finger number.');
    if (Number.isInteger(row.onsetTicks)) {
      const tickKey = `${row.midi}:tick:${row.onsetTicks}`;
      buckets.set(tickKey, [...(buckets.get(tickKey) || []), row]);
    }
    const secKey = `${row.midi}:${Math.round(row.onsetSeconds * 1000)}`;
    buckets.set(secKey, [...(buckets.get(secKey) || []), row]);
  }
  const mapped = notes.map(note => {
    const key = `${note.midi}:${note.timeMs - INITIAL_PLAYBACK_DELAY_MS}`;
    const choices = (Number.isInteger(note.ticks) ? buckets.get(`${note.midi}:tick:${note.ticks}`) : undefined) || buckets.get(key);
    if (!choices?.length) {
      // Graceful fallback for any unmatched note instead of crashing playback
      const fallbackHand = note.hand || (note.midi < 60 ? 'left' : 'right');
      const fallbackFinger = note.finger || (fallbackHand === 'left' ? 5 : 1);
      return { ...note, hand: fallbackHand, finger: fallbackFinger as 1|2|3|4|5 };
    }
    const row = choices[0];
    return {...note, hand: row.hand, finger: row.finger as 1|2|3|4|5};
  });

  return postProcessWideIntervalFingering(mapped);
}

/**
 * Post-processes fingering for 1-octave intervals and leaps (12 semitones).
 * Piano technique rules:
 * - Left Hand: 1-octave intervals/leaps force low note to 5 (pinky) and high note to 1 (thumb).
 * - Right Hand: 1-octave intervals/leaps force low note to 1 (thumb) and high note to 5 (pinky).
 * - All other intervals are preserved as originally calculated.
 */
export function postProcessWideIntervalFingering(notes: MidiNotePlaybackItem[]): MidiNotePlaybackItem[] {
  if (!notes || notes.length <= 1) return notes;

  const result = notes.map(n => ({ ...n }));

  for (const hand of ['left', 'right'] as const) {
    const handNotes = result.filter(n => n.hand === hand);
    if (handNotes.length <= 1) continue;

    // Group notes into time clusters (notes played simultaneously or within 35ms)
    handNotes.sort((a, b) => a.timeMs !== b.timeMs ? a.timeMs - b.timeMs : a.midi - b.midi);

    const clusters: MidiNotePlaybackItem[][] = [];
    let currentCluster: MidiNotePlaybackItem[] = [handNotes[0]];

    for (let i = 1; i < handNotes.length; i++) {
      const prev = handNotes[i - 1];
      const curr = handNotes[i];
      if (Math.abs(curr.timeMs - prev.timeMs) <= 35) {
        currentCluster.push(curr);
      } else {
        clusters.push(currentCluster);
        currentCluster = [curr];
      }
    }
    clusters.push(currentCluster);

    // 1. Chords / simultaneous intervals (notes played at the same onset)
    for (const cluster of clusters) {
      if (cluster.length >= 2) {
        cluster.sort((a, b) => a.midi - b.midi);
        const lowest = cluster[0];
        const highest = cluster[cluster.length - 1];
        const interval = highest.midi - lowest.midi;
        // Hanya untuk yang jarak 1 oktaf (12 semitone)
        if (interval === 12) {
          if (hand === 'left') {
            lowest.finger = 5;
            highest.finger = 1;
          } else {
            lowest.finger = 1;
            highest.finger = 5;
          }
        }
      }
    }

    // 2. Sequential intervals / leaps across consecutive clusters
    for (let i = 0; i < clusters.length - 1; i++) {
      const c1 = clusters[i];
      const c2 = clusters[i + 1];

      const dt = c2[0].timeMs - c1[0].timeMs;
      if (dt > 3000) continue; // Skip if notes are far apart in time (> 3 seconds)

      c1.sort((a, b) => a.midi - b.midi);
      c2.sort((a, b) => a.midi - b.midi);

      const c1Lowest = c1[0];
      const c1Highest = c1[c1.length - 1];
      const c2Lowest = c2[0];
      const c2Highest = c2[c2.length - 1];

      const n1 = c1[0];
      const n2 = c2[0];

      const pitchDiff = n2.midi - n1.midi;
      const absDiff = Math.abs(pitchDiff);
      const isAscending = pitchDiff > 0;

      // Hanya untuk yang jarak 1 oktaf (12 semitone)
      if (absDiff === 12) {
        if (hand === 'left') {
          if (isAscending) {
            c1Lowest.finger = 5;
            c2Highest.finger = 1;
          } else {
            c1Highest.finger = 1;
            c2Lowest.finger = 5;
          }
        } else {
          if (isAscending) {
            c1Lowest.finger = 1;
            c2Highest.finger = 5;
          } else {
            c1Highest.finger = 5;
            c2Lowest.finger = 1;
          }
        }
      }
    }
  }

  return result;
}
