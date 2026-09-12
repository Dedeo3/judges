import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `/api/prove` reads the circuit's wasm witness calculator and proving key from prover/build
  // at request time (see src/lib/prove.ts). Next's tracer can't see an `fs` read built from
  // `process.cwd()`, and in a monorepo the tracing root defaults to this project directory, so
  // both settings are needed: widen the root to the repo, then name the two files explicitly.
  // Without this the deployed function throws ENOENT on the first proof — and only then.
  outputFileTracingRoot: path.join(import.meta.dirname, "..", ".."),
  outputFileTracingIncludes: {
    "/api/prove": [
      "../../prover/build/judges_membership_final.zkey",
      "../../prover/build/judges_membership_js/judges_membership.wasm",
    ],
  },
};

export default nextConfig;
