export type ReviewMode = "audio" | "visual" | "transcript";
export type ReviewStep = ReviewMode | "focus";
export type FocusCategory = "pace" | "pause" | "voice" | "visual" | "fillers" | "language" | "structure" | "custom";

export interface ReviewCompletion {
  audio: boolean;
  visual: boolean;
  transcript: boolean;
}

export interface FocusSelection {
  category: FocusCategory;
  customCategory: string;
  action: string;
}

export interface ReviewState {
  completedAt: number | null;
  completed: ReviewCompletion;
  ratings: Record<string, number>;
  behaviorTags: string[];
  behaviorOther: string;
  noBehaviorNoticed: boolean;
  whatWorked: string;
  focus: FocusSelection | null;
  /** Retained through Slice 3 so older backups do not lose their broad reflection. */
  reflection: string;
}

export interface TranscriptMetrics {
  words: number;
  wpm: number;
  nonWords: number;
  fillers: number;
}

