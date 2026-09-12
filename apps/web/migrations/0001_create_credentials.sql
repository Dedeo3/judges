create table if not exists credentials (
  id text primary key,
  credential_public_key text not null,
  user_id text not null,
  rp_id text not null,
  sign_count bigint not null default 0,
  transports text[],
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists credentials_user_id_idx on credentials (user_id);
