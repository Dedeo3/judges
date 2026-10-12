"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";

type Phase = "static" | "pending" | "in";

/**
 * Plays an element's entrance once, when it scrolls into view. The styles are in the Motion
 * section of globals.css, keyed on `data-reveal`.
 *
 * The server always renders the finished state. After hydration, only elements still below the
 * viewport are held back ("pending") until they arrive ("in"); anything already on screen is left
 * exactly as it is. So nothing visible ever blinks out, and without JavaScript the page is whole.
 */
export function Reveal({
  as = "div",
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "ol" }) {
  // Typed as one tag so the ref and props check; the element rendered is whatever `as` says.
  const Tag = as as "div";
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("static");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry.isIntersecting) {
          setPhase((current) => (current === "pending" ? "in" : current));
          observer.disconnect();
        } else if (entry.boundingClientRect.top >= window.innerHeight) {
          setPhase("pending");
        } else {
          observer.disconnect();
        }
      },
      // Wait until the element is a little way up the screen, not just touching its bottom edge.
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag {...rest} ref={ref} data-reveal={phase === "static" ? undefined : phase}>
      {children}
    </Tag>
  );
}
