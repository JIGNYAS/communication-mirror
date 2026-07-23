"use client";

import Link from "next/link";
import { ArrowRight, Download, FileDown, LockKeyhole, RotateCcw, ShieldCheck, Trash2, Upload, Video } from "lucide-react";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLocalState } from "@/hooks/useLocalState";
import { deleteAllData, downloadVideo, exportBackup, importBackup } from "@/lib/storage/backup";
import { INITIAL_STATE } from "@/lib/storage/state";

interface JourneyCard {
  number: string;
  title: string;
  copy: string;
}const cards: JourneyCard[] = [
  { number: "I", title: "Record what is real", copy: "Five questions. Five minutes. No restart. The imperfections are the useful part." },
  { number: "II", title: "Create some distance", copy: "The recording rests for 24 hours so immediate self-criticism can fade." },
  { number: "III", title: "Notice one channel", copy: "Listen blind. Watch muted. Read the words. Each pass reveals different evidence." },
];

export default function HomePage() {
  const { state, setState, ready } = useLocalState();
  const [message, setMessage] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const hasReview = Object.values(state.review.completed).every(Boolean);
  const hasAnalysis = Boolean(state.coach.current);
  const nextHref = !state.diagnostic.hasRecording ? "/diagnostic" : !hasReview ? "/review" : hasAnalysis ? "/gym" : "/coach";
  const nextLabel = !state.diagnostic.hasRecording
    ? (state.goals.length === 5 ? "Record your baseline" : "Choose your five words")
    : !hasReview
      ? "Continue your review"
      : hasAnalysis
        ? "Go to the practice gym"
        : "Analyze your baseline";

  async function restore(file?: File): Promise<void> {
    if (!file) return;
    try {
      const restored = await importBackup(file);
      setState(restored);
      setMessage("Notes restored. Video was intentionally left out; record a new baseline when ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The backup could not be restored.");
    }
  }

  async function removeEverything(): Promise<void> {
    if (!window.confirm("Delete your recording, goals, reviews, and practice history from this browser? This cannot be undone.")) return;
    await deleteAllData();
    setState(INITIAL_STATE);
    setMessage("All Mirror data was deleted from this browser.");
  }

  return (
    <AppShell active="home" eyebrow="Your private rehearsal room" title="The world is a stage. This is the room before it.">
      <section className="hero-stage">
        <div className="spotlight" aria-hidden="true"><span>YOU</span></div>
        <div className="hero-copy">
          <p className="lead">You cannot improve what you cannot see.</p>
          <p>Record a real attempt, let it rest, then review it without the noise of performing and judging at the same time.</p>
          <Link className="button primary" href={nextHref}>{nextLabel}<ArrowRight size={18} /></Link>
          <div className="privacy-proof"><ShieldCheck size={18} /><span>Your video is stored in this browser. It is never uploaded by Mirror.</span></div>
        </div>
      </section>

      <section className="principles" aria-label="The Mirror method">
        {cards.map((card) => <article key={card.number}><span>{card.number}</span><h2>{card.title}</h2><p>{card.copy}</p></article>)}
      </section>

      <section className="split-section">
        <article className="paper-card next-call">
          <p className="eyebrow dark">Your next cue</p>
          <h2>{ready ? nextLabel : "Opening your rehearsal roomâ€¦"}</h2>
          <p>{state.diagnostic.hasRecording ? "Your baseline is safe in this browser. Return to the next unfinished part of the loop." : "Start with the five qualities you want people to feel when you speak."}</p>
          <Link className="text-link" href={nextHref}>Take the next step <ArrowRight size={16} /></Link>
        </article>

        <article className="panel data-panel">
          <p className="eyebrow">Data ownership</p>
          <h2>Your work should be portable.</h2>
          <p>Backups contain goals, notes, and practice history. Video downloads separately so private media never slips into a small JSON file.</p>
          <div className="button-row">
            <button className="button secondary" onClick={() => { exportBackup(state); setMessage("Notes backup downloaded."); }}><FileDown size={17} /> Back up notes</button>
            <button className="button secondary" onClick={() => importRef.current?.click()}><Upload size={17} /> Restore</button>
            <button className="button secondary" disabled={!state.diagnostic.hasRecording} onClick={() => downloadVideo().then(() => setMessage("Video downloaded.")).catch((error: Error) => setMessage(error.message))}><Video size={17} /> Download video</button>
            <button className="button danger" onClick={() => void removeEverything()}><Trash2 size={17} /> Delete everything</button>
          </div>
          <input ref={importRef} className="sr-only" type="file" accept="application/json" onChange={(event) => void restore(event.target.files?.[0])} />
          {message && <p className="inline-message" role="status"><Download size={15} />{message}</p>}
        </article>
      </section>

      <section className="privacy-strip">
        <LockKeyhole size={22} /><div><strong>No cloud coach listening in.</strong><span>Analysis is intentionally limited to what your browser can calculate on-device.</span></div>
        <RotateCcw size={22} /><div><strong>One baseline at a time.</strong><span>Overwrite only when you deliberately begin a new Mirror loop.</span></div>
      </section>
    </AppShell>
  );
}

