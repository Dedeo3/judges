/**
 * Section numbering comes from these arrays alone: a section's § number is its position here, so
 * reordering or inserting one renumbers everything with no other edit.
 */
export interface SectionDef {
  readonly id: string;
  readonly title: string;
}

export const OPINION_SECTIONS = [
  { id: "holding", title: "Holding" },
  { id: "evidence", title: "Evidence" },
  { id: "procedure", title: "Procedure" },
  { id: "docket", title: "Docket" },
  { id: "dissent", title: "Dissent" },
] as const satisfies readonly SectionDef[];

export const DEVELOPER_SECTIONS = [
  { id: "install", title: "Install" },
  { id: "usage", title: "Usage" },
  { id: "namespace", title: "Your namespace" },
  { id: "binding", title: "Binding an action" },
  { id: "requirements", title: "Page requirements" },
  { id: "errors", title: "Errors" },
  { id: "contracts", title: "Contracts" },
] as const satisfies readonly SectionDef[];

export function sectionNumber(list: readonly SectionDef[], id: string): number {
  const index = list.findIndex((s) => s.id === id);
  if (index === -1) throw new Error(`Unknown section id: ${id}`);
  return index + 1;
}

export function sectionTitle(list: readonly SectionDef[], id: string): string {
  const found = list.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown section id: ${id}`);
  return found.title;
}
