import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH ?? path.join(__dirname, "..", "..", "radio.db");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS now_playing (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    thumbnail_url TEXT,
    phrase_text TEXT,
    phrase_author TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    submitter_telegram_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    thumbnail_url TEXT,
    phrase_text TEXT,
    phrase_author TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    client_id TEXT,
    submitter_ip TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shows (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS schedule_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_of_week INTEGER NOT NULL, -- 0=Sunday .. 6=Saturday
    start_time TEXT NOT NULL,     -- "HH:MM"
    show_id TEXT NOT NULL REFERENCES shows(id)
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT NOT NULL,
    photo_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS skip_votes (
    identity TEXT NOT NULL,
    video_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (identity, video_id)
  );

  CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    thumbnail_url TEXT,
    telegram_id INTEGER,
    started_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS library_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    artist TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    file_path TEXT NOT NULL,
    added_by INTEGER,
    play_count INTEGER NOT NULL DEFAULT 0,
    last_played_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Lightweight migration: CREATE TABLE IF NOT EXISTS above only shapes brand-new tables, so
// columns added after a table already existed (e.g. on a running deployment) need this too.
for (const [table, column, ddl] of [
  ["now_playing", "duration_seconds", "ALTER TABLE now_playing ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0"],
  ["queue", "duration_seconds", "ALTER TABLE queue ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0"],
  ["queue", "client_id", "ALTER TABLE queue ADD COLUMN client_id TEXT"],
  ["queue", "submitter_ip", "ALTER TABLE queue ADD COLUMN submitter_ip TEXT"],
  ["now_playing", "submitter_telegram_id", "ALTER TABLE now_playing ADD COLUMN submitter_telegram_id INTEGER"],
] as const) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) db.exec(ddl);
}
