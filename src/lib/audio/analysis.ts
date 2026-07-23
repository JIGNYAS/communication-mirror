import { getTranscriptMetrics } from "@/lib/transcript";
import type { AnalysisResult, PauseSegment, SeriesPoint, TranscriptSegment } from "@/types/coach";

interface AnalyzeOptions {
  recordedAt: number;
  transcript: string;
  transcriptSegments: TranscriptSegment[];
  fallbackDurationSeconds: number | null;
}

const TARGET_SAMPLE_RATE = 8000;
const VOLUME_WINDOW_SECONDS = 0.1;

export async function analyzeRecording(blob: Blob, options: AnalyzeOptions): Promise<AnalysisResult> {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) throw new Error("Web Audio analysis is unavailable in this browser.");
  const context = new AudioContextConstructor();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = downmixAndResample(buffer, TARGET_SAMPLE_RATE);
    const durationSeconds = buffer.duration || options.fallbackDurationSeconds || 1;
    if (!samples.length) throw new Error("No audio track was found in the saved recording.");

    const overallRms = calculateRms(samples, 0, samples.length);
    const windowSize = Math.max(1, Math.round(TARGET_SAMPLE_RATE * VOLUME_WINDOW_SECONDS));
    const rawVolume = windowedRms(samples, windowSize, TARGET_SAMPLE_RATE);
    const silenceThreshold = Math.max(0.006, overallRms * 0.2);
    const pauses = findPauses(rawVolume, silenceThreshold, VOLUME_WINDOW_SECONDS);
    const totalPauseSeconds = pauses.reduce((sum, pause) => sum + pause.duration, 0);
    const pitchSeries = await measurePitch(samples, silenceThreshold);
    const pitchValues = pitchSeries.map((point) => point.value).sort((left, right) => left - right);
    const pitchMedianHz = pitchValues.length ? percentile(pitchValues, 0.5) : null;
    const pitchStdDevHz = pitchValues.length ? standardDeviation(pitchValues) : null;
    const pitchRangeHz = pitchValues.length ? percentile(pitchValues, 0.9) - percentile(pitchValues, 0.1) : null;
    const uptalk = estimateUptalk(pitchSeries, pauses, durationSeconds);

    return {
      sourceRecordedAt: options.recordedAt,
      analyzedAt: Date.now(),
      durationSeconds,
      overallRms,
      peakRms: rawVolume.reduce((peak, point) => Math.max(peak, point.value), 0),
      volumeSeries: compressSeries(rawVolume, 180),
      pauses,
      speechRatio: Math.max(0, 1 - totalPauseSeconds / durationSeconds),
      totalPauseSeconds,
      averagePauseSeconds: pauses.length ? totalPauseSeconds / pauses.length : 0,
      pitchMedianHz,
      pitchStdDevHz,
      pitchRangeHz,
      pitchSeries: compressSeries(pitchSeries, 500),
      voicedFrames: pitchSeries.length,
      uptalkCandidates: uptalk.candidates,
      uptalkRising: uptalk.rising,
      transcript: getTranscriptMetrics(options.transcript, durationSeconds),
      paceSeries: buildPaceSeries(options.transcriptSegments, durationSeconds),
    };
  } catch (error) {
    if (error instanceof DOMException) throw new Error("This browser could not decode the recording’s audio track. Try Chrome or Edge with a new WebM recording.");
    throw error;
  } finally {
    await context.close().catch(() => undefined);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function downmixAndResample(buffer: AudioBuffer, targetRate: number): Float32Array {
  const targetLength = Math.max(1, Math.floor(buffer.duration * targetRate));
  const result = new Float32Array(targetLength);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const ratio = buffer.sampleRate / targetRate;
  for (let index = 0; index < targetLength; index += 1) {
    const sourceIndex = Math.min(channels[0].length - 1, Math.floor(index * ratio));
    let sample = 0;
    for (const channel of channels) sample += channel[sourceIndex] ?? 0;
    result[index] = sample / channels.length;
  }
  return result;
}

function calculateRms(samples: Float32Array, start: number, end: number): number {
  let squares = 0;
  for (let index = start; index < end; index += 1) squares += samples[index] * samples[index];
  return Math.sqrt(squares / Math.max(1, end - start));
}

function windowedRms(samples: Float32Array, size: number, sampleRate: number): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (let start = 0; start < samples.length; start += size) {
    points.push({ time: start / sampleRate, value: calculateRms(samples, start, Math.min(samples.length, start + size)) });
  }
  return points;
}

function findPauses(points: SeriesPoint[], threshold: number, windowSeconds: number): PauseSegment[] {
  const pauses: PauseSegment[] = [];
  let silenceStart = -1;
  for (let index = 0; index <= points.length; index += 1) {
    const silent = index < points.length && points[index].value < threshold;
    if (silent && silenceStart < 0) silenceStart = index;
    if (!silent && silenceStart >= 0) {
      const duration = (index - silenceStart) * windowSeconds;
      if (duration >= 0.7) pauses.push({ start: silenceStart * windowSeconds, duration });
      silenceStart = -1;
    }
  }
  return pauses;
}

async function measurePitch(samples: Float32Array, silenceThreshold: number): Promise<SeriesPoint[]> {
  const frameSize = 512;
  const step = Math.max(1200, Math.ceil(samples.length / 2000));
  const points: SeriesPoint[] = [];
  let frames = 0;
  for (let start = 0; start + frameSize < samples.length; start += step) {
    if (calculateRms(samples, start, start + frameSize) > silenceThreshold * 1.25) {
      const pitch = autocorrelatePitch(samples.subarray(start, start + frameSize), TARGET_SAMPLE_RATE);
      if (pitch !== null) points.push({ time: start / TARGET_SAMPLE_RATE, value: pitch });
    }
    frames += 1;
    if (frames % 160 === 0) await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
  return points;
}

function autocorrelatePitch(frame: Float32Array, sampleRate: number): number | null {
  let mean = 0;
  for (const sample of frame) mean += sample;
  mean /= frame.length;
  const minLag = Math.floor(sampleRate / 400);
  const maxLag = Math.min(frame.length - 2, Math.ceil(sampleRate / 75));
  let bestLag = 0;
  let bestCorrelation = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let energyA = 0;
    let energyB = 0;
    for (let index = 0; index < frame.length - lag; index += 1) {
      const left = frame[index] - mean;
      const right = frame[index + lag] - mean;
      correlation += left * right;
      energyA += left * left;
      energyB += right * right;
    }
    const normalized = correlation / Math.sqrt(Math.max(1e-12, energyA * energyB));
    if (normalized > bestCorrelation) {
      bestCorrelation = normalized;
      bestLag = lag;
    }
  }
  if (bestCorrelation < 0.55 || bestLag === 0) return null;
  const pitch = sampleRate / bestLag;
  return pitch >= 75 && pitch <= 400 ? pitch : null;
}

function estimateUptalk(pitch: SeriesPoint[], pauses: PauseSegment[], duration: number): { candidates: number; rising: number } {
  const endings = [...pauses.map((pause) => pause.start), duration];
  let candidates = 0;
  let rising = 0;
  for (const ending of endings) {
    const points = pitch.filter((point) => point.time >= Math.max(0, ending - 0.5) && point.time <= ending);
    if (points.length < 3) continue;
    candidates += 1;
    const split = Math.max(1, Math.floor(points.length / 2));
    const early = median(points.slice(0, split).map((point) => point.value));
    const late = median(points.slice(split).map((point) => point.value));
    if (late - early >= 12 && late / Math.max(1, early) >= 1.08) rising += 1;
  }
  return { candidates, rising };
}

function buildPaceSeries(segments: TranscriptSegment[], duration: number): SeriesPoint[] {
  if (!segments.length) return [];
  const bucketSeconds = 30;
  const bucketCount = Math.max(1, Math.ceil(duration / bucketSeconds));
  const words = Array.from({ length: bucketCount }, () => 0);
  for (const segment of segments) {
    const bucket = Math.min(bucketCount - 1, Math.max(0, Math.floor(segment.endSeconds / bucketSeconds)));
    words[bucket] += segment.text.trim() ? segment.text.trim().split(/\s+/).length : 0;
  }
  return words.map((count, index) => ({ time: index * bucketSeconds + bucketSeconds / 2, value: count * (60 / bucketSeconds) }));
}

function compressSeries(points: SeriesPoint[], maximum: number): SeriesPoint[] {
  if (points.length <= maximum) return points;
  const groupSize = points.length / maximum;
  return Array.from({ length: maximum }, (_, group) => {
    const start = Math.floor(group * groupSize);
    const end = Math.max(start + 1, Math.floor((group + 1) * groupSize));
    const slice = points.slice(start, end);
    return {
      time: slice.reduce((sum, point) => sum + point.time, 0) / slice.length,
      value: slice.reduce((sum, point) => sum + point.value, 0) / slice.length,
    };
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return percentile(sorted, 0.5);
}

function percentile(sorted: number[], fraction: number): number {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function standardDeviation(values: number[]): number {
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length);
}
