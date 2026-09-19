import { sql } from "./db";

/**
 * Short-lived key/value state in Postgres, with the same contract the Redis store had:
 * `take` returns the value at most once, and never after it has expired.
 */
export async function putEphemeral(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const db = sql();
  // Opportunistic cleanup so the table stays small without a scheduled job.
  await db`delete from ephemeral_state where expires_at < now()`;
  await db`
    insert into ephemeral_state (key, value, expires_at)
    values (${key}, ${JSON.stringify(value)}::jsonb, now() + make_interval(secs => ${ttlSeconds}))
    on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at
  `;
}

export async function takeEphemeral<T>(key: string): Promise<T | null> {
  // DELETE ... RETURNING is atomic: two concurrent takers can't both receive the value.
  const rows = (await sql()`
    delete from ephemeral_state
    where key = ${key} and expires_at > now()
    returning value
  `) as { value: T }[];
  return rows.length > 0 ? rows[0].value : null;
}
