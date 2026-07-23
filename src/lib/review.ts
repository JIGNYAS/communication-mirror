import type {
  FocusCategory,
  FocusSelection,
  ReviewCompletion,
  ReviewStep,
  TranscriptMetrics,
} from "@/types/review";

export const FOCUS_CATEGORIES: Array<{ id: FocusCategory; label: string; action: string }> = [
  { id: "pace", label: "Pace", action: "Slow down enough to finish each sentence." },
  { id: "pause", label: "Pause", action: "Pause after each main idea." },
  { id: "voice", label: "Voice", action: "Choose one feeling and let it shape the sentence." },
  { id: "visual", label: "Visual delivery", action: "Keep your hands still until they support a point." },
  { id: "language", label: "Fillers / language", action: "Replace fillers with one silent breath." },
  { id: "structure", label: "Structure", action: "State the point before the explanation." },
  { id: "custom", label: "Something else", action: "" },
];

export function isAudioReviewReady(goals: string[], ratings: Record<string, number>, tonalityRating: number | null): boolean {
  return Boolean(tonalityRating) && goals.every((goal) => Boolean(ratings[goal]));
}

export function canOpenReviewStep(step: ReviewStep, completed: ReviewCompletion): boolean {
  if (step === "audio") return true;
  if (step === "visual") return completed.audio;
  if (step === "transcript") return completed.audio && completed.visual;
  return completed.audio && completed.visual && completed.transcript;
}

export function nextReviewStep(completed: ReviewCompletion): ReviewStep {
  if (!completed.audio) return "audio";
  if (!completed.visual) return "visual";
  if (!completed.transcript) return "transcript";
  return "focus";
}

export function isReviewComplete(completed: ReviewCompletion, focus: FocusSelection | null): boolean {
  return Object.values(completed).every(Boolean) && Boolean(focus?.action.trim());
}

export function getFocusCategoryLabel(category: FocusCategory, customCategory = ""): string {
  if (category === "custom") return customCategory.trim() || "Custom focus";
  return FOCUS_CATEGORIES.find((item) => item.id === category)?.label ?? "Focus";
}

interface FocusSuggestionInput {
  metrics: TranscriptMetrics;
  visualObservations: number;
  tonalityRating: number | null;
  averagePauseSeconds: number | null;
  speechRatio: number | null;
}

export function suggestFocusCategories(input: FocusSuggestionInput): FocusCategory[] {
  const suggestions: FocusCategory[] = [];
  const add = (category: FocusCategory) => {
    if (!suggestions.includes(category)) suggestions.push(category);
  };

  if (input.metrics.wpm > 165 || (input.metrics.wpm > 0 && input.metrics.wpm < 110)) add("pace");
  if (
    (input.averagePauseSeconds !== null && input.averagePauseSeconds < 0.45)
    || (input.speechRatio !== null && input.speechRatio > 0.9)
  ) add("pause");
  if (input.tonalityRating !== null && input.tonalityRating <= 3) add("voice");
  if (input.visualObservations > 0) add("visual");
  if (input.metrics.nonWords + input.metrics.fillers >= 3) add("language");
  if (input.metrics.words > 0) add("structure");

  if (!suggestions.length) suggestions.push("voice", "structure");
  return suggestions.slice(0, 3);
}
