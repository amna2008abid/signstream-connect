import { useMemo } from "react";
import robot from "@/assets/robot-signer.png";
import { activeSegment, activeTokenIndex, type SignSegment } from "@/lib/asl";

type Props = {
  segments: SignSegment[];
  time: number;
  playing: boolean;
};

/** Round interpreter bubble that overlays the video's left corner. */
export function SignStage({ segments, time, playing }: Props) {
  const seg = useMemo(() => activeSegment(segments, time), [segments, time]);
  const idx = activeTokenIndex(seg, time);
  const token = seg && idx >= 0 ? seg.tokens[idx] : null;
  const signing = playing && Boolean(token);

  return (
    <div className="bubble" aria-label="Sign language interpreter">
      <div className={`bubble-ring ${signing ? "is-live" : ""}`}>
        <img
          src={robot}
          alt="Robot interpreter signing in American Sign Language"
          width={1024}
          height={1024}
          className={signing ? "is-signing" : ""}
        />
      </div>
      <div className="bubble-caption" aria-live="polite">
        {token ? (
          token.fingerspell ? (
            <span className="bubble-spell">
              {token.gloss.split("").map((c, i) => (
                <span key={i} className="bubble-letter">
                  {c}
                </span>
              ))}
            </span>
          ) : (
            <span className="bubble-gloss">{token.gloss}</span>
          )
        ) : (
          <span className="bubble-gloss bubble-idle">
            {segments.length ? "▶ press play" : "…"}
          </span>
        )}
      </div>
    </div>
  );
}
