"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Mic2, Radio, RotateCcw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLocalState } from "@/hooks/useLocalState";
import { calibrateMicrophone } from "@/lib/audio/calibration";

type CalibrationPhase = "idle" | "running" | "done";

export default function CalibrationPage() {
  const { state, update } = useLocalState();
  const [phase, setPhase] = useState<CalibrationPhase>(state.coach.calibration.baselineRms ? "done" : "idle");
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function startCalibration(): Promise<void> {
    setError("");
    setElapsed(0);
    setLevel(0);
    setPhase("running");
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const result = await calibrateMicrophone({
        durationSeconds: 10,
        signal: controller.signal,
        onSample: (sample) => {
          setElapsed(sample.elapsedSeconds);
          setLevel(sample.rms);
        },
      });
      update((current) => ({ ...current, coach: { ...current.coach, calibration: { ...result, calibratedAt: Date.now() } } }));
      setPhase("done");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Calibration failed.");
      setPhase("idle");
    }
  }

  const remaining = Math.max(0, Math.ceil(10 - elapsed));
  const displayLevel = Math.min(100, Math.max(2, level * 900));
  const saved = state.coach.calibration;

  return (
    <AppShell active="coach" tone="light" eyebrow="Sound check" title="Give volume a reference point." aside={<Link className="button secondary" href="/coach"><ArrowLeft size={16} /> Back to Insights</Link>}>
      <section className="calibration-stage">
        <div className="calibration-copy">
          <p className="eyebrow">Level 3 · Conversational voice</p>
          <h2>Speak naturally for ten seconds.</h2>
          <p>Use the same microphone and distance you expect for diagnostics. Mirror stores only one RMS number—not this calibration audio.</p>
          <ol>
            <li><span>1</span> Sit or stand at your normal recording distance.</li>
            <li><span>2</span> Speak continuously at a comfortable conversation level.</li>
            <li><span>3</span> Mirror defines Level 5 as 1.67× this baseline.</li>
          </ol>
          <div className="privacy-proof"><ShieldCheck size={18} /><span>No calibration audio is recorded or saved.</span></div>
        </div>
        <div className="soundcheck panel">
          <div className={phase === "running" ? "calibration-mic live" : "calibration-mic"}><Mic2 size={40} /></div>
          <div aria-live="polite" aria-atomic="true">
            {phase === "running" ? <><strong className="calibration-count">{remaining}</strong><p>Keep speaking at Level 3</p></> : phase === "done" ? <><Check size={28} className="calibration-check" /><h2>Reference saved</h2><p>Level 3: {saved.baselineRms?.toFixed(4)} RMS<br />Level 5 target: {saved.targetRms?.toFixed(4)} RMS</p></> : <><Radio size={28} /><h2>Ready for sound check</h2><p>Your browser will ask for microphone permission.</p></>}
          </div>
          <div className="level-meter" role="progressbar" aria-label="Live microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(displayLevel)}><span style={{ width: `${displayLevel}%` }} /></div>
          <button className="button primary full" disabled={phase === "running"} onClick={() => void startCalibration()}>{phase === "done" ? <RotateCcw size={17} /> : <Mic2 size={17} />}{phase === "done" ? "Calibrate again" : "Start 10-second calibration"}</button>
          {error && <p className="field-note" role="alert">{error}</p>}
        </div>
      </section>
    </AppShell>
  );
}

