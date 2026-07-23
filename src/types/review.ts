export type ReviewMode = "audio" | "visual" | "transcript";

export interface ReviewCompletion {
  audio: boolean;
  visual: boolean;
  transcript: boolean;
}

export interface ReviewState {
  completed: ReviewCompletion;
  ratings: Record<string, number>;
  behaviorTags: string[];
  behaviorOther: string;
  noBehaviorNoticed: boolean;
  reflection: string;
}

export interface TranscriptMetrics {
  words: number;
  wpm: number;
  nonWords: number;
  fillers: number;
}

