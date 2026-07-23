export function normalizeIntentions(values: string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const entry of values) {
    const value = entry.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    normalized.push(value);
    if (normalized.length === 5) break;
  }
  return normalized;
}
