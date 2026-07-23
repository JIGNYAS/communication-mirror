import type { TranscriptMetrics } from "./review";

export interface TranscriptSegment {
  text: string;
  startSeconds: number;
  endSeconds: number;
}

export interface SeriesPoint {
  time: number;
  value: number;
}

export interface PauseSegment {
  start: number;
  duration: number;
}

export interface CalibrationState {
  baselineRms: number | null;
  targetRms: number | null;
  calibratedAt: number | null;
}

export interface AnalysisResult {
  sourceRecordedAt: number;
  analyzedAt: number;
  durationSeconds: number;
  overallRms: number;
  peakRms: number;
  volumeSeries: SeriesPoint[];
  pauses: PauseSegment[];
  speechRatio: number;
  totalPauseSeconds: number;
  averagePauseSeconds: number;
  pitchMedianHz: number | null;
  pitchStdDevHz: number | null;
  pitchRangeHz: number | null;
  pitchSeries: SeriesPoint[];
  voicedFrames: number;
  uptalkCandidates: number;
  uptalkRising: number;
  transcript: TranscriptMetrics;
  paceSeries: SeriesPoint[];
}

export interface AnalysisHistoryItem {
  sourceRecordedAt: number;
  analyzedAt: number;
  wpm: number;
  overallRms: number;
  pitchStdDevHz: number | null;
  pauseSeconds: number;
  tonalityRating: number | null;
}

export type ProfileColor = "red" | "yellow" | "green" | "blue";

export interface ProfilerState {
  answers: Record<string, ProfileColor>;
  result: ProfileColor | null;
}

export interface CoachState {
  calibration: CalibrationState;
  current: AnalysisResult | null;
  history: AnalysisHistoryItem[];
  tonalityRating: number | null;
  eslMode: boolean;
  profiler: ProfilerState;
}

