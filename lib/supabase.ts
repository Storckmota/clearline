import "server-only";
import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

/**
 * Server-only Supabase client.
 * Uses the service role key to bypass RLS and perform administrative operations.
 * Must NEVER be imported into a client component.
 */
export const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY
);
