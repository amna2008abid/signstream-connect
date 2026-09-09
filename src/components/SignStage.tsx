import { useMemo } from "react";
import robot from "@/assets/robot-signer.png";
import { activeSegment, type SignSegment } from "@/lib/asl";
import { HANDSHAPES, activeFrameIndex, buildHandFrames } from "@/lib/handshapes";

type Props = {
  segments: SignSegment[];
  time: number;
  playing: boolean;
};

/** Round interpreter bubble that overlays the video's left corner. */
export function SignStage({ segments, time, playing }: Props) {
  const seg = useMemo(() => activeSegment(segments, time), [segments, time]);
  const frames = useMemo(() => buildHandFrames(seg), [seg]);
  const fi = activeFrameIndex(frames, time);
  const frame = fi >= 0 ? frames[fi] : undefined;
  const hand = frame?.letter ? HANDSHAPES[frame.letter] : undefined;
  const signing = playing && Boolean(frame);

  return (
    <div className="bubble" aria-label="Sign language interpreter">
      <div className={`bubble-ring ${signing ? "is-live" : ""}`}>
        <img className="bubble-robot" src={robot} alt="" aria-hidden />
        {hand && frame ? (
          <img
            key={`${fi}-${frame.letter}`}
            className="bubble-hand"
            src={hand}
            alt={`Hand shape for the letter ${frame.letter}`}
          />
        ) : (
          <div className="bubble-rest" aria-hidden />
        )}
      </div>

      <div className="bubble-caption" aria-live="polite">
        {frame ? (
          <span className="bubble-gloss">
            {frame.gloss.split("").map((ch, i) => (
              <span key={i} className={i === frame.pos ? "bubble-now" : undefined}>
                {ch}
              </span>
            ))}
          </span>
        ) : (
          <span className="bubble-gloss bubble-idle">
            {segments.length ? "▶ press play" : "…"}
          </span>
        )}
      </div>
    </div>
  );
}
