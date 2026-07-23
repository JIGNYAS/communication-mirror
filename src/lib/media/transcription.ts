interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function canTranscribe(): boolean {
  return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startLiveTranscription(
  onText: (text: string) => void,
  onFinalSegment?: (segment: { text: string; startSeconds: number; endSeconds: number }) => void,
): () => void {
  const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Constructor) return () => undefined;
  const recognition = new Constructor();
  let finalText = "";
  const startedAt = performance.now();
  let lastFinalSeconds = 0;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.onresult = (event) => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const text = event.results[index][0]?.transcript ?? "";
      if (event.results[index].isFinal) {
        finalText += `${text} `;
        const endSeconds = Math.max(lastFinalSeconds, (performance.now() - startedAt) / 1000);
        onFinalSegment?.({ text: text.trim(), startSeconds: lastFinalSeconds, endSeconds });
        lastFinalSeconds = endSeconds;
      } else interim += text;
    }
    onText(`${finalText}${interim}`.trim());
  };
  recognition.onerror = () => undefined;
  recognition.start();
  return () => {
    try { recognition.stop(); } catch { /* Recognition may already be stopped. */ }
  };
}
