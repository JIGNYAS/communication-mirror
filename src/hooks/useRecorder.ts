"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supportedRecordingType } from "@/lib/media/recorder";
import {
  appendRecordingDraftChunk,
  beginRecordingDraft,
  clearRecordingDraft,
  getRecordingDraft,
  type RecordingDraft,
} from "@/lib/storage/db";

export interface RecorderCapture {
  blob: Blob;
  mimeType: string;
  startedAt: number;
  durationSeconds: number;
}

interface StopPromiseHandlers {
  resolve: (capture: RecorderCapture) => void;
  reject: (error: Error) => void;
}

export function useRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkIndexRef = useRef(0);
  const startedAtRef = useRef(0);
  const mimeTypeRef = useRef("video/webm");
  const draftEnabledRef = useRef(false);
  const draftQueueRef = useRef<Promise<void>>(Promise.resolve());
  const stopPromiseRef = useRef<Promise<RecorderCapture> | null>(null);
  const stopHandlersRef = useRef<StopPromiseHandlers | null>(null);
  const [recoveryDraft, setRecoveryDraft] = useState<RecordingDraft | null>(null);
  const [recorderError, setRecorderError] = useState("");
  const [draftWarning, setDraftWarning] = useState("");

  const refreshRecoveryDraft = useCallback(async (): Promise<void> => {
    try {
      setRecoveryDraft(await getRecordingDraft());
    } catch {
      setRecoveryDraft(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getRecordingDraft()
      .then((draft) => { if (active) setRecoveryDraft(draft); })
      .catch(() => { if (active) setRecoveryDraft(null); });
    return () => { active = false; };
  }, []);

  const startRecording = useCallback(async (stream: MediaStream): Promise<void> => {
    if (recorderRef.current?.state === "recording") throw new Error("A recording is already in progress.");
    setRecorderError("");
    setDraftWarning("");
    setRecoveryDraft(null);
    chunksRef.current = [];
    chunkIndexRef.current = 0;
    stopPromiseRef.current = null;
    stopHandlersRef.current = null;
    startedAtRef.current = Date.now();
    const supportedType = supportedRecordingType();
    const recorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);
    const mimeType = recorder.mimeType || supportedType || "video/webm";
    mimeTypeRef.current = mimeType;
    recorderRef.current = recorder;
    try {
      await beginRecordingDraft(mimeType, startedAtRef.current);
      draftEnabledRef.current = true;
    } catch {
      draftEnabledRef.current = false;
      setDraftWarning("Interrupted-take recovery is unavailable because browser storage could not be prepared. The active take can still be saved or downloaded.");
    }

    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      chunksRef.current.push(event.data);
      if (!draftEnabledRef.current) return;
      const index = chunkIndexRef.current;
      chunkIndexRef.current += 1;
      draftQueueRef.current = draftQueueRef.current
        .then(() => appendRecordingDraftChunk(event.data, index))
        .catch(() => {
          draftEnabledRef.current = false;
          setDraftWarning("Mirror could not keep updating the interrupted-take recovery copy. End the take normally to save it.");
        });
    };
    recorder.onerror = () => {
      const error = new Error("The browser stopped recording unexpectedly. End the take to save any captured data.");
      setRecorderError(error.message);
      stopHandlersRef.current?.reject(error);
    };
    recorder.onstop = async () => {
      try {
        await draftQueueRef.current;
        let blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        if (blob.size === 0) blob = (await getRecordingDraft())?.blob ?? blob;
        if (blob.size === 0) throw new Error("The browser ended the take without producing recording data.");
        stopHandlersRef.current?.resolve({
          blob,
          mimeType: mimeTypeRef.current,
          startedAt: startedAtRef.current,
          durationSeconds: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
        });
      } catch (caught) {
        stopHandlersRef.current?.reject(caught instanceof Error ? caught : new Error("The recording could not be finalized."));
      } finally {
        recorderRef.current = null;
        stopHandlersRef.current = null;
      }
    };
    recorder.start(4000);
  }, []);

  const stopRecording = useCallback((): Promise<RecorderCapture> => {
    if (stopPromiseRef.current) return stopPromiseRef.current;
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return Promise.reject(new Error("No active recording was found."));
    stopPromiseRef.current = new Promise<RecorderCapture>((resolve, reject) => {
      stopHandlersRef.current = { resolve, reject };
      recorder.stop();
    });
    return stopPromiseRef.current;
  }, []);

  const requestDraftFlush = useCallback((): void => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      try { recorder.requestData(); } catch { /* A scheduled data event is already pending. */ }
    }
  }, []);

  const discardRecoveryDraft = useCallback(async (): Promise<void> => {
    await clearRecordingDraft();
    setRecoveryDraft(null);
  }, []);

  return {
    startRecording,
    stopRecording,
    requestDraftFlush,
    discardRecoveryDraft,
    refreshRecoveryDraft,
    recoveryDraft,
    recorderError,
    draftWarning,
  };
}
