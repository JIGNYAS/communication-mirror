"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { INITIAL_STATE, loadState, saveState, STATE_EVENT, STATE_KEY } from "@/lib/storage/state";
import type { MirrorState } from "@/types/session";

export function useLocalState() {
  const [storageError, setStorageError] = useState("");
  const state = useSyncExternalStore(subscribe, getClientSnapshot, () => INITIAL_STATE);

  useEffect(() => {
    navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  const update = useCallback((updater: Partial<MirrorState> | ((current: MirrorState) => MirrorState)) => {
    const current = loadState();
    const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
    try {
      saveState(next);
      setStorageError("");
    } catch {
      setStorageError("Browser storage is full or unavailable. Export a backup before closing this tab.");
    }
  }, []);

  const setState = useCallback((next: MirrorState) => {
    try {
      saveState(next);
      setStorageError("");
    } catch {
      setStorageError("Browser storage is full or unavailable. Export a backup before closing this tab.");
    }
  }, []);

  return { state, setState, update, ready: true, storageError };
}

let cachedRaw: string | null | undefined;
let cachedState = INITIAL_STATE;

function getClientSnapshot(): MirrorState {
  const raw = window.localStorage.getItem(STATE_KEY);
  if (raw === cachedRaw) return cachedState;
  cachedRaw = raw;
  cachedState = loadState();
  return cachedState;
}

function subscribe(notify: () => void): () => void {
  const listener = () => notify();
  window.addEventListener(STATE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(STATE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
