"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Dumbbell, Eye, ListTree, Mic2, Pause, Play, RefreshCcw, Sparkles, Target, TimerReset, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLocalState } from "@/hooks/useLocalState";
import { RANDOM_WORDS, WARMUPS } from "@/lib/constants";
import { getPracticeRecommendation, type PracticeExerciseId, type PracticeRecommendation } from "@/lib/practice";
import type { FrameworkKind } from "@/types/gym";

function localDay(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const frameworkFields: Record<FrameworkKind, Array<{ id: string; label: string; placeholder: string }>> = {
  ccc: [
    { id: "context", label: "Context", placeholder: "What does the listener need to know?" },
    { id: "core", label: "Core", placeholder: "What is the one point you need to land?" },
    { id: "connect", label: "Connect", placeholder: "Why does it matter, and what should happen next?" },
  ],
  "321": [
    { id: "three", label: "3 key points", placeholder: "The three facts or ideas…" },
    { id: "two", label: "2 implications", placeholder: "The two consequences or lessons…" },
    { id: "one", label: "1 clear ask", placeholder: "The one action you want…" },
  ],
};

const warmupThresholds = WARMUPS.map((_, index) => WARMUPS.slice(0, index + 1).reduce((sum, warmup) => sum + warmup.seconds, 0));

export default function GymPage() {
  const { state, update } = useLocalState();
  const [word, setWord] = useState(RANDOM_WORDS[0]);
  const [drillSeconds, setDrillSeconds] = useState(60);
  const [drillActive, setDrillActive] = useState(false);
  const [warmupSeconds, setWarmupSeconds] = useState(300);
  const [warmupActive, setWarmupActive] = useState(false);
  const [visualSeconds, setVisualSeconds] = useState(90);
  const [visualActive, setVisualActive] = useState(false);
  const [customExercise, setCustomExercise] = useState<Exclude<PracticeExerciseId, "choose"> | null>(null);
  const completedToday = state.gym.lastDrillDay === localDay();
  const recommendation = getPracticeRecommendation(state.review.focus);
  const recommendedExercise = recommendation?.exercise === "choose" ? customExercise : recommendation?.exercise ?? null;
  const warmupElapsed = 300 - warmupSeconds;
  const activeWarmup = useMemo(() => warmupThresholds.findIndex((threshold) => warmupElapsed < threshold), [warmupElapsed]);

  const completeDrill = useCallback((): void => {
    const today = localDay();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = localDay(yesterdayDate);
    update((current) => {
      if (current.gym.lastDrillDay === today) return current;
      return { ...current, gym: { ...current.gym, drillCount: current.gym.drillCount + 1, streak: current.gym.lastDrillDay === yesterday ? current.gym.streak + 1 : 1, lastDrillDay: today } };
    });
  }, [update]);

  useEffect(() => {
    if (!drillActive) return;
    const interval = window.setInterval(() => setDrillSeconds((seconds) => {
      if (seconds <= 1) {
        window.clearInterval(interval);
        setDrillActive(false);
        completeDrill();
        return 0;
      }
      return seconds - 1;
    }), 1000);
    return () => window.clearInterval(interval);
  }, [completeDrill, drillActive]);

  useEffect(() => {
    if (!warmupActive) return;
    const interval = window.setInterval(() => setWarmupSeconds((seconds) => {
      if (seconds <= 1) {
        window.clearInterval(interval);
        setWarmupActive(false);
        update((current) => ({ ...current, gym: { ...current.gym, warmupsDone: WARMUPS.map((warmup) => warmup.id) } }));
        return 0;
      }
      return seconds - 1;
    }), 1000);
    return () => window.clearInterval(interval);
  }, [update, warmupActive]);

  useEffect(() => {
    if (!visualActive) return;
    const interval = window.setInterval(() => setVisualSeconds((seconds) => {
      if (seconds <= 1) {
        window.clearInterval(interval);
        setVisualActive(false);
        return 0;
      }
      return seconds - 1;
    }), 1000);
    return () => window.clearInterval(interval);
  }, [visualActive]);

  function nextWord(): void {
    const candidates = RANDOM_WORDS.filter((item) => item !== word);
    setWord(candidates[Math.floor(Math.random() * candidates.length)]);
    setDrillSeconds(60);
    setDrillActive(false);
  }

  function changeFramework(kind: FrameworkKind): void {
    update((current) => ({ ...current, gym: { ...current.gym, framework: { ...current.gym.framework, kind } } }));
  }

  function changeFrameworkField(id: string, value: string): void {
    update((current) => ({ ...current, gym: { ...current.gym, framework: { ...current.gym.framework, fields: { ...current.gym.framework.fields, [id]: value } } } }));
  }

  function toggleWarmup(id: string): void {
    update((current) => ({ ...current, gym: { ...current.gym, warmupsDone: current.gym.warmupsDone.includes(id) ? current.gym.warmupsDone.filter((item) => item !== id) : [...current.gym.warmupsDone, id] } }));
  }

  function startRecommendedExercise(exercise: Exclude<PracticeExerciseId, "choose">): void {
    if (exercise === "pause-rep") {
      if (drillSeconds === 0) setDrillSeconds(60);
      setDrillActive(true);
      return;
    }
    if (exercise === "framework") {
      document.getElementById("framework")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (exercise === "warmup") {
      if (warmupSeconds === 0) {
        setWarmupSeconds(300);
        update((current) => ({ ...current, gym: { ...current.gym, warmupsDone: [] } }));
      }
      setWarmupActive(true);
      return;
    }
    if (visualSeconds === 0) setVisualSeconds(90);
    setVisualActive(true);
  }

  return (
    <AppShell active="gym" tone="light" eyebrow="Practice library" title="Repeat one change until it feels available." aside={<div className="streak-pill"><Trophy size={17} /><strong>{state.gym.streak}</strong><span>DAY STREAK</span></div>}>
      {recommendation ? (
        <PracticePrescription
          recommendation={recommendation}
          activeExercise={recommendedExercise}
          word={word}
          drillSeconds={drillSeconds}
          visualSeconds={visualSeconds}
          warmupSeconds={warmupSeconds}
          onChoose={setCustomExercise}
          onStart={startRecommendedExercise}
        />
      ) : (
        <section className="practice-intro">
          <Target size={22} />
          <div><strong>No focus saved yet.</strong><p>Choose any exercise below, or complete a review to get one recommendation for your next take.</p></div>
        </section>
      )}

      <div className="library-divider"><span>COMPLETE LIBRARY</span><i /></div>
      <section className="gym-grid">
        <article className="word-drill panel" id="pause-rep">
          <div className="panel-heading"><div><p className="eyebrow">Mind-to-mouth</p><h2>Speak before the perfect answer arrives.</h2></div><button className="icon-button" onClick={nextWord} aria-label="Draw a different word"><RefreshCcw size={18} /></button></div>
          <div className={drillActive ? "word-ticket active" : "word-ticket"}><span>YOUR WORD</span><strong>{word}</strong><time>{formatTime(drillSeconds)}</time></div>
          <p>Connect this word to a story, a lesson, or an opinion. Keep talking for the full minute; fillers can become pauses.</p>
          <div className="button-row">
            <button className="button primary" disabled={drillActive} onClick={() => { if (drillSeconds === 0) setDrillSeconds(60); setDrillActive(true); }}><Play size={17} /> {completedToday ? "Practice again" : drillSeconds < 60 ? "Resume" : "Start 60 seconds"}</button>
            <button className="button secondary" disabled={!drillActive} onClick={() => setDrillActive(false)}><Pause size={17} /> Pause</button>
            <button className="button secondary" onClick={nextWord}><TimerReset size={17} /> Reset</button>
          </div>
          {completedToday && <p className="inline-message"><Check size={16} />The full minute counted toward your streak.</p>}
        </article>

        <article className="panel framework-builder" id="framework">
          <div className="panel-heading"><div><p className="eyebrow">Framework builder</p><h2>Give the thought a spine.</h2></div><Dumbbell size={22} /></div>
          <div className="segmented-control">{(["ccc", "321"] as FrameworkKind[]).map((kind) => <button key={kind} className={state.gym.framework.kind === kind ? "active" : ""} onClick={() => changeFramework(kind)}>{kind === "ccc" ? "CCC" : "3–2–1"}</button>)}</div>
          <label className="field-label">Topic<input value={state.gym.framework.topic} onChange={(event) => update((current) => ({ ...current, gym: { ...current.gym, framework: { ...current.gym.framework, topic: event.target.value } } }))} placeholder="e.g. Why the project is delayed" /></label>
          <div className="framework-fields">{frameworkFields[state.gym.framework.kind].map((field) => <label key={field.id}><span>{field.label}</span><textarea value={state.gym.framework.fields[field.id] ?? ""} onChange={(event) => changeFrameworkField(field.id, event.target.value)} placeholder={field.placeholder} /></label>)}</div>
        </article>
      </section>

      <section className="warmup-studio" id="warmup">
        <div className="warmup-heading"><div><p className="eyebrow">Five-minute vocal warm-up</p><h2>Prepare the instrument, not the performance.</h2><p>A short guided sequence for breath, articulation, range, and jaw release.</p></div><div className="warmup-clock"><span>{formatTime(warmupSeconds)}</span><button className="button primary" onClick={() => { if (warmupSeconds === 0) { setWarmupSeconds(300); update((current) => ({ ...current, gym: { ...current.gym, warmupsDone: [] } })); } setWarmupActive((active) => !active); }}>{warmupActive ? <Pause size={17} /> : <Play size={17} />}{warmupActive ? "Pause sequence" : warmupSeconds === 0 ? "Run again" : "Start sequence"}</button></div></div>
        <div className="warmup-list">{WARMUPS.map((warmup, index) => { const done = state.gym.warmupsDone.includes(warmup.id) || (warmupActive && index < activeWarmup); const active = warmupActive && index === activeWarmup; return <button className={`${done ? "done" : ""} ${active ? "active" : ""}`} key={warmup.id} onClick={() => toggleWarmup(warmup.id)}><span className="warmup-number">{done ? <Check size={17} /> : index + 1}</span><div><strong>{warmup.title}</strong><p>{warmup.detail}</p></div><time>{Math.floor(warmup.seconds / 60)}:{String(warmup.seconds % 60).padStart(2, "0")}</time>{active && <Sparkles size={17} />}</button>; })}</div>
      </section>
    </AppShell>
  );
}

interface PracticePrescriptionProps {
  recommendation: PracticeRecommendation;
  activeExercise: Exclude<PracticeExerciseId, "choose"> | null;
  word: string;
  drillSeconds: number;
  visualSeconds: number;
  warmupSeconds: number;
  onChoose: (exercise: Exclude<PracticeExerciseId, "choose">) => void;
  onStart: (exercise: Exclude<PracticeExerciseId, "choose">) => void;
}

const exerciseChoices: Array<{ id: Exclude<PracticeExerciseId, "choose">; label: string; icon: typeof Target }> = [
  { id: "pause-rep", label: "Pause rep", icon: TimerReset },
  { id: "framework", label: "Framework", icon: ListTree },
  { id: "warmup", label: "Voice warm-up", icon: Mic2 },
  { id: "visual", label: "Body rehearsal", icon: Eye },
];

function PracticePrescription({ recommendation, activeExercise, word, drillSeconds, visualSeconds, warmupSeconds, onChoose, onStart }: PracticePrescriptionProps) {
  const selected = activeExercise ?? (recommendation.exercise === "choose" ? null : recommendation.exercise);
  const selectedCategory = selected === "pause-rep" ? "pause" : selected === "framework" ? "structure" : selected === "warmup" ? "voice" : "visual";
  const selectedRecommendation = selected
    ? getPracticeRecommendation({ category: selectedCategory, customCategory: "", action: recommendation.focusAction })
    : null;
  const display = recommendation.exercise === "choose" ? selectedRecommendation ?? recommendation : recommendation;
  const liveValue = selected === "pause-rep"
    ? `${word} · ${formatTime(drillSeconds)}`
    : selected === "warmup"
      ? formatTime(warmupSeconds)
      : selected === "visual"
        ? formatTime(visualSeconds)
        : "CCC / 3–2–1";

  return (
    <section className="practice-prescription" id="recommended" aria-labelledby="practice-recommendation-title">
      <div className="prescription-focus">
        <span>YOUR ONE FOCUS · {recommendation.focusLabel}</span>
        <strong>{recommendation.focusAction}</strong>
      </div>
      <article>
        <div className="prescription-copy">
          <p>{display.label}</p>
          <h2 id="practice-recommendation-title">{display.title}</h2>
          <span>{display.instruction}</span>
        </div>
        {recommendation.exercise === "choose" && (
          <div className="prescription-choices" aria-label="Choose a recommended exercise">
            {exerciseChoices.map((choice) => {
              const Icon = choice.icon;
              return <button type="button" className={selected === choice.id ? "selected" : ""} key={choice.id} onClick={() => onChoose(choice.id)}><Icon size={16} />{choice.label}</button>;
            })}
          </div>
        )}
        <div className="prescription-action">
          <strong>{liveValue}</strong>
          <button className="button primary" disabled={!selected} onClick={() => selected && onStart(selected)}><Play size={17} />{display.actionLabel}</button>
        </div>
      </article>
    </section>
  );
}
