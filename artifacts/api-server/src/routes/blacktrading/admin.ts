import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateChallengeBody,
  CreateChallengeResponse,
  CreateFaqBody,
  CreateFaqResponse,
  CreateMediaBody,
  CreateMediaResponse,
  CreatePaymentMethodBody,
  CreatePaymentMethodResponse,
  CreateTestimonialBody,
  CreateTestimonialResponse,
  DeleteChallengeParams,
  DeleteFaqParams,
  DeleteMediaParams,
  DeletePaymentMethodParams,
  DeleteTestimonialParams,
  GetAdminDashboardResponse,
  GetAdminSettingsResponse,
  ListAdminChallengesResponse,
  ListAdminFaqsResponse,
  ListAdminMediaResponse,
  ListAdminOrdersResponse,
  ListAdminPaymentMethodsResponse,
  ListAdminStatisticsResponse,
  ListAdminTestimonialsResponse,
  ReplaceAdminStatisticsBody,
  ReplaceAdminStatisticsResponse,
  UpdateAdminOrderBody,
  UpdateAdminOrderParams,
  UpdateAdminOrderResponse,
  UpdateAdminSettingsBody,
  UpdateAdminSettingsResponse,
  UpdateChallengeBody,
  UpdateChallengeParams,
  UpdateChallengeResponse,
  UpdateFaqBody,
  UpdateFaqParams,
  UpdateFaqResponse,
  UpdateMediaBody,
  UpdateMediaParams,
  UpdateMediaResponse,
  UpdatePaymentMethodBody,
  UpdatePaymentMethodParams,
  UpdatePaymentMethodResponse,
  UpdateTestimonialBody,
  UpdateTestimonialParams,
  UpdateTestimonialResponse,
} from "@workspace/api-zod";
import { Prisma, prisma, type OrderStatus } from "@workspace/db";
import { recordAdminAudit } from "../../lib/audit";
import { requireAdmin, type AdminRequest } from "../../lib/admin-auth";
import {
  serializeChallenge,
  serializeOrder,
  serializePaymentMethod,
  serializeSiteSettings,
} from "../../lib/serializers";

const router: IRouter = Router();
router.use(requireAdmin);

type Schema = {
  parse(value: unknown): any;
  safeParse(value: unknown): { success: true; data: any } | { success: false; error: { flatten(): unknown } };
};
type ResponseSchema = { parse(value: unknown): any };

function actor(req: Request) {
  const adminActor = (req as AdminRequest).adminActor;
  if (!adminActor) throw new Error("Admin actor missing after authorization.");
  return adminActor;
}

function validationFailure(res: Response, details: unknown) {
  res.status(400).json({ error: "Invalid request body.", details });
}

function registerCrud(options: {
  path: string;
  entityType: string;
  delegate: any;
  inputSchema: Schema;
  createResponseSchema: ResponseSchema;
  updateResponseSchema: ResponseSchema;
  listResponseSchema: ResponseSchema;
  serialize: (row: any) => any;
  normalize?: (data: any) => any;
  beforeDelete?: (id: string) => Promise<string | null>;
}) {
  router.get(options.path, async (_req, res) => {
    const rows = await options.delegate.findMany({ orderBy: { createdAt: "desc" } });
    res.json(options.listResponseSchema.parse(rows.map(options.serialize)));
  });

  router.post(options.path, async (req, res) => {
    const parsed = options.inputSchema.safeParse(req.body);
    if (!parsed.success) {
      validationFailure(res, parsed.error.flatten());
      return;
    }
    const data = options.normalize ? options.normalize(parsed.data) : parsed.data;
    const row = await options.delegate.create({ data });
    await recordAdminAudit(actor(req), "create", options.entityType, row.id);
    res.status(201).json(options.createResponseSchema.parse(options.serialize(row)));
  });

  router.patch(`${options.path}/:id`, async (req, res) => {
    const parsed = options.inputSchema.safeParse(req.body);
    if (!parsed.success) {
      validationFailure(res, parsed.error.flatten());
      return;
    }
    const existing = await options.delegate.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "Record not found." });
      return;
    }
    const data = options.normalize ? options.normalize(parsed.data) : parsed.data;
    const row = await options.delegate.update({
      where: { id: req.params.id },
      data,
    });
    await recordAdminAudit(actor(req), "update", options.entityType, row.id, {
      changedFields: Object.keys(data),
    });
    res.json(options.updateResponseSchema.parse(options.serialize(row)));
  });

  router.delete(`${options.path}/:id`, async (req, res) => {
    const id = req.params.id;
    if (options.beforeDelete) {
      const denial = await options.beforeDelete(id);
      if (denial) {
        res.status(409).json({ error: denial });
        return;
      }
    }
    const existing = await options.delegate.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Record not found." });
      return;
    }
    await options.delegate.delete({ where: { id } });
    await recordAdminAudit(actor(req), "delete", options.entityType, id);
    res.status(204).send();
  });
}

router.get("/admin/dashboard", async (_req, res) => {
  const [totalOrders, pendingPayments, paidOrders, rejectedOrders, paidTotals, recent] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: { paymentStatus: { in: ["PENDING", "PAYMENT_SUBMITTED", "UNDER_REVIEW"] } },
      }),
      prisma.order.count({ where: { paymentStatus: "PAID" } }),
      prisma.order.count({ where: { paymentStatus: "REJECTED" } }),
      prisma.order.aggregate({
        where: { paymentStatus: "PAID" },
        _sum: { price: true },
      }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    ]);

  res.json(
    GetAdminDashboardResponse.parse({
      totalOrders,
      pendingPayments,
      paidOrders,
      rejectedOrders,
      revenue: Number(paidTotals._sum.price ?? 0),
      recentOrders: recent.map(serializeOrder),
    }),
  );
});

router.get("/admin/orders", async (_req, res) => {
  const rows = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  res.json(ListAdminOrdersResponse.parse(rows.map(serializeOrder)));
});

router.patch("/admin/orders/:orderId", async (req, res) => {
  const params = UpdateAdminOrderParams.safeParse(req.params);
  const body = UpdateAdminOrderBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid order update." });
    return;
  }

  const existing = await prisma.order.findUnique({
    where: { id: params.data.orderId },
  });
  if (!existing) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  const updated = await prisma.order.update({
    where: { id: existing.id },
    data: { paymentStatus: body.data.paymentStatus as OrderStatus },
  });
  await recordAdminAudit(actor(req), "update_status", "order", updated.id, {
    from: existing.paymentStatus,
    to: updated.paymentStatus,
  });
  res.json(UpdateAdminOrderResponse.parse(serializeOrder(updated)));
});

registerCrud({
  path: "/admin/challenges",
  entityType: "challenge",
  delegate: prisma.challenge,
  inputSchema: CreateChallengeBody as Schema,
  createResponseSchema: CreateChallengeResponse,
  updateResponseSchema: UpdateChallengeResponse,
  listResponseSchema: ListAdminChallengesResponse,
  serialize: serializeChallenge,
  beforeDelete: async (id) => {
    const orderCount = await prisma.order.count({ where: { challengeId: id } });
    return orderCount > 0
      ? "This evaluation has orders and cannot be deleted. Disable it instead."
      : null;
  },
});

registerCrud({
  path: "/admin/payment-methods",
  entityType: "payment_method",
  delegate: prisma.paymentMethod,
  inputSchema: CreatePaymentMethodBody as Schema,
  createResponseSchema: CreatePaymentMethodResponse,
  updateResponseSchema: UpdatePaymentMethodResponse,
  listResponseSchema: ListAdminPaymentMethodsResponse,
  serialize: serializePaymentMethod,
  normalize: (data) => ({
    ...data,
    currency: data.currency.trim().toUpperCase(),
    network: data.network.trim().toUpperCase(),
    walletAddress: data.walletAddress.trim(),
  }),
});

registerCrud({
  path: "/admin/faqs",
  entityType: "faq",
  delegate: prisma.faq,
  inputSchema: CreateFaqBody as Schema,
  createResponseSchema: CreateFaqResponse,
  updateResponseSchema: UpdateFaqResponse,
  listResponseSchema: ListAdminFaqsResponse,
  serialize: (row) => row,
});

registerCrud({
  path: "/admin/testimonials",
  entityType: "testimonial",
  delegate: prisma.testimonial,
  inputSchema: CreateTestimonialBody as Schema,
  createResponseSchema: CreateTestimonialResponse,
  updateResponseSchema: UpdateTestimonialResponse,
  listResponseSchema: ListAdminTestimonialsResponse,
  serialize: (row) => row,
});

registerCrud({
  path: "/admin/media",
  entityType: "media",
  delegate: prisma.mediaItem,
  inputSchema: CreateMediaBody as Schema,
  createResponseSchema: CreateMediaResponse,
  updateResponseSchema: UpdateMediaResponse,
  listResponseSchema: ListAdminMediaResponse,
  serialize: (row) => row,
});

router.get("/admin/statistics", async (_req, res) => {
  const rows = await prisma.siteStatistic.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  res.json(ListAdminStatisticsResponse.parse(rows));
});

router.put("/admin/statistics", async (req, res) => {
  const parsed = ReplaceAdminStatisticsBody.safeParse(req.body);
  if (!parsed.success) {
    validationFailure(res, parsed.error.flatten());
    return;
  }

  const items = parsed.data.statistics.map((statistic: any) => ({
    label: statistic.label.trim(),
    value: statistic.value.trim(),
    verified: statistic.verified,
    visible: statistic.visible,
    sortOrder: statistic.sortOrder,
  }));

  const rows = await prisma.$transaction(async (tx) => {
    await tx.siteStatistic.deleteMany();
    if (items.length) await tx.siteStatistic.createMany({ data: items });
    return tx.siteStatistic.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  });
  await recordAdminAudit(actor(req), "replace", "site_statistics", "all", {
    itemCount: items.length,
  });
  res.json(ReplaceAdminStatisticsResponse.parse(rows));
});

router.get("/admin/settings", async (_req, res) => {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "global" } });
  if (!settings) {
    res.status(503).json({ error: "Site settings are not configured." });
    return;
  }
  res.json(GetAdminSettingsResponse.parse(serializeSiteSettings(settings)));
});

router.put("/admin/settings", async (req, res) => {
  const parsed = UpdateAdminSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    validationFailure(res, parsed.error.flatten());
    return;
  }

  const data = {
    companyName: parsed.data.companyName.trim(),
    logoText: parsed.data.logoText.trim(),
    supportEmail: parsed.data.supportEmail.trim(),
    socialLinks: parsed.data.socialLinks as Prisma.InputJsonArray,
    termsContent: parsed.data.termsContent,
    privacyContent: parsed.data.privacyContent,
  };
  const settings = await prisma.siteSetting.upsert({
    where: { id: "global" },
    create: { id: "global", ...data },
    update: data,
  });
  await recordAdminAudit(actor(req), "update", "site_settings", "global", {
    changedFields: Object.keys(data),
  });
  res.json(
    UpdateAdminSettingsResponse.parse(serializeSiteSettings(settings)),
  );
});

export default router;
