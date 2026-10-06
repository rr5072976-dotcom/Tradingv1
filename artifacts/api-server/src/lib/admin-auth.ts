import { clerkClient, getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "@workspace/db";

export interface AdminActor {
  clerkUserId: string;
  email: string;
}

export interface AdminRequest extends Request {
  adminActor?: AdminActor;
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      res.status(401).json({ error: "Sign-in required." });
      return;
    }

    const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (allowedEmails.length === 0) {
      res.status(403).json({
        error: "Admin access is not configured.",
        code: "ADMIN_ALLOWLIST_NOT_CONFIGURED",
      });
      return;
    }

    const user = await clerkClient.users.getUser(auth.userId);
    const email =
      user.emailAddresses.find(
        (address) => address.id === user.primaryEmailAddressId,
      )?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

    if (!email || !allowedEmails.includes(email.toLowerCase())) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }

    const normalizedEmail = email.toLowerCase();
    await prisma.user.upsert({
      where: { clerkUserId: auth.userId },
      create: { clerkUserId: auth.userId, email: normalizedEmail },
      update: { email: normalizedEmail },
    });
    await prisma.admin.upsert({
      where: { clerkUserId: auth.userId },
      create: { clerkUserId: auth.userId, email: normalizedEmail },
      update: { email: normalizedEmail },
    });

    (req as AdminRequest).adminActor = {
      clerkUserId: auth.userId,
      email: normalizedEmail,
    };
    next();
  } catch (error) {
    next(error);
  }
}
