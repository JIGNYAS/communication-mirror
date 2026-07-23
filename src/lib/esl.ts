export interface TenseFlag {
  sentenceIndex: number;
  sentence: string;
  reason: string;
}

const pastMarkers = /\b(yesterday|last (?:night|week|month|year)|ago|previously)\b/i;
const futureMarkers = /\b(tomorrow|next (?:week|month|year)|later|soon|in the future)\b/i;
const pastGrammar = /\b(was|were|had|did|went|came|made|took|said|told|worked|finished|started|\w+ed)\b/i;
const futureGrammar = /\b(will|shall|going to|plan to|hope to)\b/i;

export function findTenseFlags(text: string): TenseFlag[] {
  const sentences = text.match(/[^.!?]+[.!?]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  return sentences.flatMap((sentence, sentenceIndex) => {
    if (pastMarkers.test(sentence) && futureGrammar.test(sentence)) {
      return [{ sentenceIndex, sentence, reason: "A past-time marker appears with future grammar. Check whether the time shift is intentional." }];
    }
    if (futureMarkers.test(sentence) && pastGrammar.test(sentence)) {
      return [{ sentenceIndex, sentence, reason: "A future-time marker appears with past grammar. Check the verb tense." }];
    }
    if (pastGrammar.test(sentence) && futureGrammar.test(sentence) && !/\b(but|then|and now|because)\b/i.test(sentence)) {
      return [{ sentenceIndex, sentence, reason: "Past and future forms appear together without a clear transition." }];
    }
    return [];
  });
}

