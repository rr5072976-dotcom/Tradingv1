import { prisma } from "@workspace/db";
import type { AdminActor } from "./admin-auth";

export async function recordAdminAudit(
  actor: AdminActor,
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorClerkId: actor.clerkUserId,
      actorEmail: actor.email,
      action,
      entityType,
      entityId,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
    },
  });
}
