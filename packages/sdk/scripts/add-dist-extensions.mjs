// Adds `.js` to relative import specifiers in the emitted dist/ (both .js and .d.ts).
//
// Why this exists: the source keeps extensionless relative imports, because Next.js/Turbopack in
// this monorepo consumes the SDK's TypeScript source directly and can't resolve `./x.js` to
// `./x.ts`. But the *published* package is ESM ("type": "module"), and Node ESM — plus TypeScript
// consumers on `moduleResolution: NodeNext` — require explicit extensions on relative imports.
// Rewriting only the build output satisfies both, without adding a bundler.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const distDir = join(import.meta.dirname, "..", "dist");

// `from "./x"`, `export … from "./x"`, and inline `import("./x")` (which tsc emits in .d.ts for
// inferred types). Only bare relative specifiers with no extension are touched.
const specifier = /((?:from\s*|import\s*\(\s*)["'])(\.{1,2}\/[^"'.]+)(["'])/g;

let changed = 0;
for (const file of readdirSync(distDir)) {
  if (!file.endsWith(".js") && !file.endsWith(".d.ts")) continue;
  const path = join(distDir, file);
  const before = readFileSync(path, "utf8");
  const after = before.replace(specifier, (_match, prefix, spec, quote) => `${prefix}${spec}.js${quote}`);
  if (after !== before) {
    writeFileSync(path, after);
    changed++;
  }
}

console.log(`add-dist-extensions: rewrote relative imports in ${changed} file(s)`);
