import type { CredentialStore, StoredCredential } from "@judges/webauthn";
import { sql } from "./db";

interface CredentialRow {
  id: string;
  credential_public_key: string;
  user_id: string;
  rp_id: string;
  sign_count: string | number;
  transports: string[] | null;
  status: string;
  created_at: string | Date;
}

function toStoredCredential(row: CredentialRow): StoredCredential {
  return {
    id: row.id,
    publicKey: row.credential_public_key,
    userId: row.user_id,
    rpId: row.rp_id,
    signCount: Number(row.sign_count),
    transports: row.transports ?? undefined,
    status: row.status === "revoked" ? "revoked" : "active",
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export const neonCredentialStore: CredentialStore = {
  async save(credential) {
    await sql()`
      insert into credentials (id, credential_public_key, user_id, rp_id, sign_count, transports, status, created_at)
      values (${credential.id}, ${credential.publicKey}, ${credential.userId}, ${credential.rpId}, ${credential.signCount}, ${credential.transports ?? null}, ${credential.status}, ${credential.createdAt})
      on conflict (id) do nothing
    `;
  },

  async findById(credentialId) {
    const rows = (await sql()`
      select id, credential_public_key, user_id, rp_id, sign_count, transports, status, created_at
      from credentials
      where id = ${credentialId}
    `) as CredentialRow[];

    const row = rows[0];
    return row ? toStoredCredential(row) : null;
  },

  async updateSignCount(credentialId, signCount) {
    await sql()`
      update credentials set sign_count = ${signCount} where id = ${credentialId}
    `;
  },
};
