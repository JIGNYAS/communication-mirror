import { FILLER_PHRASES, NON_WORDS } from "./constants";
import type { TranscriptMetrics } from "@/types/review";

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function countPhrases(text: string, phrases: readonly string[]): number {
  return phrases.reduce((total, phrase) => total + (text.match(new RegExp(`\\b${escaped(phrase)}\\b`, "gi"))?.length ?? 0), 0);
}

export function getTranscriptMetrics(text: string, durationSeconds: number | null): TranscriptMetrics {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, durationSeconds ?? 300) / 60;
  return {
    words,
    wpm: words ? Math.round(words / minutes) : 0,
    nonWords: countPhrases(text, NON_WORDS),
    fillers: countPhrases(text, FILLER_PHRASES),
  };
}

