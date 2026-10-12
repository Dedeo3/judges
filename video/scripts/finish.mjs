// Brings a rendered video to streaming loudness without touching the picture.
//
//   node scripts/finish.mjs out/judges-demo.raw.mp4 out/judges-demo.mp4
//
// The render is mixed with headroom (see src/audio/Soundtrack.tsx). This measures it, applies one
// fixed gain to reach -16 LUFS, and limits the few peaks (the stamps) that the gain pushes past
// -1.5 dB. A fixed gain keeps the balance between voice and music exactly as mixed, which
// ffmpeg's loudnorm does not promise once it has to fall back to its dynamic mode.

import { spawnSync } from "node:child_process";

const TARGET_LUFS = -16;
const CEILING = 0.84; // about -1.5 dBFS

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/finish.mjs <rendered.mp4> <finished.mp4>");
  process.exit(1);
}

function run(args) {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8" });
  if (result.error) throw new Error(`ffmpeg did not start (${result.error.message}). Is it on PATH?`);
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stderr;
}

function measure(file) {
  const log = run(["-i", file, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const summary = log.slice(log.lastIndexOf("Summary:"));
  const loudness = Number.parseFloat(/I:\s+(-?[0-9.]+) LUFS/.exec(summary)?.[1] ?? "NaN");
  const peak = Number.parseFloat(/Peak:\s+(-?[0-9.]+) dBFS/.exec(summary)?.[1] ?? "NaN");
  if (!Number.isFinite(loudness)) throw new Error(`Could not measure the loudness of ${file}`);
  return { loudness, peak };
}

const before = measure(input);
const gain = TARGET_LUFS - before.loudness;
run(["-y", "-i", input, "-c:v", "copy", "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=${CEILING}:level=false:attack=3:release=60`, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", output]);
const after = measure(output);

console.log(`rendered: ${before.loudness.toFixed(1)} LUFS, peak ${before.peak.toFixed(1)} dBFS`);
console.log(`gain:     ${gain >= 0 ? "+" : ""}${gain.toFixed(1)} dB`);
console.log(`finished: ${after.loudness.toFixed(1)} LUFS, peak ${after.peak.toFixed(1)} dBFS  ->  ${output}`);
