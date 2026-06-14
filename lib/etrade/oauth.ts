/**
 * OAuth 1.0a request signing for the E*TRADE API (decision db09d3a5: interactive
 * user-present OAuth, read-only). HMAC-SHA1 over the RFC 5849 signature base
 * string. Pure + deterministic given a nonce/timestamp, so it is unit-testable.
 */
import { createHmac } from "node:crypto";

export interface OAuthToken {
  token: string;
  tokenSecret: string;
}

export interface SignParams {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  token?: OAuthToken;
  /** Extra oauth_* params (e.g. oauth_callback, oauth_verifier). */
  extraOAuth?: Record<string, string>;
  /** Non-oauth query params, included in the signature base. */
  query?: Record<string, string>;
  nonce: string;
  timestamp: string;
}

/** RFC 3986 percent-encoding (stricter than encodeURIComponent). */
export function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/** Build the full `Authorization: OAuth ...` header value for a signed request. */
export function buildOAuthHeader(p: SignParams): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: p.consumerKey,
    oauth_nonce: p.nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: p.timestamp,
    oauth_version: "1.0",
    ...(p.token ? { oauth_token: p.token.token } : {}),
    ...(p.extraOAuth ?? {}),
  };

  // Signature base: all oauth + query params, sorted, encoded, joined.
  const allParams = { ...oauth, ...(p.query ?? {}) };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(allParams[k])}`)
    .join("&");

  const base = [p.method.toUpperCase(), rfc3986(p.url), rfc3986(paramString)].join("&");
  const signingKey = `${rfc3986(p.consumerSecret)}&${rfc3986(p.token?.tokenSecret ?? "")}`;
  const signature = createHmac("sha1", signingKey).update(base).digest("base64");

  const headerParams: Record<string, string> = { ...oauth, oauth_signature: signature };
  // Only oauth_* params go in the header (not the non-oauth query params).
  return (
    "OAuth " +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${rfc3986(k)}="${rfc3986(headerParams[k])}"`)
      .join(", ")
  );
}

/** Parse the `oauth_token=...&oauth_token_secret=...` form body E*TRADE returns. */
export function parseTokenResponse(body: string): OAuthToken {
  const params = new URLSearchParams(body);
  const token = params.get("oauth_token");
  const tokenSecret = params.get("oauth_token_secret");
  if (!token || !tokenSecret) throw new Error("Token response missing oauth_token/secret");
  return { token, tokenSecret };
}
