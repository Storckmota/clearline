import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/receivables/[id]
// Returns a single receivable and its linked transactions.
// display_status is computed on read — overdue is never written to the DB.
// No blockchain or RPC call is made from this route.
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id.trim() === "") {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("receivables")
    .select(
      `id, merchant_wallet, label, expected_amount_raw, due_date,
       reference_pubkey, solana_pay_url, status, created_at, resolved_at,
       transactions (
         id, signature, amount_raw, status, classification_reason,
         sender_wallet, recipient_wallet, mint, reference_pubkey,
         receivable_id, observed_at, created_at
       )`
    )
    .eq("id", id.trim())
    .maybeSingle();

  if (error) {
    // 22P02 = invalid_text_representation (e.g. malformed UUID)
    if (error.code === "22P02") {
      return NextResponse.json({ error: "Invalid id format." }, { status: 400 });
    }
    console.error("[GET /api/receivables/[id]] Supabase query failed:", error.code);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (data === null) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Separate embedded transactions from receivable fields.
  const { transactions: txRows, ...receivableFields } = data;

  // Compute display_status — overdue is display-only, never written to DB.
  const now = new Date();
  const display_status =
    receivableFields.status === "pending" &&
    receivableFields.due_date &&
    new Date(receivableFields.due_date) < now
      ? "overdue"
      : receivableFields.status;

  // Sort transactions newest first.
  const transactions = [...(txRows ?? [])].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json(
    {
      receivable: { ...receivableFields, display_status },
      transactions,
    },
    { status: 200 }
  );
}
