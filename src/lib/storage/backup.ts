import { deleteAllRecordingData, getRecording } from "./db";
import { clearState, hydrateState, saveState } from "./state";
import type { MirrorState } from "@/types/session";

interface BackupEnvelope {
  product: "The Communication Mirror";
  version: 2;
  exportedAt: string;
  state: MirrorState;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function exportBackup(state: MirrorState): void {
  const backup: BackupEnvelope = {
    product: "The Communication Mirror",
    version: 2,
    exportedAt: new Date().toISOString(),
    state,
  };
  downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }), `mirror-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

export async function importBackup(file: File): Promise<MirrorState> {
  const parsed: unknown = JSON.parse(await file.text());
  if (typeof parsed !== "object" || parsed === null || !("state" in parsed)) {
    throw new Error("That file is not a Mirror backup.");
  }
  const state = hydrateState((parsed as { state: unknown }).state);
  await deleteAllRecordingData();
  const restored = { ...state, diagnostic: { ...state.diagnostic, hasRecording: false, recordedAt: null, durationSeconds: null, lockedUntil: null }, coach: { ...state.coach, current: null } };
  saveState(restored);
  return restored;
}

export async function downloadVideo(): Promise<void> {
  const recording = await getRecording();
  if (!recording) throw new Error("No saved diagnostic video was found.");
  const extension = recording.type.includes("mp4") ? "mp4" : "webm";
  downloadBlob(recording, `mirror-diagnostic.${extension}`);
}

export async function deleteAllData(): Promise<void> {
  await deleteAllRecordingData();
  clearState();
}
