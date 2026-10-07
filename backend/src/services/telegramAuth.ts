import crypto from "node:crypto";

// Telegram Login Widget's own HMAC scheme — NOT the same as Mini App initData verification.
// secret_key = SHA256(bot_token) (raw digest, used directly as the HMAC key), vs. Mini Apps'
// secret_key = HMAC-SHA256("WebAppData", bot_token). Mixing the two up silently fails every check.
export interface TelegramLoginPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

export function verifyTelegramLogin(payload: TelegramLoginPayload, botToken: string): boolean {
  const { hash, ...rest } = payload;
  const dataCheckString = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return false;
  if (Date.now() / 1000 - payload.auth_date > MAX_AUTH_AGE_SECONDS) return false;
  return true;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
