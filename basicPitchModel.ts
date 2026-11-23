// ==================================================================================
// Loads the Basic Pitch note model (Spotify, Apache-2.0, ~0.9 MB) with TensorFlow.js.
//
//   * Everything is imported lazily: nothing here is downloaded until the microphone
//     is switched on, and the main bundle does not grow.
//   * The first time, the model is fetched from /models/basic-pitch/ and saved into the
//     browser (IndexedDB). After that it is read from there, also offline.
//   * It only runs on the GPU (WebGL), where it does not block the page. Without WebGL,
//     or on a device where one run takes too long for a live job, nothing is loaded and
//     the app keeps working with the built-in signal detector.
//   * Any failure (private mode, blocked storage, old browser) also just returns null.
// ==================================================================================

export interface BasicPitchOutput {
  /** frames x pitches, 172 x 88 flattened: how strongly each key is sounding. */
  frames: Float32Array;
  /** frames x pitches, 172 x 88 flattened: how likely a new note starts. */
  onsets: Float32Array;
}

export type InferWindow = (audio: Float32Array) => Promise<BasicPitchOutput>;

export interface InferenceHandle {
  infer: InferWindow;
  backend: string;
  /** Duration of one timed run on this device, in ms. */
  inferMs: number;
  /** True when the model came from the browser's own storage (no download). */
  fromCache: boolean;
  dispose: () => void;
}

export const BASIC_PITCH_WINDOW_SAMPLES = 43844; // 2 s at 22.05 kHz, minus one hop
const DEFAULT_MODEL_URL = '/models/basic-pitch/model.json';
const STORE_KEY = 'indexeddb://octavia-basic-pitch-v1';

export type ModelStatus = 'downloading' | 'ready' | 'failed';

export async function loadBasicPitchInference(
  options: { modelUrl?: string; onStatus?: (s: ModelStatus) => void; maxInferMs?: number } = {}
): Promise<InferenceHandle | null> {
  const { modelUrl = DEFAULT_MODEL_URL, onStatus, maxInferMs = 700 } = options;
  try {
    const core = await import('@tensorflow/tfjs-core');
    await import('@tensorflow/tfjs-backend-cpu');
    await import('@tensorflow/tfjs-backend-webgl');
    const converter = await import('@tensorflow/tfjs-converter');

    const webglOk = await core.setBackend('webgl').catch(() => false);
    if (!webglOk) throw new Error('WebGL is not available');
    await core.ready();

    let fromCache = false;
    let model: import('@tensorflow/tfjs-converter').GraphModel;
    try {
      model = await converter.loadGraphModel(STORE_KEY);
      fromCache = true;
    } catch {
      onStatus?.('downloading');
      model = await converter.loadGraphModel(modelUrl);
      try {
        await model.save(STORE_KEY);
      } catch {
        // Storage can be unavailable (private window, quota): then it is simply fetched again next time.
      }
    }

    const infer: InferWindow = async (audio) => {
      const input = core.tensor3d(audio, [1, BASIC_PITCH_WINDOW_SAMPLES, 1]);
      let outputs: import('@tensorflow/tfjs-core').Tensor[] = [];
      try {
        outputs = model.execute(input, ['Identity_1', 'Identity_2']) as import('@tensorflow/tfjs-core').Tensor[];
        const [frames, onsets] = await Promise.all(outputs.map((o) => o.data()));
        return { frames: frames as Float32Array, onsets: onsets as Float32Array };
      } finally {
        input.dispose();
        outputs.forEach((o) => o.dispose());
      }
    };

    // The first run compiles the GPU programs (can take a second); the second shows the real speed.
    // If that is too slow for a live job, do not use the model on this device at all.
    const silence = new Float32Array(BASIC_PITCH_WINDOW_SAMPLES);
    await infer(silence);
    const started = performance.now();
    await infer(silence);
    const inferMs = performance.now() - started;
    if (inferMs > maxInferMs) {
      model.dispose();
      throw new Error(`Too slow on this device (${Math.round(inferMs)} ms per run)`);
    }

    onStatus?.('ready');
    return { infer, backend: core.getBackend(), inferMs, fromCache, dispose: () => model.dispose() };
  } catch (error) {
    console.warn('Basic Pitch model unavailable, using the built-in detector only:', error);
    onStatus?.('failed');
    return null;
  }
}
