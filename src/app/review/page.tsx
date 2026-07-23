"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  Gauge,
  LockKeyhole,
  Sparkles,
  Tags,
  Target,
  Volume2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TranscriptMarkup } from "@/components/TranscriptMarkup";
import { useCountdown } from "@/hooks/useCountdown";
import { useLocalState } from "@/hooks/useLocalState";
import { BEHAVIOR_TAGS } from "@/lib/constants";
import { findTenseFlags } from "@/lib/esl";
import {
  canOpenReviewStep,
  FOCUS_CATEGORIES,
  getFocusCategoryLabel,
  isAudioReviewReady,
  isReviewComplete,
  nextReviewStep,
  suggestFocusCategories,
} from "@/lib/review";
import { getRecording } from "@/lib/storage/db";
import { getTranscriptMetrics } from "@/lib/transcript";
import type { FocusCategory, ReviewMode, ReviewStep } from "@/types/review";

const steps: Array<{ id: ReviewStep; title: string; instruction: string }> = [
  { id: "audio", title: "Listen", instruction: "Voice without the face" },
  { id: "visual", title: "Watch", instruction: "Body without the sound" },
  { id: "transcript", title: "Read", instruction: "Words without delivery" },
  { id: "focus", title: "Focus", instruction: "Choose one change" },
];

interface FocusDraft {
  category: FocusCategory | null;
  customCategory: string;
  action: string;
}

function formatCountdown(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export default function ReviewPage() {
  const { state, update, ready } = useLocalState();
  const [selectedStep, setSelectedStep] = useState<ReviewStep | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState("");
  const [focusDraft, setFocusDraft] = useState<FocusDraft | null>(null);
  const [developmentUnlock, setDevelopmentUnlock] = useState(
    () => process.env.NODE_ENV === "development" && typeof window !== "undefined" && window.location.search.includes("unlock"),
  );
  const remaining = useCountdown(state.diagnostic.lockedUntil);
  const locked = remaining > 0 && !developmentUnlock;
  const metrics = useMemo(
    () => getTranscriptMetrics(state.diagnostic.transcript, state.diagnostic.durationSeconds),
    [state.diagnostic.durationSeconds, state.diagnostic.transcript],
  );
  const averageRating = useMemo(() => {
    const scores = state.goals
      .map((goal) => state.review.ratings[goal])
      .filter((rating): rating is number => typeof rating === "number" && rating > 0);
    return scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : "—";
  }, [state.goals, state.review.ratings]);
  const allModesDone = Object.values(state.review.completed).every(Boolean);
  const reviewComplete = isReviewComplete(state.review.completed, state.review.focus);
  const step = selectedStep && canOpenReviewStep(selectedStep, state.review.completed)
    ? selectedStep
    : nextReviewStep(state.review.completed);
  const focusCategory = focusDraft?.category ?? state.review.focus?.category ?? null;
  const customCategory = focusDraft?.customCategory ?? state.review.focus?.customCategory ?? "";
  const focusAction = focusDraft?.action ?? state.review.focus?.action ?? "";
  const averagePauseSeconds = state.coach.current?.averagePauseSeconds ?? null;
  const speechRatio = state.coach.current?.speechRatio ?? null;
  const tonalityRating = state.coach.tonalityRating;
  const tenseFlags = useMemo(
    () => state.coach.eslMode ? findTenseFlags(state.diagnostic.transcript) : [],
    [state.coach.eslMode, state.diagnostic.transcript],
  );
  const suggestedCategories = useMemo(() => suggestFocusCategories({
    metrics,
    visualObservations: state.review.behaviorTags.length + (state.review.behaviorOther.trim() ? 1 : 0),
    tonalityRating,
    averagePauseSeconds,
    speechRatio,
  }), [
    averagePauseSeconds,
    metrics,
    speechRatio,
    state.review.behaviorOther,
    state.review.behaviorTags.length,
    tonalityRating,
  ]);
  const orderedFocusCategories = useMemo(
    () => [...FOCUS_CATEGORIES].sort((a, b) => {
      const aIndex = suggestedCategories.indexOf(a.id);
      const bIndex = suggestedCategories.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }),
    [suggestedCategories],
  );
  const modeReady = step === "audio"
    ? isAudioReviewReady(state.goals, state.review.ratings, state.coach.tonalityRating)
    : step === "visual"
      ? state.review.behaviorTags.length > 0 || Boolean(state.review.behaviorOther.trim()) || state.review.noBehaviorNoticed
      : step === "transcript"
        ? Boolean(state.diagnostic.transcript.trim())
        : false;
  const focusReady = Boolean(
    focusCategory
    && focusAction.trim()
    && (focusCategory !== "custom" || customCategory.trim()),
  );

  useEffect(() => {
    let url = "";
    getRecording().then((blob) => {
      if (!blob) {
        setRecordingError("The saved video is missing from this browser. Start a fresh recording to continue.");
        return;
      }
      url = URL.createObjectURL(blob);
      setRecordingUrl(url);
    }).catch(() => setRecordingError("The saved video could not be opened from browser storage."));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, []);

  function completeMode(target: ReviewMode): void {
    update((current) => ({
      ...current,
      review: {
        ...current.review,
        completed: { ...current.review.completed, [target]: true },
      },
    }));
    const index = steps.findIndex((item) => item.id === target);
    setSelectedStep(steps[index + 1]?.id ?? "focus");
  }

  function openStep(target: ReviewStep): void {
    if (canOpenReviewStep(target, state.review.completed)) setSelectedStep(target);
  }

  function setRating(goal: string, rating: number): void {
    update((current) => ({
      ...current,
      review: { ...current.review, ratings: { ...current.review.ratings, [goal]: rating } },
    }));
  }

  function toggleTag(tag: string): void {
    update((current) => ({
      ...current,
      review: {
        ...current.review,
        behaviorTags: current.review.behaviorTags.includes(tag)
          ? current.review.behaviorTags.filter((item) => item !== tag)
          : [...current.review.behaviorTags, tag],
        noBehaviorNoticed: false,
      },
    }));
  }

  function chooseFocus(category: FocusCategory): void {
    const existingDefault = FOCUS_CATEGORIES.some((item) => item.action === focusAction);
    const nextDefault = FOCUS_CATEGORIES.find((item) => item.id === category)?.action ?? "";
    setFocusDraft({
      category,
      customCategory,
      action: !focusAction.trim() || existingDefault ? nextDefault : focusAction,
    });
  }

  function saveFocus(): void {
    if (!focusCategory || !focusReady) return;
    update((current) => ({
      ...current,
      review: {
        ...current.review,
        focus: {
          category: focusCategory,
          customCategory: focusCategory === "custom" ? customCategory.trim() : "",
          action: focusAction.trim(),
        },
      },
    }));
  }

  if (!ready) {
    return (
      <AppShell active="review" tone="light" eyebrow="Review" title="Opening the saved take…">
        <div className="empty-state"><Clock3 size={34} /><p>Checking this browser for your recording.</p></div>
      </AppShell>
    );
  }

  if (!state.diagnostic.hasRecording) {
    return (
      <AppShell active="review" tone="light" eyebrow="Review" title="Record before you review.">
        <section className="empty-state large">
          <Gauge size={48} />
          <h2>There is no saved take yet.</h2>
          <p>The guided review opens after one uninterrupted recording is stored in this browser.</p>
          <Link className="button primary" href="/diagnostic">Go to Record <ArrowRight size={18} /></Link>
        </section>
      </AppShell>
    );
  }

  if (locked) {
    return (
      <AppShell active="review" tone="light" eyebrow="The kindness buffer" title="Your take is resting.">
        <section className="countdown-stage slice-two-lock">
          <div className="lock-orbit"><LockKeyhole size={42} /></div>
          <p className="countdown-label">REVIEW OPENS IN</p>
          <strong className="countdown-clock">{formatCountdown(remaining)}</strong>
          <h2>Tomorrow, watch the evidence—not the memory.</h2>
          <p>The 24-hour distance helps you notice patterns instead of replaying embarrassment.</p>
          <div className="countdown-facts">
            <span><Clock3 size={17} /> Recorded {state.diagnostic.recordedAt ? new Date(state.diagnostic.recordedAt).toLocaleString() : "today"}</span>
            <span><LockKeyhole size={17} /> Stored only in this browser</span>
          </div>
          {process.env.NODE_ENV === "development" && (
            <button className="button secondary" onClick={() => setDevelopmentUnlock(true)}>Development: review now</button>
          )}
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      active="review"
      tone="light"
      eyebrow="Guided review"
      title="One take. Three views. One focus."
      aside={(
        <div className={reviewComplete ? "completion-pill done" : "completion-pill"}>
          <Check size={16} /> {reviewComplete ? "FOCUS SAVED" : `${Object.values(state.review.completed).filter(Boolean).length}/3 PASSES`}
        </div>
      )}
    >
      {recordingError && <p className="status-banner error" role="alert">{recordingError}</p>}

      <nav className="review-rail" aria-label="Guided review steps">
        {steps.map((item, index) => {
          const open = canOpenReviewStep(item.id, state.review.completed);
          const complete = item.id === "focus" ? reviewComplete : state.review.completed[item.id];
          return (
            <button
              key={item.id}
              type="button"
              disabled={!open}
              aria-current={step === item.id ? "step" : undefined}
              className={`${step === item.id ? "active " : ""}${complete ? "complete" : ""}`.trim()}
              onClick={() => openStep(item.id)}
            >
              <span>{complete ? <Check size={15} /> : open ? index + 1 : <LockKeyhole size={14} />}</span>
              <div><strong>{item.title}</strong><small>{open ? item.instruction : "Finish the prior step"}</small></div>
            </button>
          );
        })}
      </nav>

      {step !== "focus" ? (
        <section className="review-workspace guided-review-workspace">
          <div className="review-media panel">
            {step === "audio" && (
              <div className="audio-stage">
                <div className="sound-rings" aria-hidden="true"><Volume2 size={46} /></div>
                <p>Screen intentionally hidden</p>
                {recordingUrl && <audio controls src={recordingUrl} />}
              </div>
            )}
            {step === "visual" && (
              <div className="video-review">
                {recordingUrl && <video controls muted playsInline src={recordingUrl} />}
                <span>MUTED BY DESIGN</span>
              </div>
            )}
            {step === "transcript" && (
              <div className="transcript-review">
                <div className="transcript-legend">
                  <span><i className="non-word" /> NON-WORD</span>
                  <span><i className="filler" /> FILLER</span>
                  {state.coach.eslMode && <span><i className="tense" /> TENSE CHECK</span>}
                </div>
                <TranscriptMarkup text={state.diagnostic.transcript} tenseFlags={tenseFlags} />
              </div>
            )}
          </div>

          <aside className="review-task panel">
            {step === "audio" && (
              <AudioTask
                goals={state.goals}
                ratings={state.review.ratings}
                tonalityRating={state.coach.tonalityRating}
                onRate={setRating}
                onRateTonality={(rating) => update((current) => ({
                  ...current,
                  coach: { ...current.coach, tonalityRating: rating },
                }))}
              />
            )}
            {step === "visual" && (
              <VisualTask
                tags={state.review.behaviorTags}
                other={state.review.behaviorOther}
                none={state.review.noBehaviorNoticed}
                onToggle={toggleTag}
                onOther={(value) => update((current) => ({
                  ...current,
                  review: { ...current.review, behaviorOther: value, noBehaviorNoticed: false },
                }))}
                onNone={(checked) => update((current) => ({
                  ...current,
                  review: {
                    ...current.review,
                    noBehaviorNoticed: checked,
                    behaviorTags: checked ? [] : current.review.behaviorTags,
                  },
                }))}
              />
            )}
            {step === "transcript" && (
              <TranscriptTask
                transcript={state.diagnostic.transcript}
                metrics={metrics}
                eslMode={state.coach.eslMode}
                tenseFlags={tenseFlags}
                onToggleEsl={(enabled) => update((current) => ({
                  ...current,
                  coach: { ...current.coach, eslMode: enabled },
                }))}
                onChange={(value) => update((current) => ({
                  ...current,
                  diagnostic: { ...current.diagnostic, transcript: value, transcriptSegments: [] },
                  coach: { ...current.coach, current: null },
                }))}
              />
            )}
            <button className="button primary full" onClick={() => completeMode(step)} disabled={!modeReady}>
              {state.review.completed[step] ? "Save and continue" : `Complete ${steps.find((item) => item.id === step)?.title}`}
              <ArrowRight size={17} />
            </button>
            {!modeReady && <p className="review-gate-note">Add the observation requested above to unlock the next step.</p>}
          </aside>
        </section>
      ) : (
        <section className="focus-workspace">
          <article className="focus-builder">
            <p className="home-kicker">Final step · Choose one</p>
            <h2>What will you change in the next take?</h2>
            <p className="focus-intro">Do not fix the whole recording. Pick the single change that would make the next one more effective.</p>

            <label className="focus-worked">
              <span>What worked? <small>Optional</small></span>
              <textarea
                value={state.review.whatWorked}
                onChange={(event) => update((current) => ({
                  ...current,
                  review: { ...current.review, whatWorked: event.target.value },
                }))}
                placeholder="Keep one thing you want to repeat…"
              />
            </label>

            <fieldset className="focus-choices">
              <legend>Choose one focus category</legend>
              <div>
                {orderedFocusCategories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    aria-pressed={focusCategory === category.id}
                    className={focusCategory === category.id ? "selected" : ""}
                    onClick={() => chooseFocus(category.id)}
                  >
                    <span>{category.label}</span>
                    {suggestedCategories.includes(category.id) && category.id !== "custom" && <small><Sparkles size={12} /> Suggested</small>}
                  </button>
                ))}
              </div>
            </fieldset>

            {focusCategory === "custom" && (
              <label className="field-label light-field">
                Name your focus
                <input
                  value={customCategory}
                  onChange={(event) => setFocusDraft({ category: focusCategory, customCategory: event.target.value, action: focusAction })}
                  placeholder="For example, eye contact"
                />
              </label>
            )}

            <label className="field-label light-field">
              One specific action
              <textarea
                value={focusAction}
                onChange={(event) => setFocusDraft({ category: focusCategory, customCategory, action: event.target.value })}
                placeholder="Pause after each main idea."
              />
            </label>

            <button className="button primary" disabled={!focusReady} onClick={saveFocus}>
              Save this focus <Target size={17} />
            </button>
          </article>

          <aside className="focus-evidence">
            {state.review.focus ? (
              <article className="saved-focus-card" aria-live="polite">
                <div><span>YOUR NEXT TAKE</span><Check size={18} /></div>
                <p>{getFocusCategoryLabel(state.review.focus.category, state.review.focus.customCategory)}</p>
                <strong>{state.review.focus.action}</strong>
                <Link href="/gym">Practice this focus <ArrowRight size={17} /></Link>
              </article>
            ) : (
              <article className="focus-prompt-card">
                <Target size={28} />
                <strong>The review is not finished until one focus is saved.</strong>
                <p>A category names the area. The action sentence tells you exactly what to do differently.</p>
              </article>
            )}

            {allModesDone && (
              <article className="review-metrics-card">
                <p className="home-kicker">What the passes found</p>
                <div>
                  <span><strong>{averageRating}</strong><small>INTENTION AVG</small></span>
                  <span><strong>{metrics.wpm || "—"}</strong><small>WORDS / MIN</small></span>
                  <span><strong>{metrics.nonWords + metrics.fillers}</strong><small>VERBAL FILLERS</small></span>
                  <span><strong>{state.review.behaviorTags.length}</strong><small>VISUAL TAGS</small></span>
                </div>
              </article>
            )}
          </aside>
        </section>
      )}
    </AppShell>
  );
}

interface AudioTaskProps {
  goals: string[];
  ratings: Record<string, number>;
  tonalityRating: number | null;
  onRate: (goal: string, rating: number) => void;
  onRateTonality: (rating: number) => void;
}

function AudioTask({ goals, ratings, tonalityRating, onRate, onRateTonality }: AudioTaskProps) {
  return (
    <>
      <p className="eyebrow">Step 1 · Listen only</p>
      <h2>{goals.length ? "Did the voice embody your intention?" : "What feeling did the voice create?"}</h2>
      <p>Listen once without taking notes. On the second pass, notice pace, volume, melody, pauses, and the feeling underneath the words.</p>
      {goals.length > 0 && (
        <div className="rating-table">
          {goals.map((goal) => (
            <div key={goal}>
              <strong>{goal}</strong>
              <div>{[1, 2, 3, 4, 5].map((rating) => (
                <button aria-label={`${goal}: ${rating} out of 5`} className={ratings[goal] === rating ? "selected" : ""} key={rating} onClick={() => onRate(goal, rating)}>{rating}</button>
              ))}</div>
            </div>
          ))}
        </div>
      )}
      <div className="review-tonality">
        <div><strong>Tonality</strong><small>How clearly did a deliberate feeling come through? This is a self-rating, not a browser measurement.</small></div>
        <div className="tonality-rating" aria-label="Tonality self-rating">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button aria-label={`Tonality: ${rating} out of 5`} className={tonalityRating === rating ? "selected" : ""} key={rating} onClick={() => onRateTonality(rating)}>{rating}</button>
          ))}
        </div>
      </div>
    </>
  );
}

interface VisualTaskProps {
  tags: string[];
  other: string;
  none: boolean;
  onToggle: (tag: string) => void;
  onOther: (value: string) => void;
  onNone: (checked: boolean) => void;
}

function VisualTask({ tags, other, none, onToggle, onOther, onNone }: VisualTaskProps) {
  return (
    <>
      <p className="eyebrow">Step 2 · Watch only</p>
      <h2>Tag movement that does not help the message.</h2>
      <p>Do not label yourself. Label observable behavior.</p>
      <div className="tag-list">{BEHAVIOR_TAGS.map((tag) => (
        <button className={tags.includes(tag) ? "selected" : ""} key={tag} onClick={() => onToggle(tag)}><Tags size={14} />{tag}</button>
      ))}</div>
      <label className="field-label">Other observation<textarea value={other} onChange={(event) => onOther(event.target.value)} placeholder="Something specific you could see…" /></label>
      <label className="check-line"><input type="checkbox" checked={none} onChange={(event) => onNone(event.target.checked)} /><span>No distracting behavior stood out this time.</span></label>
    </>
  );
}

interface TranscriptTaskProps {
  transcript: string;
  metrics: ReturnType<typeof getTranscriptMetrics>;
  eslMode: boolean;
  tenseFlags: ReturnType<typeof findTenseFlags>;
  onChange: (value: string) => void;
  onToggleEsl: (enabled: boolean) => void;
}

function TranscriptTask({ transcript, metrics, eslMode, tenseFlags, onChange, onToggleEsl }: TranscriptTaskProps) {
  return (
    <>
      <p className="eyebrow">Step 3 · Read only</p>
      <h2>Look for friction in the language.</h2>
      <p>Review the automatic transcript, or paste one if live transcription was off. Counts update locally as you type.</p>
      <label className="field-label">Transcript<textarea className="tall" value={transcript} onChange={(event) => onChange(event.target.value)} placeholder="Paste or type the words from your recording…" /></label>
      <div className="mini-metrics">
        <span><strong>{metrics.words}</strong> words</span>
        <span><strong>{metrics.wpm || "—"}</strong> WPM</span>
        <span><strong>{metrics.nonWords + metrics.fillers}</strong> verbal fillers</span>
      </div>
      <label className="switch-line esl-switch">
        <input type="checkbox" checked={eslMode} onChange={(event) => onToggleEsl(event.target.checked)} />
        <span><strong>ESL tense check</strong><small>Highlights simple time-marker conflicts. This is a writing prompt, not a grammar verdict.</small></span>
      </label>
      {eslMode && (
        <div className="tense-findings">
          <strong>{tenseFlags.length ? `${tenseFlags.length} sentence${tenseFlags.length === 1 ? "" : "s"} to check` : "No obvious time-marker conflicts"}</strong>
          {tenseFlags.map((flag) => <p key={`${flag.sentenceIndex}-${flag.sentence}`}><q>{flag.sentence}</q><span>{flag.reason}</span></p>)}
        </div>
      )}
    </>
  );
}
