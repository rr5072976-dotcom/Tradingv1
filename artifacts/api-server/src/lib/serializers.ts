import type { Prisma } from "@workspace/db";

export function serializeChallenge(row: any) {
  return { ...row, price: Number(row.price) };
}

export function serializeOrder(row: any) {
  return {
    ...row,
    price: Number(row.price),
    cryptoAmount: row.cryptoAmount === null ? null : Number(row.cryptoAmount),
  };
}

export function serializePaymentMethod(row: any) {
  return row;
}

export function serializeSiteSettings(row: any) {
  return {
    companyName: row.companyName,
    logoText: row.logoText,
    supportEmail: row.supportEmail,
    socialLinks: row.socialLinks as Prisma.JsonArray,
    termsContent: row.termsContent,
    privacyContent: row.privacyContent,
  };
}
