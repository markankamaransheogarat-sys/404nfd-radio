import type { Request } from "express";
import { db } from "../db/index.js";

export interface AuthedUser {
  telegramId: number;
  username: string | null;
  firstName: string;
  photoUrl: string | null;
}

export function getAuthedUser(req: Request): AuthedUser | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length);

  const row = db
    .prepare(
      `SELECT u.telegram_id, u.username, u.first_name, u.photo_url
       FROM sessions s JOIN users u ON u.telegram_id = s.telegram_id
       WHERE s.token = ?`
    )
    .get(token) as { telegram_id: number; username: string | null; first_name: string; photo_url: string | null } | undefined;

  if (!row) return null;
  return { telegramId: row.telegram_id, username: row.username, firstName: row.first_name, photoUrl: row.photo_url };
}

/** A logged-in user's Telegram ID is a far stronger identity signal than an anonymous
 * browser-generated clientId, so prefer it whenever a valid session is present. */
export function resolveIdentity(req: Request, fallbackClientId: string): string {
  const user = getAuthedUser(req);
  return user ? `tg:${user.telegramId}` : fallbackClientId;
}
