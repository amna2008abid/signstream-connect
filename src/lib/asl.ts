export type SignToken = {
  /** ASL gloss for the sign, e.g. "HELLO" */
  gloss: string;
  /** true when the word has no lexical sign and must be fingerspelled */
  fingerspell: boolean;
};

export type SignSegment = {
  start: number;
  end: number;
  /** original spoken words */
  text: string;
  /** ASL gloss sequence (ASL grammar, not English word order) */
  tokens: SignToken[];
};

export type TranslationResult = {
  segments: SignSegment[];
  language: string;
  summary: string;
};

export function activeSegment(segments: SignSegment[], t: number) {
  return segments.find((s) => t >= s.start && t < s.end) ?? null;
}

export function activeTokenIndex(segment: SignSegment | null, t: number) {
  if (!segment || segment.tokens.length === 0) return -1;
  const span = Math.max(segment.end - segment.start, 0.4);
  const per = span / segment.tokens.length;
  const idx = Math.floor((t - segment.start) / per);
  return Math.min(Math.max(idx, 0), segment.tokens.length - 1);
}

export function formatTime(t: number) {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
