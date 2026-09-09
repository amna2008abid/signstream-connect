import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { translateVideo } from "@/lib/translate.functions";
import { formatTime, type TranslationResult } from "@/lib/asl";
import { SignStage } from "@/components/SignStage";
import { YouTubeStage } from "@/components/YouTubeStage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HandsOn — Watch Any Video in Sign Language" },
      {
        name: "description",
        content:
          "Paste a YouTube link or upload a video and a signing interpreter shows what is said in American Sign Language — no reading needed.",
      },
      { property: "og:title", content: "HandsOn — Watch Any Video in Sign Language" },
      {
        property: "og:description",
        content:
          "Video made accessible for Deaf viewers: an on-screen ASL interpreter signs along with any video.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const MAX_BYTES = 18 * 1024 * 1024;

function youTubeId(input: string): string | null {
  const m = input.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  return m?.[1] ?? null;
}

function Index() {
  const run = useServerFn(translateVideo);

  const [mode, setMode] = useState<"link" | "upload">("link");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytRef = useRef<{ seek: (t: number) => void } | null>(null);

  const handleTime = useCallback((t: number) => setTime(t), []);
  const handlePlaying = useCallback((p: boolean) => setPlaying(p), []);
  const handleReady = useCallback((api: { seek: (t: number) => void }) => {
    ytRef.current = api;
  }, []);


  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  async function fileToDataUrl(f: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("That file could not be read."));
      reader.readAsDataURL(f);
    });
  }

  async function start() {
    setError(null);
    setResult(null);
    setTime(0);
    setPlaying(false);

    try {
      if (mode === "link") {
        const id = youTubeId(url.trim());
        if (!id) {
          setError("That doesn't look like a YouTube link. Copy the link from the video page.");
          return;
        }
        setVideoId(id);
        setObjectUrl(null);
        setLoading(true);
        const res = await run({ data: { kind: "youtube", url: url.trim() } });
        setResult(res);
      } else {
        if (!file) {
          setError("Choose a video from your device first.");
          return;
        }
        if (file.size > MAX_BYTES) {
          setError("That video is too big. Please pick one under 18 MB, or paste a YouTube link.");
          return;
        }
        setVideoId(null);
        setObjectUrl(URL.createObjectURL(file));
        setLoading(true);
        const dataUrl = await fileToDataUrl(file);
        const res = await run({
          data: { kind: "upload", dataUrl, mimeType: file.type || "video/mp4" },
        });
        setResult(res);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function seek(t: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      void videoRef.current.play();
    }
    ytRef.current?.seek(t);
    setTime(t);
  }


  return (
    <main className="min-h-screen hero-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-6">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-3xl">
            🤟
          </span>
          <span className="font-[family-name:var(--font-display)] text-xl font-extrabold">
            HandsOn
          </span>
        </div>
        <span className="text-sm text-muted-foreground">American Sign Language</span>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-10 pt-4 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
          Any video. <span className="text-primary">Signed</span>, not spelled.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Paste a video link or upload one. An interpreter appears beside it and signs what is
          said, so nothing has to be read.
        </p>

        <div className="panel mx-auto mt-9 max-w-2xl p-5 text-left">
          <div className="flex gap-2">
            <button className="btn-ghost" data-active={mode === "link"} onClick={() => setMode("link")}>
              🔗 Paste a link
            </button>
            <button
              className="btn-ghost"
              data-active={mode === "upload"}
              onClick={() => setMode("upload")}
            >
              ⬆️ Upload a video
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {mode === "link" ? (
              <input
                className="field"
                inputMode="url"
                placeholder="https://youtube.com/watch?v=…"
                aria-label="YouTube video link"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            ) : (
              <input
                className="field"
                type="file"
                accept="video/*"
                aria-label="Video file from your device"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            )}
            <button className="btn-primary shrink-0" onClick={start} disabled={loading}>
              {loading ? "Interpreting…" : "Start signing"}
            </button>
          </div>

          {loading && (
            <p className="mt-4 text-sm text-accent">
              Watching the video and preparing the signs — this takes about a minute.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </section>

      {(videoId || objectUrl) && (
        <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-16 lg:grid-cols-[1.5fr_1fr]">
          <div className="stage-wrap">
            {videoId ? (
              <YouTubeStage
                videoId={videoId}
                onTime={handleTime}
                onPlaying={handlePlaying}
                onReady={handleReady}
              />

            ) : (
              <div className="player">
                <video
                  ref={videoRef}
                  src={objectUrl ?? undefined}
                  controls
                  playsInline
                  onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
              </div>
            )}
            <SignStage segments={result?.segments ?? []} time={time} playing={playing} />
          </div>

          <div className="panel p-5">
            <h2 className="text-lg font-bold">What is said</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {result?.summary || "Preparing the signs for this video…"}
            </p>
            {result && (
              <ul className="mt-4 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                {result.segments.map((s, i) => {
                  const on = time >= s.start && time < s.end;
                  return (
                    <li key={i}>
                      <button
                        onClick={() => seek(s.start)}
                        className={`w-full rounded-xl border border-border px-4 py-3 text-left transition-colors ${
                          on ? "bg-accent text-accent-foreground" : "bg-secondary"
                        }`}
                      >
                        <span className="text-xs opacity-70">{formatTime(s.start)}</span>
                        <p className="mt-1 font-semibold">
                          {s.tokens.map((t) => t.gloss).join(" ")}
                        </p>
                        <p className="mt-1 text-sm opacity-80">{s.text}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

      )}

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: "👀", t: "Made for eyes, not reading", d: "Big signs and clear cues instead of small subtitles." },
            { icon: "⚡", t: "Works with any video", d: "A YouTube link or a video from your phone." },
            { icon: "🫶", t: "No sign-up, no waiting", d: "Open it, paste, watch. Free to use." },
          ].map((c) => (
            <div key={c.t} className="panel p-6">
              <div aria-hidden className="text-3xl">
                {c.icon}
              </div>
              <h3 className="mt-3 text-lg font-bold">{c.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Interpretation is generated automatically and can be imperfect — for medical, legal, or
          emergency information, please use a human interpreter.
        </p>
      </section>
    </main>
  );
}
