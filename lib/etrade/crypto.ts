/**
 * AES-256-GCM encryption for E*TRADE OAuth tokens at rest (decision db09d3a5:
 * "OAuth tokens encrypted at rest in Postgres"). The key is derived from a
 * server secret (ETRADE_ENC_KEY, falling back to AUTH_SECRET) — never stored with
 * the ciphertext. Output format: base64(iv).base64(authTag).base64(ciphertext).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const secret = process.env.ETRADE_ENC_KEY ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("ETRADE_ENC_KEY or AUTH_SECRET must be set to encrypt tokens");
  // Derive a stable 32-byte key from the secret.
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptToken(encoded: string): string {
  const [ivB64, tagB64, dataB64] = encoded.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted token");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
