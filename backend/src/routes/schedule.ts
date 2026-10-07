import { Router } from "express";
import { db } from "../db/index.js";

const router = Router();

router.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT s.id, s.day_of_week, s.start_time, sh.id as show_id, sh.title as show_title
       FROM schedule_slots s JOIN shows sh ON sh.id = s.show_id
       ORDER BY s.day_of_week, s.start_time`
    )
    .all();
  res.json(rows);
});

export default router;
