"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { step } from "@/lib/motion";

/**
 * A block of code on slightly darker paper, with a plain-text copy control. With `typed`, each
 * character is its own element so the page's load sequence can type the snippet out in order,
 * whatever way the lines happen to wrap.
 */
export function CodeBlock({
  code,
  label,
  wrap,
  typed,
  className,
  style,
}: {
  code: string;
  label?: string;
  wrap?: boolean;
  typed?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
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
    <figure className={`code${wrap ? " code--wrap" : ""}${className ? ` ${className}` : ""}`} style={{ margin: 0, ...style }}>
      <div className="code-bar label muted">
        <span>{label ?? "code"}</span>
        <button type="button" className="linkbtn" onClick={copy} data-copied={copied || undefined}>
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre tabIndex={0}>
        <code>
          {typed
            ? Array.from(code, (char, i) => (
                <span key={i} className="code-char" style={step(i)}>
                  {char}
                </span>
              ))
            : code}
        </code>
      </pre>
    </figure>
  );
}
