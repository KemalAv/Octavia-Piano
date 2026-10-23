import { frequencyToMidi } from './utils';
import { MicThresholds } from './types';

export interface PitchDetectionResult {
  midi: number;
  frequency: number;
  magnitude: number;
}

/**
 * Advanced In-Browser Acoustic Piano Transcription Engine.
 * Operates 100% client-side via Web Audio API with zero external servers,
 * zero python scripts, and zero zip downloads.
 * 
 * Features:
 * - High-resolution spectral peak detection with parabolic interpolation.
 * - Multi-harmonic overtone summation tailored to acoustic piano timbre.
 * - Harmonic overtone suppression to eliminate ghost octaves (e.g. C5 triggered by C4).
 * - Dynamic noise floor estimation to reject microphone hiss and room noise.
 * - Fast temporal attack/release tracking (~30ms latency for real-time play).
 * - iPad / Safari / Chrome full compatibility.
 */
export class AcousticPianoService {
  private analysers: AnalyserNode[];
  private audioContext: AudioContext;
  private sampleRate: number;
  private fftSize: number;
  private bufferLength: number;
  private frequencyDataBuffers: Float32Array[];
  private combinedBuffer: Float32Array;
  
  // Note tracking state
  private noteOnThreshold: number = 2; // Frames to confirm note attack (~30ms at 60fps)
  private noteOffThreshold: number = 2; // Frames to confirm note release
  private activeNotes: Map<number, { frames: number; magnitude: number; confirmed: boolean }> = new Map();
  private detectedNotesThisFrame: Set<number> = new Set();

  // 88-Key Piano Note Frequency Table (A0 = MIDI 21, C8 = MIDI 108)
  private static readonly MIN_MIDI = 21;
  private static readonly MAX_MIDI = 108;
  private pianoFrequencies: Float32Array;

  constructor(analysers: AnalyserNode | AnalyserNode[], audioContext: AudioContext) {
    this.analysers = Array.isArray(analysers) ? analysers : [analysers];
    this.audioContext = audioContext;
    this.sampleRate = audioContext.sampleRate || 44100;
    this.fftSize = this.analysers[0]?.fftSize || 8192;
    this.bufferLength = this.analysers[0]?.frequencyBinCount || (this.fftSize / 2);
    
    this.frequencyDataBuffers = this.analysers.map(() => new Float32Array(this.bufferLength));
    this.combinedBuffer = new Float32Array(this.bufferLength);

    // Precompute exact fundamental frequencies for all 88 piano notes
    this.pianoFrequencies = new Float32Array(AcousticPianoService.MAX_MIDI + 1);
    for (let midi = AcousticPianoService.MIN_MIDI; midi <= AcousticPianoService.MAX_MIDI; midi++) {
      this.pianoFrequencies[midi] = 440 * Math.pow(2, (midi - 69) / 12);
    }
  }

  /**
   * Performs high-accuracy pitch and chord detection directly from microphone frequency data.
   */
  public detectPitch(thresholds: MicThresholds): PitchDetectionResult[] {
    this.detectedNotesThisFrame.clear();
    this.combinedBuffer.fill(0);

    const numAnalysers = this.analysers.length;
    if (numAnalysers === 0) return [];

    // 1. Combine frequency data across channels (averaging stereo / dual-mic)
    for (let ch = 0; ch < numAnalysers; ch++) {
      this.analysers[ch].getFloatFrequencyData(this.frequencyDataBuffers[ch] as any);
      for (let i = 0; i < this.bufferLength; i++) {
        this.combinedBuffer[i] += this.frequencyDataBuffers[ch][i] / numAnalysers;
      }
    }

    const binWidth = this.sampleRate / this.fftSize;
    const detectedCandidates: Array<{ midi: number; frequency: number; score: number; magnitude: number }> = [];

    // 2. Scan piano notes with Harmonic Prominence & Parabolic Interpolation
    for (let midi = AcousticPianoService.MIN_MIDI; midi <= AcousticPianoService.MAX_MIDI; midi++) {
      const f0 = this.pianoFrequencies[midi];
      const targetBin = f0 / binWidth;
      const centerBin = Math.round(targetBin);

      if (centerBin < 1 || centerBin >= this.bufferLength - 1) continue;

      // Find local peak around expected fundamental
      let peakBin = centerBin;
      let peakVal = this.combinedBuffer[centerBin];
      
      const searchRadius = midi < 40 ? 1 : 2;
      for (let b = Math.max(1, centerBin - searchRadius); b <= Math.min(this.bufferLength - 2, centerBin + searchRadius); b++) {
        if (this.combinedBuffer[b] > peakVal) {
          peakVal = this.combinedBuffer[b];
          peakBin = b;
        }
      }

      // Parabolic interpolation for fine sub-bin frequency estimation
      const alpha = this.combinedBuffer[peakBin - 1];
      const beta = this.combinedBuffer[peakBin];
      const gamma = this.combinedBuffer[peakBin + 1];

      let interpolatedFreq = f0;
      const denom = alpha - 2 * beta + gamma;
      if (denom !== 0 && beta > alpha && beta > gamma) {
        const p = 0.5 * (alpha - gamma) / denom;
        if (isFinite(p) && Math.abs(p) <= 1) {
          interpolatedFreq = (peakBin + p) * binWidth;
        }
      }

      // Check threshold based on octave range
      let userThreshold = -65;
      if (midi < 43) userThreshold = thresholds.subBass || -70;
      else if (midi < 48) userThreshold = thresholds.bass || -65;
      else if (midi < 60) userThreshold = thresholds.mid || -60;
      else if (midi <= 96) userThreshold = thresholds.treble || -68;
      else userThreshold = thresholds.highTreble || -70;

      // Calculate local noise floor (moving window around peak)
      let localNoise = -100;
      const noiseWindow = 8;
      let noiseSum = 0;
      let noiseCount = 0;
      for (let nb = Math.max(1, peakBin - noiseWindow); nb <= Math.min(this.bufferLength - 2, peakBin + noiseWindow); nb++) {
        if (Math.abs(nb - peakBin) > 2) {
          noiseSum += this.combinedBuffer[nb];
          noiseCount++;
        }
      }
      if (noiseCount > 0) {
        localNoise = noiseSum / noiseCount;
      }

      // Fundamental must exceed user threshold AND be significantly above local noise floor
      const snr = peakVal - localNoise;
      if (peakVal < userThreshold || snr < 7) continue;

      // Harmonic confirmation (check 2nd and 3rd harmonics)
      let harmonicScore = peakVal;
      const h2Bin = Math.round((f0 * 2) / binWidth);
      if (h2Bin < this.bufferLength) {
        const h2Val = this.combinedBuffer[h2Bin];
        if (h2Val > userThreshold - 15) {
          harmonicScore += h2Val * 0.4;
        }
      }

      const h3Bin = Math.round((f0 * 3) / binWidth);
      if (h3Bin < this.bufferLength) {
        const h3Val = this.combinedBuffer[h3Bin];
        if (h3Val > userThreshold - 20) {
          harmonicScore += h3Val * 0.2;
        }
      }

      detectedCandidates.push({
        midi,
        frequency: interpolatedFreq,
        score: harmonicScore,
        magnitude: peakVal
      });
    }

    // 3. Overtone Suppression: eliminate false upper octaves caused by strong lower notes
    // Sort candidates by magnitude (strongest fundamentals first)
    detectedCandidates.sort((a, b) => b.score - a.score);

    const suppressedMidis = new Set<number>();
    const results: PitchDetectionResult[] = [];

    for (const cand of detectedCandidates) {
      if (suppressedMidis.has(cand.midi)) continue;

      results.push({
        midi: cand.midi,
        frequency: cand.frequency,
        magnitude: cand.magnitude
      });
      this.detectedNotesThisFrame.add(cand.midi);

      // Suppress 2nd harmonic (+12 semitones / 1 octave) and 3rd harmonic (+19 semitones / 1 octave + fifth)
      // unless their peak is independently stronger than predicted overtone decay
      const octaveAbove = cand.midi + 12;
      const octaveFifthAbove = cand.midi + 19;
      const doubleOctaveAbove = cand.midi + 24;

      const candOctave = detectedCandidates.find(c => c.midi === octaveAbove);
      if (candOctave && candOctave.magnitude < cand.magnitude - 4) {
        suppressedMidis.add(octaveAbove);
      }

      const candFifth = detectedCandidates.find(c => c.midi === octaveFifthAbove);
      if (candFifth && candFifth.magnitude < cand.magnitude - 6) {
        suppressedMidis.add(octaveFifthAbove);
      }

      const candDouble = detectedCandidates.find(c => c.midi === doubleOctaveAbove);
      if (candDouble && candDouble.magnitude < cand.magnitude - 8) {
        suppressedMidis.add(doubleOctaveAbove);
      }
    }

    return results;
  }

  /**
   * Updates note state across consecutive audio frames and filters out noise.
   * Returns note-on and note-off events directly.
   */
  public updateNotes(currentFrameNotes: PitchDetectionResult[]): { on: number[]; off: number[] } {
    const noteOn: number[] = [];
    const noteOff: number[] = [];
    
    const currentMidis = new Set(currentFrameNotes.map(n => n.midi));

    // 1. Update existing notes and register new detected candidates
    for (const res of currentFrameNotes) {
      const midi = res.midi;
      if (this.activeNotes.has(midi)) {
        const state = this.activeNotes.get(midi)!;
        if (state.frames < 0) state.frames = 0;
        state.frames = Math.min(state.frames + 1, 10);
        state.magnitude = res.magnitude;
      } else {
        this.activeNotes.set(midi, { frames: 1, magnitude: res.magnitude, confirmed: false });
      }
    }

    // 2. Handle missing notes (decaying state)
    this.activeNotes.forEach((state, midi) => {
      if (!currentMidis.has(midi)) {
        if (state.frames > 0) state.frames = 0;
        state.frames--;
      }
    });

    // 3. Confirm Note-Ons and Note-Offs
    this.activeNotes.forEach((state, midi) => {
      // Trigger Note-On after 2 consecutive verified frames
      if (!state.confirmed && state.frames >= this.noteOnThreshold) {
        noteOn.push(midi);
        state.confirmed = true;
      }
      
      // Trigger Note-Off after release threshold
      if (state.confirmed && state.frames <= -this.noteOffThreshold) {
        noteOff.push(midi);
        this.activeNotes.delete(midi);
      } else if (!state.confirmed && state.frames <= -this.noteOffThreshold) {
        this.activeNotes.delete(midi);
      }
    });

    return { on: noteOn, off: noteOff };
  }

  public destroy(): void {
    this.activeNotes.clear();
    this.detectedNotesThisFrame.clear();
  }
}
