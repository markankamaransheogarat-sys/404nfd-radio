import { Router } from "express";
import { db } from "../db/index.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(db.prepare("SELECT * FROM shows").all());
});

router.get("/:id", (req, res) => {
  const show = db.prepare("SELECT * FROM shows WHERE id = ?").get(req.params.id);
  if (!show) {
    res.status(404).json({ error: "Show not found" });
    return;
  }
  res.json(show);
});

export default router;
