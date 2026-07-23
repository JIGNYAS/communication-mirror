"use client";

import Link from "next/link";
import { History, Home, LayoutGrid, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

type ActiveRoute = "home" | "diagnostic" | "review" | "coach" | "gym" | "history" | "more";

interface AppShellProps {
  active: ActiveRoute;
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  aside?: ReactNode;
  tone?: "dark" | "light";
}

export function AppShell({ active, eyebrow, title, children, aside, tone = "dark" }: AppShellProps) {
  return (
    <div className={`app-shell ${tone === "light" ? "light-shell" : "dark-shell"}`}>
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="Communication Mirror home">
          <span className="mirror-mark" aria-hidden="true"><span /></span>
          <span>THE COMMUNICATION MIRROR</span>
        </Link>
        <div className="shell-actions">
          <div className="privacy-seal"><ShieldCheck size={16} /><span>STAYS ON THIS DEVICE</span></div>
          <nav className="primary-nav" aria-label="Main navigation">
            <Link className={active === "home" ? "active" : ""} href="/"><Home size={16} /> Home</Link>
            <Link className={active === "history" ? "active" : ""} href="/history"><History size={16} /> History</Link>
            <Link className={active === "more" ? "active" : ""} href="/more"><LayoutGrid size={16} /> More</Link>
          </nav>
        </div>
      </header>

      <main className="page-frame">
        {title && (
          <header className="page-intro">
            <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1></div>
            {aside}
          </header>
        )}
        {children}
      </main>
      <footer className="site-footer"><span>Private by architecture.</span><span>No account · No upload · No audience</span></footer>
    </div>
  );
}
