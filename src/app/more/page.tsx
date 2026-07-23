"use client";

import Link from "next/link";
import { Activity, ArrowRight, Download, Dumbbell, FileDown, Mic2, Palette, ShieldCheck, Target, Trash2, Upload, Video } from "lucide-react";
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

interface ToolGroup {
  eyebrow: string;
  title: string;
  copy: string;
  tools: ToolLink[];
}

const toolGroups: ToolGroup[] = [
  {
    eyebrow: "Optional evidence",
    title: "Insights",
    copy: "Measure only when the numbers would help. The weekly loop works without this section.",
    tools: [
      { href: "/coach?view=foundations", title: "Measurements and trends", copy: "Rate, projection, pauses, melody, and summary trends.", icon: Activity },
      { href: "/calibration", title: "Microphone calibration", copy: "Set a personal volume reference without saving audio.", icon: Mic2 },
    ],
  },
  {
    eyebrow: "Extra repetitions",
    title: "Practice tools",
    copy: "Use the focused recommendation first. Open these when you want a wider practice structure.",
    tools: [
      { href: "/gym", title: "Practice library", copy: "Random-word, framework, warm-up, and visual-delivery reps.", icon: Dumbbell },
      { href: "/coach?view=plan", title: "Four-week plan", copy: "A rule-based sequence from the weakest measured foundations.", icon: Target },
      { href: "/coach?view=profile", title: "Color Profile", copy: "Optional communication-preference prompts and adaptation cues.", icon: Palette },
    ],
  },
];

export default function MorePage() {
  const { state, setState, update, storageError } = useLocalState();
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

      <section className="more-groups" aria-label="Optional communication tools">
        {toolGroups.map((group) => (
          <article className="more-group" key={group.title}>
            <header><p className="home-kicker">{group.eyebrow}</p><h2>{group.title}</h2><p>{group.copy}</p></header>
            <div>
              {group.tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link className="more-tool-row" href={tool.href} key={tool.href}>
                    <span><Icon size={19} /></span>
                    <div><strong>{tool.title}</strong><small>{tool.copy}</small></div>
                    <ArrowRight size={17} />
                  </Link>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      <div className="settings-divider"><span>SETTINGS AND DATA</span><i /></div>
      <section className="more-preferences" aria-labelledby="practice-settings-heading">
        <div>
          <p className="home-kicker">Review preferences</p>
          <h2 id="practice-settings-heading">Keep the optional helpers honest.</h2>
        </div>
        <article>
          <div><strong>Live transcription</strong><p>Off by default. If enabled before recording, Chrome may send live microphone audio to Google for speech recognition. Mirror never uploads the saved video.</p></div>
          <span>CHOOSE BEFORE RECORDING</span>
        </article>
        <label>
          <input type="checkbox" checked={state.coach.eslMode} onChange={(event) => update((current) => ({ ...current, coach: { ...current.coach, eslMode: event.target.checked } }))} />
          <span><strong>ESL transcript hints</strong><small>Underline simple tense inconsistencies during transcript review. These are local heuristics, not grammar correction.</small></span>
        </label>
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
        <input ref={importRef} className="sr-only" type="file" accept="application/json" aria-label="Restore Mirror notes backup" onChange={(event) => void restore(event.target.files?.[0])} />
      </section>
    </AppShell>
  );
}
