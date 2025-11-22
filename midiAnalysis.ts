
import { MidiNotePlaybackItem, AnalysisResult, ExtendedResult, AnalysisConfig } from './types';

export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
    densityWindowMs: 1000.8670821799764,
    densityStepMs: 266.3211382449282,
    densityMinNorm: 0.0974689153319719,
    densityMaxNorm: 80.27258065360013,
    awkwardIntervalMin: 3.055912777402908,
    awkwardIntervalMax: 4.223312325452998,
    awkwardGapMin: 0.016856180161895266,
    awkwardGapMax: 0.09248177809040742,
    awkwardWeightMax: 0.3640343509741535,
    zigzagGapMin: 0.054225225366679335,
    zigzagGapMax: 0.032006622114661466,
    zigzagWeightMax: 0.953247320018822,
    repetitionWindow: 6.952017982033874,
    repetitionWeightMin: -0.10775038700335018,
    repetitionWeightMax: 0.9600746308638215,
    abstractnessWeightMax: 32.757041093009946,
    timingVarianceMax: 868.9286083693863,
    complexityAwkwardWeight: 0.42250714297903497,
    complexityZigzagWeight: 0.2518308966122291,
    complexityAbstractWeight: 0.06231366426481266,
    complexityTimingWeight: 0.34291635341638477,
    complexityFinalMin: 0.06397309451303217,
    complexityFinalMax: 0.354283815719138,
    tightIntervalMax: 6.096522989298555,
    tightIntervalDtMax: 201.52246344852105,
    tightIntervalMinNorm: 0.07821961522820114,
    tightIntervalMaxNorm: 0.683853077489632,
    chordMobilityMinInterval: 5.673790782723057,
    chordMobilityMinNorm: 21.999402140820344,
    chordMobilityMaxNorm: 217.30848624166936,
    effortWindow: 407.59165856942406,
    effortStep: 164.76699670435562,
    effortNormMin: 2.4302752401840912,
    effortNormMax: 88.43558827189071,
    effortConsistencyDiscount: 0.08003114963293073,
    rangeWindow: 2061.508453092694,
    rangeStep: 737.1458434152491,
    rangeNormMin: 19.55415696652793,
    rangeNormMax: 117.72775217169061,
    arpNpsMin: 1.635032055945509,
    arpNpsMax: 123.14239899225598,
    arpRangeMin: 5.87024750296897,
    arpRangeMax: 38.84059985484811,
    arpJumpSmall: 8.94572651829202,
    arpJumpLarge: 4.828722762101031,
    arpJumpWeight: 0.15834613390179653,
    arpZigzagWeight: 0.11744168352726626,
    arpSpeedWeight: 0.2902653969168716,
    arpRangeWeight: 0.41413041649680443,
    arpJumpZigzagWeight: 0.18655415958379173,
    arpConsistencyWeight: 0.052403966057608456,
    trillMaxInterval: 3.0750328544449013,
    trillMaxGap: 278.56017443862015,
    trillNormMin: 0.08195563548331179,
    trillNormMax: 0.28183442248724055,
    npsNormMin: 1.158753345162829,
    npsNormMax: 192.18830806814913,
    weightSpeedNps: 0.1801837165279198,
    weightSpeedDensity: 0.5377502946711245,
    weightSpeedEffort: 0.4348945150406208,
    polyphonyNormMin: 0.5048688734054705,
    polyphonyNormMax: 5.010744264109642,
    weightCompPolyphony: 0.14144557459870077,
    weightCompAbstract: 0.3517768365580828,
    weightCompInterval: 0.14460115554507458,
    weightCompChordMobility: 0.049099647777488424,
    weightCompRange: 0.3488033519121258,
    durationNormMin: 18.823203156057648,
    durationNormMax: 262.794983545287,
    finalWeightSpeed: 3.0135413034930014,
    finalWeightComplexity: 5.6,
    finalWeightArpeggio: 2.330733943435883,
    penaltyRepetition: 0.19773790077035797,
    penaltyTrill: 0.4885877519201026,
    bonusStamina: 0.2544150057548726,
    expFactor: 2.75,
    scale: 0.5090584179668028,
    base: 0.43905417771091604
};

// ============================================================
// UTILITIES
// ============================================================
const norm = (v: number, min: number, max: number): number => {
  if (!isFinite(v) || !isFinite(min) || !isFinite(max)) return 0;
  if (max === min) return 0;
  const x = (v - min) / (max - min);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const curved = Math.log1p(x * 9) / Math.log1p(9); // soften scaling
  return Math.max(0, Math.min(1, curved));
};

const avg = (arr: number[]): number =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

// ============================================================
// METRIC: BASIC DENSITY / POLYPHONY
// ============================================================
function getMetrics(notes: MidiNotePlaybackItem[], totalDurationMs: number, config: AnalysisConfig) {
  if (notes.length < 2 || totalDurationMs <= 0)
    return { density: 0, polyphony: 1, chordNps: 0, peakDensity: 0, localDensity: [] };

  const windowMs = config.densityWindowMs;
  const stepMs = config.densityStepMs;

  const s = [...notes].sort((a, b) => a.timeMs - b.timeMs);
  const localDensity: number[] = [];

  for (let t = s[0].timeMs; t < s[s.length - 1].timeMs; t += stepMs) {
    const inside = s.filter(n => n.timeMs >= t && n.timeMs < t + windowMs);
    localDensity.push(inside.length / (windowMs / 1000));
  }

  const peakDensity = Math.max(...localDensity, 0.1);
  const avgDensity = avg(localDensity);

  const density = norm(peakDensity * 0.7 + avgDensity * 0.3, config.densityMinNorm, config.densityMaxNorm);

  // Polyphony: group by time
  const timeMap = new Map<number, number>();
  for (const n of s) timeMap.set(n.timeMs, (timeMap.get(n.timeMs) || 0) + 1);
  const polyphony = avg(Array.from(timeMap.values())) || 1;

  return {
    density,
    polyphony,
    chordNps: density * polyphony,
    peakDensity,
    localDensity
  };
}

// ============================================================
// METRIC: PATTERN COMPLEXITY
// ==================================================================================
function detectPatternComplexity(notes: MidiNotePlaybackItem[], config: AnalysisConfig) {
  if (notes.length < 10)
    return { abstractness: 0, repetitiveness: 0, timingVariance: 0, gaps: [] };

  const s = [...notes].sort((a, b) => a.timeMs - b.timeMs);
  const gaps = s.slice(1).map((n, i) => n.timeMs - s[i].timeMs);
  const intervals = s.slice(1).map((n, i) => n.midi - s[i].midi);
  const absIntervals = intervals.map(x => Math.abs(x));

  const durationSec =
    (s[s.length - 1].timeMs - s[0].timeMs) / 1000 || 1;
  const nps = notes.length / durationSec;

  // ============================================================
  // 1. Finger Awkwardness (main component)
  //    Interval 5–9 semitone cepat = sulit untuk jari
  // ============================================================
  let awkwardSum = 0;
  for (let i = 0; i < absIntervals.length; i++) {
    const iv = absIntervals[i];
    const gap = gaps[i] || 200;

    if (iv >= config.awkwardIntervalMin && iv <= config.awkwardIntervalMax) {
      const speedFactor = norm(1 / gap, config.awkwardGapMin, config.awkwardGapMax); // cepat = tinggi
      awkwardSum += speedFactor;
    }
  }

  const awkwardness = norm(awkwardSum, 0.01, config.awkwardWeightMax);

  // ============================================================
  // 2. Zig-zag / Finger-crossing
  // ============================================================
  let zig = 0;
  for (let i = 1; i < intervals.length - 1; i++) {
    if (intervals[i] * intervals[i - 1] < 0) {
      const gap = gaps[i] || 200;
      zig += norm(1 / gap, config.zigzagGapMin, config.zigzagGapMax);
    }
  }

  const zigzagScore = norm(zig, 0.005, config.zigzagWeightMax);

  // ============================================================
  // 3. Repetitiveness — menentukan apakah pola teknik berulang
  // ============================================================
  const window = Math.round(config.repetitionWindow);
  const patternMap = new Map<string, number>();

  if (intervals.length > window) {
    for (let i = 0; i <= intervals.length - window; i++) {
      const shape = intervals
        .slice(i, i + window)
        .map(iv => {
          const x = Math.abs(iv);
          if (x <= 2) return 0;   // scale steps
          if (x <= 5) return 1;   // small intervals
          if (x <= 9) return 2;   // awkward
          return 3;               // large jump
        })
        .join(",");
      patternMap.set(shape, (patternMap.get(shape) || 0) + 1);
    }
  }

  const repeats = [...patternMap.values()].reduce(
    (sum, c) => sum + (c > 1 ? c - 1 : 0),
    0
  );

  const repetitiveness = norm(
    repeats / Math.max(1, notes.length - window),
    config.repetitionWeightMin,
    config.repetitionWeightMax
  );

  // ============================================================
  // 4. Abstractness (VERY reduced).
  // ============================================================
  const tinyAbstract =
    norm(avg(absIntervals), 0, config.abstractnessWeightMax) * 0.15;

  // ============================================================
  // 5. Timing Variance — kept VERY small
  // ============================================================
  const avgGap = avg(gaps);
  const rawTV =
    Math.sqrt(avg(gaps.map(g => (g - avgGap) ** 2))) || 0;

  const timingVariance = norm(rawTV, 0, config.timingVarianceMax) * 0.05;

  // ============================================================
  // FINAL — controlled range
  // ============================================================
  const combined =
    awkwardness * config.complexityAwkwardWeight +
    zigzagScore * config.complexityZigzagWeight +
    tinyAbstract * config.complexityAbstractWeight +
    timingVariance * config.complexityTimingWeight;

  const abstractness = norm(combined, config.complexityFinalMin, config.complexityFinalMax);

  return {
    abstractness,
    repetitiveness,
    timingVariance,
    gaps
  };
}



// ============================================================
// METRIC: TIGHT PASSAGE COMPLEXITY (SMALL INTERVALS)
// ============================================================
function getIntervalComplexity(notes: MidiNotePlaybackItem[], config: AnalysisConfig) {
  if (notes.length < 5) return 0;

  const s = [...notes].sort((a, b) => a.timeMs - b.timeMs);
  let count = 0;

  for (let i = 1; i < s.length; i++) {
    const interval = Math.abs(s[i].midi - s[i - 1].midi);
    const dt = s[i].timeMs - s[i - 1].timeMs;
    if (interval <= config.tightIntervalMax && dt > 0 && dt < config.tightIntervalDtMax) count++;
  }

  return norm(count / s.length, config.tightIntervalMinNorm, config.tightIntervalMaxNorm);
}

// ============================================================
// METRIC: CHORD MOBILITY (WIDE LEAPS / VOICING MOVEMENT)
// ============================================================
function getChordMobility(notes: MidiNotePlaybackItem[], config: AnalysisConfig) {
  if (notes.length < 5) return 0;

  const s = [...notes].sort((a, b) => a.timeMs - b.timeMs);

  let mobility = 0;
  let events = 0;

  for (let i = 1; i < s.length; i++) {
    const interval = Math.abs(s[i].midi - s[i - 1].midi);
    const dt = s[i].timeMs - s[i - 1].timeMs;
    if (dt <= 0) continue;

    if (interval >= config.chordMobilityMinInterval) {
      const diff = interval * (1000 / dt);
      mobility += norm(diff, config.chordMobilityMinNorm, config.chordMobilityMaxNorm);
      events++;
    }
  }

  if (events === 0) return 0;
  return Math.min(1, mobility / events);
}

// ============================================================
// METRIC: PHYSICAL EFFORT (DENSITY BURST)
// ============================================================
function getEffortIntensity(notes: MidiNotePlaybackItem[], config: AnalysisConfig) {
  if (notes.length < 10) return 0;

  const s = [...notes].sort((a, b) => a.timeMs - b.timeMs);

  const window = config.effortWindow;
  const step = config.effortStep;
  const arr: number[] = [];

  for (let t = s[0].timeMs; t < s[s.length - 1].timeMs; t += step) {
    const segment = s.filter(n => n.timeMs >= t && n.timeMs < t + window);
    if (segment.length > 1) arr.push(segment.length / 0.4);
  }

  if (!arr.length) return 0;

  arr.sort((a, b) => b - a);
  const top = arr.slice(0, Math.max(1, Math.floor(arr.length * 0.2)));
  let effort = norm(avg(top), config.effortNormMin, config.effortNormMax);

  // light nerf for too-consistent arpeggio patterns
  const intervals = s.slice(1).map((n, i) => Math.abs(n.midi - s[i].midi));
  const avgInt = avg(intervals);
  const stdev = Math.sqrt(avg(intervals.map(i => (i - avgInt) ** 2))) || 0;

  const consistency = norm(20 - stdev, 0, 20);
  effort *= (1 - consistency * config.effortConsistencyDiscount);

  return effort;
}

// ============================================================
// METRIC: RANGE INTENSITY
// ============================================================
function getRangeScore(notes: MidiNotePlaybackItem[], config: AnalysisConfig): number {
  if (notes.length < 5) return 0;

  const s = [...notes].sort((a, b) => a.timeMs - b.timeMs);

  const totalTime = s[s.length - 1].timeMs - s[0].timeMs;
  const window = config.rangeWindow;
  const step = config.rangeStep;

  const arr: number[] = [];

  for (let t = s[0].timeMs; t < s[s.length - 1].timeMs; t += step) {
    const seg = s.filter(n => n.timeMs >= t && n.timeMs < t + window);
    if (seg.length > 1) {
      const pitches = seg.map(n => n.midi);
      arr.push(Math.max(...pitches) - Math.min(...pitches));
    }
  }

  if (!arr.length) return 0;

  const rangeAvg = avg(arr);
  const rangePeak = Math.max(...arr);

  const dyn = rangeAvg * 0.6 + rangePeak * 0.4;
  const rate = norm(notes.length / (totalTime / 1000), 2, 30);

  return norm(dyn * (0.5 + rate * 0.5), config.rangeNormMin, config.rangeNormMax);
}

// ============================================================
// METRIC: ARPEGGIO VIRTUOSITY (WATERFALL STYLE)
// ============================================================
function getArpeggioVirtuosity(notes: MidiNotePlaybackItem[], config: AnalysisConfig): number {
  if (!notes || notes.length < 5) return 0;

  const s = [...notes].sort((a,b)=>a.timeMs - b.timeMs);

  const intervals = s.slice(1).map((n,i)=> Math.abs(n.midi - s[i].midi));
  const gaps = s.slice(1).map((n,i)=> n.timeMs - s[i].timeMs);

  const avgInterval = avg(intervals);
  const stdevInterval = Math.sqrt(avg(intervals.map(i => (i - avgInterval) ** 2))) || 0;

  const durationMs = s[s.length-1].timeMs - s[0].timeMs;
  const nps = s.length / Math.max(1, durationMs / 1000);

  // SPEED
  const speedScore = norm(nps, config.arpNpsMin, config.arpNpsMax);

  // RANGE
  const pitches = s.map(n => n.midi);
  const globalRange = Math.max(...pitches) - Math.min(...pitches);
  const rangeScore = norm(globalRange, config.arpRangeMin, config.arpRangeMax);

  // BIG JUMPS & ZIGZAG
  let jumps = 0;
  let zig = 0;

  for (let i = 1; i < intervals.length; i++) {
    const iv = intervals[i];
    if (iv >= config.arpJumpSmall) jumps++;
    if (iv >= config.arpJumpLarge) jumps++;

    if (i < intervals.length - 1) {
      if ((intervals[i] > 0 && intervals[i+1] < 0) ||
          (intervals[i] < 0 && intervals[i+1] > 0))
        zig++;
    }
  }

  const jumpFactor = norm(jumps / (durationMs / 1000), 0.2, 2) * config.arpJumpWeight;
  const zigFactor = norm(zig / (durationMs / 1000), 0.2, 1.5) * config.arpZigzagWeight;

  // CONSISTENCY NERF
  const consistency = norm(20 - stdevInterval, 0, 20);
  const consistencyNerf = consistency * config.arpConsistencyWeight;

  let virt =
      speedScore * config.arpSpeedWeight +
      rangeScore * config.arpRangeWeight +
      (jumpFactor + zigFactor) * config.arpJumpZigzagWeight +
      consistency * 0.10;

  virt *= (1 - consistencyNerf);
  return Math.min(1, Math.max(0, virt));
}

// ============================================================
// METRIC: TRILL / TREMOLO
// ============================================================
function detectTrillTremolo(notes: MidiNotePlaybackItem[], config: AnalysisConfig) {
  if (notes.length < 8) return { trillRatio: 0 };

  const s = [...notes].sort((a, b) => a.timeMs - b.timeMs);
  const intervals = s.slice(1).map((n, i) => n.midi - s[i].midi);
  const gaps = s.slice(1).map((n, i) => n.timeMs - s[i].timeMs);

  let alt = 0;

  for (let i = 2; i < intervals.length; i++) {
    const a = intervals[i - 1];
    const b = intervals[i];
    const g = gaps[i];

    if (Math.abs(a) <= config.trillMaxInterval && Math.abs(b) <= config.trillMaxInterval && a * b < 0 && g > 0 && g < config.trillMaxGap)
      alt++;
  }

  return { trillRatio: +norm(alt / notes.length, config.trillNormMin, config.trillNormMax).toFixed(3) };
}

// ============================================================
// DIFFICULTY LEVEL CALCULATION
// ============================================================
function calculateDifficultyLevels(performanceScore: number): { difficultyLevel: number, starLevel: number } {
    let difficultyLevel = 1;
    if (performanceScore < 200)
      difficultyLevel = 1 + norm(performanceScore, 1, 200) * 3;
    else if (performanceScore < 600)
      difficultyLevel = 4 + norm(performanceScore, 200, 600) * 3;
    else if (performanceScore < 1200)
      difficultyLevel = 7 + norm(performanceScore, 600, 1200) * 3.6;
    else if (performanceScore < 2000)
      difficultyLevel = 10 + norm(performanceScore, 1200, 2000) * 2.9;
    else if (performanceScore < 4000)
      difficultyLevel = 13 + norm(performanceScore, 2000, 100000) * 4;
  
    const starLevel = Math.max(1, difficultyLevel);
    return {
        difficultyLevel: +difficultyLevel.toFixed(2),
        starLevel: +starLevel.toFixed(1)
    };
}


// ============================================================
// CHUNK ANALYSIS (original analyzeMidi)
// ============================================================
function _analyzeMidiChunk(
  notes: MidiNotePlaybackItem[],
  totalDurationMs: number,
  config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG
): ExtendedResult | null {
  if (!notes.length || totalDurationMs <= 500) return null;

  const durationSec = totalDurationMs / 1000;

  const { density, polyphony, chordNps, peakDensity, localDensity } =
    getMetrics(notes, totalDurationMs, config);

  const avgDensity = avg(localDensity);

  const { abstractness, repetitiveness, timingVariance, gaps } =
    detectPatternComplexity(notes, config);

  const intervalComplexity = getIntervalComplexity(notes, config);
  const chordMobilityScore = getChordMobility(notes, config);
  const effort = getEffortIntensity(notes, config);
  const range = getRangeScore(notes, config);
  const arpeggioVirtuosity = getArpeggioVirtuosity(notes, config);

  const { trillRatio } = detectTrillTremolo(notes, config);

  const nps = notes.length / durationSec;

  const nps_score = norm(nps, config.npsNormMin, config.npsNormMax);
  const density_score = norm(density, config.densityMinNorm, config.densityMaxNorm);

  // COMPONENTS
  const speed_component =
    (nps_score * config.weightSpeedNps) +
    (density_score * config.weightSpeedDensity) +
    (effort * config.weightSpeedEffort);

  const polyphony_score = norm(polyphony, config.polyphonyNormMin, config.polyphonyNormMax);

  const complexity_component =
    (polyphony_score * config.weightCompPolyphony) +
    (abstractness * config.weightCompAbstract) +
    (intervalComplexity * config.weightCompInterval) +
    (chordMobilityScore * config.weightCompChordMobility) +
    (range * config.weightCompRange);

  const duration_factor = norm(durationSec, config.durationNormMin, config.durationNormMax);
  const stamina_component = duration_factor * effort;

  // FINAL DIFFICULTY
  let combined =
    (speed_component * config.finalWeightSpeed) +
    (complexity_component * config.finalWeightComplexity) +
    (arpeggioVirtuosity * config.finalWeightArpeggio);

  combined *= (1 - (repetitiveness * config.penaltyRepetition + (trillRatio as number) * config.penaltyTrill));
  combined *= (1 + stamina_component * config.bonusStamina);

  const expFactor = config.expFactor;
  const scale = config.scale;
  const base = config.base;

  const performanceScore = Math.round(
    Math.pow(Math.exp(combined * expFactor) - base, 0.5) * scale
  );

  const { difficultyLevel, starLevel } = calculateDifficultyLevels(performanceScore);

  // BUILD OUTPUT
  const analysis: AnalysisResult = {
    difficultyLevel,
    performanceScore,
    parameters: {
      density: +density.toFixed(2),
      patternComplexity: +abstractness.toFixed(2),
      physicalEffort: +effort.toFixed(2),
      rangeIntensity: +range.toFixed(2),
      chordMobility: +chordMobilityScore.toFixed(2),
      arpeggioRepetition: +(1 - repetitiveness).toFixed(2),
      arpeggioVirtuosity: +arpeggioVirtuosity.toFixed(2),
      totalNps: +nps.toFixed(2),
      polyphony: +polyphony.toFixed(2),
      chordNps: +chordNps.toFixed(2),
      chordPower: +((polyphony_score * speed_component) * 7.5).toFixed(2),
      chordPowerIndex: +(1).toFixed(2),
      patternRepPenalty: +repetitiveness.toFixed(2),
      trillRatio: +((trillRatio as number) || 0).toFixed(2),
      starLevel,
    },
  };

  // META
  const pitches = notes.map(n => n.midi);
  const highestNote = pitches.length ? Math.max(...pitches) : 0;
  const lowestNote = pitches.length ? Math.min(...pitches) : 0;
  const gapAvg = avg(gaps);
  const gapVar = Math.sqrt(avg(gaps.map(g => (g - gapAvg) ** 2)));

  const burstThreshold = avgDensity * 1.8 + 2;
  let burstSections = 0;
  let inBurst = false;
  for (const ld of localDensity) {
    if (ld > burstThreshold && !inBurst) {
      burstSections++;
      inBurst = true;
    } else if (ld <= burstThreshold) {
      inBurst = false;
    }
  }

  const meta = {
    durationSec: +durationSec.toFixed(2),
    totalNotes: notes.length,
    highestNote,
    lowestNote,
    avgGapMs: +gapAvg.toFixed(2),
    gapVariance: +gapVar.toFixed(2),
    irregularityIndex: +timingVariance.toFixed(2),
    burstSections,
    peakSpeedNps: +peakDensity.toFixed(2),
    avgVirtuosityIndex: +arpeggioVirtuosity.toFixed(2),
    tempoDeviation: undefined,
    arpeggioRate: undefined,
  };

  return {
    ...analysis,
    meta
  };
}

// ============================================================
// MAIN ANALYSIS (with chunking logic)
// ============================================================
export function analyzeMidi(
    notes: MidiNotePlaybackItem[],
    totalDurationMs: number,
    config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG
): ExtendedResult | null {
    if (!notes.length || totalDurationMs <= 500) return null;

    const CHUNK_DURATION_MS = 60 * 1000; // 1 minute
    const MIN_NOTES_FOR_ANALYSIS = 15; // Require at least 15 notes for a meaningful chunk analysis

    // Normalize notes to start from t=0 for easier chunking
    const sortedNotes = [...notes].sort((a,b) => a.timeMs - b.timeMs);
    const songStartTime = sortedNotes.length > 0 ? sortedNotes[0].timeMs : 0;
    const normalizedNotes = sortedNotes.map(n => ({...n, timeMs: n.timeMs - songStartTime}));
    const normalizedDuration = totalDurationMs - songStartTime;

    // If song is short, analyze the whole thing as one chunk.
    if (normalizedDuration <= CHUNK_DURATION_MS * 1.5) { // Use a threshold to avoid splitting a short song
        return _analyzeMidiChunk(normalizedNotes, normalizedDuration, config);
    }

    const chunkAnalyses: ExtendedResult[] = [];

    for (let startTime = 0; startTime < normalizedDuration; startTime += CHUNK_DURATION_MS) {
        const endTime = startTime + CHUNK_DURATION_MS;
        const chunkNotes = normalizedNotes.filter(n => n.timeMs >= startTime && n.timeMs < endTime);
        
        if (chunkNotes.length > MIN_NOTES_FOR_ANALYSIS) { 
            // Make note times relative to the chunk's start time
            const relativeChunkNotes = chunkNotes.map(n => ({ ...n, timeMs: n.timeMs - startTime }));
            
            // The last chunk might be shorter
            const chunkDuration = Math.min(CHUNK_DURATION_MS, normalizedDuration - startTime);
            const analysis = _analyzeMidiChunk(relativeChunkNotes, chunkDuration, config);
            
            if (analysis) {
                chunkAnalyses.push(analysis);
            }
        }
    }

    if (chunkAnalyses.length === 0) {
        // Fallback if no valid chunks were found (e.g., very sparse song)
        return _analyzeMidiChunk(normalizedNotes, normalizedDuration, config);
    }
    
    if (chunkAnalyses.length === 1) {
        // If only one chunk was generated, return its analysis
        return chunkAnalyses[0];
    }

    // Find the hardest chunk based on performanceScore
    let hardestChunkAnalysis = chunkAnalyses[0];
    let maxScore = hardestChunkAnalysis.performanceScore;
    let maxScoreIndex = 0;
    for(let i = 1; i < chunkAnalyses.length; i++) {
        if(chunkAnalyses[i].performanceScore > maxScore) {
            maxScore = chunkAnalyses[i].performanceScore;
            hardestChunkAnalysis = chunkAnalyses[i];
            maxScoreIndex = i;
        }
    }

    // Calculate average score of the other chunks
    const otherScores = chunkAnalyses
        .filter((_, index) => index !== maxScoreIndex)
        .map(a => a.performanceScore);
        
    const avgOtherScores = otherScores.length > 0 ? avg(otherScores) : maxScore; 

    // Calculate the final weighted score
    const finalPerformanceScore = Math.round(maxScore * 0.9 + avgOtherScores * 0.2);
    
    // Recalculate levels based on the new final score
    const { difficultyLevel, starLevel } = calculateDifficultyLevels(finalPerformanceScore);

    // Get meta stats for the whole song by running a one-off analysis
    const wholeSongMeta = _analyzeMidiChunk(normalizedNotes, normalizedDuration, config)?.meta;

    // Create a final result object.
    // Use parameters from the hardest chunk, but override the main scores and meta.
    const finalResult: ExtendedResult = {
        ...hardestChunkAnalysis,
        performanceScore: finalPerformanceScore,
        difficultyLevel: difficultyLevel,
        parameters: {
            ...hardestChunkAnalysis.parameters,
            starLevel: starLevel,
        },
        meta: wholeSongMeta || hardestChunkAnalysis.meta, // Prioritize whole-song meta
    };

    return finalResult;
}
