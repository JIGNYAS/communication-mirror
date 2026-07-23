export function isAudioReviewReady(goals: string[], ratings: Record<string, number>, tonalityRating: number | null): boolean {
  return Boolean(tonalityRating) && goals.every((goal) => Boolean(ratings[goal]));
}
