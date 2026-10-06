import { Router, type IRouter, type Request } from "express";
import rateLimit from "express-rate-limit";
import {
  CreateOrderBody,
  CreateOrderResponse,
  GetOrderPaymentParams,
  GetOrderPaymentResponse,
  GetPublicSiteResponse,
  ListPublicPaymentMethodsResponse,
  SubmitPaymentBody,
  SubmitPaymentParams,
  SubmitPaymentResponse,
} from "@workspace/api-zod";
import { prisma } from "@workspace/db";
import { logger } from "../../lib/logger";
import {
  createPaymentQuote,
  QuoteUnavailableError,
  verifyPaymentQuote,
} from "../../lib/crypto-quotes";
import {
  serializeChallenge,
  serializeOrder,
  serializePaymentMethod,
  serializeSiteSettings,
} from "../../lib/serializers";

const router: IRouter = Router();

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Please try again later." },
});

router.get("/public/site", async (_req, res) => {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "global" } });
  if (!settings) {
    res.status(503).json({ error: "Site settings are not configured." });
    return;
  }

  const [challenges, faqs, testimonials, media, statistics] = await Promise.all([
    prisma.challenge.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.faq.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.testimonial.findMany({
      where: { published: true, OR: [{ verified: true }, { demo: true }] },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mediaItem.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.siteStatistic.findMany({
      where: { visible: true, verified: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const body = GetPublicSiteResponse.parse({
    ...serializeSiteSettings(settings),
    challenges: challenges.map(serializeChallenge),
    faqs,
    testimonials,
    media,
    statistics,
  });
  res.json(body);
});

router.get("/public/payment-methods", async (_req, res) => {
  const methods = await prisma.paymentMethod.findMany({
    where: { enabled: true, walletAddress: { not: "" } },
    orderBy: [{ currency: "asc" }, { network: "asc" }],
  });
  res.json(
    ListPublicPaymentMethodsResponse.parse(
      methods.map(serializePaymentMethod),
    ),
  );
});

router.post("/orders", checkoutLimiter, async (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order details.", details: parsed.error.flatten() });
    return;
  }

  const challenge = await prisma.challenge.findFirst({
    where: { id: parsed.data.challengeId, enabled: true },
  });
  if (!challenge) {
    res.status(404).json({ error: "This evaluation is unavailable." });
    return;
  }

  const order = await prisma.order.create({
    data: {
      fullName: parsed.data.fullName.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      country: parsed.data.country.trim(),
      phone: parsed.data.phone?.trim() || null,
      challengeId: challenge.id,
      challengeName: challenge.displayName,
      accountSize: challenge.accountSize,
      price: challenge.price,
      paymentStatus: "PENDING",
    },
  });

  res.status(201).json(CreateOrderResponse.parse(serializeOrder(order)));
});

async function orderPaymentResponse(orderId: string, req: Request) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;

  const isAwaitingPayment =
    order.paymentStatus === "PENDING" || order.paymentStatus === "REJECTED";
  if (!isAwaitingPayment && order.paymentMethodId && order.cryptoAmount !== null) {
    const method = await prisma.paymentMethod.findUnique({
      where: { id: order.paymentMethodId },
    });
    return {
      id: order.id,
      challengeName: order.challengeName,
      accountSize: order.accountSize,
      price: Number(order.price),
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      network: order.network,
      paymentAddress: order.paymentAddress,
      instructions: method?.instructions ?? null,
      paymentOptions: [
        {
          paymentMethodId: order.paymentMethodId,
          currency: order.currency!,
          network: order.network!,
          walletAddress: order.paymentAddress!,
          instructions: method?.instructions ?? "",
          amount: Number(order.cryptoAmount),
          quoteUpdatedAt: order.updatedAt,
          quoteSource: "Submitted order snapshot",
          quoteToken: "",
        },
      ],
    };
  }

  const methods = await prisma.paymentMethod.findMany({
    where: { enabled: true, walletAddress: { not: "" } },
    orderBy: [{ currency: "asc" }, { network: "asc" }],
  });
  const settledQuotes = await Promise.allSettled(
    methods.map((method) => createPaymentQuote(Number(order.price), method, order.id)),
  );
  const paymentOptions = settledQuotes.flatMap((result, index) => {
    if (result.status === "fulfilled") return [result.value];
    const method = methods[index];
    if (result.reason instanceof QuoteUnavailableError) {
      req.log?.warn(
        { currency: method.currency, network: method.network },
        "A payment quote was unavailable",
      );
    } else {
      req.log?.warn({ err: result.reason }, "A payment quote could not be created");
    }
    return [];
  });

  return {
    id: order.id,
    challengeName: order.challengeName,
    accountSize: order.accountSize,
    price: Number(order.price),
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    network: order.network,
    paymentAddress: order.paymentAddress,
    instructions: null,
    paymentOptions,
  };
}

router.get("/orders/:orderId/payment", async (req, res) => {
  const params = GetOrderPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid order ID." });
    return;
  }
  const body = await orderPaymentResponse(params.data.orderId, req);
  if (!body) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  res.json(GetOrderPaymentResponse.parse(body));
});

router.post("/orders/:orderId/payment", checkoutLimiter, async (req, res) => {
  const params = SubmitPaymentParams.safeParse(req.params);
  const input = SubmitPaymentBody.safeParse(req.body);
  if (!params.success || !input.success) {
    res.status(400).json({ error: "Invalid payment submission." });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: params.data.orderId },
  });
  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  if (order.paymentStatus !== "PENDING" && order.paymentStatus !== "REJECTED") {
    res.status(409).json({
      error: "This order is no longer accepting a payment submission.",
    });
    return;
  }

  const currency = input.data.currency.trim().toUpperCase();
  const network = input.data.network.trim().toUpperCase();
  const quote = verifyPaymentQuote(
    input.data.quoteToken,
    order.id,
    currency,
    network,
  );
  if (!quote) {
    res.status(400).json({
      error: "The payment quote is invalid or too old. Refresh the payment page before sending.",
    });
    return;
  }

  const method = await prisma.paymentMethod.findUnique({
    where: { id: quote.paymentMethodId },
  });
  if (
    !method ||
    !method.enabled ||
    method.walletAddress !== quote.walletAddress ||
    method.currency.toUpperCase() !== currency ||
    method.network.toUpperCase() !== network
  ) {
    res.status(409).json({
      error: "This payment method changed after the quote. Refresh before sending.",
    });
    return;
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentMethodId: method.id,
      cryptoAmount: quote.amount,
      currency: method.currency,
      network: method.network,
      paymentAddress: quote.walletAddress,
      transactionHash: input.data.transactionHash.trim(),
      paymentStatus: "PAYMENT_SUBMITTED",
    },
  });

  logger.info(
    { orderId: updated.id, paymentStatus: updated.paymentStatus },
    "Customer submitted transaction proof for manual review",
  );

  const response = {
    id: updated.id,
    challengeName: updated.challengeName,
    accountSize: updated.accountSize,
    price: Number(updated.price),
    paymentStatus: updated.paymentStatus,
    currency: updated.currency,
    network: updated.network,
    paymentAddress: quote.walletAddress,
    instructions: quote.instructions,
    paymentOptions: [
      {
        ...quote,
        quoteUpdatedAt: new Date(quote.quoteUpdatedAt),
        quoteToken: input.data.quoteToken,
      },
    ],
  };
  res.json(SubmitPaymentResponse.parse(response));
});

export default router;
