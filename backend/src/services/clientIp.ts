import type { Request } from "express";

// Cloudflare sets this itself at the edge (can't be spoofed by the client, unlike
// X-Forwarded-For, which anyone can send). Falls back to Express's own req.ip for local dev.
export function getClientIp(req: Request): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp) return cfIp;
  return req.ip ?? "unknown";
}
