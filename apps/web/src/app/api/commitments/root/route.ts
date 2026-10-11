import { NextResponse } from "next/server";
import { getCurrentRoot } from "@/lib/commitments";

export const dynamic = "force-dynamic";

/**
 * The current membership root. `rootHex` is what an operator posts on-chain with
 * `cast send <commitmentTree> "postRoot(bytes32)" <rootHex>`. Returns an empty state when no
 * commitment has been registered yet.
 */
export async function GET() {
  try {
    const root = await getCurrentRoot();
    if (!root) {
      return NextResponse.json({ ok: true, root: null, leafCount: 0 });
    }
    return NextResponse.json({ ok: true, ...root });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
