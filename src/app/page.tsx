"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useCountdown } from "@/hooks/useCountdown";
import { useLocalState } from "@/hooks/useLocalState";

interface HomeAction {
  eyebrow: string;
  label: string;
  href: string;
  note: string;
  step: number;
}

const methodSteps = ["Record", "Wait", "Review", "Improve"];

function getHomeAction(hasRecording: boolean, locked: boolean, completedPasses: number, reviewComplete: boolean): HomeAction {
  if (!hasRecording) {
    return {
      eyebrow: "Your next step",
      label: "Record your five-minute take",
      href: "/diagnostic",
      note: "One uninterrupted attempt. The imperfect parts are the useful parts.",
      step: 0,
    };
  }
  if (locked) {
    return {
      eyebrow: "Your take is resting",
      label: "See when review opens",
      href: "/review",
      note: "Distance softens the first wave of self-criticism.",
      step: 1,
    };
  }
  if (!reviewComplete) {
    return {
      eyebrow: completedPasses ? `${completedPasses} of 3 review passes complete` : "Your take is ready",
      label: completedPasses ? "Continue your review" : "Begin your review",
      href: "/review",
      note: "Listen, watch, and read separately so each channel reveals different evidence.",
      step: 2,
    };
  }
  return {
    eyebrow: "Review complete",
    label: "Practice your one change",
    href: "/gym",
    note: "Carry one specific observation into a short practice rep.",
    step: 3,
  };
}

export default function HomePage() {
  const { state, storageError } = useLocalState();
  const remaining = useCountdown(state.diagnostic.lockedUntil);
  const completedPasses = Object.values(state.review.completed).filter(Boolean).length;
  const reviewComplete = completedPasses === 3 && Boolean(state.review.reflection.trim());
  const action = getHomeAction(state.diagnostic.hasRecording, remaining > 0, completedPasses, reviewComplete);

  return (
    <AppShell active="home" tone="light">
      {storageError && <p className="status-banner error" role="alert">{storageError}</p>}
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-kicker">Private communication practice</p>
          <h1>Record five minutes.<br />See what everyone else sees.</h1>
          <p className="home-deck">Leave the take for a day. Review your voice, body, and words separately. Then choose one thing to improve.</p>
          <div className="home-action">
            <span>{action.eyebrow}</span>
            <Link className="button primary" href={action.href}>{action.label}<ArrowRight size={18} /></Link>
            <p>{action.note}</p>
          </div>
        </div>

        <div className="take-marker" aria-label="One five-minute take">
          <div className="take-marker-top"><span className="record-pulse" /> ONE TAKE</div>
          <strong>5:00</strong>
          <p>No restart. No performance. Just evidence.</p>
          <div className="take-line" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
        </div>
      </section>

      <ol className="method-line" aria-label="The four-step Mirror method">
        {methodSteps.map((step, index) => (
          <li className={index < action.step ? "complete" : index === action.step ? "current" : ""} key={step}>
            <span>{index < action.step ? <Check size={15} /> : index + 1}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>

      <section className="home-proof" aria-label="How Mirror protects the practice">
        <article><LockKeyhole size={19} /><div><strong>A kinder review</strong><p>The 24-hour pause separates the recording from the first emotional reaction.</p></div></article>
        <article><ShieldCheck size={19} /><div><strong>Stored on this device</strong><p>Your saved video stays in this browser and is never uploaded by Mirror.</p></div></article>
        <article><Clock3 size={19} /><div><strong>One weekly loop</strong><p>Repeat the same small process instead of trying to fix everything at once.</p></div></article>
      </section>
    </AppShell>
  );
}
