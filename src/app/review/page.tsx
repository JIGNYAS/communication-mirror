"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3, Gauge, LockKeyhole, RotateCcw, Tags, Volume2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TranscriptMarkup } from "@/components/TranscriptMarkup";
import { useCountdown } from "@/hooks/useCountdown";
import { useLocalState } from "@/hooks/useLocalState";
import { BEHAVIOR_TAGS } from "@/lib/constants";
import { getRecording } from "@/lib/storage/db";
import { getTranscriptMetrics } from "@/lib/transcript";
import { findTenseFlags } from "@/lib/esl";
import type { ReviewMode } from "@/types/review";

const modes: Array<{ id: ReviewMode; title: string; instruction: string }> = [
  { id: "audio", title: "Blind listen", instruction: "Hear the voice without reading the face." },
  { id: "visual", title: "Mute watch", instruction: "Watch the body without being persuaded by words." },
  { id: "transcript", title: "Read the words", instruction: "See the language without tone or presence." },
];

function formatCountdown(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
export default function ReviewPage() {
  const { state, update, ready } = useLocalState();
  const [mode, setMode] = useState<ReviewMode>("audio");
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState("");
  const [developmentUnlock, setDevelopmentUnlock] = useState(() => process.env.NODE_ENV === "development" && typeof window !== "undefined" && window.location.search.includes("unlock"));
  const remaining = useCountdown(state.diagnostic.lockedUntil);
  const locked = remaining > 0 && !developmentUnlock;
  const metrics = useMemo(() => getTranscriptMetrics(state.diagnostic.transcript, state.diagnostic.durationSeconds), [state.diagnostic.durationSeconds, state.diagnostic.transcript]);
  const averageRating = useMemo(() => {
    const scores = state.goals.map((goal) => state.review.ratings[goal]).filter((rating): rating is number => typeof rating === "number" && rating > 0);
    return scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : "â€”";
  }, [state.goals, state.review.ratings]);
  const allModesDone = Object.values(state.review.completed).every(Boolean);
  const reviewComplete = allModesDone && Boolean(state.review.reflection.trim());
  const tenseFlags = useMemo(() => state.coach.eslMode ? findTenseFlags(state.diagnostic.transcript) : [], [state.coach.eslMode, state.diagnostic.transcript]);
  const modeReady = mode === "audio"
    ? state.goals.length === 5 && state.goals.every((goal) => state.review.ratings[goal]) && Boolean(state.coach.tonalityRating)
    : mode === "visual"
      ? state.review.behaviorTags.length > 0 || Boolean(state.review.behaviorOther.trim()) || state.review.noBehaviorNoticed
      : Boolean(state.diagnostic.transcript.trim());

  useEffect(() => {
    let url = "";
    getRecording().then((blob) => {
      if (!blob) {
        setRecordingError("The saved video is missing from this browser. Start a fresh baseline to continue.");
        return;
      }
      url = URL.createObjectURL(blob);
      setRecordingUrl(url);
    }).catch(() => setRecordingError("The saved video could not be opened from browser storage."));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, []);

  function completeMode(target: ReviewMode): void {
    update((current) => ({ ...current, review: { ...current.review, completed: { ...current.review.completed, [target]: true } } }));
    const index = modes.findIndex((item) => item.id === target);
    if (index < modes.length - 1) setMode(modes[index + 1].id);
  }

  function setRating(goal: string, rating: number): void {
    update((current) => ({ ...current, review: { ...current.review, ratings: { ...current.review.ratings, [goal]: rating } } }));
  }

  function toggleTag(tag: string): void {
    update((current) => ({
      ...current,
      review: {
        ...current.review,
        behaviorTags: current.review.behaviorTags.includes(tag) ? current.review.behaviorTags.filter((item) => item !== tag) : [...current.review.behaviorTags, tag],
        noBehaviorNoticed: false,
      },
    }));
  }

  if (!ready) return <AppShell active="review" eyebrow="Act II Â· The review" title="Opening the saved takeâ€¦"><div className="empty-state"><Clock3 size={34} /><p>Checking this browser for your baseline.</p></div></AppShell>;

  if (!state.diagnostic.hasRecording) {
    return (
      <AppShell active="review" eyebrow="Act II Â· The review" title="There is nothing to judge yet.">
        <section className="empty-state large"><Gauge size={48} /><h2>Record a baseline first.</h2><p>The three review channels open only after a real no-restart take is stored in this browser.</p><Link className="button primary" href="/diagnostic">Go to the Mirror <ArrowRight size={18} /></Link></section>
      </AppShell>
    );
  }

  if (locked) {
    return (
      <AppShell active="review" eyebrow="The kindness buffer" title="The mirror is resting.">
        <section className="countdown-stage">
          <div className="lock-orbit"><LockKeyhole size={42} /></div>
          <p className="countdown-label">REVIEW OPENS IN</p>
          <strong className="countdown-clock">{formatCountdown(remaining)}</strong>
          <h2>Tomorrow, watch the evidenceâ€”not the memory.</h2>
          <p>Immediate review magnifies every moment you felt awkward. The 24-hour distance helps you notice patterns instead of replaying embarrassment.</p>
          <div className="countdown-facts"><span><Clock3 size={17} /> Recorded {state.diagnostic.recordedAt ? new Date(state.diagnostic.recordedAt).toLocaleString() : "today"}</span><span><LockKeyhole size={17} /> Stored only in this browser</span></div>
          {process.env.NODE_ENV === "development" && <button className="button secondary" onClick={() => setDevelopmentUnlock(true)}>Development: review now</button>}
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell active="review" eyebrow="Act II Â· Isolated channels" title="Change one sense. Change what you notice." aside={<div className={reviewComplete ? "completion-pill done" : "completion-pill"}><Check size={16} /> {Object.values(state.review.completed).filter(Boolean).length}/3 PASSES</div>}>
      {recordingError && <p className="status-banner error" role="alert">{recordingError}</p>}
      <div className="review-tabs" role="tablist" aria-label="Review modes">
        {modes.map((item, index) => <button key={item.id} role="tab" aria-selected={mode === item.id} className={mode === item.id ? "active" : ""} onClick={() => setMode(item.id)}><span>{state.review.completed[item.id] ? <Check size={15} /> : index + 1}</span><div><strong>{item.title}</strong><small>{item.instruction}</small></div></button>)}
      </div>

      <section className="review-workspace">
        <div className="review-media panel">
          {mode === "audio" && <div className="audio-stage"><div className="sound-rings" aria-hidden="true"><Volume2 size={46} /></div><p>Screen intentionally hidden</p>{recordingUrl && <audio controls src={recordingUrl} />}</div>}
          {mode === "visual" && <div className="video-review">{recordingUrl && <video controls muted playsInline src={recordingUrl} />}<span>MUTED BY DESIGN</span></div>}
          {mode === "transcript" && <div className="transcript-review"><div className="transcript-legend"><span><i className="non-word" /> NON-WORD</span><span><i className="filler" /> FILLER</span>{state.coach.eslMode && <span><i className="tense" /> TENSE CHECK</span>}</div><TranscriptMarkup text={state.diagnostic.transcript} tenseFlags={tenseFlags} /></div>}
        </div>

        <aside className="review-task panel">
          {mode === "audio" && <AudioTask goals={state.goals} ratings={state.review.ratings} tonalityRating={state.coach.tonalityRating} onRate={setRating} onRateTonality={(rating) => update((current) => ({ ...current, coach: { ...current.coach, tonalityRating: rating } }))} />}
          {mode === "visual" && <VisualTask tags={state.review.behaviorTags} other={state.review.behaviorOther} none={state.review.noBehaviorNoticed} onToggle={toggleTag} onOther={(value) => update((current) => ({ ...current, review: { ...current.review, behaviorOther: value, noBehaviorNoticed: false } }))} onNone={(checked) => update((current) => ({ ...current, review: { ...current.review, noBehaviorNoticed: checked, behaviorTags: checked ? [] : current.review.behaviorTags } }))} />}
          {mode === "transcript" && <TranscriptTask transcript={state.diagnostic.transcript} metrics={metrics} eslMode={state.coach.eslMode} tenseFlags={tenseFlags} onToggleEsl={(enabled) => update((current) => ({ ...current, coach: { ...current.coach, eslMode: enabled } }))} onChange={(value) => update((current) => ({ ...current, diagnostic: { ...current.diagnostic, transcript: value, transcriptSegments: [] }, coach: { ...current.coach, current: null } }))} />}
          <button className="button primary full" onClick={() => completeMode(mode)} disabled={!modeReady}>{state.review.completed[mode] ? "Save and continue" : `Complete ${modes.find((item) => item.id === mode)?.title}`} <ArrowRight size={17} /></button>
        </aside>
      </section>

      <section className="summary-grid">
        <article className="paper-card metrics-summary">
          <p className="eyebrow dark">Baseline summary</p><h2>What the first pass found</h2>
          <div className="metric-row"><span><strong>{averageRating}</strong><small>GOAL AVG / 5</small></span><span><strong>{metrics.wpm || "â€”"}</strong><small>WORDS / MIN</small></span><span><strong>{metrics.nonWords}</strong><small>NON-WORDS</small></span><span><strong>{metrics.fillers}</strong><small>FILLERS</small></span><span><strong>{state.review.behaviorTags.length}</strong><small>VISUAL TAGS</small></span></div>
        </article>
        <article className="panel reflection-panel"><p className="eyebrow">Your next rep</p><h2>Keep one thing. Change one thing.</h2><textarea value={state.review.reflection} onChange={(event) => update((current) => ({ ...current, review: { ...current.review, reflection: event.target.value } }))} placeholder="Next time, I will keepâ€¦ and I will changeâ€¦" />{reviewComplete ? <Link className="button primary" href="/gym">Take it to the gym <ArrowRight size={17} /></Link> : <p className="field-note">Finish all three passes and write a reflection to complete this review.</p>}</article>
      </section>

      <div className="fresh-loop"><RotateCcw size={18} /><span>Ready for a new baseline?</span><Link href="/diagnostic">Return to the Mirror</Link></div>
    </AppShell>
  );
}

interface AudioTaskProps { goals: string[]; ratings: Record<string, number>; tonalityRating: number | null; onRate: (goal: string, rating: number) => void; onRateTonality: (rating: number) => void; }
function AudioTask({ goals, ratings, tonalityRating, onRate, onRateTonality }: AudioTaskProps) {
  return <><p className="eyebrow">Task Â· Listen only</p><h2>Did the voice embody your five words?</h2><p>Listen once without taking notes. On the second pass, score the feelingâ€”not your intention.</p><div className="rating-table">{goals.map((goal) => <div key={goal}><strong>{goal}</strong><div>{[1,2,3,4,5].map((rating) => <button aria-label={`${goal}: ${rating} out of 5`} className={ratings[goal] === rating ? "selected" : ""} key={rating} onClick={() => onRate(goal, rating)}>{rating}</button>)}</div></div>)}</div><div className="review-tonality"><div><strong>Tonality</strong><small>How clearly did the intended feeling come through? This is a self-rating, not a browser measurement.</small></div><div className="tonality-rating" aria-label="Tonality self-rating">{[1,2,3,4,5].map((rating) => <button aria-label={`Tonality: ${rating} out of 5`} className={tonalityRating === rating ? "selected" : ""} key={rating} onClick={() => onRateTonality(rating)}>{rating}</button>)}</div></div></>;
}

interface VisualTaskProps { tags: string[]; other: string; none: boolean; onToggle: (tag: string) => void; onOther: (value: string) => void; onNone: (checked: boolean) => void; }
function VisualTask({ tags, other, none, onToggle, onOther, onNone }: VisualTaskProps) {
  return <><p className="eyebrow">Task Â· Watch only</p><h2>Tag movement that does not help the message.</h2><p>Do not label yourself. Label observable behavior.</p><div className="tag-list">{BEHAVIOR_TAGS.map((tag) => <button className={tags.includes(tag) ? "selected" : ""} key={tag} onClick={() => onToggle(tag)}><Tags size={14} />{tag}</button>)}</div><label className="field-label">Other observation<textarea value={other} onChange={(event) => onOther(event.target.value)} placeholder="Something specific you could seeâ€¦" /></label><label className="check-line"><input type="checkbox" checked={none} onChange={(event) => onNone(event.target.checked)} /><span>No distracting behavior stood out this time.</span></label></>;
}

interface TranscriptTaskProps { transcript: string; metrics: ReturnType<typeof getTranscriptMetrics>; eslMode: boolean; tenseFlags: ReturnType<typeof findTenseFlags>; onChange: (value: string) => void; onToggleEsl: (enabled: boolean) => void; }
function TranscriptTask({ transcript, metrics, eslMode, tenseFlags, onChange, onToggleEsl }: TranscriptTaskProps) {
  return <><p className="eyebrow">Task Â· Read only</p><h2>Look for friction in the language.</h2><p>Paste a transcript if live transcription was off. Counts update locally as you type.</p><label className="field-label">Transcript<textarea className="tall" value={transcript} onChange={(event) => onChange(event.target.value)} placeholder="Paste or type the words from your recordingâ€¦" /></label><div className="mini-metrics"><span><strong>{metrics.words}</strong> words</span><span><strong>{metrics.wpm || "â€”"}</strong> WPM</span><span><strong>{metrics.nonWords + metrics.fillers}</strong> verbal fillers</span></div><label className="switch-line esl-switch"><input type="checkbox" checked={eslMode} onChange={(event) => onToggleEsl(event.target.checked)} /><span><strong>ESL tense check</strong><small>Highlights simple time-marker conflicts. This is a writing prompt, not a grammar verdict.</small></span></label>{eslMode && <div className="tense-findings"><strong>{tenseFlags.length ? `${tenseFlags.length} sentence${tenseFlags.length === 1 ? "" : "s"} to check` : "No obvious time-marker conflicts"}</strong>{tenseFlags.map((flag) => <p key={`${flag.sentenceIndex}-${flag.sentence}`}><q>{flag.sentence}</q><span>{flag.reason}</span></p>)}</div>}</>;
}

