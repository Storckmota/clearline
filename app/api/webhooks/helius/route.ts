import { NextRequest, NextResponse } from "next/server";
import { config } from "../../../../lib/config";
import { ingest } from "../../../../lib/ingest";

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

  let result;
  try {
    result = await ingest(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[POST /api/webhooks/helius] ingest threw unexpectedly: ${msg}`);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  console.log(`[POST /api/webhooks/helius] ingest result — status=${result.status} sig=${result.signature?.slice(0, 12) ?? "none"}…`);
  return NextResponse.json({ received: true }, { status: 200 });
}
