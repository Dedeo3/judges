"use client";

import dynamic from "next/dynamic";

// Client-only on purpose: the consent flow is meaningless without `window.opener` and the URL,
// neither of which exist during a server render.
const ConnectFlow = dynamic(() => import("./ConnectFlow"), {
  ssr: false,
  loading: () => (
    <main style={{ maxWidth: 420, margin: "2rem auto", padding: "0 1rem", fontFamily: "sans-serif" }}>
      <p>Loading…</p>
    </main>
  ),
});

export default function ConnectPage() {
  return <ConnectFlow />;
}
