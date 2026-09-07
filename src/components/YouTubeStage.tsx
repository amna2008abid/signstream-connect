import { useEffect, useRef } from "react";

type Props = {
  videoId: string;
  onTime: (t: number) => void;
  onPlaying: (p: boolean) => void;
};

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
  });
}

export function YouTubeStage({ videoId, onTime, onPlaying }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let player: any;
    let timer: ReturnType<typeof setInterval>;
    let cancelled = false;

    loadApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      player = new YT.Player(hostRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e: any) => {
            const playing = e.data === YT.PlayerState.PLAYING;
            onPlaying(playing);
          },
        },
      });
      timer = setInterval(() => {
        if (typeof player?.getCurrentTime === "function") {
          onTime(player.getCurrentTime() ?? 0);
        }
      }, 120);
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      try {
        player?.destroy?.();
      } catch {
        /* ignore */
      }
    };
  }, [videoId, onTime, onPlaying]);

  return (
    <div className="player">
      <div ref={hostRef} className="player-frame" />
    </div>
  );
}
