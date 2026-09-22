import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "migrations");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = neon(databaseUrl);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`Applying ${file}...`);
    // Strip `--` comments first: statements are split on `;`, and a `;` inside a comment would cut it
    // in half and send the second half to Postgres as SQL.
    const contents = readFileSync(join(MIGRATIONS_DIR, file), "utf8").replace(/--.*$/gm, "");
    const statements = contents
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await sql(statement);
    }
  }

  console.log("Migrations complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
