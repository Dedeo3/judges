import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Redesign B: proving runs in the browser, so no server route reads the wasm/zkey anymore.
  // The v2 artifacts are served as static assets from public/prover/ (see lib/proveBrowser.ts and
  // public/prover/README.md), which Next serves directly — no file tracing needed.

  async headers() {
    return [
      {
        // The consent popup must never be framed. If another site could embed it, it could lay a
        // decoy over the "Verify with passkey" button and trick a tap (clickjacking).
        //
        // Note what is deliberately NOT set: Cross-Origin-Opener-Policy: same-origin. That would
        // sever `window.opener`, and the popup would have no way to hand the proof back.
        source: "/connect",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
