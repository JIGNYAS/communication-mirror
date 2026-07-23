const DB_NAME = "communication-mirror-db";
const STORE_NAME = "recordings";
const DRAFT_STORE_NAME = "recording-draft";
const RECORDING_KEY = "diagnostic";
const DRAFT_META_KEY = "meta";

interface DraftMetaEntry {
  key: typeof DRAFT_META_KEY;
  kind: "meta";
  mimeType: string;
  startedAt: number;
}

interface DraftChunkEntry {
  key: string;
  kind: "chunk";
  index: number;
  capturedAt: number;
  blob: Blob;
}

type DraftEntry = DraftMetaEntry | DraftChunkEntry;

export interface RecordingDraft {
  blob: Blob;
  mimeType: string;
  startedAt: number;
  durationSeconds: number;
  chunkCount: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
      if (!request.result.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        request.result.createObjectStore(DRAFT_STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open recording storage."));
  });
}

async function transact<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(database.transaction(storeName, mode).objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Recording storage failed."));
    });
  } finally {
    database.close();
  }
}

export async function putRecording(blob: Blob): Promise<void> {
  await transact(STORE_NAME, "readwrite", (store) => store.put(blob, RECORDING_KEY));
}

export async function getRecording(): Promise<Blob | null> {
  return (await transact(STORE_NAME, "readonly", (store) => store.get(RECORDING_KEY))) ?? null;
}

export async function deleteRecording(): Promise<void> {
  await transact(STORE_NAME, "readwrite", (store) => store.delete(RECORDING_KEY));
}

export async function beginRecordingDraft(mimeType: string, startedAt: number): Promise<void> {
  await clearRecordingDraft();
  const entry: DraftMetaEntry = { key: DRAFT_META_KEY, kind: "meta", mimeType, startedAt };
  await transact(DRAFT_STORE_NAME, "readwrite", (store) => store.put(entry));
}

export async function appendRecordingDraftChunk(blob: Blob, index: number, capturedAt = Date.now()): Promise<void> {
  const entry: DraftChunkEntry = {
    key: `chunk:${String(index).padStart(6, "0")}`,
    kind: "chunk",
    index,
    capturedAt,
    blob,
  };
  await transact(DRAFT_STORE_NAME, "readwrite", (store) => store.put(entry));
}

export async function getRecordingDraft(): Promise<RecordingDraft | null> {
  const entries = await transact<DraftEntry[]>(DRAFT_STORE_NAME, "readonly", (store) => store.getAll());
  const meta = entries.find((entry): entry is DraftMetaEntry => entry.kind === "meta");
  const chunks = entries
    .filter((entry): entry is DraftChunkEntry => entry.kind === "chunk")
    .sort((left, right) => left.index - right.index);
  if (!meta || chunks.length === 0) return null;
  const capturedAt = chunks[chunks.length - 1]?.capturedAt ?? meta.startedAt;
  return {
    blob: new Blob(chunks.map((entry) => entry.blob), { type: meta.mimeType }),
    mimeType: meta.mimeType,
    startedAt: meta.startedAt,
    durationSeconds: Math.max(1, Math.round((capturedAt - meta.startedAt) / 1000)),
    chunkCount: chunks.length,
  };
}

export async function clearRecordingDraft(): Promise<void> {
  await transact(DRAFT_STORE_NAME, "readwrite", (store) => store.clear());
}

export async function deleteAllRecordingData(): Promise<void> {
  await Promise.all([deleteRecording(), clearRecordingDraft()]);
}
