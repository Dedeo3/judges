import type { ReactNode } from "react";
import { sectionNumber, sectionTitle, type SectionDef } from "@/lib/sections";

/** A short note set in the margin. On narrow screens it sits inline above the section body. */
export function Marginalia({ children }: { children: ReactNode }) {
  return <p className="margin">{children}</p>;
}

/** One numbered footnote. Render inside an `<ol className="footnotes">`. */
export function Footnote({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li id={`fn-${n}`}>
      <span className="fn-n">{n}</span>
      <span>{children}</span>
    </li>
  );
}

/**
 * One numbered section. The § number and heading come from the section list (`@/lib/sections`),
 * never typed by hand, so reordering the list renumbers the page.
 */
export function Section({
  list,
  id,
  margin,
  wide,
  children,
}: {
  list: readonly SectionDef[];
  id: string;
  margin?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="sec" aria-labelledby={`${id}-title`}>
      <div className="sec-side">
        <span className="sec-num">§ {sectionNumber(list, id)}</span>
        {margin && <Marginalia>{margin}</Marginalia>}
      </div>
      <div className={`sec-body${wide ? " sec-body--wide" : ""}`}>
        <h2 id={`${id}-title`}>{sectionTitle(list, id)}</h2>
        {children}
      </div>
    </section>
  );
}
