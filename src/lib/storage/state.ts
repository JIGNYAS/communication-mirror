import type { MirrorState, SessionCoachMetrics, SessionSummary, VisualObservations } from "@/types/session";
import type { AnalysisHistoryItem, AnalysisResult, ProfileColor, SeriesPoint, TranscriptSegment } from "@/types/coach";
import type { FocusSelection, TranscriptMetrics } from "@/types/review";
import { createMetricOnlySummary, upsertSessionSummary } from "../history";
import { createEmptyReviewState } from "../review";

export const STATE_KEY = "mirror-state-v1";
export const STATE_EVENT = "mirror-state-change";

export const INITIAL_STATE: MirrorState = {
  version: 3,
  goals: [],
  diagnostic: {
    recordedAt: null,
    durationSeconds: null,
    lockedUntil: null,
    transcript: "",
    transcriptSegments: [],
    hasRecording: false,
  },
  review: createEmptyReviewState(),
  gym: {
    streak: 0,
    drillCount: 0,
    lastDrillDay: null,
    warmupsDone: [],
    framework: { kind: "ccc", topic: "", fields: {} },
  },
  coach: {
    calibration: { baselineRms: null, targetRms: null, calibratedAt: null },
    current: null,
    history: [],
    tonalityRating: null,
    eslMode: false,
    profiler: { answers: {}, result: null },
  },
  history: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function strings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function numberOr(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function series(value: unknown, limit = 3000): SeriesPoint[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, limit).flatMap((item) => isRecord(item) && Number.isFinite(item.time) && Number.isFinite(item.value)
    ? [{ time: Number(item.time), value: Number(item.value) }]
    : []);
}

function transcriptSegments(value: unknown): TranscriptSegment[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 1000).flatMap((item) => isRecord(item) && typeof item.text === "string"
    ? [{ text: item.text, startSeconds: numberOr(item.startSeconds), endSeconds: numberOr(item.endSeconds) }]
    : []);
}

function hydrateAnalysis(value: unknown): AnalysisResult | null {
  if (!isRecord(value) || !Number.isFinite(value.analyzedAt) || !Number.isFinite(value.sourceRecordedAt)) return null;
  const transcript = isRecord(value.transcript) ? value.transcript : {};
  const pauses = Array.isArray(value.pauses) ? value.pauses.slice(0, 1000).flatMap((item) => isRecord(item) && Number.isFinite(item.start) && Number.isFinite(item.duration)
    ? [{ start: Number(item.start), duration: Number(item.duration) }]
    : []) : [];
  return {
    sourceRecordedAt: numberOr(value.sourceRecordedAt),
    analyzedAt: numberOr(value.analyzedAt),
    durationSeconds: Math.max(1, numberOr(value.durationSeconds, 1)),
    overallRms: Math.max(0, numberOr(value.overallRms)),
    peakRms: Math.max(0, numberOr(value.peakRms)),
    volumeSeries: series(value.volumeSeries, 500),
    pauses,
    speechRatio: Math.min(1, Math.max(0, numberOr(value.speechRatio))),
    totalPauseSeconds: Math.max(0, numberOr(value.totalPauseSeconds)),
    averagePauseSeconds: Math.max(0, numberOr(value.averagePauseSeconds)),
    pitchMedianHz: nullableNumber(value.pitchMedianHz),
    pitchStdDevHz: nullableNumber(value.pitchStdDevHz),
    pitchRangeHz: nullableNumber(value.pitchRangeHz),
    pitchSeries: series(value.pitchSeries, 3000),
    voicedFrames: Math.max(0, Math.round(numberOr(value.voicedFrames))),
    uptalkCandidates: Math.max(0, Math.round(numberOr(value.uptalkCandidates))),
    uptalkRising: Math.max(0, Math.round(numberOr(value.uptalkRising))),
    transcript: {
      words: Math.max(0, Math.round(numberOr(transcript.words))),
      wpm: Math.max(0, Math.round(numberOr(transcript.wpm))),
      nonWords: Math.max(0, Math.round(numberOr(transcript.nonWords))),
      fillers: Math.max(0, Math.round(numberOr(transcript.fillers))),
    },
    paceSeries: series(value.paceSeries, 1000),
  };
}

function hydrateHistory(value: unknown): AnalysisHistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-20).flatMap((item) => isRecord(item) && Number.isFinite(item.sourceRecordedAt)
    ? [{
        sourceRecordedAt: numberOr(item.sourceRecordedAt),
        analyzedAt: numberOr(item.analyzedAt),
        wpm: Math.max(0, Math.round(numberOr(item.wpm))),
        overallRms: Math.max(0, numberOr(item.overallRms)),
        pitchStdDevHz: nullableNumber(item.pitchStdDevHz),
        pauseSeconds: Math.max(0, numberOr(item.pauseSeconds)),
        tonalityRating: nullableNumber(item.tonalityRating),
      }]
    : []);
}

function profileColor(value: unknown): ProfileColor | null {
  return value === "red" || value === "yellow" || value === "green" || value === "blue" ? value : null;
}

function focusCategory(value: unknown): import("@/types/review").FocusCategory | null {
  return value === "pace"
    || value === "pause"
    || value === "voice"
    || value === "visual"
    || value === "language"
    || value === "structure"
    || value === "custom"
    ? value
    : null;
}

function hydrateFocus(value: unknown): FocusSelection | null {
  if (!isRecord(value)) return null;
  const category = focusCategory(value.category);
  const action = typeof value.action === "string" ? value.action.trim() : "";
  const customCategory = typeof value.customCategory === "string" ? value.customCategory.trim() : "";
  return category && action && (category !== "custom" || customCategory)
    ? { category, customCategory, action }
    : null;
}

function hydrateTranscriptMetrics(value: unknown): TranscriptMetrics | null {
  if (!isRecord(value)) return null;
  return {
    words: Math.max(0, Math.round(numberOr(value.words))),
    wpm: Math.max(0, Math.round(numberOr(value.wpm))),
    nonWords: Math.max(0, Math.round(numberOr(value.nonWords))),
    fillers: Math.max(0, Math.round(numberOr(value.fillers))),
  };
}

function hydrateVisualObservations(value: unknown): VisualObservations | null {
  if (!isRecord(value)) return null;
  return {
    tags: strings(value.tags, 20),
    other: typeof value.other === "string" ? value.other.trim() : "",
    noneNoticed: value.noneNoticed === true,
  };
}

function hydrateSessionCoachMetrics(value: unknown): SessionCoachMetrics | null {
  if (!isRecord(value) || !Number.isFinite(value.analyzedAt)) return null;
  return {
    analyzedAt: numberOr(value.analyzedAt),
    wpm: Math.max(0, Math.round(numberOr(value.wpm))),
    overallRms: Math.max(0, numberOr(value.overallRms)),
    pitchStdDevHz: nullableNumber(value.pitchStdDevHz),
    pauseSeconds: Math.max(0, numberOr(value.pauseSeconds)),
    tonalityRating: nullableNumber(value.tonalityRating),
  };
}

function hydrateSessionHistory(value: unknown): SessionSummary[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-100).reduce<SessionSummary[]>((history, item) => {
    if (!isRecord(item) || !Number.isFinite(item.recordedAt)) return history;
    const summary: SessionSummary = {
      recordedAt: numberOr(item.recordedAt),
      durationSeconds: nullableNumber(item.durationSeconds),
      goals: strings(item.goals, 5),
      reviewCompletedAt: nullableNumber(item.reviewCompletedAt),
      whatWorked: typeof item.whatWorked === "string" ? item.whatWorked.trim() : "",
      focus: hydrateFocus(item.focus),
      transcriptMetrics: hydrateTranscriptMetrics(item.transcriptMetrics),
      visualObservations: hydrateVisualObservations(item.visualObservations),
      coachMetrics: hydrateSessionCoachMetrics(item.coachMetrics),
      source: item.source === "coach-metrics" ? "coach-metrics" : "reviewed-session",
    };
    return upsertSessionSummary(history, summary);
  }, []);
}

export function hydrateState(value: unknown): MirrorState {
  if (!isRecord(value)) return INITIAL_STATE;
  const diagnostic = isRecord(value.diagnostic) ? value.diagnostic : {};
  const review = isRecord(value.review) ? value.review : {};
  const completed = isRecord(review.completed) ? review.completed : {};
  const hydratedFocus = hydrateFocus(review.focus);
  const gym = isRecord(value.gym) ? value.gym : {};
  const framework = isRecord(gym.framework) ? gym.framework : {};
  const coach = isRecord(value.coach) ? value.coach : {};
  const coachHistory = hydrateHistory(coach.history);
  const calibration = isRecord(coach.calibration) ? coach.calibration : {};
  const profiler = isRecord(coach.profiler) ? coach.profiler : {};
  const ratings = isRecord(review.ratings)
    ? Object.fromEntries(
        Object.entries(review.ratings)
          .filter(([, rating]) => typeof rating === "number" && Number.isFinite(rating))
          .map(([goal, rating]) => [goal, Math.min(5, Math.max(1, Math.round(rating as number)))]),
      )
    : {};

  const recordedAt = finiteNumber(diagnostic.recordedAt);
  const hydratedHistory = hydrateSessionHistory(value.history);
  const history = coachHistory.reduce(
    (summaries, item) => item.sourceRecordedAt === recordedAt || summaries.some((summary) => summary.recordedAt === item.sourceRecordedAt)
      ? summaries
      : upsertSessionSummary(summaries, createMetricOnlySummary(item)),
    hydratedHistory,
  );

  return {
    version: 3,
    goals: strings(value.goals, 5),
    diagnostic: {
      recordedAt,
      durationSeconds: finiteNumber(diagnostic.durationSeconds),
      lockedUntil: finiteNumber(diagnostic.lockedUntil),
      transcript: typeof diagnostic.transcript === "string" ? diagnostic.transcript : "",
      transcriptSegments: transcriptSegments(diagnostic.transcriptSegments),
      hasRecording: diagnostic.hasRecording === true,
    },
    review: {
      completedAt: nullableNumber(review.completedAt),
      completed: {
        audio: completed.audio === true,
        visual: completed.visual === true,
        transcript: completed.transcript === true,
      },
      ratings,
      behaviorTags: strings(review.behaviorTags, 20),
      behaviorOther: typeof review.behaviorOther === "string" ? review.behaviorOther : "",
      noBehaviorNoticed: review.noBehaviorNoticed === true,
      whatWorked: typeof review.whatWorked === "string"
        ? review.whatWorked
        : typeof review.reflection === "string"
          ? review.reflection
          : "",
      focus: hydratedFocus,
      reflection: typeof review.reflection === "string" ? review.reflection : "",
    },
    gym: {
      streak: Math.max(0, Math.round(finiteNumber(gym.streak) ?? 0)),
      drillCount: Math.max(0, Math.round(finiteNumber(gym.drillCount) ?? 0)),
      lastDrillDay: typeof gym.lastDrillDay === "string" ? gym.lastDrillDay : null,
      warmupsDone: strings(gym.warmupsDone, 10),
      framework: {
        kind: framework.kind === "321" ? "321" : "ccc",
        topic: typeof framework.topic === "string" ? framework.topic : "",
        fields: isRecord(framework.fields)
          ? Object.fromEntries(Object.entries(framework.fields).filter(([, item]) => typeof item === "string")) as Record<string, string>
          : {},
      },
    },
    coach: {
      calibration: {
        baselineRms: nullableNumber(calibration.baselineRms),
        targetRms: nullableNumber(calibration.targetRms),
        calibratedAt: nullableNumber(calibration.calibratedAt),
      },
      current: hydrateAnalysis(coach.current),
      history: coachHistory,
      tonalityRating: nullableNumber(coach.tonalityRating),
      eslMode: coach.eslMode === true,
      profiler: {
        answers: isRecord(profiler.answers)
          ? Object.fromEntries(Object.entries(profiler.answers).flatMap(([key, answer]) => {
              const color = profileColor(answer);
              return color ? [[key, color]] : [];
            }))
          : {},
        result: profileColor(profiler.result),
      },
    },
    history,
  };
}

export function loadState(): MirrorState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const saved = window.localStorage.getItem(STATE_KEY);
    return saved ? hydrateState(JSON.parse(saved)) : INITIAL_STATE;
  } catch {
    return INITIAL_STATE;
  }
}

export function saveState(state: MirrorState): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: state }));
}

export function clearState(): void {
  window.localStorage.removeItem(STATE_KEY);
  window.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: INITIAL_STATE }));
}
