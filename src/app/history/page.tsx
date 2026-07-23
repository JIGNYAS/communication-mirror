"use client";

import Link from "next/link";
import { ArrowRight, Archive, CalendarDays, Mic2, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLocalState } from "@/hooks/useLocalState";
import { getFocusCategoryLabel } from "@/lib/review";
import type { SessionSummary } from "@/types/session";

function formatSessionDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(timestamp);
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "Duration unavailable";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")} take`;
}

export default function HistoryPage() {
  const { state } = useLocalState();

  return (
    <AppShell active="history" tone="light" eyebrow="Weekly practice ledger" title="The changes you carried forward.">
      <section className="history-note">
        <Archive size={20} />
        <div>
          <strong>History keeps summaries, not recordings.</strong>
          <p>When you start a new weekly cycle, the current video is permanently replaced. Download it first from More if you want a personal copy.</p>
        </div>
      </section>

      {state.history.length === 0 ? (
        <section className="empty-state large history-empty">
          <CalendarDays size={44} />
          <h2>Your first week will appear here.</h2>
          <p>Complete one review and choose one focus. Mirror archives its summary when you start the next weekly recording.</p>
          <Link className="button primary" href={state.diagnostic.hasRecording ? "/review" : "/diagnostic"}>
            {state.diagnostic.hasRecording ? "Continue current cycle" : "Record your first take"} <ArrowRight size={17} />
          </Link>
        </section>
      ) : (
        <ol className="history-ledger" aria-label={`${state.history.length} saved session summaries`}>
          {state.history.map((session, index) => <HistoryEntry key={session.recordedAt} session={session} number={state.history.length - index} />)}
        </ol>
      )}
    </AppShell>
  );
}

function HistoryEntry({ session, number }: { session: SessionSummary; number: number }) {
  const visualCount = session.visualObservations
    ? session.visualObservations.tags.length + (session.visualObservations.other ? 1 : 0)
    : null;
  return (
    <li className="history-entry">
      <div className="history-spine">
        <span>WEEK {String(number).padStart(2, "0")}</span>
        <i aria-hidden="true" />
      </div>
      <article className="history-card">
        <header>
          <div>
            <time dateTime={new Date(session.recordedAt).toISOString()}>{formatSessionDate(session.recordedAt)}</time>
            <span>{formatDuration(session.durationSeconds)}</span>
          </div>
          <span className={`history-kind ${session.source === "coach-metrics" ? "imported" : ""}`}>
            {session.source === "coach-metrics" ? "Imported measurement" : "Review summary"}
          </span>
        </header>

        {session.focus ? (
          <div className="history-focus">
            <Target size={19} />
            <div>
              <span>{getFocusCategoryLabel(session.focus.category, session.focus.customCategory)}</span>
              <strong>{session.focus.action}</strong>
            </div>
          </div>
        ) : (
          <div className="history-focus muted">
            <Mic2 size={19} />
            <div>
              <span>No review was stored</span>
              <strong>This older Coach entry contains measurements only.</strong>
            </div>
          </div>
        )}

        {(session.whatWorked || session.goals.length > 0) && (
          <div className="history-notes">
            {session.whatWorked && <p><span>KEEP</span>{session.whatWorked}</p>}
            {session.goals.length > 0 && <p><span>INTENTIONS</span>{session.goals.join(" · ")}</p>}
          </div>
        )}

        {(session.transcriptMetrics || session.coachMetrics || visualCount !== null) && (
          <dl className="history-metrics">
            {(session.transcriptMetrics || session.coachMetrics) && (
              <div><dt>PACE</dt><dd>{session.transcriptMetrics?.wpm ?? session.coachMetrics?.wpm ?? "—"} <small>WPM</small></dd></div>
            )}
            {session.transcriptMetrics && <div><dt>FILLERS</dt><dd>{session.transcriptMetrics.nonWords + session.transcriptMetrics.fillers}</dd></div>}
            {visualCount !== null && <div><dt>VISUAL NOTES</dt><dd>{visualCount || (session.visualObservations?.noneNoticed ? "None" : "—")}</dd></div>}
            {session.coachMetrics && <div><dt>PAUSE TIME</dt><dd>{session.coachMetrics.pauseSeconds.toFixed(1)} <small>SEC</small></dd></div>}
          </dl>
        )}
      </article>
    </li>
  );
}
