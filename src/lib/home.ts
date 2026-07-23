import { isReviewComplete } from "./review";
import type { FocusSelection, ReviewCompletion } from "@/types/review";

export interface HomeAction {
  eyebrow: string;
  label: string;
  href: string;
  note: string;
  step: number;
}

export function getHomeAction(
  hasRecording: boolean,
  locked: boolean,
  completed: ReviewCompletion,
  focus: FocusSelection | null,
): HomeAction {
  const completedPasses = Object.values(completed).filter(Boolean).length;
  if (!hasRecording) {
    return {
      eyebrow: "Your next step",
      label: "Record your five-minute take",
      href: "/diagnostic",
      note: "One uninterrupted attempt. The imperfect parts are the useful parts.",
      step: 0,
    };
  }
  if (locked) {
    return {
      eyebrow: "Your take is resting",
      label: "See when review opens",
      href: "/review",
      note: "Distance softens the first wave of self-criticism.",
      step: 1,
    };
  }
  if (!isReviewComplete(completed, focus)) {
    return {
      eyebrow: completedPasses === 3 ? "Three review passes complete" : completedPasses ? `${completedPasses} of 3 review passes complete` : "Your take is ready",
      label: completedPasses === 3 ? "Choose one focus" : completedPasses ? "Continue your review" : "Begin your review",
      href: "/review",
      note: completedPasses === 3 ? "Turn what you noticed into one specific action for the next take." : "Listen, watch, and read separately so each channel reveals different evidence.",
      step: 2,
    };
  }
  return {
    eyebrow: "Review complete",
    label: "Start next weekly recording",
    href: "/diagnostic",
    note: focus?.action ?? "Carry one specific observation into the next take.",
    step: 3,
  };
}
