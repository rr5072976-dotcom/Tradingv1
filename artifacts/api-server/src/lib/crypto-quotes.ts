import { createHmac, timingSafeEqual } from "node:crypto";

const QUOTE_CACHE_MS = 30_000;
const QUOTE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const quoteCache = new Map<string, { usdPerUnit: number; updatedAt: Date }>();

interface SignedQuote {
  orderId: string;
  paymentMethodId: string;
  currency: string;
  network: string;
  walletAddress: string;
  instructions: string;
  amount: number;
  quoteUpdatedAt: string;
  quoteSource: string;
  issuedAt: number;
}

export class QuoteUnavailableError extends Error {
  constructor(currency: string) {
    super(`A current ${currency} price quote is unavailable.`);
    this.name = "QuoteUnavailableError";
  }
}

function signQuote(claims: SignedQuote): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required to sign payment quotes.");
  }
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPaymentQuote(
  token: string,
  orderId: string,
  currency: string,
  network: string,
): SignedQuote | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required to verify payment quotes.");
  }

  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length > 0) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as SignedQuote;
    if (
      claims.orderId !== orderId ||
      claims.currency.toUpperCase() !== currency.toUpperCase() ||
      claims.network.toUpperCase() !== network.toUpperCase() ||
      !Number.isFinite(claims.amount) ||
      claims.amount <= 0 ||
      !Number.isFinite(claims.issuedAt) ||
      Date.now() - claims.issuedAt < 0 ||
      Date.now() - claims.issuedAt > QUOTE_MAX_AGE_MS
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

async function getUsdPerUnit(currency: string): Promise<{
  usdPerUnit: number;
  updatedAt: Date;
  source: string;
}> {
  const normalized = currency.toUpperCase();
  const cached = quoteCache.get(normalized);
  if (cached && Date.now() - cached.updatedAt.getTime() < QUOTE_CACHE_MS) {
    return { ...cached, source: "Coinbase spot rate" };
  }

  if (normalized === "USDT" || normalized === "USDC") {
    const quote = { usdPerUnit: 1, updatedAt: new Date() };
    quoteCache.set(normalized, quote);
    return { ...quote, source: "USD parity estimate" };
  }

  if (normalized !== "BTC" && normalized !== "ETH") {
    throw new QuoteUnavailableError(normalized);
  }

  try {
    const response = await fetch(
      `https://api.coinbase.com/v2/prices/${normalized}-USD/spot`,
      { signal: AbortSignal.timeout(5_000) },
    );
    if (!response.ok) throw new Error(`Quote service returned ${response.status}`);

    const payload = (await response.json()) as {
      data?: { amount?: string; currency?: string };
    };
    const usdPerUnit = Number(payload.data?.amount);
    if (!Number.isFinite(usdPerUnit) || usdPerUnit <= 0) {
      throw new Error("Quote service returned an invalid price.");
    }

    const quote = { usdPerUnit, updatedAt: new Date() };
    quoteCache.set(normalized, quote);
    return { ...quote, source: "Coinbase spot rate" };
  } catch {
    throw new QuoteUnavailableError(normalized);
  }
}

export async function createPaymentQuote(
  priceUsd: number,
  method: {
    id: string;
    currency: string;
    network: string;
    walletAddress: string;
    instructions: string;
  },
  orderId: string,
) {
  const rate = await getUsdPerUnit(method.currency);
  const decimals = method.currency.toUpperCase() === "BTC" || method.currency.toUpperCase() === "ETH" ? 8 : 2;
  const amount = Number((priceUsd / rate.usdPerUnit).toFixed(decimals));

  const quote = {
    paymentMethodId: method.id,
    currency: method.currency,
    network: method.network,
    walletAddress: method.walletAddress,
    instructions: method.instructions,
    amount,
    quoteUpdatedAt: rate.updatedAt,
    quoteSource: rate.source,
  };
  const claims: SignedQuote = {
    ...quote,
    quoteUpdatedAt: rate.updatedAt.toISOString(),
    orderId,
    issuedAt: Date.now(),
  };
  return { ...quote, quoteToken: signQuote(claims) };
}
