create table if not exists applications (
  id text primary key,
  name text not null,
  domain text not null unique,
  policy_hash text,
  created_at timestamptz not null default now()
);

insert into applications (id, name, domain)
values ('demo', 'Judges Demo', 'judges-demo')
on conflict (domain) do nothing;

create table if not exists bindings (
  id text primary key,
  credential_id text not null references credentials(id),
  wallet_address text not null,
  domain text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- A credential can be bound to only one wallet per domain at a time.
create unique index if not exists bindings_domain_credential_active_idx
  on bindings (domain, credential_id) where revoked_at is null;

-- A wallet can be bound to only one credential per domain at a time.
create unique index if not exists bindings_domain_wallet_active_idx
  on bindings (domain, wallet_address) where revoked_at is null;
