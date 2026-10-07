import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyIyzicoSignature(raw: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function iyzicoConfigured(): boolean {
  return Boolean(process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET);
}

/** Free activation without payment: local development and preview deployments only, never production. */
export function devCheckoutAllowed(): boolean {
  if (iyzicoConfigured()) return false;
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV !== "production";
  return process.env.NODE_ENV !== "production";
}
