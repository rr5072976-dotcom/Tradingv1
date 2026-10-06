import type { RequestHandler } from "express";

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(",")[0]?.trim();
}

export const sameOriginForWrites: RequestHandler = (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  const expectedHost =
    firstHeaderValue(req.headers["x-forwarded-host"]) ?? req.get("host");
  const expectedProtocol =
    firstHeaderValue(req.headers["x-forwarded-proto"]) ?? req.protocol;

  if (!origin || !expectedHost) {
    res.status(403).json({ error: "Same-origin request required." });
    return;
  }

  try {
    const parsedOrigin = new URL(origin);
    if (
      parsedOrigin.host.toLowerCase() !== expectedHost.toLowerCase() ||
      parsedOrigin.protocol.replace(":", "").toLowerCase() !==
        expectedProtocol.toLowerCase()
    ) {
      res.status(403).json({ error: "Same-origin request required." });
      return;
    }
  } catch {
    res.status(403).json({ error: "Same-origin request required." });
    return;
  }

  next();
};
