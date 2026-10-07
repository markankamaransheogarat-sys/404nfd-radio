import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { getAuthedUser } from "../services/identity.js";
import { generateSessionToken, verifyTelegramLogin } from "../services/telegramAuth.js";

const router = Router();

const loginSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

router.post("/telegram", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    res.status(503).json({ error: "Login is not configured (missing BOT_TOKEN)" });
    return;
  }

  if (!verifyTelegramLogin(parsed.data, botToken)) {
    res.status(401).json({ error: "Invalid Telegram login signature" });
    return;
  }

  const d = parsed.data;
  db.prepare(
    `INSERT INTO users (telegram_id, username, first_name, photo_url)
     VALUES (@id, @username, @first_name, @photo_url)
     ON CONFLICT(telegram_id) DO UPDATE SET
       username = excluded.username, first_name = excluded.first_name, photo_url = excluded.photo_url`
  ).run({
    id: d.id,
    username: d.username ?? null,
    first_name: d.first_name,
    photo_url: d.photo_url ?? null,
  });

  const token = generateSessionToken();
  db.prepare("INSERT INTO sessions (token, telegram_id) VALUES (?, ?)").run(token, d.id);

  res.json({
    token,
    user: { telegramId: d.id, username: d.username ?? null, firstName: d.first_name, photoUrl: d.photo_url ?? null },
  });
});

router.get("/me", (req, res) => {
  const user = getAuthedUser(req);
  res.json(user);
});

router.post("/logout", (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(auth.slice("Bearer ".length));
  }
  res.status(204).end();
});

export default router;
