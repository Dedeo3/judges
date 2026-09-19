-- Short-lived, single-use state (WebAuthn challenges, pending wallet bindings).
-- Replaces the Upstash Redis store: one fewer service to run for the MVP.
-- Single-use is enforced by `delete ... returning` in the app (atomic in Postgres).
create table if not exists ephemeral_state (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz not null
);

create index if not exists ephemeral_state_expires_at_idx on ephemeral_state (expires_at);
