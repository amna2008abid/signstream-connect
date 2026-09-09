import A from "@/assets/asl/A.png";
import B from "@/assets/asl/B.png";
import C from "@/assets/asl/C.png";
import D from "@/assets/asl/D.png";
import E from "@/assets/asl/E.png";
import F from "@/assets/asl/F.png";
import G from "@/assets/asl/G.png";
import H from "@/assets/asl/H.png";
import I from "@/assets/asl/I.png";
import J from "@/assets/asl/J.png";
import K from "@/assets/asl/K.png";
import L from "@/assets/asl/L.png";
import M from "@/assets/asl/M.png";
import N from "@/assets/asl/N.png";
import O from "@/assets/asl/O.png";
import P from "@/assets/asl/P.png";
import Q from "@/assets/asl/Q.png";
import R from "@/assets/asl/R.png";
import S from "@/assets/asl/S.png";
import T from "@/assets/asl/T.png";
import U from "@/assets/asl/U.png";
import V from "@/assets/asl/V.png";
import W from "@/assets/asl/W.png";
import X from "@/assets/asl/X.png";
import Y from "@/assets/asl/Y.png";
import Z from "@/assets/asl/Z.png";
import type { SignSegment } from "./asl";

/** Real ASL manual-alphabet handshapes (Wikimedia Commons, public domain). */
export const HANDSHAPES: Record<string, string> = {
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  X,
  Y,
  Z,
};

export type HandFrame = {
  /** letter being formed by the hand, or null for the short rest between words */
  letter: string | null;
  /** word (gloss) this frame belongs to */
  gloss: string;
  /** index of the letter inside the gloss, -1 for a rest */
  pos: number;
  start: number;
  end: number;
};

/**
 * Turn one timed segment into a sequence of handshape frames spread across the
 * segment, so the interpreter's hand actually moves through the signs while the
 * video plays. Between words the hand rests briefly.
 */
export function buildHandFrames(segment: SignSegment | null): HandFrame[] {
  if (!segment) return [];
  const span = Math.max(segment.end - segment.start, 0.5);

  type Slot = { letter: string | null; gloss: string; pos: number; weight: number };
  const slots: Slot[] = [];

  segment.tokens.forEach((token, ti) => {
    const letters = token.gloss.toUpperCase().replace(/[^A-Z]/g, "").split("");
    if (letters.length === 0) return;
    letters.forEach((letter, pos) => {
      slots.push({ letter, gloss: token.gloss, pos, weight: 1 });
    });
    if (ti < segment.tokens.length - 1) {
      slots.push({ letter: null, gloss: token.gloss, pos: -1, weight: 0.6 });
    }
  });

  if (slots.length === 0) return [];

  const total = slots.reduce((sum, s) => sum + s.weight, 0);
  let t = segment.start;
  return slots.map((s) => {
    const dur = (s.weight / total) * span;
    const frame: HandFrame = {
      letter: s.letter,
      gloss: s.gloss,
      pos: s.pos,
      start: t,
      end: t + dur,
    };
    t += dur;
    return frame;
  });
}

export function activeFrameIndex(frames: HandFrame[], t: number): number {
  if (frames.length === 0) return -1;
  for (let i = 0; i < frames.length; i++) {
    if (t >= frames[i]!.start && t < frames[i]!.end) return i;
  }
  return t >= frames[frames.length - 1]!.end ? frames.length - 1 : 0;
}
