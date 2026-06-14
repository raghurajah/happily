import { beforeAll, describe, expect, it } from "vitest";

import { parseAccounts, parseBalance, parsePositions } from "./client.js";
import { decryptToken, encryptToken } from "./crypto.js";
import { bucketForAccount } from "./mapping.js";
import { buildOAuthHeader, parseTokenResponse, rfc3986 } from "./oauth.js";

describe("OAuth 1.0a signing", () => {
  it("rfc3986 encodes the reserved set strictly", () => {
    expect(rfc3986("a b!*'()")).toBe("a%20b%21%2A%27%28%29");
  });

  it("produces a deterministic, golden HMAC-SHA1 header", () => {
    const header = buildOAuthHeader({
      method: "GET",
      url: "https://apisb.etrade.com/v1/accounts/list.json",
      consumerKey: "ckey",
      consumerSecret: "csecret",
      token: { token: "atoken", tokenSecret: "asecret" },
      nonce: "fixednonce",
      timestamp: "1700000000",
    });
    expect(header).toContain('oauth_signature="G8R%2FyxgyaUKQF2qVr7pJG6inW6k%3D"');
    expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(header).toContain('oauth_token="atoken"');
  });

  it("parses oauth_token responses", () => {
    const t = parseTokenResponse("oauth_token=abc&oauth_token_secret=def&oauth_callback_confirmed=true");
    expect(t).toEqual({ token: "abc", tokenSecret: "def" });
  });
});

describe("token encryption at rest", () => {
  beforeAll(() => {
    process.env.ETRADE_ENC_KEY = "test-encryption-key-for-unit-tests";
  });
  it("round-trips and is non-reversible without the key", () => {
    const enc = encryptToken("super-secret-access-token");
    expect(enc).not.toContain("super-secret");
    expect(decryptToken(enc)).toBe("super-secret-access-token");
  });
  it("produces different ciphertext each call (random IV)", () => {
    expect(encryptToken("x")).not.toBe(encryptToken("x"));
  });
});

describe("E*TRADE response parsers", () => {
  it("parses the accounts list", () => {
    const json = {
      AccountListResponse: {
        Accounts: {
          Account: [
            { accountId: "12345", accountIdKey: "key-abc", accountType: "INDIVIDUAL", accountDesc: "Brokerage" },
            { accountId: "67890", accountIdKey: "key-xyz", accountType: "IRA", accountDesc: "Rollover IRA" },
          ],
        },
      },
    };
    const accounts = parseAccounts(json);
    expect(accounts).toHaveLength(2);
    expect(accounts[1]).toMatchObject({ accountIdKey: "key-xyz", accountDesc: "Rollover IRA" });
  });

  it("parses the real-time total account value from balance", () => {
    const json = { BalanceResponse: { Computed: { RealTimeValues: { totalAccountValue: 1234567.89 } } } };
    expect(parseBalance(json)).toBe(1234567.89);
  });

  it("parses positions", () => {
    const json = {
      PortfolioResponse: {
        AccountPortfolio: [
          {
            Position: [
              { Product: { symbol: "VTI" }, symbolDescription: "Vanguard Total", quantity: 100, marketValue: 25000, totalCost: 18000 },
              { Product: { symbol: "AAPL" }, quantity: 50, marketValue: 9000 },
            ],
          },
        ],
      },
    };
    const positions = parsePositions(json);
    expect(positions).toEqual([
      { symbol: "VTI", description: "Vanguard Total", quantity: 100, marketValue: 25000, costBasis: 18000 },
      { symbol: "AAPL", description: null, quantity: 50, marketValue: 9000, costBasis: null },
    ]);
  });

  it("returns [] for empty payloads", () => {
    expect(parseAccounts({})).toEqual([]);
    expect(parsePositions({})).toEqual([]);
    expect(parseBalance({})).toBe(0);
  });
});

describe("account → bucket mapping (decision 8a2f4e15)", () => {
  it("maps IRAs / rollover / retirement to tax-deferred", () => {
    expect(bucketForAccount({ accountType: "IRA", accountDesc: "" })).toBe("tax_deferred");
    expect(bucketForAccount({ accountType: "INDIVIDUAL", accountDesc: "Rollover IRA" })).toBe("tax_deferred");
    expect(bucketForAccount({ accountType: "ROTH", accountDesc: "" })).toBe("tax_deferred");
  });
  it("maps taxable brokerage to post-tax", () => {
    expect(bucketForAccount({ accountType: "INDIVIDUAL", accountDesc: "Brokerage" })).toBe("post_tax");
    expect(bucketForAccount({ accountType: "JOINT", accountDesc: "Taxable" })).toBe("post_tax");
  });
});
