"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, AudioLines, Check, Clock3, Gauge, LoaderCircle, Mic2, Palette, RefreshCcw, ShieldCheck, Sparkles, Target, Waves } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LineChart, PauseMap } from "@/components/CoachCharts";
import { useLocalState } from "@/hooks/useLocalState";
import { analyzeRecording } from "@/lib/audio/analysis";
import { buildTrainingPlan, getFoundationScores, PROFILE_COPY } from "@/lib/coach";
import { getRecording } from "@/lib/storage/db";
import type { AnalysisHistoryItem, ProfileColor } from "@/types/coach";

type CoachView = "foundations" | "plan" | "profile";

const profileQuestions: Array<{ id: string; prompt: string; options: Record<ProfileColor, string> }> = [
  { id: "decision", prompt: "When a group is stuck, I usually…", options: { red: "Choose a direction", yellow: "Create fresh energy", green: "Make space for everyone", blue: "Find the missing facts" } },
  { id: "meeting", prompt: "In a meeting, people rely on me to…", options: { red: "Keep momentum", yellow: "Build connection", green: "Keep the room steady", blue: "Make the logic precise" } },
  { id: "pressure", prompt: "Under pressure, I become more…", options: { red: "Direct", yellow: "Expressive", green: "Accommodating", blue: "Detailed" } },
  { id: "message", prompt: "A strong message should first be…", options: { red: "Actionable", yellow: "Memorable", green: "Considerate", blue: "Accurate" } },
  { id: "conflict", prompt: "During disagreement, my instinct is to…", options: { red: "Resolve it now", yellow: "Reframe possibilities", green: "Lower the temperature", blue: "Test each claim" } },
  { id: "feedback", prompt: "The feedback I value most is…", options: { red: "Tell me what to change", yellow: "Tell me what landed", green: "Tell me how it affected people", blue: "Show me the evidence" } },
];

export default function CoachPage() {
  const { state, update } = useLocalState();
  const [view, setView] = useState<CoachView>("foundations");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "running">("idle");
  const [analysisError, setAnalysisError] = useState("");
  const analysis = state.coach.current;
  const reviewDone = Object.values(state.review.completed).every(Boolean) && Boolean(state.review.reflection.trim());
  const scores = useMemo(() => analysis ? getFoundationScores(analysis, state.coach.calibration, state.coach.tonalityRating) : [], [analysis, state.coach.calibration, state.coach.tonalityRating]);
  const trainingPlan = useMemo(() => buildTrainingPlan(scores), [scores]);

  async function analyze(): Promise<void> {
    if (!state.diagnostic.recordedAt) return;
    setAnalysisError("");
    setAnalysisStatus("running");
    try {
      const blob = await getRecording();
      if (!blob) throw new Error("The saved recording is missing from this browser.");
      const result = await analyzeRecording(blob, {
        recordedAt: state.diagnostic.recordedAt,
        transcript: state.diagnostic.transcript,
        transcriptSegments: state.diagnostic.transcriptSegments,
        fallbackDurationSeconds: state.diagnostic.durationSeconds,
      });
      update((current) => {
        const historyItem: AnalysisHistoryItem = {
          sourceRecordedAt: result.sourceRecordedAt,
          analyzedAt: result.analyzedAt,
          wpm: result.transcript.wpm,
          overallRms: result.overallRms,
          pitchStdDevHz: result.pitchStdDevHz,
          pauseSeconds: result.totalPauseSeconds,
          tonalityRating: current.coach.tonalityRating,
        };
        const history = [...current.coach.history.filter((item) => item.sourceRecordedAt !== result.sourceRecordedAt), historyItem].slice(-20);
        return { ...current, coach: { ...current.coach, current: result, history } };
      });
    } catch (caught) {
      setAnalysisError(caught instanceof Error ? caught.message : "The recording could not be analyzed.");
    } finally {
      setAnalysisStatus("idle");
    }
  }

  function rateTonality(rating: number): void {
    update((current) => ({
      ...current,
      coach: {
        ...current.coach,
        tonalityRating: rating,
        history: current.coach.history.map((item) => item.sourceRecordedAt === current.diagnostic.recordedAt ? { ...item, tonalityRating: rating } : item),
      },
    }));
  }

  function answerProfile(questionId: string, color: ProfileColor): void {
    update((current) => {
      const answers = { ...current.coach.profiler.answers, [questionId]: color };
      const complete = profileQuestions.every((question) => answers[question.id]);
      const counts: Record<ProfileColor, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
      Object.values(answers).forEach((answer) => { counts[answer] += 1; });
      const result = complete ? (Object.entries(counts).sort((left, right) => right[1] - left[1])[0][0] as ProfileColor) : null;
      return { ...current, coach: { ...current.coach, profiler: { answers, result } } };
    });
  }

  return (
    <AppShell active="coach" eyebrow="Act IV · On-device coach" title="Turn the take into one useful change." aside={<div className="coach-privacy"><ShieldCheck size={16} /> ANALYZED IN THIS BROWSER</div>}>
      <div className="coach-tabs" role="tablist" aria-label="Coach sections">
        <button role="tab" aria-selected={view === "foundations"} className={view === "foundations" ? "active" : ""} onClick={() => setView("foundations")}><AudioLines size={17} /> Foundations</button>
        <button role="tab" aria-selected={view === "plan"} className={view === "plan" ? "active" : ""} onClick={() => setView("plan")}><Target size={17} /> 4-Week Plan</button>
        <button role="tab" aria-selected={view === "profile"} className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}><Palette size={17} /> Color Profile</button>
      </div>

      {view === "foundations" && <FoundationsView state={state} reviewDone={reviewDone} analysisStatus={analysisStatus} analysisError={analysisError} scores={scores} onAnalyze={() => void analyze()} onRateTonality={rateTonality} />}
      {view === "plan" && <PlanView hasAnalysis={Boolean(analysis)} plan={trainingPlan} />}
      {view === "profile" && <ProfileView answers={state.coach.profiler.answers} result={state.coach.profiler.result} onAnswer={answerProfile} />}
    </AppShell>
  );
}

interface FoundationsViewProps {
  state: ReturnType<typeof useLocalState>["state"];
  reviewDone: boolean;
  analysisStatus: "idle" | "running";
  analysisError: string;
  scores: ReturnType<typeof getFoundationScores>;
  onAnalyze: () => void;
  onRateTonality: (rating: number) => void;
}

function FoundationsView({ state, reviewDone, analysisStatus, analysisError, scores, onAnalyze, onRateTonality }: FoundationsViewProps) {
  const analysis = state.coach.current;
  if (!state.diagnostic.hasRecording) return <section className="empty-state large"><Gauge size={48} /><h2>The Coach needs a real take.</h2><p>Record a diagnostic first. The browser analyzes the saved audio only after the Mirror review.</p><Link className="button primary" href="/diagnostic">Record a baseline <ArrowRight size={17} /></Link></section>;
  if (!reviewDone) return <section className="empty-state large"><Clock3 size={48} /><h2>Review before measuring.</h2><p>The isolated-channel review protects the method from becoming a score chase. Finish it before opening the Coach.</p><Link className="button primary" href="/review">Finish the review <ArrowRight size={17} /></Link></section>;
  if (!analysis) return <section className="coach-start panel"><div className="analysis-disc"><Waves size={48} /></div><p className="eyebrow">One-time local analysis</p><h2>Decode the saved audio on this device.</h2><p>Mirror will measure rate, RMS volume, silences longer than 700ms, and best-effort pitch movement. The recording does not leave the browser.</p><div className="coach-start-actions"><button className="button primary large" disabled={analysisStatus === "running"} onClick={onAnalyze}>{analysisStatus === "running" ? <LoaderCircle className="spin" size={18} /> : <Activity size={18} />}{analysisStatus === "running" ? "Analyzing the take…" : "Analyze my recording"}</button><Link className="button secondary" href="/calibration"><Mic2 size={17} /> Calibrate volume</Link></div>{analysisError && <p className="status-banner error" role="alert">{analysisError}</p>}</section>;

  const volumeInsight = state.coach.calibration.targetRms ? `Average projection reached ${Math.round((analysis.overallRms / state.coach.calibration.targetRms) * 100)}% of your Level 5 target.` : "Calibrate the microphone to turn relative RMS into a personal projection target.";
  const pitchInsight = analysis.pitchStdDevHz === null ? "Not enough stable pitch was detected." : `Median ${Math.round(analysis.pitchMedianHz ?? 0)} Hz with ${Math.round(analysis.pitchStdDevHz)} Hz variation.`;
  const paceInsight = analysis.paceSeries.length ? "Thirty-second WPM estimates from live transcript checkpoints." : "No transcript timestamps were captured; overall WPM is still shown above.";
  return <>
    <section className="coach-control panel"><div><p className="eyebrow">Current take</p><h2>{new Date(analysis.sourceRecordedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</h2><p>Analyzed {new Date(analysis.analyzedAt).toLocaleString()}</p></div><div className="coach-control-actions"><Link className="button secondary" href="/calibration"><Mic2 size={17} /> {state.coach.calibration.baselineRms ? "Recalibrate" : "Calibrate volume"}</Link><button className="button secondary" disabled={analysisStatus === "running"} onClick={onAnalyze}><RefreshCcw size={17} /> Analyze again</button></div></section>
    {analysisError && <p className="status-banner error" role="alert">{analysisError}</p>}
    <section className="foundation-grid">{scores.map((score) => <article className="foundation-card" key={score.id}><div className="foundation-top"><span>{score.label}</span><small>{score.confidence}</small></div><strong>{score.value}</strong><div className="score-track" aria-label={`${score.label} score ${score.score ?? "unavailable"} out of 100`}>{score.score === null ? <i className="missing" /> : <i style={{ width: `${score.score}%` }} />}</div><p>{score.advice}</p>{score.id === "tonality" && <div className="tonality-rating" aria-label="Tonality self-rating">{[1,2,3,4,5].map((rating) => <button className={state.coach.tonalityRating === rating ? "selected" : ""} key={rating} onClick={() => onRateTonality(rating)}>{rating}</button>)}</div>}</article>)}</section>
    <section className="coach-chart-grid"><LineChart id="volume-chart" title="Projection changed across the take" insight={volumeInsight} points={analysis.volumeSeries.map((point) => ({ ...point, value: point.value * 1000 }))} duration={analysis.durationSeconds} unit="rel." startAtZero /><PauseMap pauses={analysis.pauses} duration={analysis.durationSeconds} /><LineChart id="pitch-chart" title="Melody moved instead of staying on one key" insight={pitchInsight} points={analysis.pitchSeries} duration={analysis.durationSeconds} unit="Hz" color="#9cb58b" experimental /><LineChart id="pace-chart" title="Pace by 30-second window" insight={paceInsight} points={analysis.paceSeries} duration={analysis.durationSeconds} unit="WPM" color="#d58e72" startAtZero /></section>
    <section className="experimental-note"><Sparkles size={18} /><div><strong>Pitch and uptalk are experimental.</strong><p>The browser found {analysis.voicedFrames} usable pitch frames and {analysis.uptalkRising} rising endings among {analysis.uptalkCandidates} candidates. Room noise, microphone processing, accent, and voice type can change these estimates.</p></div></section>
    {state.coach.history.length >= 2 && <HistoryTable history={state.coach.history} />}
  </>;
}

function PlanView({ hasAnalysis, plan }: { hasAnalysis: boolean; plan: ReturnType<typeof buildTrainingPlan> }) {
  if (!hasAnalysis) return <section className="empty-state large"><Target size={48} /><h2>Measure before planning.</h2><p>The four-week sequence is generated from the weakest measured foundations, not generic advice.</p></section>;
  return <section className="training-plan"><header><p className="eyebrow">Rule-based · No AI prompt</p><h2>Four weeks. One foundation at a time.</h2><p>The weakest signal comes first. Repeat the diagnostic after week four and let the next plan re-rank itself.</p></header><div className="training-weeks">{plan.map((item) => <article key={item.week}><span>WEEK {item.week}</span><small>{item.foundation}</small><h3>{item.title}</h3><p>{item.drill}</p><div><Check size={16} /><strong>{item.success}</strong></div></article>)}</div><Link className="button primary" href="/gym">Start today’s rep <ArrowRight size={17} /></Link></section>;
}

interface ProfileViewProps { answers: Record<string, ProfileColor>; result: ProfileColor | null; onAnswer: (questionId: string, color: ProfileColor) => void; }
function ProfileView({ answers, result, onAnswer }: ProfileViewProps) {
  const answered = Object.keys(answers).length;
  return <section className="profile-layout"><div className="profile-intro"><p className="eyebrow">Communication preference · Not personality science</p><h2>How do you naturally enter a room?</h2><p>Choose the response that is most like you—not the one that sounds best. This lightweight profile adapts practice advice; it does not diagnose personality.</p><div className="profile-progress"><span style={{ width: `${(answered / profileQuestions.length) * 100}%` }} /></div><small>{answered} of {profileQuestions.length} answered</small>{result && <article className={`profile-result ${result}`}><span>{result.toUpperCase()}</span><h3>{PROFILE_COPY[result].name}</h3><p><strong>Strength:</strong> {PROFILE_COPY[result].strength}</p><p><strong>Watch:</strong> {PROFILE_COPY[result].watch}</p><p><strong>Adapt:</strong> {PROFILE_COPY[result].adapt}</p></article>}</div><div className="profile-questions">{profileQuestions.map((question, index) => <fieldset key={question.id}><legend><span>{index + 1}</span>{question.prompt}</legend><div>{(Object.entries(question.options) as Array<[ProfileColor,string]>).map(([color, label]) => <button type="button" className={`${color} ${answers[question.id] === color ? "selected" : ""}`} key={color} onClick={() => onAnswer(question.id, color)}><i />{label}</button>)}</div></fieldset>)}</div></section>;
}

function HistoryTable({ history }: { history: AnalysisHistoryItem[] }) {
  return <section className="history-panel panel"><p className="eyebrow">Trend ledger</p><h2>Evidence across diagnostics</h2><p>History stores summary numbers only; earlier videos are not archived.</p><div className="history-table-wrap"><table><thead><tr><th>Take</th><th>Rate</th><th>Volume RMS</th><th>Pitch variation</th><th>White space</th><th>Tonality</th></tr></thead><tbody>{history.map((item) => <tr key={item.sourceRecordedAt}><td>{new Date(item.sourceRecordedAt).toLocaleDateString()}</td><td>{item.wpm || "—"} WPM</td><td>{item.overallRms.toFixed(4)}</td><td>{item.pitchStdDevHz === null ? "—" : `${Math.round(item.pitchStdDevHz)} Hz`}</td><td>{item.pauseSeconds.toFixed(1)}s</td><td>{item.tonalityRating ? `${item.tonalityRating}/5` : "—"}</td></tr>)}</tbody></table></div></section>;
}

