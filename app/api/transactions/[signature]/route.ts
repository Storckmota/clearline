import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { config } from "../../../../lib/config";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/transactions/[signature]
// Returns a single transaction by signature and its linked receivable if any.
// explorer_url is built server-side from config.SOLANA_NETWORK.
// No RPC call is made from this route.
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ signature: string }> }
) {
  const { signature } = await params;

  if (!signature || signature.trim() === "") {
    return NextResponse.json({ error: "signature is required." }, { status: 400 });
  }

  const sig = signature.trim();

  const { data: txData, error: txError } = await supabaseAdmin
    .from("transactions")
    .select(
      "id, signature, amount_raw, status, classification_reason, sender_wallet, recipient_wallet, observed_at, created_at, receivable_id"
    )
    .eq("signature", sig)
    .maybeSingle();

  if (txError) {
    console.error("[GET /api/transactions/[signature]] Supabase query failed:", txError.code);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }

  if (txData === null) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Fetch linked receivable if present — failure is non-fatal.
  let receivable: {
    id: string;
    label: string;
    expected_amount_raw: number | string;
    due_date: string | null;
    status: string;
  } | null = null;

  if (txData.receivable_id) {
    const { data: recData, error: recError } = await supabaseAdmin
      .from("receivables")
      .select("id, label, expected_amount_raw, due_date, status")
      .eq("id", txData.receivable_id)
      .maybeSingle();

    if (recError) {
      console.error("[GET /api/transactions/[signature]] receivable query failed:", recError.code);
    } else if (recData) {
      receivable = recData;
    }
  }

  // Build explorer URL server-side — config.SOLANA_NETWORK is not accessible on the client.
  let network = "devnet";
  try {
    network = config.SOLANA_NETWORK;
  } catch {
    // Config unavailable — safe default.
  }
  const clusterParam = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  const explorer_url = `https://explorer.solana.com/tx/${sig}${clusterParam}`;

  return NextResponse.json(
    { transaction: txData, receivable, explorer_url },
    { status: 200 }
  );
}
