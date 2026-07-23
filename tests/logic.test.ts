import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTrainingPlan, type FoundationScore } from "../src/lib/coach";
import { findTenseFlags } from "../src/lib/esl";
import { hydrateState } from "../src/lib/storage/state";
import { getTranscriptMetrics } from "../src/lib/transcript";
import {
  canOpenReviewStep,
  isAudioReviewReady,
  isReviewComplete,
  nextReviewStep,
  suggestFocusCategories,
} from "../src/lib/review";
import { normalizeIntentions } from "../src/lib/intentions";

test("a fixed 100-word, 60-second passage reports 100 WPM", () => {
  const transcript = Array.from({ length: 100 }, (_, index) => `word${index + 1}`).join(" ");
  assert.deepEqual(getTranscriptMetrics(transcript, 60), {
    words: 100,
    wpm: 100,
    nonWords: 0,
    fillers: 0,
  });
});

test("non-words and multi-word fillers are counted independently", () => {
  const metrics = getTranscriptMetrics("Um, I actually, you know, like the plan. Uh, I mean it.", 30);
  assert.equal(metrics.nonWords, 2);
  assert.equal(metrics.fillers, 4);
});

test("audio review works with no intention words and still validates selected words", () => {
  assert.equal(isAudioReviewReady([], {}, 3), true);
  assert.equal(isAudioReviewReady([], {}, null), false);
  assert.equal(isAudioReviewReady(["clear", "warm"], { clear: 4 }, 3), false);
  assert.equal(isAudioReviewReady(["clear", "warm"], { clear: 4, warm: 5 }, 3), true);
});

test("intentions are optional, trimmed, deduplicated, and capped at five", () => {
  assert.deepEqual(normalizeIntentions(["", "  "]), []);
  assert.deepEqual(normalizeIntentions([" Clear ", "clear", "warm", "calm", "credible", "concise", "extra"]), ["Clear", "warm", "calm", "credible", "concise"]);
});

test("review steps unlock in order and completion requires one saved focus", () => {
  const none = { audio: false, visual: false, transcript: false };
  const audio = { ...none, audio: true };
  const visual = { ...audio, visual: true };
  const all = { ...visual, transcript: true };

  assert.equal(canOpenReviewStep("audio", none), true);
  assert.equal(canOpenReviewStep("visual", none), false);
  assert.equal(canOpenReviewStep("visual", audio), true);
  assert.equal(canOpenReviewStep("transcript", audio), false);
  assert.equal(canOpenReviewStep("focus", visual), false);
  assert.equal(canOpenReviewStep("focus", all), true);
  assert.equal(nextReviewStep(none), "audio");
  assert.equal(nextReviewStep(audio), "visual");
  assert.equal(nextReviewStep(visual), "transcript");
  assert.equal(nextReviewStep(all), "focus");
  assert.equal(isReviewComplete(all, null), false);
  assert.equal(isReviewComplete(all, { category: "pause", customCategory: "", action: "Pause after each main idea." }), true);
});

test("focus suggestions are derived from the completed review evidence", () => {
  assert.deepEqual(suggestFocusCategories({
    metrics: { words: 180, wpm: 180, nonWords: 2, fillers: 3 },
    visualObservations: 1,
    tonalityRating: 2,
    averagePauseSeconds: null,
    speechRatio: null,
  }), ["pace", "voice", "visual"]);
  assert.deepEqual(suggestFocusCategories({
    metrics: { words: 0, wpm: 0, nonWords: 0, fillers: 0 },
    visualObservations: 0,
    tonalityRating: null,
    averagePauseSeconds: null,
    speechRatio: null,
  }), ["voice", "structure"]);
});

test("legacy and malformed state hydrates into bounded version-two state", () => {
  const state = hydrateState({
    version: 1,
    goals: ["clear", "warm", "credible", "calm", "concise", "ignored"],
    diagnostic: { hasRecording: true, durationSeconds: Number.NaN, transcript: "hello" },
    review: { ratings: { clear: 99 }, completed: { audio: true } },
    gym: { streak: -4 },
  });
  assert.equal(state.version, 2);
  assert.deepEqual(state.goals, ["clear", "warm", "credible", "calm", "concise"]);
  assert.equal(state.diagnostic.durationSeconds, null);
  assert.equal(state.review.ratings.clear, 5);
  assert.equal(state.review.completed.audio, true);
  assert.equal(state.review.completed.visual, false);
  assert.equal(state.review.focus, null);
  assert.equal(state.gym.streak, 0);
  assert.equal(state.coach.current, null);
});

test("a valid single focus survives hydration while incomplete focus data is rejected", () => {
  const state = hydrateState({
    version: 2,
    review: {
      completed: { audio: true, visual: true, transcript: true },
      whatWorked: "The opening was direct.",
      focus: { category: "pause", customCategory: "", action: "  Pause after each main idea.  " },
    },
  });
  assert.deepEqual(state.review.focus, {
    category: "pause",
    customCategory: "",
    action: "Pause after each main idea.",
  });
  assert.equal(hydrateState({ review: { focus: { category: "custom", action: "Look up more often." } } }).review.focus, null);
});

test("the training plan ranks measurable weak foundations before missing metrics", () => {
  const scores: FoundationScore[] = [
    score("pace", 82),
    score("volume", null),
    score("melody", 18),
    score("pause", 44),
    score("tonality", 60),
  ];
  assert.deepEqual(buildTrainingPlan(scores).map((week) => week.foundation), ["melody", "pause", "tonality", "pace"]);
});

test("ESL mode flags simple future/past marker conflicts and leaves aligned tense alone", () => {
  const flags = findTenseFlags("Tomorrow I finished the report. Yesterday I will send it. Last week I finished the draft.");
  assert.equal(flags.length, 2);
  assert.match(flags[0].reason, /future-time marker/i);
  assert.match(flags[1].reason, /past-time marker/i);
});

function score(id: FoundationScore["id"], value: number | null): FoundationScore {
  return { id, label: id, score: value, value: String(value ?? "missing"), confidence: value === null ? "missing" : "measured", advice: "" };
}
