import { createEmptyReviewState, isReviewComplete } from "./review";
import { getTranscriptMetrics } from "./transcript";
import type { MirrorState, SessionCoachMetrics, SessionSummary } from "@/types/session";
import type { AnalysisHistoryItem } from "@/types/coach";

function coachMetricsForCurrentSession(state: MirrorState): SessionCoachMetrics | null {
  const recordedAt = state.diagnostic.recordedAt;
  if (recordedAt === null) return null;
  const current = state.coach.current?.sourceRecordedAt === recordedAt ? state.coach.current : null;
  if (current) {
    return {
      analyzedAt: current.analyzedAt,
      wpm: current.transcript.wpm,
      overallRms: current.overallRms,
      pitchStdDevHz: current.pitchStdDevHz,
      pauseSeconds: current.totalPauseSeconds,
      tonalityRating: state.coach.tonalityRating,
    };
  }
  const saved = [...state.coach.history].reverse().find((item) => item.sourceRecordedAt === recordedAt);
  return saved ? historyMetrics(saved) : null;
}

function historyMetrics(item: AnalysisHistoryItem): SessionCoachMetrics {
  return {
    analyzedAt: item.analyzedAt,
    wpm: item.wpm,
    overallRms: item.overallRms,
    pitchStdDevHz: item.pitchStdDevHz,
    pauseSeconds: item.pauseSeconds,
    tonalityRating: item.tonalityRating,
  };
}

export function createCurrentSessionSummary(state: MirrorState): SessionSummary | null {
  const recordedAt = state.diagnostic.recordedAt;
  if (
    recordedAt === null
    || !state.diagnostic.hasRecording
    || !isReviewComplete(state.review.completed, state.review.focus)
  ) return null;
  return {
    recordedAt,
    durationSeconds: state.diagnostic.durationSeconds,
    goals: [...state.goals],
    reviewCompletedAt: state.review.completedAt,
    whatWorked: state.review.whatWorked.trim(),
    focus: state.review.focus ? { ...state.review.focus } : null,
    transcriptMetrics: getTranscriptMetrics(state.diagnostic.transcript, state.diagnostic.durationSeconds),
    visualObservations: {
      tags: [...state.review.behaviorTags],
      other: state.review.behaviorOther.trim(),
      noneNoticed: state.review.noBehaviorNoticed,
    },
    coachMetrics: coachMetricsForCurrentSession(state),
    source: "reviewed-session",
  };
}

export function createMetricOnlySummary(item: AnalysisHistoryItem): SessionSummary {
  return {
    recordedAt: item.sourceRecordedAt,
    durationSeconds: null,
    goals: [],
    reviewCompletedAt: null,
    whatWorked: "",
    focus: null,
    transcriptMetrics: null,
    visualObservations: null,
    coachMetrics: historyMetrics(item),
    source: "coach-metrics",
  };
}

export function upsertSessionSummary(history: SessionSummary[], summary: SessionSummary): SessionSummary[] {
  return [...history.filter((item) => item.recordedAt !== summary.recordedAt), summary]
    .sort((left, right) => right.recordedAt - left.recordedAt)
    .slice(0, 100);
}

export interface NextCycleResult {
  state: MirrorState;
  archived: boolean;
}

export function beginNextCycle(state: MirrorState): NextCycleResult {
  const summary = createCurrentSessionSummary(state);
  return {
    archived: Boolean(summary),
    state: {
      ...state,
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
      coach: { ...state.coach, current: null, tonalityRating: null },
      history: summary ? upsertSessionSummary(state.history, summary) : state.history,
    },
  };
}
