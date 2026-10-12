// Fetches the music bed and sound effects from Mixkit and prepares them with ffmpeg.
//
//   pnpm --filter @judges/video audio            what is missing
//   pnpm --filter @judges/video audio -- --force  everything again
//
// Downloads go to video/.cache/audio, results to public/music and public/sfx. None of it is
// committed: the Mixkit licence allows use in a video but not passing the files on by themselves.
// Needs ffmpeg on PATH.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cache = join(root, ".cache", "audio");
const force = process.argv.includes("--force");

// "Your Breath" by Eugenio Mininni, mixkit.co/free-stock-music (Mixkit Stock Music Free License).
const MUSIC = { id: 634, url: "https://assets.mixkit.co/music/634/634.mp3" };
// mixkit.co/free-sound-effects (Mixkit Sound Effects Free License), by sound id.
const sfxUrl = (id) => `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;

/**
 * The track is 120 BPM and its kick drums already land on the half second (measured: within
 * 10 ms), which is every 15 frames at 30 fps. So it plays from its own start, untrimmed, and cuts
 * and stamps can sit exactly on the grid.
 */

/**
 * Its sections differ by about 10 dB (quiet intro, loud chorus). Under narration that is too much
 * movement, so each section is pulled toward the same level. [seconds, gain in dB], straight
 * lines between points; measured per bar from the file.
 */
const LEVEL = [
  [0, 0],
  [13.5, 0],
  [15.5, -4],
  [27.5, -4],
  [28.5, -5.5],
  [44, -5.5],
  [46, -6.5],
  [79.5, -6.5],
  [80.5, -4],
  [87.5, -4],
  [89.5, -7],
  [119.5, -7],
  [120.5, -6],
  [400, -6],
];

function levelExpression() {
  let expr = String(LEVEL.at(-1)[1]);
  for (let i = LEVEL.length - 2; i >= 0; i--) {
    const [t0, g0] = LEVEL[i];
    const [t1, g1] = LEVEL[i + 1];
    expr = `if(lt(t,${t1}),${g0}+(${g1 - g0})*(t-${t0})/${t1 - t0},${expr})`;
  }
  return `pow(10,(${expr})/20)`;
}

async function download(url, file) {
  if (existsSync(file) && !force) return;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

function ffmpeg(args, output) {
  const result = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args, output], { encoding: "utf8" });
  if (result.error) throw new Error(`ffmpeg did not start (${result.error.message}). Is it on PATH?`);
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${output}:\n${result.stderr}`);
}

const mp3 = ["-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k"];

/** name -> how to build it. `src` are Mixkit sound ids, in input order. */
const EFFECTS = {
  // A wooden hit for the body, a typewriter strike for the snap, a low sine for weight.
  stamp: {
    src: [2182, 1382],
    extra: ["-f", "lavfi", "-i", "sine=frequency=58:duration=0.34"],
    filter:
      "[0:a]atrim=start=0.045,asetpts=PTS-STARTPTS,volume=0.9[body];" +
      "[1:a]atrim=start=0.105,asetpts=PTS-STARTPTS,highpass=f=900,volume=0.3[snap];" +
      "[2:a]volume='exp(-15*t)':eval=frame,volume=0.8[low];" +
      "[body][snap][low]amix=inputs=3:normalize=0:duration=longest,atrim=duration=0.6,afade=t=out:st=0.4:d=0.2,alimiter=limit=0.85",
  },
  tick: { src: [1125], filter: "[0:a]atrim=start=0.095:duration=0.16,asetpts=PTS-STARTPTS,afade=t=out:st=0.1:d=0.06,volume=2dB" },
  paper: { src: [2380], filter: "[0:a]atrim=start=0.15:duration=0.72,asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=0.5:d=0.22,volume=3dB,alimiter=limit=0.85" },
  marker: { src: [2998], filter: "[0:a]atrim=duration=0.4,asetpts=PTS-STARTPTS,lowpass=f=9000,afade=t=out:st=0.26:d=0.14,volume=7dB,alimiter=limit=0.7" },
  click: { src: [1113], filter: "[0:a]atrim=duration=0.3,asetpts=PTS-STARTPTS,afade=t=out:st=0.18:d=0.12,volume=-6dB" },
  whoosh: { src: [1489], filter: "[0:a]atrim=start=0.35:duration=1,asetpts=PTS-STARTPTS,afade=t=in:d=0.06,afade=t=out:st=0.7:d=0.3,volume=-4dB" },
};

mkdirSync(cache, { recursive: true });
mkdirSync(join(root, "public", "music"), { recursive: true });
mkdirSync(join(root, "public", "sfx"), { recursive: true });

const music = join(root, "public", "music", "your-breath.mp3");
if (force || !existsSync(music)) {
  const source = join(cache, `music-${MUSIC.id}.mp3`);
  await download(MUSIC.url, source);
  ffmpeg(
    [
      "-i", source,
      // The 2.5 kHz dip leaves room for the voice.
      "-af", `volume=volume='${levelExpression()}':eval=frame,equalizer=f=2500:t=q:w=1.2:g=-3,alimiter=limit=0.9`,
      ...mp3,
    ],
    music,
  );
  console.log("music: your-breath.mp3");
} else {
  console.log("music: exists");
}

for (const [name, effect] of Object.entries(EFFECTS)) {
  const output = join(root, "public", "sfx", `${name}.mp3`);
  if (!force && existsSync(output)) {
    console.log(`${name}: exists`);
    continue;
  }
  const inputs = [];
  for (const id of effect.src) {
    const file = join(cache, `sfx-${id}.mp3`);
    await download(sfxUrl(id), file);
    inputs.push("-i", file);
  }
  ffmpeg([...inputs, ...(effect.extra ?? []), "-filter_complex", effect.filter, ...mp3], output);
  console.log(`${name}: ok`);
}
