import { NextRequest, NextResponse } from "next/server";
import { config } from "../../../lib/config";
import { supabaseAdmin } from "../../../lib/supabase";
import { classify, ClassifyStatus } from "../../../lib/classify";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Auth — fail-closed: unconfigured secret returns 401, not 500.
  let expectedSecret: string;
  try {
    expectedSecret = config.DEV_SECRET;
  } catch {
    console.warn("[POST /api/resolve] 401 — DEV_SECRET not configured");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = req.headers.get("x-dev-secret");
  if (secret !== expectedSecret) {
    console.warn("[POST /api/resolve] 401 — invalid or missing x-dev-secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "transaction_id and receivable_id are required." },
      { status: 400 }
    );
  }

  const raw = body as Record<string, unknown>;
  const transaction_id =
    typeof raw.transaction_id === "string" ? raw.transaction_id.trim() : "";
  const receivable_id =
    typeof raw.receivable_id === "string" ? raw.receivable_id.trim() : "";

  if (!transaction_id || !receivable_id) {
    return NextResponse.json(
      { error: "transaction_id and receivable_id are required." },
      { status: 400 }
    );
  }

  // Load transaction.
  const { data: transaction, error: txError } = await supabaseAdmin
    .from("transactions")
    .select("id, status, amount_raw, reference_pubkey, receivable_id")
    .eq("id", transaction_id)
    .maybeSingle();

  if (txError) {
    if (txError.code === "22P02") {
      return NextResponse.json(
        { error: "Invalid transaction_id format." },
        { status: 400 }
      );
    }
    console.error("[POST /api/resolve] transaction query failed:", txError.code);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (transaction === null) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  // Only unknown transactions may be resolved.
  if (transaction.status !== "unknown") {
    return NextResponse.json(
      { error: "Transaction is not in unknown status." },
      { status: 400 }
    );
  }

  // Load receivable.
  const { data: receivable, error: recError } = await supabaseAdmin
    .from("receivables")
    .select("id, status, expected_amount_raw, reference_pubkey")
    .eq("id", receivable_id)
    .maybeSingle();

  if (recError) {
    if (recError.code === "22P02") {
      return NextResponse.json(
        { error: "Invalid receivable_id format." },
        { status: 400 }
      );
    }
    console.error("[POST /api/resolve] receivable query failed:", recError.code);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (receivable === null) {
    return NextResponse.json({ error: "Receivable not found." }, { status: 404 });
  }

  // Classify — reuse lib/classify.ts; no logic copied here.
  const classifyResult = classify(
    {
      status: receivable.status as "pending" | "paid" | "partial" | "overpaid",
      expected_amount_raw: String(receivable.expected_amount_raw),
    },
    { amount_raw: String(transaction.amount_raw) }
  );

  // Update transaction.
  const { error: txUpdateError } = await supabaseAdmin
    .from("transactions")
    .update({
      receivable_id: receivable.id,
      reference_pubkey: receivable.reference_pubkey,
      status: classifyResult.status,
      classification_reason: classifyResult.reason,
    })
    .eq("id", transaction.id);

  if (txUpdateError) {
    console.error("[POST /api/resolve] transaction update failed:", txUpdateError.code);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Update receivable status for paid/partial/overpaid only.
  // Do not update for duplicate or unknown.
  if (
    classifyResult.status === "paid" ||
    classifyResult.status === "partial" ||
    classifyResult.status === "overpaid"
  ) {
    const { error: recUpdateError } = await supabaseAdmin
      .from("receivables")
      .update({ status: classifyResult.status })
      .eq("id", receivable.id);

    if (recUpdateError) {
      console.error("[POST /api/resolve] receivable update failed:", recUpdateError.code);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  console.log(
    `[POST /api/resolve] tx=${transaction.id.slice(0, 8)}… status=${classifyResult.status}`
  );

  return NextResponse.json(
    {
      transaction_id: transaction.id,
      receivable_id: receivable.id,
      status: classifyResult.status as ClassifyStatus,
      classification_reason: classifyResult.reason,
    },
    { status: 200 }
  );
}
