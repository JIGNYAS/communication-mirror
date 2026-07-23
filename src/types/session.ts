export interface DiagnosticSession {
  recordedAt: number | null;
  durationSeconds: number | null;
  lockedUntil: number | null;
  transcript: string;
  transcriptSegments: import("./coach").TranscriptSegment[];
  hasRecording: boolean;
}

export interface MirrorState {
  version: 2;
  goals: string[];
  diagnostic: DiagnosticSession;
  review: import("./review").ReviewState;
  gym: import("./gym").GymState;
  coach: import("./coach").CoachState;
}
