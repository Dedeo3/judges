import timing from "./timing.json";

/**
 * The narration, as data. `script.json` is the text; `timing.json` is what
 * `pnpm --filter @judges/video voice` measured when it generated each line: how long it runs and
 * when each word is spoken. Scenes are timed from these numbers, so a re-recorded line moves the
 * pictures with it.
 */

export const FPS = 30;

type Timing = { seconds: number; spokenUntil: number; words: [text: string, start: number, end: number][] };
const lines = timing as unknown as Record<string, Timing>;

/** A narration line placed on a timeline, in frames. */
export type Cue = { id: string; at: number };

/** One caption line: `words[i]` is the frame, counted from `from`, at which word `i` is spoken. */
export type CaptionLine = { from: number; text: string; words?: number[]; until?: number };

export function line(id: string): Timing {
  const entry = lines[id];
  if (!entry) throw new Error(`No narration timing for "${id}". Run: pnpm --filter @judges/video voice`);
  return entry;
}

/** Frames until the voice stops. */
export function spoken(id: string) {
  return Math.ceil(line(id).spokenUntil * FPS);
}

/** Frames until the audio file ends, room tone included. */
export function clipFrames(id: string) {
  return Math.ceil(line(id).seconds * FPS) + 1;
}

/** Frame, counted from the start of the line, at which the first word starting with `text` is spoken. */
export function wordAt(id: string, text: string, occurrence = 0) {
  const matches = line(id).words.filter(([word]) => word.toLowerCase().startsWith(text.toLowerCase()));
  const match = matches[occurrence];
  if (!match) throw new Error(`"${text}" is not in narration line "${id}"`);
  return Math.round(match[1] * FPS);
}

/** Splits each line into captions of a readable length, breaking where the sentence does. */
export function captions(cues: Cue[], maxWords = 9): CaptionLine[] {
  const out: CaptionLine[] = [];
  for (const cue of cues) {
    const { words, spokenUntil } = line(cue.id);
    let chunk: typeof words = [];
    const flush = (isLast: boolean) => {
      if (chunk.length === 0) return;
      const from = cue.at + Math.round(chunk[0][1] * FPS);
      const end = isLast ? spokenUntil : chunk[chunk.length - 1][2];
      out.push({
        from,
        text: chunk.map(([word]) => word).join(" "),
        words: chunk.map(([, start]) => cue.at + Math.round(start * FPS) - from),
        until: cue.at + Math.round(end * FPS) + 14,
      });
      chunk = [];
    };
    words.forEach((word, i) => {
      chunk.push(word);
      const last = i === words.length - 1;
      const sentenceEnd = /[.?!]$/.test(word[0]);
      const pause = /[,:;]$/.test(word[0]) && chunk.length >= 4 && words.length - i > 3;
      if (last || sentenceEnd || pause || chunk.length >= maxWords) flush(last);
    });
  }
  return out;
}
