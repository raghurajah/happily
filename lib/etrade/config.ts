/**
 * E*TRADE environment resolution (decision db09d3a5). Consumer key/secret live in
 * Railway env vars; the active environment switches sandbox→production for the
 * E6-S4 key swap. Sandbox is the default until the production key is granted.
 */
export type EtradeEnv = "sandbox" | "production";

export interface EtradeConfig {
  env: EtradeEnv;
  baseUrl: string;
  authorizeBaseUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

const BASE_URLS: Record<EtradeEnv, string> = {
  sandbox: "https://apisb.etrade.com",
  production: "https://api.etrade.com",
};

export function resolveEtradeConfig(envOverride?: EtradeEnv): EtradeConfig {
  const env: EtradeEnv = envOverride ?? (process.env.ETRADE_ENV === "production" ? "production" : "sandbox");
  const consumerKey =
    (env === "production" ? process.env.ETRADE_PROD_CONSUMER_KEY : process.env.ETRADE_SANDBOX_CONSUMER_KEY) ??
    process.env.ETRADE_CONSUMER_KEY ??
    "";
  const consumerSecret =
    (env === "production"
      ? process.env.ETRADE_PROD_CONSUMER_SECRET
      : process.env.ETRADE_SANDBOX_CONSUMER_SECRET) ??
    process.env.ETRADE_CONSUMER_SECRET ??
    "";
  return {
    env,
    baseUrl: BASE_URLS[env],
    authorizeBaseUrl: "https://us.etrade.com/e/t/etws/authorize",
    consumerKey,
    consumerSecret,
  };
}

export function isConfigured(cfg: EtradeConfig): boolean {
  return Boolean(cfg.consumerKey && cfg.consumerSecret);
}
