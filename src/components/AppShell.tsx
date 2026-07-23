"use client";

import Link from "next/link";
import { AudioLines, Dumbbell, Home, LockKeyhole, Mic2, ShieldCheck } from "lucide-react";
import { useLocalState } from "@/hooks/useLocalState";
import type { ReactNode } from "react";

type ActiveRoute = "home" | "diagnostic" | "review" | "coach" | "gym";

interface AppShellProps {
  active: ActiveRoute;
  eyebrow: string;
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}
const journey = [
  { label: "Goals", href: "/diagnostic" },
  { label: "Record", href: "/diagnostic" },
  { label: "Wait", href: "/review" },
  { label: "Review", href: "/review" },
  { label: "Train", href: "/gym" },
];

function getJourneyIndex(hasGoals: boolean, hasRecording: boolean, lockedUntil: number | null, reviewDone: boolean): number {
  if (!hasGoals) return 0;
  if (!hasRecording) return 1;
  if (lockedUntil && lockedUntil > Date.now()) return 2;
  if (!reviewDone) return 3;
  return 4;
}

export function AppShell({ active, eyebrow, title, children, aside }: AppShellProps) {
  const { state, ready, storageError } = useLocalState();
  const reviewDone = Object.values(state.review.completed).every(Boolean) && Boolean(state.review.reflection.trim());
  const currentStep = getJourneyIndex(state.goals.length === 5, state.diagnostic.hasRecording, state.diagnostic.lockedUntil, reviewDone);

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="Communication Mirror home">
          <span className="mirror-mark" aria-hidden="true"><span /></span>
          <span>THE COMMUNICATION MIRROR</span>
        </Link>
        <nav className="primary-nav" aria-label="Main navigation">
          <Link className={active === "home" ? "active" : ""} href="/"><Home size={16} /> Stage</Link>
          <Link className={active === "diagnostic" ? "active" : ""} href="/diagnostic"><Mic2 size={16} /> Mirror</Link>
          <Link className={active === "review" ? "active" : ""} href="/review"><LockKeyhole size={16} /> Review</Link>
          <Link className={active === "coach" ? "active" : ""} href="/coach"><AudioLines size={16} /> Coach</Link>
          <Link className={active === "gym" ? "active" : ""} href="/gym"><Dumbbell size={16} /> Gym</Link>
        </nav>
        <div className="privacy-seal"><ShieldCheck size={16} /><span>STAYS ON THIS DEVICE</span></div>
      </header>

      <div className="journey" aria-label="Your Mirror journey">
        {journey.map((step, index) => (
          <Link key={step.label} href={step.href} className={index < currentStep ? "complete" : index === currentStep ? "current" : ""}>
            <span>{index < currentStep ? "âœ“" : index + 1}</span>
            <strong>{step.label}</strong>
          </Link>
        ))}
      </div>
      {ready && state.goals.length === 5 && (
        <div className="goal-rubric" aria-label="Your five-word communication rubric">
          <span>Your intended impression</span>
          <ol>{state.goals.map((goal) => <li key={goal}>{goal}</li>)}</ol>
        </div>
      )}

      <main className="page-frame">
        <header className="page-intro">
          <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
          {aside}
        </header>
        {!ready && <p className="status-banner">Opening your private workspaceâ€¦</p>}
        {storageError && <p className="status-banner error" role="alert">{storageError}</p>}
        {children}
      </main>
      <footer className="site-footer"><span>Private by architecture.</span><span>No account Â· No upload Â· No audience</span></footer>
    </div>
  );
}

