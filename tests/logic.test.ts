import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTrainingPlan, type FoundationScore } from "../src/lib/coach";
import { findTenseFlags } from "../src/lib/esl";
import { hydrateState } from "../src/lib/storage/state";
import { getTranscriptMetrics } from "../src/lib/transcript";
import { isAudioReviewReady } from "../src/lib/review";
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
  assert.equal(state.gym.streak, 0);
  assert.equal(state.coach.current, null);
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
