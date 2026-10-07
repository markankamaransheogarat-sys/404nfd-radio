import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(128),
  email: z.string().email(),
  message: z.string().min(1).max(2000),
});

router.post("/", (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, email, message } = parsed.data;
  db.prepare("INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)").run(name, email, message);
  res.status(201).json({ ok: true });
});

export default router;
