import "server-only";

/**
 * Application configuration loaded from environment variables.
 * We use getters to delay evaluating process.env until the values are explicitly accessed,
 * preventing build errors if .env.local is not present during build time.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  get SUPABASE_URL() { return requireEnv('SUPABASE_URL'); },
  get SUPABASE_SERVICE_ROLE_KEY() { return requireEnv('SUPABASE_SERVICE_ROLE_KEY'); },
  get SOLANA_NETWORK() { return requireEnv('SOLANA_NETWORK'); },
  get SOLANA_RPC_URL() { return requireEnv('SOLANA_RPC_URL'); },
  get RECIPIENT_WALLET() { return requireEnv('RECIPIENT_WALLET'); },
  get RECIPIENT_USDC_ATA() { return requireEnv('RECIPIENT_USDC_ATA'); },
  get USDC_MINT_DEVNET() { return requireEnv('USDC_MINT_DEVNET'); },
  get USDC_MINT_MAINNET() { return requireEnv('USDC_MINT_MAINNET'); },
  get HELIUS_AUTH_TOKEN() { return requireEnv('HELIUS_AUTH_TOKEN'); },
  get DEV_SECRET() { return requireEnv('DEV_SECRET'); },
};
