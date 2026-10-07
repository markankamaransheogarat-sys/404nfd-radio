// Generates looping radio-static noise entirely in the browser via Web Audio API — no audio
// file, no licensing, nothing YouTube-related. Plays while nothing is queued/playing, so the
// station never goes dead silent between tracks (the whole point of a "live radio" feel).

// Shared with getLevels() below, which zooms the visualizer into exactly this band instead of
// the full spectrum — a Q this narrow leaves everything outside it permanently silent.
const FILTER_FREQ = 2200;
const FILTER_Q = 0.6;

let ctx: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let targetVolume = 1;

function ensureContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    gainNode = ctx.createGain();
    gainNode.gain.value = targetVolume * 0.15; // static reads as "loud" fast; keep it subdued
    // Tapped for the "no signal" visualizer — this is real synthesized audio (unlike the actual
    // music, which plays through a cross-origin YouTube iframe we can't analyse), so the bars
    // it drives are an honest reading, not a fake animation.
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    gainNode.connect(analyser);
    analyser.connect(ctx.destination);
  }
  return ctx;
}

function buildNoiseBuffer(context: AudioContext): AudioBuffer {
  const seconds = 2;
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export const staticNoise = {
  play(): void {
    const context = ensureContext();
    if (source) return; // already playing

    const bufferSource = context.createBufferSource();
    bufferSource.buffer = buildNoiseBuffer(context);
    bufferSource.loop = true;

    // Band-pass shapes plain white noise into something closer to AM radio hiss/crackle.
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = FILTER_FREQ;
    filter.Q.value = FILTER_Q;

    bufferSource.connect(filter);
    filter.connect(gainNode!);
    bufferSource.start();
    source = bufferSource;

    void context.resume();
  },

  stop(): void {
    source?.stop();
    source = null;
  },

  setVolume(v: number): void {
    targetVolume = Math.max(0, Math.min(1, v));
    if (gainNode) gainNode.gain.value = targetVolume * 0.15;
  },

  isPlaying(): boolean {
    return source !== null;
  },

  /** Real frequency-bucket levels (0..1) from the noise graph, bucketed to `barCount` bars —
   * all zero when nothing is actually playing yet, rather than faking motion. */
  getLevels(barCount: number): number[] {
    if (!analyser || !ctx || !source) return new Array(barCount).fill(0);
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    // The bandpass filter crams all the energy into a narrow band around FILTER_FREQ — bucketing
    // the full 0..nyquist spectrum across the bars would leave most of them permanently flat.
    // Zoom into just that band so every bar reflects real, moving signal.
    const binHz = ctx.sampleRate / analyser.fftSize;
    const centerBin = Math.round(FILTER_FREQ / binHz);
    const spanBins = Math.max(barCount, Math.round((FILTER_FREQ / FILTER_Q) / binHz));
    const startBin = Math.max(0, centerBin - Math.floor(spanBins / 2));
    const slice = data.slice(startBin, Math.min(data.length, startBin + spanBins));

    const bucketSize = Math.max(1, Math.floor(slice.length / barCount));
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < bucketSize; j++) sum += slice[i * bucketSize + j] ?? 0;
      bars.push(sum / bucketSize / 255);
    }
    return bars;
  },
};
