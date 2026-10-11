import { NextResponse } from "next/server";
import { getInclusionProof } from "@/lib/commitments";

// Reads the leaf set from the DB per request; never cached.
export const dynamic = "force-dynamic";

/**
 * Returns the LeanIMT inclusion proof for a registered commitment, shaped for the browser prover
 * (root, depth, padded indices/siblings). 404 if the commitment isn't registered. Public by
 * design: the tree is public and reveals nothing about any secret.
 */
export async function GET(request: Request) {
  const commitment = new URL(request.url).searchParams.get("commitment");
  if (!commitment) {
    return NextResponse.json({ ok: false, reason: "missing_commitment" }, { status: 400 });
  }

  try {
    const proof = await getInclusionProof(commitment);
    if (!proof) {
      return NextResponse.json({ ok: false, reason: "not_registered" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, proof });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "invalid_commitment";
    return NextResponse.json({ ok: false, reason }, { status: 400 });
  }
}
