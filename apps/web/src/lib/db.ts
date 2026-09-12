import { neon } from "@neondatabase/serverless";
import { requireEnv } from "./env";

let client: ReturnType<typeof neon> | null = null;

export function sql() {
  if (!client) {
    client = neon(requireEnv("DATABASE_URL"));
  }
  return client;
}
