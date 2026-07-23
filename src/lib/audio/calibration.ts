export interface CalibrationSample {
  elapsedSeconds: number;
  rms: number;
}

interface CalibrationOptions {
  durationSeconds?: number;
  signal?: AbortSignal;
  onSample?: (sample: CalibrationSample) => void;
}

export async function calibrateMicrophone(options: CalibrationOptions = {}): Promise<{ baselineRms: number; targetRms: number }> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot access a microphone.");
  const durationSeconds = options.durationSeconds ?? 10;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
  } catch (error) {
    if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
      throw new Error("Microphone access is blocked. Allow it in this site’s browser settings, then try again.");
    }
    if (error instanceof DOMException && error.name === "NotFoundError") throw new Error("No microphone was found. Connect one and try again.");
    throw new Error("The microphone could not start. Close other apps using it, then retry.");
  }

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("Web Audio calibration is unavailable in this browser.");
  }
  const context = new AudioContextConstructor();
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.25;
  context.createMediaStreamSource(stream).connect(analyser);
  const buffer = new Float32Array(analyser.fftSize);
  const samples: number[] = [];
  const startedAt = performance.now();

  try {
    return await new Promise((resolve, reject) => {
      let frame = 0;
      const stop = () => {
        cancelAnimationFrame(frame);
        reject(new DOMException("Calibration stopped.", "AbortError"));
      };
      options.signal?.addEventListener("abort", stop, { once: true });
      const measure = () => {
        if (options.signal?.aborted) return;
        analyser.getFloatTimeDomainData(buffer);
        let squares = 0;
        for (const value of buffer) squares += value * value;
        const rms = Math.sqrt(squares / buffer.length);
        const elapsedSeconds = (performance.now() - startedAt) / 1000;
        if (rms > 0.002) samples.push(rms);
        options.onSample?.({ elapsedSeconds, rms });
        if (elapsedSeconds >= durationSeconds) {
          options.signal?.removeEventListener("abort", stop);
          const sorted = samples.sort((left, right) => left - right);
          if (!sorted.length) {
            reject(new Error("No voice was detected. Speak throughout the calibration and try again."));
            return;
          }
          const useful = sorted.slice(Math.floor(sorted.length * 0.2));
          const baselineRms = useful.reduce((sum, value) => sum + value, 0) / useful.length;
          resolve({ baselineRms, targetRms: Math.min(1, baselineRms * 1.67) });
          return;
        }
        frame = requestAnimationFrame(measure);
      };
      frame = requestAnimationFrame(measure);
    });
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    await context.close().catch(() => undefined);
  }
}

