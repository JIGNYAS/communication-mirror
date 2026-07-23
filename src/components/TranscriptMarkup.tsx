import { FILLER_PHRASES, NON_WORDS } from "@/lib/constants";
import type { TenseFlag } from "@/lib/esl";

interface TranscriptMarkupProps {
  text: string;
  tenseFlags?: TenseFlag[];
}

export function TranscriptMarkup({ text, tenseFlags = [] }: TranscriptMarkupProps) {
  if (!text.trim()) return <p className="empty-copy">Your highlighted transcript will appear here.</p>;
  const phrases = [...FILLER_PHRASES, ...NON_WORDS].sort((left, right) => right.length - left.length);
  const expression = new RegExp(`(\\b(?:${phrases.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b)`, "gi");
  const sentences = text.match(/[^.!?]+[.!?]?/g) ?? [text];
  const flagged = new Set(tenseFlags.map((flag) => flag.sentenceIndex));
  return (
    <p className="marked-transcript">
      {sentences.map((sentence, sentenceIndex) => <span className={flagged.has(sentenceIndex) ? "tense-warning" : ""} key={`${sentence}-${sentenceIndex}`}>{sentence.split(expression).map((token, tokenIndex) => {
          const normalized = token.toLowerCase();
          const kind = NON_WORDS.includes(normalized) ? "non-word" : FILLER_PHRASES.includes(normalized) ? "filler" : undefined;
          return kind ? <mark key={`${token}-${tokenIndex}`} className={kind}>{token}</mark> : <span key={`${token}-${tokenIndex}`}>{token}</span>;
        })}{" "}</span>)}
    </p>
  );
}
