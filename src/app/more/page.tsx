"use client";

import Link from "next/link";
import { Activity, ArrowRight, Download, Dumbbell, FileDown, Mic2, ShieldCheck, Trash2, Upload, Video } from "lucide-react";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLocalState } from "@/hooks/useLocalState";
import { deleteAllData, downloadVideo, exportBackup, importBackup } from "@/lib/storage/backup";
import { INITIAL_STATE } from "@/lib/storage/state";

interface ToolLink {
  href: string;
  title: string;
  copy: string;
  icon: typeof Activity;
}

const tools: ToolLink[] = [
  { href: "/coach", title: "Insights", copy: "Review on-device measurements for pace, projection, pauses, and melody.", icon: Activity },
  { href: "/gym", title: "Practice library", copy: "Use random-word reps, speaking frameworks, and vocal warm-ups.", icon: Dumbbell },
  { href: "/calibration", title: "Microphone calibration", copy: "Set a personal volume reference without saving calibration audio.", icon: Mic2 },
];

export default function MorePage() {
  const { state, setState, storageError } = useLocalState();
  const [message, setMessage] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  async function restore(file?: File): Promise<void> {
    if (!file) return;
    try {
      const restored = await importBackup(file);
      setState(restored);
      setMessage("Notes restored. Video was intentionally left out; record a new take when ready.");
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
    <AppShell active="more" tone="light" eyebrow="Tools and settings" title="Everything beyond the weekly loop.">
      {(storageError || message) && <p className={storageError ? "status-banner error" : "status-banner"} role={storageError ? "alert" : "status"}>{storageError || message}</p>}

      <section className="more-tools" aria-label="Optional communication tools">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link className="more-tool-card" href={tool.href} key={tool.href}>
              <span><Icon size={20} /></span>
              <div><h2>{tool.title}</h2><p>{tool.copy}</p></div>
              <ArrowRight size={18} />
            </Link>
          );
        })}
      </section>

      <section className="data-workspace" aria-labelledby="data-heading">
        <div className="data-workspace-copy">
          <p className="home-kicker">Settings and data</p>
          <h2 id="data-heading">Your practice belongs to you.</h2>
          <p>Notes and practice history export as a small JSON file. Video downloads separately so private media never slips into a notes backup.</p>
          <div className="local-proof"><ShieldCheck size={18} /><span>No account, recording upload, or analytics pipeline.</span></div>
        </div>
        <div className="data-actions">
          <button className="data-action" onClick={() => { exportBackup(state); setMessage("Notes backup downloaded."); }}><FileDown size={18} /><span><strong>Back up notes</strong><small>Download a JSON copy</small></span><Download size={16} /></button>
          <button className="data-action" onClick={() => importRef.current?.click()}><Upload size={18} /><span><strong>Restore notes</strong><small>Import a Mirror backup</small></span><ArrowRight size={16} /></button>
          <button className="data-action" disabled={!state.diagnostic.hasRecording} onClick={() => downloadVideo().then(() => setMessage("Video downloaded.")).catch((error: Error) => setMessage(error.message))}><Video size={18} /><span><strong>Download current video</strong><small>{state.diagnostic.hasRecording ? "Save the take separately" : "No saved take yet"}</small></span><Download size={16} /></button>
          <button className="data-action danger" onClick={() => void removeEverything()}><Trash2 size={18} /><span><strong>Delete everything</strong><small>Remove local Mirror data</small></span><ArrowRight size={16} /></button>
        </div>
        <input ref={importRef} className="sr-only" type="file" accept="application/json" onChange={(event) => void restore(event.target.files?.[0])} />
      </section>
    </AppShell>
  );
}
