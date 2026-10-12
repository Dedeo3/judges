// Generates the narration with ElevenLabs and records when each word is spoken.
//
//   pnpm --filter @judges/video voice                 every line that changed since the last run
//   pnpm --filter @judges/video voice -- --only a,b   just those line ids
//   pnpm --filter @judges/video voice -- --force      regenerate everything (costs credits)
//   pnpm --filter @judges/video voice -- --samples    one line in a few voices, into out/voice-samples
//
// Reads src/voiceover/script.json, writes public/vo/<id>.mp3 and src/voiceover/timing.json.
// Needs ELEVENLABS_API_KEY in video/.env (the `voice` script passes --env-file).

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = join(root, "src", "voiceover", "script.json");
const timingPath = join(root, "src", "voiceover", "timing.json");
const audioDir = join(root, "public", "vo");

// Built-in voices only: the free plan cannot use Voice Library voices through the API.
const SAMPLE_VOICES = [
  ["daniel", "onwK4e9ZLuTAKqWW03F9"],
  ["george", "JBFqnCBsd6RMkjVDRZzb"],
  ["eric", "cjVigY5qzO86Huf0OWal"],
  ["brian", "nPczCjzI2devNBz1zQrb"],
];

const key = process.env.ELEVENLABS_API_KEY?.trim();
if (!key) {
  console.error("ELEVENLABS_API_KEY is not set. Put it in video/.env.");
  process.exit(1);
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const script = JSON.parse(readFileSync(scriptPath, "utf8"));
const timing = existsSync(timingPath) ? JSON.parse(readFileSync(timingPath, "utf8")) : {};

async function synthesize({ voiceId, text, previous, next }) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: script.model,
      voice_settings: script.settings,
      seed: 14,
      ...(previous ? { previous_text: previous } : {}),
      ...(next ? { next_text: next } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return res.json();
}

/** Character timings -> one entry per space-separated word. */
function toWords(alignment) {
  const words = [];
  let current = null;
  alignment.characters.forEach((char, i) => {
    if (/\s/.test(char)) {
      if (current) words.push(current);
      current = null;
      return;
    }
    const start = alignment.character_start_times_seconds[i];
    const end = alignment.character_end_times_seconds[i];
    if (!current) current = { text: "", start, end };
    current.text += char;
    current.end = end;
  });
  if (current) words.push(current);
  return words;
}

function seconds(file, fallback) {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
    const value = Number.parseFloat(out);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

/** Where the voice actually stops: the timestamps count the trailing room tone as part of the last word. */
function speechEnd(file, total) {
  const { stderr } = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-38dB:d=0.1", "-f", "null", "-"], { encoding: "utf8" });
  const starts = [...(stderr ?? "").matchAll(/silence_start: ([0-9.]+)/g)].map((m) => Number.parseFloat(m[1]));
  const ends = [...(stderr ?? "").matchAll(/silence_end: ([0-9.]+)/g)].map((m) => Number.parseFloat(m[1]));
  const last = starts.at(-1);
  if (last === undefined) return total;
  const closes = ends.length === starts.length ? ends.at(-1) : total;
  return closes >= total - 0.05 ? last : total;
}

const round = (n) => Math.round(n * 1000) / 1000;

if (flag("samples")) {
  const dir = join(root, "out", "voice-samples");
  mkdirSync(dir, { recursive: true });
  const text = option("text") ?? "A wallet costs nothing to make. Judges takes a proof instead.";
  for (const [name, voiceId] of SAMPLE_VOICES) {
    try {
      const result = await synthesize({ voiceId, text });
      writeFileSync(join(dir, `${name}.mp3`), Buffer.from(result.audio_base64, "base64"));
      console.log(`sample ${name}: ok`);
    } catch (err) {
      console.log(`sample ${name}: ${err.message}`);
    }
  }
  process.exit(0);
}

mkdirSync(audioDir, { recursive: true });
const only = option("only")?.split(",");
const voiceId = option("voice") ?? script.voice.id;
let spent = 0;

for (const [i, line] of script.lines.entries()) {
  if (only && !only.includes(line.id)) continue;
  const spoken = line.say ?? line.text;
  const hash = createHash("sha256").update(JSON.stringify([voiceId, script.model, script.settings, spoken])).digest("hex").slice(0, 16);
  const file = join(audioDir, `${line.id}.mp3`);
  if (!flag("force") && timing[line.id]?.hash === hash && existsSync(file)) {
    console.log(`${line.id}: unchanged`);
    continue;
  }

  // Neighbouring lines of the same passage keep the delivery continuous across separate requests.
  const passage = (id) => id.replace(/-\d+$/, "");
  const before = script.lines[i - 1];
  const after = script.lines[i + 1];
  const result = await synthesize({
    voiceId,
    text: spoken,
    previous: before && passage(before.id) === passage(line.id) ? (before.say ?? before.text) : undefined,
    next: after && passage(after.id) === passage(line.id) ? (after.say ?? after.text) : undefined,
  });
  writeFileSync(file, Buffer.from(result.audio_base64, "base64"));

  const words = toWords(result.alignment);
  const shown = line.text.split(/\s+/);
  if (shown.length !== words.length) {
    console.warn(`${line.id}: ${shown.length} written words but ${words.length} spoken; captions use the spoken ones`);
  }
  const lastEnd = words.length ? words[words.length - 1].end : 0;
  const total = seconds(file, lastEnd + 0.2);
  timing[line.id] = {
    hash,
    seconds: round(total),
    spokenUntil: round(speechEnd(file, total)),
    words: words.map((word, n) => [shown.length === words.length ? shown[n] : word.text, round(word.start), round(word.end)]),
  };
  spent += spoken.length;
  console.log(`${line.id}: ${timing[line.id].spokenUntil}s  (${spoken.length} chars)`);
  writeFileSync(timingPath, `${JSON.stringify(timing, null, 2)}\n`);
}

console.log(`Done. ${spent} characters sent this run.`);
