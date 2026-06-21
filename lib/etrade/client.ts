/**
 * E*TRADE API client (decisions 3f1b6b21, db09d3a5): read-only OAuth 1.0a access
 * to the Accounts API for balances and positions. The request/response wiring
 * uses fetch; the response PARSERS are pure and unit-tested against fixtures.
 */
import { randomBytes } from "node:crypto";

import type { EtradeConfig } from "./config";
import { buildOAuthHeader, parseTokenResponse, type OAuthToken } from "./oauth";

export interface EtradeAccount {
  accountId: string;
  accountIdKey: string;
  accountType: string;
  accountDesc: string;
}

export interface EtradePosition {
  symbol: string;
  description: string | null;
  quantity: number;
  marketValue: number;
  costBasis: number | null;
}

function nonce(): string {
  return randomBytes(16).toString("hex");
}

function timestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

export class EtradeClient {
  constructor(private readonly cfg: EtradeConfig) {}

  private async signedGet(url: string, token?: OAuthToken, extraOAuth?: Record<string, string>): Promise<Response> {
    const header = buildOAuthHeader({
      method: "GET",
      url,
      consumerKey: this.cfg.consumerKey,
      consumerSecret: this.cfg.consumerSecret,
      token,
      extraOAuth,
      nonce: nonce(),
      timestamp: timestamp(),
    });
    return fetch(url, { headers: { Authorization: header, Accept: "application/json" } });
  }

  // --- OAuth handshake (interactive, user-present) --------------------------

  /** Step 1: request token (oauth_callback=oob for the manual verifier flow). */
  async getRequestToken(): Promise<OAuthToken> {
    const res = await this.signedGet(`${this.cfg.baseUrl}/oauth/request_token`, undefined, {
      oauth_callback: "oob",
    });
    if (!res.ok) throw new Error(`request_token failed: ${res.status}`);
    return parseTokenResponse(await res.text());
  }

  /** Step 2: the URL the user visits to authorize and receive a verifier code. */
  authorizeUrl(requestToken: string): string {
    const params = new URLSearchParams({ key: this.cfg.consumerKey, token: requestToken });
    return `${this.cfg.authorizeBaseUrl}?${params.toString()}`;
  }

  /** Step 3: exchange the verifier for the long-lived access token. */
  async getAccessToken(requestToken: OAuthToken, verifier: string): Promise<OAuthToken> {
    const res = await this.signedGet(`${this.cfg.baseUrl}/oauth/access_token`, requestToken, {
      oauth_verifier: verifier,
    });
    if (!res.ok) throw new Error(`access_token failed: ${res.status}`);
    return parseTokenResponse(await res.text());
  }

  // --- Read-only data -------------------------------------------------------

  async listAccounts(token: OAuthToken): Promise<EtradeAccount[]> {
    const res = await this.signedGet(`${this.cfg.baseUrl}/v1/accounts/list.json`, token);
    if (!res.ok) throw new Error(`accounts/list failed: ${res.status}`);
    return parseAccounts(await res.json());
  }

  async getBalance(token: OAuthToken, accountIdKey: string): Promise<number> {
    const url = `${this.cfg.baseUrl}/v1/accounts/${accountIdKey}/balance.json?instType=BROKERAGE&realTimeNAV=true`;
    const res = await this.signedGet(url, token);
    if (!res.ok) throw new Error(`balance failed: ${res.status}`);
    return parseBalance(await res.json());
  }

  async getPositions(token: OAuthToken, accountIdKey: string): Promise<EtradePosition[]> {
    const res = await this.signedGet(
      `${this.cfg.baseUrl}/v1/accounts/${accountIdKey}/portfolio.json`,
      token,
    );
    if (res.status === 204) return []; // no positions
    if (!res.ok) throw new Error(`portfolio failed: ${res.status}`);
    return parsePositions(await res.json());
  }
}

// --- Pure parsers (unit-tested against fixtures) ----------------------------

export function parseAccounts(json: unknown): EtradeAccount[] {
  const list = (json as { AccountListResponse?: { Accounts?: { Account?: unknown[] } } })
    ?.AccountListResponse?.Accounts?.Account;
  if (!Array.isArray(list)) return [];
  return list.map((a) => {
    const o = a as Record<string, unknown>;
    return {
      accountId: String(o.accountId ?? ""),
      accountIdKey: String(o.accountIdKey ?? ""),
      accountType: String(o.accountType ?? ""),
      accountDesc: String(o.accountDesc ?? o.accountName ?? ""),
    };
  });
}

export function parseBalance(json: unknown): number {
  const c = (json as { BalanceResponse?: { Computed?: { RealTimeValues?: { totalAccountValue?: number } } } })
    ?.BalanceResponse?.Computed?.RealTimeValues?.totalAccountValue;
  return typeof c === "number" ? c : 0;
}

export function parsePositions(json: unknown): EtradePosition[] {
  const list = (
    json as { PortfolioResponse?: { AccountPortfolio?: Array<{ Position?: unknown[] }> } }
  )?.PortfolioResponse?.AccountPortfolio?.[0]?.Position;
  if (!Array.isArray(list)) return [];
  return list.map((p) => {
    const o = p as Record<string, unknown>;
    const product = (o.Product as Record<string, unknown>) ?? {};
    return {
      symbol: String(product.symbol ?? o.symbolDescription ?? ""),
      description: o.symbolDescription ? String(o.symbolDescription) : null,
      quantity: Number(o.quantity ?? 0),
      marketValue: Number(o.marketValue ?? 0),
      costBasis: o.totalCost !== undefined ? Number(o.totalCost) : null,
    };
  });
}
