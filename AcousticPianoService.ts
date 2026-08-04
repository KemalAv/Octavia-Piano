
import { frequencyToMidi } from './utils';
import { MicThresholds } from './types';

export interface PitchDetectionResult {
  midi: number;
  frequency: number;
  magnitude: number;
}

export class AcousticPianoService {
  private analysers: AnalyserNode[];
  private audioContext: AudioContext;
  private sampleRate: number;
  private fftSize: number;
  private hpsOrder: number = 4; // Number of harmonic downsamplings
  private bufferLength: number;
  private frequencyDataBuffers: Float32Array[];
  private combinedHpsBuffer: Float32Array;
  private hpsBuffers: Float32Array[];
  
  // Debouncing / Smoothing
  private noteOnThreshold: number = 4; // Increased for better stability (PDF suggests 7 frames window)
  private noteOffThreshold: number = 3; // frames
  
  // activeNotes tracks: framesDetected (positive) or framesMissing (negative)
  // We also need to know if the note has been "confirmed" (sent to UI)
  private activeNotes: Map<number, { frames: number, magnitude: number, confirmed: boolean }> = new Map();
  private detectedNotesThisFrame: Set<number> = new Set();

  constructor(analysers: AnalyserNode | AnalyserNode[], audioContext: AudioContext) {
    this.analysers = Array.isArray(analysers) ? analysers : [analysers];
    this.audioContext = audioContext;
    this.sampleRate = audioContext.sampleRate;
    this.fftSize = this.analysers[0].fftSize;
    this.bufferLength = this.analysers[0].frequencyBinCount;
    this.frequencyDataBuffers = this.analysers.map(() => new Float32Array(this.bufferLength));
    this.combinedHpsBuffer = new Float32Array(this.bufferLength);
    this.hpsBuffers = this.analysers.map(() => new Float32Array(this.bufferLength));
  }

  /**
   * Performs pitch detection using Harmonic Product Spectrum (HPS)
   * and returns a list of detected MIDI notes.
   * Supports dual-channel by averaging the HPS results from both channels.
   */
  public detectPitch(thresholds: MicThresholds): PitchDetectionResult[] {
    this.detectedNotesThisFrame.clear();
    this.combinedHpsBuffer.fill(0);
    
    // Process each channel
    for (let ch = 0; ch < this.analysers.length; ch++) {
      this.analysers[ch].getFloatFrequencyData(this.frequencyDataBuffers[ch] as any);
      
      const hpsBuffer = this.hpsBuffers[ch];
      for (let i = 0; i < this.bufferLength; i++) {
        hpsBuffer[i] = this.frequencyDataBuffers[ch][i];
      }

      // Multiply (add in log space) downsampled versions
      for (let order = 2; order <= this.hpsOrder; order++) {
        for (let i = Math.floor(20 * this.fftSize / this.sampleRate); i < Math.floor(this.bufferLength / order); i++) {
          const freq = i * this.sampleRate / this.fftSize;
          
          if (freq > 500 && order > 3) continue; 
          if (freq > 1000 && order > 2) continue; 
          if (freq > 2000 && order > 1) continue; 

          let maxVal = -120; 
          const windowSize = Math.max(1, Math.floor(i * order * 0.015)); 
          for (let w = -windowSize; w <= windowSize; w++) {
            const idx = i * order + w;
            if (idx >= 0 && idx < this.bufferLength) {
              maxVal = Math.max(maxVal, this.frequencyDataBuffers[ch][idx]);
            }
          }
          const weight = 1.0 / (order * 0.5);
          hpsBuffer[i] += maxVal * weight;
        }
      }
      
      // Accumulate into combined buffer
      for (let i = 0; i < this.bufferLength; i++) {
        this.combinedHpsBuffer[i] += hpsBuffer[i] / this.analysers.length;
      }
    }

    // 2. Find peaks in the combined HPS buffer
    const results: PitchDetectionResult[] = [];
    const minMidi = 21; // A0
    const maxMidi = 108; // C8
    const maxBin = Math.floor(5000 * this.fftSize / this.sampleRate);

    for (let i = Math.floor(20 * this.fftSize / this.sampleRate); i < maxBin; i++) {
      const freq = i * this.sampleRate / this.fftSize;
      const midi = frequencyToMidi(freq);
      
      if (midi < minMidi || midi > maxMidi) continue;

      // Determine threshold based on MIDI range
      let threshold = -60;
      if (midi < 43) threshold = thresholds.subBass || -70;
      else if (midi < 48) threshold = thresholds.bass || -65;
      else if (midi < 60) threshold = thresholds.mid || -60;
      else if (midi <= 96) threshold = thresholds.treble || -70;
      else threshold = thresholds.highTreble || -70;

    // Adjusted HPS threshold logic:
    let effectiveHpsOrder = 1;
    if (freq <= 500) effectiveHpsOrder = 1 + (1/1.0 + 1/1.5 + 1/2.0); 
    else if (freq <= 1000) effectiveHpsOrder = 1 + (1/1.0 + 1/1.5); 
    else if (freq <= 2000) effectiveHpsOrder = 1 + (1/1.0); 
    
    const rangeAdjustment = midi >= 60 ? 10 : 0; 
    const hpsThreshold = (threshold + rangeAdjustment) * effectiveHpsOrder;

    if (this.combinedHpsBuffer[i] > hpsThreshold && 
        this.combinedHpsBuffer[i] > this.combinedHpsBuffer[i - 1] && 
        this.combinedHpsBuffer[i] > this.combinedHpsBuffer[i + 1]) {
        
        // Quadratic interpolation for better frequency accuracy
        const alpha = this.combinedHpsBuffer[i - 1];
        const beta = this.combinedHpsBuffer[i];
        const gamma = this.combinedHpsBuffer[i + 1];
        const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
        
        const interpolatedFreq = (isFinite(p) && !isNaN(p))
          ? (i + p) * this.sampleRate / this.fftSize
          : freq;
          
        const interpolatedMidi = frequencyToMidi(interpolatedFreq);
        
        // Only add if it's a distinct MIDI note
        if (!this.detectedNotesThisFrame.has(interpolatedMidi)) {
          results.push({
            midi: interpolatedMidi,
            frequency: interpolatedFreq,
            magnitude: beta / this.hpsOrder // Average magnitude
          });
          this.detectedNotesThisFrame.add(interpolatedMidi);
        }
      }
    }

    return results;
  }

  /**
   * Updates the state of active notes based on current frame detections.
   * Returns a list of notes that should be triggered (note-on) or released (note-off).
   */
  public updateNotes(currentFrameNotes: PitchDetectionResult[]): { on: number[], off: number[] } {
    const noteOn: number[] = [];
    const noteOff: number[] = [];
    
    const currentMidis = new Set(currentFrameNotes.map(n => n.midi));

    // 1. Update existing notes and add new candidates
    for (const res of currentFrameNotes) {
      const midi = res.midi;
      if (this.activeNotes.has(midi)) {
        const state = this.activeNotes.get(midi)!;
        if (state.frames < 0) state.frames = 0; // Reset missing counter if it reappears
        state.frames = Math.min(state.frames + 1, 10); // Cap at 10 frames
        state.magnitude = res.magnitude;
      } else {
        this.activeNotes.set(midi, { frames: 1, magnitude: res.magnitude, confirmed: false });
      }
    }

    // 2. Handle missing notes (decaying)
    this.activeNotes.forEach((state, midi) => {
      if (!currentMidis.has(midi)) {
        if (state.frames > 0) state.frames = 0; // Start missing counter
        state.frames--;
      }
    });

    // 3. Confirm Note-Ons and Note-Offs
    this.activeNotes.forEach((state, midi) => {
      // Confirm Note-On
      if (!state.confirmed && state.frames >= this.noteOnThreshold) {
        noteOn.push(midi);
        state.confirmed = true;
      }
      
      // Confirm Note-Off
      if (state.confirmed && state.frames <= -this.noteOffThreshold) {
        noteOff.push(midi);
        this.activeNotes.delete(midi);
      } else if (!state.confirmed && state.frames <= -this.noteOffThreshold) {
        // Candidate that never got confirmed
        this.activeNotes.delete(midi);
      }
    });

    return { on: noteOn, off: noteOff };
  }
}
