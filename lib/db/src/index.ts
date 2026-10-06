import { OrderStatus, Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prismaClient?: PrismaClient;
};

export const prisma =
  globalForPrisma.prismaClient ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaClient = prisma;
}

export { prisma as db };
export { OrderStatus, Prisma, PrismaClient };
