-- Redesign B: the server stores only identity COMMITMENTS (Poseidon(secret)), never secrets.
-- The secret is derived client-side from a wallet signature and never leaves the device.
--
-- Leaves are append-only and ordered by `leaf_index` (the LeanIMT insertion order), so the
-- off-chain tree can be rebuilt deterministically and the on-chain root reproduced. A commitment
-- is unique, and re-registering the same identity is a no-op.
create table if not exists identity_commitments (
  commitment text primary key,                          -- decimal string of Poseidon(secret)
  leaf_index bigint generated always as identity unique, -- DB-assigned, monotonic = LeanIMT insertion order
  created_at timestamptz not null default now()
);

create index if not exists identity_commitments_leaf_index_idx on identity_commitments (leaf_index);

-- Records each Merkle root the server has posted on-chain (CommitmentTree.postRoot), so the
-- backend can serve "prove against this known root" without re-reading the chain every time.
create table if not exists posted_roots (
  root text primary key,                  -- decimal string of the root field element
  leaf_count bigint not null,             -- number of leaves the tree had when this root was posted
  tx_hash text,                           -- the postRoot() transaction, once mined
  posted_at timestamptz not null default now()
);
