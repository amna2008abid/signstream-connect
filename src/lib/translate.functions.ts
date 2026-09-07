import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TranslationResult, SignSegment } from "./asl";

const Input = z.union([
  z.object({ kind: z.literal("youtube"), url: z.string().url() }),
  z.object({
    kind: z.literal("upload"),
    dataUrl: z.string().min(32),
    mimeType: z.string().min(3),
  }),
]);

const SYSTEM = `You are an expert American Sign Language (ASL) interpreter and captioner.
You watch a video and produce a sign-language-ready interpretation for Deaf users who cannot read written text well.

Return ONLY minified JSON, no markdown fences, with this exact shape:
{"language":"<spoken language name>","summary":"<one very simple sentence, max 12 easy words, describing what the video is about>","segments":[{"start":<seconds number>,"end":<seconds number>,"text":"<what is said, verbatim>","tokens":[{"gloss":"<ASL GLOSS IN CAPS>","fingerspell":<true|false>}]}]}

Rules:
- start/end are numbers of seconds from the beginning of the video (e.g. 4.5), never strings.
- Break speech into short segments of 2 to 6 seconds.
- tokens must follow ASL grammar and word order (topic-comment, time markers first), NOT English word order. Drop English function words that ASL does not sign (a, the, is, are, of).
- Use standard ASL glosses in capitals. Use a hyphen for compound glosses (e.g. LOOK-AT).
- Set fingerspell true only for names, brands, or words with no lexical sign; the gloss is then the word in capitals.
- If the video has no speech, return segments describing key sounds/actions instead, and say so in summary.`;

function parseSeconds(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parts = v.split(":").map(Number);
    if (parts.every((n) => Number.isFinite(n))) {
      return parts.reduce((acc, n) => acc * 60 + n, 0);
    }
  }
  return 0;
}

export const translateVideo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<TranslationResult> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured yet.");

    const videoUrl =
      data.kind === "youtube"
        ? data.url
        : data.dataUrl.startsWith("data:")
          ? data.dataUrl
          : `data:${data.mimeType};base64,${data.dataUrl}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        stream: false,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Interpret this video into ASL following your instructions. JSON only.",
              },
              { type: "video_url", video_url: { url: videoUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 402)
        throw new Error(
          "This site has run out of AI credits. The owner needs to top them up before more videos can be translated.",
        );
      if (res.status === 429)
        throw new Error("Too many videos at once. Please wait a moment and try again.");
      throw new Error(
        `The video could not be interpreted (${res.status}). ${body.slice(0, 200)}`,
      );
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No speech could be read from this video.");

    let parsed: {
      language?: string;
      summary?: string;
      segments?: {
        start?: unknown;
        end?: unknown;
        text?: string;
        tokens?: { gloss?: string; fingerspell?: boolean }[];
      }[];
    };
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      throw new Error("The interpretation came back unreadable. Please try again.");
    }

    const segments: SignSegment[] = (parsed.segments ?? [])
      .map((s) => {
        const st = parseSeconds(s.start);
        let en = parseSeconds(s.end);
        if (en <= st) en = st + 3;
        return {
          start: st,
          end: en,
          text: (s.text ?? "").trim(),
          tokens: (s.tokens ?? [])
            .map((t) => ({
              gloss: (t.gloss ?? "").toUpperCase().trim(),
              fingerspell: Boolean(t.fingerspell),
            }))
            .filter((t) => t.gloss.length > 0),
        };
      })
      .filter((s) => s.tokens.length > 0 || s.text.length > 0)
      .sort((a, b) => a.start - b.start);

    if (segments.length === 0) throw new Error("No speech was found in this video.");

    return {
      segments,
      language: parsed.language ?? "Unknown",
      summary: parsed.summary ?? "",
    };
  });
