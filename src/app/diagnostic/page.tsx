"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Check, ChevronDown, ChevronRight, CircleStop, Clock3, Download, LockKeyhole, Mic2, RefreshCcw, ShieldCheck, Video } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLocalState } from "@/hooks/useLocalState";
import { useRecorder, type RecorderCapture } from "@/hooks/useRecorder";
import { DIAGNOSTIC_PROMPTS, DIAGNOSTIC_SECONDS, GOAL_SUGGESTIONS, LOCK_HOURS } from "@/lib/constants";
import { requestCameraAndMic } from "@/lib/media/recorder";
import { canTranscribe, startLiveTranscription } from "@/lib/media/transcription";
import { deleteRecording, putRecording } from "@/lib/storage/db";
import { normalizeIntentions } from "@/lib/intentions";
import type { TranscriptSegment } from "@/types/coach";

type RecorderPhase = "setup" | "ready" | "recording" | "saving" | "locked";

const subscribeToBrowserCapabilities = () => () => undefined;
const browserCapabilityUnavailable = () => false;

function formatTime(total: number): string {
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

export default function DiagnosticPage() {
  const { state, update } = useLocalState();
  const [draftGoals, setDraftGoals] = useState<string[] | null>(null);
  const [phase, setPhase] = useState<RecorderPhase | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [transcriptionOptIn, setTranscriptionOptIn] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState(state.diagnostic.transcript);
  const [error, setError] = useState("");
  const [recoveryBlob, setRecoveryBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const elapsedRef = useRef(0);
  const transcriptRef = useRef(state.diagnostic.transcript);
  const transcriptSegmentsRef = useRef<TranscriptSegment[]>(state.diagnostic.transcriptSegments);
  const stopTranscriptionRef = useRef<() => void>(() => undefined);
  const { startRecording, stopRecording, requestDraftFlush, discardRecoveryDraft, recoveryDraft, recorderError, draftWarning } = useRecorder();
  const transcriptionAvailable = useSyncExternalStore(subscribeToBrowserCapabilities, canTranscribe, browserCapabilityUnavailable);
  const goalDrafts = draftGoals ?? [...state.goals, "", "", "", "", ""].slice(0, 5);
  const activePhase = phase ?? (state.diagnostic.hasRecording ? "locked" : "setup");
  const enteredGoals = goalDrafts.map((goal) => goal.trim()).filter(Boolean);
  const savedGoals = normalizeIntentions(goalDrafts);
  const hasDuplicateGoals = savedGoals.length !== enteredGoals.length;

  useEffect(() => {
    const video = videoRef.current;
    if (video && streamRef.current) video.srcObject = streamRef.current;
  }, [activePhase]);

  const persistTake = useCallback(async (capture: RecorderCapture): Promise<void> => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const now = Date.now();
    const lockedUntil = now + LOCK_HOURS * 60 * 60 * 1000;
    try {
      await putRecording(capture.blob);
      await discardRecoveryDraft();
      update((current) => ({
        ...current,
        diagnostic: { recordedAt: now, durationSeconds: capture.durationSeconds, lockedUntil, transcript: transcriptRef.current, transcriptSegments: transcriptSegmentsRef.current, hasRecording: true },
        review: { completed: { audio: false, visual: false, transcript: false }, ratings: {}, behaviorTags: [], behaviorOther: "", noBehaviorNoticed: false, reflection: "" },
        coach: { ...current.coach, current: null },
      }));
      setPhase("locked");
    } catch {
      setRecoveryBlob(capture.blob);
      setError("The take was captured, but this browser could not store it. Download the recovery copy before leaving this page.");
      setPhase("setup");
    }
  }, [discardRecoveryDraft, update]);

  const finishRecording = useCallback(async () => {
    setPhase("saving");
    stopTranscriptionRef.current();
    try {
      await persistTake(await stopRecording());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The recording could not be finalized.");
      setPhase("setup");
    }
  }, [persistTake, stopRecording]);

  useEffect(() => {
    if (activePhase !== "recording") return;
    const interval = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= DIAGNOSTIC_SECONDS) void finishRecording();
    }, 1000);
    const warn = (event: BeforeUnloadEvent) => {
      requestDraftFlush();
      event.preventDefault();
      event.returnValue = "Your recording is still in progress.";
    };
    const flushWhenHidden = () => { if (document.visibilityState === "hidden") requestDraftFlush(); };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("pagehide", requestDraftFlush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("pagehide", requestDraftFlush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [activePhase, finishRecording, requestDraftFlush]);

  useEffect(() => () => {
    stopTranscriptionRef.current();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function saveGoals(): void {
    update((current) => ({ ...current, goals: savedGoals, review: { ...current.review, ratings: Object.fromEntries(savedGoals.map((goal) => [goal, current.review.ratings[goal] ?? 0])) } }));
  }

  function addSuggestion(word: string): void {
    const empty = goalDrafts.findIndex((goal) => !goal.trim());
    if (empty === -1 || goalDrafts.some((goal) => goal.toLowerCase() === word)) return;
    setDraftGoals(goalDrafts.map((goal, index) => index === empty ? word : goal));
  }

  async function prepareCamera(): Promise<void> {
    setError("");
    if (typeof MediaRecorder === "undefined") {
      setError("This browser does not support video recording. Use a current version of Chrome, Edge, Firefox, or Safari.");
      return;
    }
    try {
      const stream = await requestCameraAndMic();
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPhase("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Camera and microphone access failed.");
    }
  }

  async function beginRecording(): Promise<void> {
    if (!streamRef.current) return;
    saveGoals();
    setError("");
    setRecoveryBlob(null);
    setPromptIndex(0);
    setElapsed(0);
    elapsedRef.current = 0;
    try {
      await startRecording(streamRef.current);
      transcriptRef.current = liveTranscript;
      transcriptSegmentsRef.current = [];
      if (transcriptionOptIn && transcriptionAvailable) {
        stopTranscriptionRef.current = startLiveTranscription((text) => {
          transcriptRef.current = text;
          setLiveTranscript(text);
        }, (segment) => {
          if (segment.text) transcriptSegmentsRef.current = [...transcriptSegmentsRef.current, segment];
        });
      }
      setPhase("recording");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The recording could not start.");
    }
  }

  async function saveRecoveredDraft(): Promise<void> {
    if (!recoveryDraft) return;
    const now = Date.now();
    const lockedUntil = now + LOCK_HOURS * 60 * 60 * 1000;
    try {
      await putRecording(recoveryDraft.blob);
      await discardRecoveryDraft();
      update((current) => ({
        ...current,
        diagnostic: { recordedAt: recoveryDraft.startedAt, durationSeconds: recoveryDraft.durationSeconds, lockedUntil, transcript: "", transcriptSegments: [], hasRecording: true },
        review: { completed: { audio: false, visual: false, transcript: false }, ratings: {}, behaviorTags: [], behaviorOther: "", noBehaviorNoticed: false, reflection: "" },
        coach: { ...current.coach, current: null },
      }));
      setPhase("locked");
    } catch {
      setError("The interrupted take could not be promoted to the saved baseline. Download it before clearing browser data.");
    }
  }

  async function startFresh(): Promise<void> {
    if (!window.confirm("Delete the current baseline and its review so you can record a fresh take?")) return;
    await Promise.all([deleteRecording(), discardRecoveryDraft()]);
    update((current) => ({ ...current, diagnostic: { recordedAt: null, durationSeconds: null, lockedUntil: null, transcript: "", transcriptSegments: [], hasRecording: false }, review: { completed: { audio: false, visual: false, transcript: false }, ratings: {}, behaviorTags: [], behaviorOther: "", noBehaviorNoticed: false, reflection: "" }, coach: { ...current.coach, current: null } }));
    setLiveTranscript("");
    setPhase("setup");
  }

  function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function downloadRecovery(): void {
    if (recoveryBlob) downloadBlob(recoveryBlob, "mirror-recovery.webm");
  }

  if (activePhase === "locked") {
    return (
      <AppShell active="diagnostic" tone="light" eyebrow="Take saved" title="Your take is resting.">
        <section className="lock-confirmation slice-two-lock">
          <div className="lock-orbit"><LockKeyhole size={42} /></div>
          <p className="eyebrow">The kindness buffer has begun</p>
          <h2>Your recording is locked for 24 hours.</h2>
          <p>Right after a recording, you remember every hesitation. Tomorrow, you can meet the speaker on screen with more distance and better evidence.</p>
          <div className="button-row centered">
            <Link className="button primary" href="/review">See the countdown <ArrowRight size={18} /></Link>
            <button className="button secondary" onClick={() => void startFresh()}><RefreshCcw size={17} /> Start a fresh baseline</button>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell active="diagnostic" tone="light" eyebrow="Record" title="One honest five-minute take." aside={<div className="no-restart"><CircleStop size={18} /><span>NO RESTART</span></div>}>
      {recoveryDraft && !state.diagnostic.hasRecording && activePhase === "setup" && (
        <section className="draft-recovery" aria-labelledby="draft-recovery-title">
          <div><p className="eyebrow">Interrupted take found</p><h2 id="draft-recovery-title">The last recoverable chunks are still here.</h2><p>{recoveryDraft.durationSeconds}s across {recoveryDraft.chunkCount} saved chunks. Live transcript text may be incomplete after a closed tab.</p></div>
          <div className="button-row">
            <button className="button primary" onClick={() => void saveRecoveredDraft()}><Check size={16} /> Use partial take</button>
            <button className="button secondary" onClick={() => downloadBlob(recoveryDraft.blob, "mirror-interrupted-take.webm")}><Download size={16} /> Download</button>
            <button className="button danger" onClick={() => void discardRecoveryDraft()}><RefreshCcw size={16} /> Discard partial take</button>
          </div>
        </section>
      )}
      {draftWarning && <p className="status-banner error" role="alert">{draftWarning}</p>}
      <section className="record-layout">
        <div className="record-primary">
          <div className={`camera-stage record-camera ${activePhase === "recording" ? "recording" : ""}`}>
            <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" />
            {activePhase === "setup" && <div className="camera-placeholder"><Camera size={42} /><strong>Your preview appears here</strong><span>Camera and mic start only after you ask.</span></div>}
            {activePhase === "recording" && <div className="recording-badge"><span /> REC {formatTime(elapsed)}</div>}
          </div>

          {activePhase === "recording" ? (
            <div className="cue-card record-cue">
              <div className="cue-meta"><span>CUE {promptIndex + 1} OF {DIAGNOSTIC_PROMPTS.length}</span><strong>{formatTime(Math.max(0, DIAGNOSTIC_SECONDS - elapsed))} LEFT</strong></div>
              <blockquote>{DIAGNOSTIC_PROMPTS[promptIndex]}</blockquote>
              <div className="button-row">
                <button className="button secondary" disabled={promptIndex === DIAGNOSTIC_PROMPTS.length - 1} onClick={() => setPromptIndex((index) => Math.min(index + 1, DIAGNOSTIC_PROMPTS.length - 1))}>Next cue <ChevronRight size={17} /></button>
                <button className="button stop" onClick={() => void finishRecording()}><CircleStop size={18} /> End and save take</button>
              </div>
              <p className="fine-print">There is no pause or restart after recording begins. You may end early; elapsed time is saved for accurate WPM.</p>
            </div>
          ) : (
            <div className="record-controls record-actionbar">
              {activePhase === "setup" && <button className="button primary large" onClick={() => void prepareCamera()}><Video size={19} /> Check camera and microphone</button>}
              {activePhase === "ready" && <button className="button record large" onClick={() => void beginRecording()}><span className="record-dot" /> Begin the five-minute take</button>}
              {activePhase === "saving" && <button className="button secondary large" disabled><Clock3 size={18} /> Saving privately…</button>}
              <p><ShieldCheck size={16} /> Preview and recording stay in this browser.</p>
            </div>
          )}
          {(error || recorderError) && <div className="status-banner error" role="alert"><span>{error || recorderError}</span>{recoveryBlob && <button className="button secondary" onClick={downloadRecovery}><Download size={16} /> Download recovery copy</button>}</div>}
        </div>

        <aside className="record-options" aria-label="Optional recording preparation">
          <p className="record-options-label">Optional preparation</p>

          <details className="prep-card intention-card">
            <summary><span><strong>Set an intention</strong><small>{savedGoals.length ? `${savedGoals.length} of 5 words` : "Skip this for your first take"}</small></span><ChevronDown size={18} /></summary>
            <div className="prep-card-body">
              <p>Add up to five qualities you want people to feel. They become an optional listening rubric later.</p>
              <div className="goal-fields">
                {goalDrafts.map((goal, index) => <label key={index}><span>{String(index + 1).padStart(2, "0")}</span><input value={goal} maxLength={24} placeholder={index === 0 ? "e.g. clear" : "Optional word"} onChange={(event) => setDraftGoals(goalDrafts.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>)}
              </div>
              <div className="suggestion-row">{GOAL_SUGGESTIONS.map((word) => <button key={word} disabled={goalDrafts.some((goal) => goal.trim().toLowerCase() === word)} onClick={() => addSuggestion(word)}>+ {word}</button>)}</div>
              {hasDuplicateGoals && <p className="field-note">Repeated words will be saved once.</p>}
              <button className="button secondary full" onClick={saveGoals}><Check size={16} /> {savedGoals.length ? "Save intention" : "Clear intention"}</button>
            </div>
          </details>

          <details className="prep-card transcript-consent">
            <summary><span><strong>Capture a live transcript</strong><small>Optional · browser dependent</small></span><Mic2 size={18} /></summary>
            <div className="prep-card-body">
              {transcriptionAvailable ? <label className="switch-line"><input type="checkbox" checked={transcriptionOptIn} onChange={(event) => setTranscriptionOptIn(event.target.checked)} /><span><strong>Use browser speech recognition</strong><small>Chrome may send live microphone audio to Google for transcription. Mirror never uploads the saved video.</small></span></label> : <p className="field-note">Live transcription is unavailable here. You can paste a transcript during review.</p>}
            </div>
          </details>

          <details className="prep-card prompt-preview">
            <summary><span><strong>Preview the five cues</strong><small>Open only if preparation helps</small></span><ChevronDown size={18} /></summary>
            <div className="prep-card-body"><ol className="record-prompt-list">{DIAGNOSTIC_PROMPTS.map((prompt, index) => <li key={prompt}><span>{index + 1}</span><p>{prompt}</p></li>)}</ol></div>
          </details>

          <p className="skip-note">You can ignore every option here and record immediately.</p>
        </aside>
      </section>
    </AppShell>
  );
}
