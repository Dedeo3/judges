"use client";

import { useEffect, useRef, useState } from "react";

/** A block of code on slightly darker paper, with a plain-text copy control. */
export function CodeBlock({ code, label, wrap }: { code: string; label?: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <figure className={`code${wrap ? " code--wrap" : ""}`} style={{ margin: 0 }}>
      <div className="code-bar label muted">
        <span>{label ?? "code"}</span>
        <button type="button" className="linkbtn" onClick={copy}>
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre tabIndex={0}>
        <code>{code}</code>
      </pre>
    </figure>
  );
}
