export interface DiagnosticSession {
  recordedAt: number | null;
  durationSeconds: number | null;
  lockedUntil: number | null;
  transcript: string;
  transcriptSegments: import("./coach").TranscriptSegment[];
  hasRecording: boolean;
}

export interface VisualObservations {
  tags: string[];
  other: string;
  noneNoticed: boolean;
}

export interface SessionCoachMetrics {
  analyzedAt: number;
  wpm: number;
  overallRms: number;
  pitchStdDevHz: number | null;
  pauseSeconds: number;
  tonalityRating: number | null;
}

export interface SessionSummary {
  /** The recording timestamp is the stable identity for a weekly cycle. */
  recordedAt: number;
  durationSeconds: number | null;
  goals: string[];
  reviewCompletedAt: number | null;
  whatWorked: string;
  focus: import("./review").FocusSelection | null;
  transcriptMetrics: import("./review").TranscriptMetrics | null;
  visualObservations: VisualObservations | null;
  coachMetrics: SessionCoachMetrics | null;
  source: "reviewed-session" | "coach-metrics";
}

export interface MirrorState {
  version: 3;
  goals: string[];
  diagnostic: DiagnosticSession;
  review: import("./review").ReviewState;
  gym: import("./gym").GymState;
  coach: import("./coach").CoachState;
  history: SessionSummary[];
}
