import { NextRequest, NextResponse } from "next/server";
import { config } from "../../../../lib/config";
import { supabaseAdmin } from "../../../../lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Verify Helius auth header.
  // ARCHITECTURE.md §23: Clearline verifies req.headers.authorization === HELIUS_AUTH_TOKEN.
  const authHeader = req.headers.get("authorization");
  if (authHeader !== config.HELIUS_AUTH_TOKEN) {
    console.warn("[POST /api/webhooks/helius] 401 — invalid or missing Authorization header");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body safely. Helius retries on non-2xx, so return 200 even for malformed bodies
  // rather than letting parse errors propagate as 500s.
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    console.warn("[POST /api/webhooks/helius] Non-JSON body — returning 200 to suppress Helius retries");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Structured log — metadata only, no full payload, no secrets.
  const isArray = Array.isArray(payload);
  console.log(
    `[POST /api/webhooks/helius] Payload received — isArray=${isArray} ` +
    `count=${isArray ? (payload as unknown[]).length : "n/a"} ` +
    `size=${JSON.stringify(payload).length}B`
  );

  // Extract transaction signature from Helius enhanced payload.
  // Helius enhancedTransaction format: array of transaction objects; signature is at [0].signature.
  const first =
    isArray && (payload as unknown[]).length > 0
      ? (payload as Record<string, unknown>[])[0]
      : undefined;
  const sig =
    typeof first?.signature === "string" ? first.signature : undefined;

  if (!sig) {
    console.warn("[POST /api/webhooks/helius] No signature in payload — returning 200");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  console.log(`[POST /api/webhooks/helius] Signature: ${sig}`);

  // Dedupe check — ARCHITECTURE.md §4 step 3.
  // If this signature already exists, return 200 immediately without reclassifying.
  const { data: existing, error: queryError } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("signature", sig)
    .maybeSingle();

  if (queryError) {
    // Transient DB error — return 200 to prevent Helius retry storm.
    console.error(`[POST /api/webhooks/helius] Dedupe query error: ${queryError.code}`);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (existing) {
    console.log(`[POST /api/webhooks/helius] Duplicate signature — ignoring`);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Signature is new. Raw payload storage deferred to Phase 8.
  // transactions requires recipient_wallet, amount_raw, mint (NOT NULL) — needs parser.
  // Phase 8: parse USDC transfer, insert transaction row with raw_payload.
  // Phase 9: extract shared ingestion pipeline into lib/ingest.ts.

  return NextResponse.json({ received: true }, { status: 200 });
}
