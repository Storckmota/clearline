import { NextRequest, NextResponse } from "next/server";
import { config } from "../../../../lib/config";

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

  // Structured log for future real payload capture (Phase 7.3+).
  const isArray = Array.isArray(payload);
  console.log(
    `[POST /api/webhooks/helius] Payload received — isArray=${isArray} ` +
    `count=${isArray ? (payload as unknown[]).length : "n/a"} ` +
    `size=${JSON.stringify(payload).length}B`
  );

  // Phase 7.3: extract signature, dedupe, store raw payload.
  // Phase 8:   parse USDC transfer, extract reference, RPC fallback.
  // Phase 9:   run shared ingestion pipeline (lib/ingest.ts).

  return NextResponse.json({ received: true }, { status: 200 });
}
