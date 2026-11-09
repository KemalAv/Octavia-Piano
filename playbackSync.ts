import {INITIAL_PLAYBACK_DELAY_MS} from './midiParser';

export const tempoRate = (rate: number) =>
  Math.max(0.1, Math.min(4, Number.isFinite(rate) ? rate : 1));

// Song offset belongs to source track time. User audio offset & hardware output latency are physical wall-clock ms.
export function backingPlayheadMs(
  songTimeMs: number,
  rate: number,
  songOffsetMs = 0,
  userOffsetMs = 0,
  outputLatencyMs = 0,
) {
  const r = tempoRate(rate);
  return (
    songTimeMs -
    INITIAL_PLAYBACK_DELAY_MS +
    songOffsetMs +
    (userOffsetMs + outputLatencyMs) * r
  );
}

export function noteInputOffsetMs(
  noteTimeMs: number,
  inputTimeMs: number,
  rate: number,
  noteOffsetMs: number,
) {
  return (noteTimeMs - inputTimeMs) / tempoRate(rate) - noteOffsetMs;
}

export function measuredOutputLatencyMs(
  context: AudioContext | null,
  _now = performance.now(),
): number {
  if (!context) return 0;
  // Use stable hardware/context properties rather than fluctuating main-thread performance.now() deltas.
  // On mobile/tablet, getOutputTimestamp() compared against performance.now() spikes during UI renders
  // and returns 0 when waking from standby, causing start-of-MIDI vs mid-MIDI offset jumps.
  const outLat = (context as any).outputLatency;
  const baseLat = context.baseLatency;
  if (typeof outLat === 'number' && Number.isFinite(outLat) && outLat > 0) {
    return Math.max(0, Math.min(1000, outLat * 1000));
  }
  const stamp = context.getOutputTimestamp?.();
  if (
    stamp?.contextTime &&
    context.currentTime > stamp.contextTime &&
    context.currentTime - stamp.contextTime < 1.0
  ) {
    return Math.max(0, Math.min(1000, (context.currentTime - stamp.contextTime) * 1000));
  }
  return Math.max(0, Math.min(1000, (baseLat || 0) * 1000));
}

const warmAudioContexts = new WeakSet<AudioContext>();

/**
 * Keeps the AudioContext hardware pipeline continuously active (warm) so mobile/tablet
 * OS audio HALs (Android AudioFlinger / iOS CoreAudio) never enter standby during pause,
 * stop, or the 2-second intro pre-roll before the backing track begins.
 */
export function ensureAudioContextWarm(context: AudioContext | null): void {
  if (!context || warmAudioContexts.has(context)) return;
  try {
    const sr = context.sampleRate || 44100;
    const silentBuffer = context.createBuffer(1, sr, sr);
    const data = silentBuffer.getChannelData(0);
    // Sub-audible DC-free dither (+/- 1e-9) prevents mobile DSP auto-mute/standby
    for (let i = 0; i < data.length; i++) {
      data[i] = i & 1 ? 1e-9 : -1e-9;
    }
    const source = context.createBufferSource();
    source.buffer = silentBuffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.value = 1.0;
    source.connect(gain);
    gain.connect(context.destination);
    source.start(0);
    warmAudioContexts.add(context);
  } catch {
    // Ignore if context is not ready yet
  }
}

export function backingCorrection(
  actualSec: number,
  expectedSec: number,
  rate: number,
  lastCorrectionMs: number,
  nowMs: number,
) {
  const r = tempoRate(rate),
    realDrift = (actualSec - expectedSec) / r;
  const absDrift = Math.abs(realDrift);

  if (
    (absDrift > 1.2 || (actualSec < 0.05 && expectedSec > 1.5)) &&
    nowMs - lastCorrectionMs > 2000
  ) {
    return {seek: Math.max(0, expectedSec), rate: r};
  }

  let speedMultiplier = 1.0;
  if (absDrift > 0.25) {
    speedMultiplier = realDrift > 0 ? 0.96 : 1.04;
  } else if (absDrift > 0.08) {
    speedMultiplier = realDrift > 0 ? 0.98 : 1.02;
  } else if (absDrift > 0.03) {
    speedMultiplier = realDrift > 0 ? 0.992 : 1.008;
  }

  return {seek: undefined, rate: tempoRate(r * speedMultiplier)};
}

export function routeLocalBackingAudio(
  audio: HTMLAudioElement,
  context: AudioContext | null,
  nodes: WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>,
  origin: string,
  destination?: AudioNode | null,
): boolean {
  if (!context) return false;
  if (nodes.has(audio)) return true;
  const src = audio.currentSrc || audio.src;
  if (!src) return false;
  try {
    const url = new URL(src, origin);
    if (
      url.protocol !== 'blob:' &&
      url.protocol !== 'data:' &&
      url.origin !== new URL(origin).origin
    )
      return false;
    const node = context.createMediaElementSource(audio);
    node.connect(destination || context.destination);
    nodes.set(audio, node);
    return true;
  } catch {
    return false;
  }
}

const WSOLA_WINDOW_SIZE = 2048;
const WSOLA_HOP_SIZE = 1024;
const WSOLA_SEARCH_RADIUS = 384;
const WSOLA_CHUNK_HOPS = 128; // 131,072 samples (~2.7s - 3.0s per native AudioBuffer chunk)
const WSOLA_CHUNK_SAMPLES = WSOLA_CHUNK_HOPS * WSOLA_HOP_SIZE;
const WSOLA_LOOKAHEAD_CHUNKS = 3; // Keep ~8.5s scheduled ahead on C++ audio thread
const IMMEDIATE_SCHEDULE_LEAD_SEC = 0.008; // 8ms lead so source.start(when) is always in the future

const HANN_WINDOW = (() => {
  const w = new Float32Array(WSOLA_WINDOW_SIZE);
  for (let i = 0; i < WSOLA_WINDOW_SIZE; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / WSOLA_WINDOW_SIZE));
  }
  return w;
})();

/**
 * Low-latency Web Audio API backing track player that plays decoded AudioBuffers
 * directly on the AudioContext C++ hardware thread (bypassing HTMLAudioElement's mobile OS deep buffer
 * and bypassing deprecated main-thread ScriptProcessorNode).
 * - At 1.0x tempo: uses a single native AudioBufferSourceNode with sample-accurate hardware scheduling.
 * - At non-1.0x tempo: uses phase-aligned WSOLA (Waveform Similarity Overlap-Add) synthesized into
 *   seamless native AudioBuffer chunks scheduled on the C++ AudioBufferSourceNode timeline, with
 *   exact Hann-window center compensation (0.00ms phase shift at 0.5x/0.75x/1.25x/1.5x) and
 *   tempo-invariant physical wall-clock offset handling.
 */
export class WebAudioBackingPlayer {
  private sourceNode: AudioBufferSourceNode | null = null;
  private scheduledChunkNodes: Set<AudioBufferSourceNode> = new Set();
  private chunkSchedulerTimer: ReturnType<typeof setInterval> | null = null;
  private context: AudioContext | null = null;
  private destination: AudioNode | null = null;
  private buffer: AudioBuffer | null = null;
  private playing = false;
  private rate = 1.0;

  // Musical track anchor (excluding wall-clock user offset) and physical wall-clock advance are stored
  // separately so changing tempo (e.g. 1.0x -> 0.5x) never distorts the user's physical ms offset.
  private anchorContextTime = 0;
  private baseTrackSec = 0;
  private wallAdvanceSec = 0;

  // WSOLA streaming chunk state
  private outBufL = new Float32Array(WSOLA_WINDOW_SIZE);
  private outBufR = new Float32Array(WSOLA_WINDOW_SIZE);
  private currentTrackSamples = 0;
  private prevChosenSample = -1;
  private nextChunkStartCtxTime = 0;

  public isPlaying(): boolean {
    return this.playing;
  }

  private getTrackSecAtContextTime(ctxTime: number): number {
    const elapsedWallSec = ctxTime - this.anchorContextTime + this.wallAdvanceSec;
    return this.baseTrackSec + elapsedWallSec * this.rate;
  }

  public getCurrentTrackTimeSec(): number {
    if (!this.playing || !this.context) {
      return Math.max(0, this.baseTrackSec + this.wallAdvanceSec * this.rate);
    }
    return Math.max(0, this.getTrackSecAtContextTime(this.context.currentTime));
  }

  public stop(): void {
    this.playing = false;
    if (this.chunkSchedulerTimer !== null) {
      clearInterval(this.chunkSchedulerTimer);
      this.chunkSchedulerTimer = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null;
        this.sourceNode.stop();
      } catch {}
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    if (this.scheduledChunkNodes.size > 0) {
      this.scheduledChunkNodes.forEach((node) => {
        try {
          node.onended = null;
          node.stop();
        } catch {}
        try {
          node.disconnect();
        } catch {}
      });
      this.scheduledChunkNodes.clear();
    }
  }

  /**
   * Starts synchronized playback on the AudioContext hardware clock.
   * Can be called either with explicit musical + wall-clock offsets via `playSynced`,
   * or with the legacy `(context, destination, buffer, initialTrackSec, startDelayWallSec, rate, wallAdvanceSec?, anchorCtxTime?)` signature.
   */
  public play(
    context: AudioContext,
    destination: AudioNode,
    buffer: AudioBuffer,
    initialTrackSec: number,
    startDelayWallSec: number,
    rate: number,
    wallAdvanceSec: number = 0,
    anchorCtxTime?: number,
  ): void {
    this.stop();
    ensureAudioContextWarm(context);
    this.context = context;
    this.destination = destination;
    this.buffer = buffer;
    this.rate = tempoRate(rate);
    this.anchorContextTime =
      anchorCtxTime !== undefined ? anchorCtxTime : context.currentTime;
    this.wallAdvanceSec = Number.isFinite(wallAdvanceSec) ? wallAdvanceSec : 0;

    // Unified virtual track time at anchorContextTime (including wallAdvanceSec):
    const combinedInitialTrackSec =
      startDelayWallSec > 0
        ? -startDelayWallSec * this.rate
        : Math.max(0, initialTrackSec);

    // Separate pure musical track time from physical wall-clock offset so setRate() keeps wallAdvanceSec invariant
    this.baseTrackSec = combinedInitialTrackSec - this.wallAdvanceSec * this.rate;
    this.playing = true;
    this.startInternalNode();
  }

  public setRate(newRate: number): void {
    const clamped = tempoRate(newRate);
    if (Math.abs(clamped - this.rate) < 0.001) return;
    if (!this.playing || !this.context || !this.destination || !this.buffer) {
      this.rate = clamped;
      return;
    }
    const nowCtx = this.context.currentTime;
    // Advance pure musical track position up to nowCtx at the old rate, preserving wallAdvanceSec unchanged!
    this.baseTrackSec =
      this.baseTrackSec + (nowCtx - this.anchorContextTime) * this.rate;
    this.anchorContextTime = nowCtx;
    this.rate = clamped;
    this.startInternalNode();
  }

  private clearActiveNodesOnly(): void {
    if (this.chunkSchedulerTimer !== null) {
      clearInterval(this.chunkSchedulerTimer);
      this.chunkSchedulerTimer = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null;
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    if (this.scheduledChunkNodes.size > 0) {
      this.scheduledChunkNodes.forEach((node) => {
        try {
          node.onended = null;
          node.stop();
          node.disconnect();
        } catch {}
      });
      this.scheduledChunkNodes.clear();
    }
  }

  private startInternalNode(): void {
    if (!this.context || !this.destination || !this.buffer || !this.playing) return;

    this.clearActiveNodesOnly();

    const nowCtx = this.context.currentTime;
    // Schedule at least IMMEDIATE_SCHEDULE_LEAD_SEC ahead of nowCtx so source.start(when) is never in the past
    // on the C++ audio rendering thread when starting from the middle of a song.
    const scheduleBaseCtx = nowCtx + IMMEDIATE_SCHEDULE_LEAD_SEC;
    const virtualTrackSecAtBase = this.getTrackSecAtContextTime(scheduleBaseCtx);

    if (virtualTrackSecAtBase >= this.buffer.duration) {
      this.playing = false;
      return;
    }

    // Exact AudioContext timestamp when audio output should begin, and exact track position at that timestamp:
    let firstAudioStartCtxTime: number;
    let startTrackSec: number;
    if (virtualTrackSecAtBase < 0) {
      const delayWallSec = -virtualTrackSecAtBase / this.rate;
      firstAudioStartCtxTime = scheduleBaseCtx + delayWallSec;
      startTrackSec = 0;
    } else {
      firstAudioStartCtxTime = scheduleBaseCtx;
      startTrackSec = virtualTrackSecAtBase;
    }

    if (Math.abs(this.rate - 1.0) < 0.005) {
      // 100% Tempo: Native C++ AudioBufferSourceNode with sample-accurate hardware start
      const source = this.context.createBufferSource();
      source.buffer = this.buffer;
      source.playbackRate.value = 1.0;
      source.connect(this.destination);
      source.start(firstAudioStartCtxTime, startTrackSec);
      source.onended = () => {
        if (this.sourceNode === source) {
          this.playing = false;
        }
      };
      this.sourceNode = source;
    } else {
      // Non-100% Tempo: Phase-aligned WSOLA Pitch-Preserving Time-Stretcher
      // Synthesized into native AudioBuffer chunks and scheduled on C++ AudioBufferSourceNode
      // with zero ScriptProcessorNode latency and exact Hann-window center alignment.
      const sampleRate = this.buffer.sampleRate;
      const ch0 = this.buffer.getChannelData(0);
      const ch1 =
        this.buffer.numberOfChannels > 1 ? this.buffer.getChannelData(1) : ch0;
      const totalSamples = this.buffer.length;

      this.outBufL.fill(0);
      this.outBufR.fill(0);
      this.prevChosenSample = -1;

      // Exact phase alignment:
      // In WSOLA overlap-add, the peak (1.0) of HANN_WINDOW is at index WSOLA_HOP_SIZE (1024).
      // By running 1 warm-up hop centered at `startSample` (targetSample = startSample - WSOLA_HOP_SIZE),
      // output sample 0 of the first chunk has unity gain at exact source sample `startSample` (0.00ms shift).
      const startSample = startTrackSec * sampleRate;
      this.currentTrackSamples = startSample - WSOLA_HOP_SIZE;
      this.synthesizeNextWsolaHop(ch0, ch1, totalSamples);

      this.nextChunkStartCtxTime = firstAudioStartCtxTime;
      this.scheduleWsolaChunksAhead();

      this.chunkSchedulerTimer = setInterval(() => {
        if (!this.playing) return;
        this.scheduleWsolaChunksAhead();
      }, 200);
    }
  }

  private scheduleWsolaChunksAhead(): void {
    if (!this.playing || !this.context || !this.destination || !this.buffer) return;

    const sampleRate = this.buffer.sampleRate;
    const chunkDurationSec = WSOLA_CHUNK_SAMPLES / sampleRate;
    const lookaheadHorizonCtx =
      Math.max(this.context.currentTime, this.nextChunkStartCtxTime - chunkDurationSec) +
      WSOLA_LOOKAHEAD_CHUNKS * chunkDurationSec;

    const ch0 = this.buffer.getChannelData(0);
    const ch1 =
      this.buffer.numberOfChannels > 1 ? this.buffer.getChannelData(1) : ch0;
    const totalSamples = this.buffer.length;
    const numChannels = this.buffer.numberOfChannels > 1 ? 2 : 1;

    while (
      this.playing &&
      this.scheduledChunkNodes.size < WSOLA_LOOKAHEAD_CHUNKS + 1 &&
      this.nextChunkStartCtxTime < lookaheadHorizonCtx
    ) {
      if (this.currentTrackSamples - WSOLA_HOP_SIZE >= totalSamples) {
        if (this.scheduledChunkNodes.size === 0) {
          this.playing = false;
        }
        break;
      }

      const chunkBuffer = this.context.createBuffer(
        numChannels,
        WSOLA_CHUNK_SAMPLES,
        sampleRate,
      );
      const outL = chunkBuffer.getChannelData(0);
      const outR = numChannels > 1 ? chunkBuffer.getChannelData(1) : outL;

      let validSamples = 0;
      for (let hop = 0; hop < WSOLA_CHUNK_HOPS; hop++) {
        if (this.currentTrackSamples - WSOLA_HOP_SIZE >= totalSamples) {
          break;
        }
        this.synthesizeNextWsolaHop(ch0, ch1, totalSamples);
        const dstOffset = hop * WSOLA_HOP_SIZE;
        for (let i = 0; i < WSOLA_HOP_SIZE; i++) {
          outL[dstOffset + i] = this.outBufL[i];
        }
        if (numChannels > 1) {
          for (let i = 0; i < WSOLA_HOP_SIZE; i++) {
            outR[dstOffset + i] = this.outBufR[i];
          }
        }
        validSamples += WSOLA_HOP_SIZE;
      }

      if (validSamples === 0) {
        if (this.scheduledChunkNodes.size === 0) {
          this.playing = false;
        }
        break;
      }

      const node = this.context.createBufferSource();
      node.buffer = chunkBuffer;
      node.playbackRate.value = 1.0;
      node.connect(this.destination);

      const startAt = this.nextChunkStartCtxTime;
      const playDurationSec = validSamples / sampleRate;
      this.nextChunkStartCtxTime += playDurationSec;

      this.scheduledChunkNodes.add(node);
      node.onended = () => {
        this.scheduledChunkNodes.delete(node);
        try {
          node.disconnect();
        } catch {}
        if (
          this.playing &&
          this.scheduledChunkNodes.size === 0 &&
          this.currentTrackSamples - WSOLA_HOP_SIZE >= totalSamples
        ) {
          this.playing = false;
          if (this.chunkSchedulerTimer !== null) {
            clearInterval(this.chunkSchedulerTimer);
            this.chunkSchedulerTimer = null;
          }
        } else if (this.playing) {
          this.scheduleWsolaChunksAhead();
        }
      };

      node.start(startAt, 0, playDurationSec);
    }
  }

  private synthesizeNextWsolaHop(
    ch0: Float32Array,
    ch1: Float32Array,
    totalSamples: number,
  ): void {
    // Shift upper half of overlap-add buffer down to lower half
    this.outBufL.copyWithin(0, WSOLA_HOP_SIZE, WSOLA_WINDOW_SIZE);
    this.outBufL.fill(0, WSOLA_HOP_SIZE, WSOLA_WINDOW_SIZE);
    this.outBufR.copyWithin(0, WSOLA_HOP_SIZE, WSOLA_WINDOW_SIZE);
    this.outBufR.fill(0, WSOLA_HOP_SIZE, WSOLA_WINDOW_SIZE);

    const targetSample = Math.round(this.currentTrackSamples);
    this.currentTrackSamples += WSOLA_HOP_SIZE * this.rate;

    if (targetSample >= totalSamples || targetSample + WSOLA_WINDOW_SIZE <= 0) {
      this.prevChosenSample = -1;
      return;
    }

    let bestOffset = 0;
    const naturalNext = this.prevChosenSample + WSOLA_HOP_SIZE;
    if (
      this.prevChosenSample >= 0 &&
      naturalNext >= 0 &&
      naturalNext + 512 < totalSamples &&
      targetSample - WSOLA_SEARCH_RADIUS >= 0 &&
      targetSample + WSOLA_SEARCH_RADIUS + 512 < totalSamples
    ) {
      let bestCorr = -Infinity;
      for (let d = -WSOLA_SEARCH_RADIUS; d <= WSOLA_SEARCH_RADIUS; d += 4) {
        const cand = targetSample + d;
        let corr = 0;
        let norm = 1e-7;
        for (let k = 0; k < 512; k += 4) {
          const a = ch0[naturalNext + k];
          const b = ch0[cand + k];
          corr += a * b;
          norm += b * b;
        }
        const score = corr / Math.sqrt(norm);
        if (score > bestCorr) {
          bestCorr = score;
          bestOffset = d;
        }
      }
    }

    const chosen = targetSample + bestOffset;
    this.prevChosenSample = chosen;

    for (let i = 0; i < WSOLA_WINDOW_SIZE; i++) {
      const idx = chosen + i;
      if (idx >= 0 && idx < totalSamples) {
        const w = HANN_WINDOW[i];
        this.outBufL[i] += ch0[idx] * w;
        this.outBufR[i] += ch1[idx] * w;
      }
    }
  }
}
