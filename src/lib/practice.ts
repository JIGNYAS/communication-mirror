import { getFocusCategoryLabel } from "./review";
import type { FocusCategory, FocusSelection } from "@/types/review";

export type PracticeExerciseId = "pause-rep" | "framework" | "warmup" | "visual" | "choose";

export interface PracticeRecommendation {
  exercise: PracticeExerciseId;
  label: string;
  title: string;
  instruction: string;
  actionLabel: string;
  focusLabel: string;
  focusAction: string;
}

interface ExerciseCopy {
  label: string;
  title: string;
  instruction: string;
  actionLabel: string;
}

const exerciseCopy: Record<PracticeExerciseId, ExerciseCopy> = {
  "pause-rep": {
    label: "Deliberate-pause rep",
    title: "Turn every filler into one silent beat.",
    instruction: "Speak on one unexpected word for 60 seconds. Finish each idea, pause for one full beat, then continue.",
    actionLabel: "Start the 60-second rep",
  },
  framework: {
    label: "Structured-answer rep",
    title: "Give the next answer a visible spine.",
    instruction: "Choose CCC or 3–2–1, write the core idea first, then rehearse the answer once without adding another point.",
    actionLabel: "Open the framework",
  },
  warmup: {
    label: "Voice warm-up",
    title: "Prepare the instrument for the feeling.",
    instruction: "Run the five-minute sequence, then repeat your focus sentence with one deliberate change in breath, pitch, or tonality.",
    actionLabel: "Start the warm-up",
  },
  visual: {
    label: "Body-language rehearsal",
    title: "Rehearse the body before adding the words.",
    instruction: "Set the camera at eye level. Hold a grounded stance, look into the lens, and deliver three sentences with gestures only when they support a point.",
    actionLabel: "Start the 90-second rehearsal",
  },
  choose: {
    label: "Choose a practice rep",
    title: "Match the exercise to the change you named.",
    instruction: "Your focus is personal, so choose the library tool that gives it the clearest repetition.",
    actionLabel: "Choose an exercise",
  },
};

const focusExercise: Record<FocusCategory, PracticeExerciseId> = {
  pace: "pause-rep",
  pause: "pause-rep",
  fillers: "pause-rep",
  structure: "framework",
  language: "framework",
  voice: "warmup",
  visual: "visual",
  custom: "choose",
};

export function getPracticeExercise(category: FocusCategory): PracticeExerciseId {
  return focusExercise[category];
}

export function getPracticeRecommendation(focus: FocusSelection | null): PracticeRecommendation | null {
  if (!focus) return null;
  const exercise = getPracticeExercise(focus.category);
  return {
    exercise,
    ...exerciseCopy[exercise],
    focusLabel: getFocusCategoryLabel(focus.category, focus.customCategory),
    focusAction: focus.action,
  };
}
