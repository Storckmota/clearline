import { NextRequest, NextResponse } from "next/server";
import { config } from "../../../../lib/config";
import { ingest } from "../../../../lib/ingest";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Verify dev secret. Access config.DEV_SECRET defensively — it throws if
  // the env var is missing/empty. Treat that as "endpoint disabled" and return
  // 401. Intentionally vague — do not reveal whether the secret was missing,
  // wrong, or unconfigured.
  let expectedSecret: string;
  try {
    expectedSecret = config.DEV_SECRET;
  } catch {
    console.warn("[POST /api/dev/replay-webhook] 401 — DEV_SECRET not configured");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = req.headers.get("x-dev-secret");
  if (secret !== expectedSecret) {
    console.warn("[POST /api/dev/replay-webhook] 401 — invalid or missing x-dev-secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body — malformed JSON returns 400 (unlike the Helius webhook,
  // there is no external retry system here that requires 200 on bad input).
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  // Call the shared ingestion pipeline — no duplicated logic.
  let result;
  try {
    result = await ingest(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[POST /api/dev/replay-webhook] ingest threw unexpectedly: ${msg}`);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  console.log(
    `[POST /api/dev/replay-webhook] status=${result.status} sig=${result.signature?.slice(0, 12) ?? "none"}…`
  );

  return NextResponse.json(
    {
      status: result.status,
      signature: result.signature ?? null,
      transaction_id: result.transaction_id ?? null,
      classification_reason: result.classification_reason ?? null,
    },
    { status: 200 }
  );
}
