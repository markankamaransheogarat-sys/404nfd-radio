import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { db } from "../db/index.js";
import { advanceQueueIfEmpty } from "./queueService.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaDir = path.join(__dirname, "..", "..", "media");

if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

const ADMIN_IDS = new Set<number>(
  (process.env.ADMIN_TELEGRAM_IDS ?? "456429284")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
);

function isAdmin(telegramId: number): boolean {
  if (ADMIN_IDS.has(telegramId)) return true;
  // Also check if user exists in db
  const row = db.prepare("SELECT telegram_id FROM users WHERE telegram_id = ?").get(telegramId);
  return Boolean(row);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function sendTelegram(botToken: string, method: string, payload: Record<string, unknown>): Promise<any> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(`Telegram API ${method} failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function probeAudio(filePath: string): Promise<{ duration: number; title?: string; artist?: string }> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration:format_tags=title,artist",
      "-of",
      "json",
      filePath,
    ]);
    const parsed = JSON.parse(stdout);
    const duration = Math.round(parseFloat(parsed.format?.duration ?? "0"));
    const title = parsed.format?.tags?.title;
    const artist = parsed.format?.tags?.artist;
    return { duration, title, artist };
  } catch (err) {
    console.error("ffprobe error on", filePath, err);
    return { duration: 0 };
  }
}

async function handleAudioMessage(botToken: string, msg: any): Promise<void> {
  const chatId = msg.chat.id;
  const fromId = msg.from?.id;

  if (!fromId || !isAdmin(fromId)) {
    await sendTelegram(botToken, "sendMessage", {
      chat_id: chatId,
      text: "⛔ Загрузка треков в эфир доступна только администратору.",
    });
    return;
  }

  const audioOrDoc = msg.audio || msg.document;
  if (!audioOrDoc) return;

  const fileId = audioOrDoc.file_id;
  const origName =
    audioOrDoc.file_name || (msg.audio ? `${msg.audio.title ?? "track"}.mp3` : "flow-music.mp3");

  const ext = path.extname(origName).toLowerCase() || ".mp3";
  const safeBase = path
    .basename(origName, ext)
    .replace(/[^a-zA-Z0-9_\-\u0400-\u04FF]/g, "_")
    .slice(0, 50);
  const uniqueName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${safeBase}${ext}`;
  const savePath = path.join(mediaDir, uniqueName);

  await sendTelegram(botToken, "sendMessage", {
    chat_id: chatId,
    text: "⏳ Скачиваю и проверяю трек из Google Flow Music…",
  });

  // 1. Get file path from Telegram
  const fileInfo = await sendTelegram(botToken, "getFile", { file_id: fileId });
  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;

  // 2. Download file to disk
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(savePath, Buffer.from(arrayBuffer));

  // 3. Inspect audio duration and tags
  const probed = await probeAudio(savePath);
  const duration = probed.duration || msg.audio?.duration || 180;

  // Title / Artist logic:
  let title = msg.caption?.trim() || probed.title || msg.audio?.title;
  let artist = probed.artist || msg.audio?.performer || "Google Flow AI";

  if (!title) {
    title = path.basename(origName, ext).replace(/[_-]+/g, " ").trim();
  }
  if (title.includes(" - ") && (!artist || artist === "Google Flow AI")) {
    const parts = title.split(" - ");
    artist = parts[0].trim();
    title = parts.slice(1).join(" - ").trim();
  }

  const videoId = `/audio/${uniqueName}`;

  // 4. Save to library_tracks
  db.prepare(
    `INSERT INTO library_tracks (video_id, title, artist, thumbnail_url, duration_seconds, file_path, added_by)
     VALUES (@videoId, @title, @artist, '/logo.png', @duration, @savePath, @fromId)`
  ).run({
    videoId,
    title,
    artist,
    duration,
    savePath,
    fromId,
  });

  const totalCount = (db.prepare("SELECT count(*) as count FROM library_tracks").get() as any).count;
  const currentlyPlaying = db.prepare("SELECT id FROM now_playing WHERE id = 1").get();

  let statusMsg = "";
  if (!currentlyPlaying) {
    // Was silent — wake up radio immediately!
    advanceQueueIfEmpty();
    statusMsg = "🚀 Радио запустилось! Твой трек прямо сейчас звучит в прямом эфире на https://404nfd.net";
  } else {
    statusMsg = "▶ Трек добавлен в библиотеку и будет играть в круговой 24/7 ротации.";
  }

  await sendTelegram(botToken, "sendMessage", {
    chat_id: chatId,
    text: `✅ *Трек успешно добавлен в ротацию!*\n\n🎵 *${title}*\n👤 Исполнитель: ${artist}\n⏱ Длительность: ${formatDuration(duration)}\n📁 Всего треков в ротации: ${totalCount}\n\n${statusMsg}`,
    parse_mode: "Markdown",
  });
}

async function handleCommand(botToken: string, msg: any, command: string, args: string): Promise<void> {
  const chatId = msg.chat.id;
  const fromId = msg.from?.id;

  if (command === "/start") {
    const libraryCount = (db.prepare("SELECT count(*) as count FROM library_tracks").get() as any).count;
    const nowPlaying = db.prepare("SELECT title, artist, duration_seconds FROM now_playing WHERE id = 1").get() as any;

    let text = `👋 *Привет! Я бот радиостанции 404NFD.*\n\n`;
    if (nowPlaying) {
      text += `📻 *Сейчас в эфире:* «${nowPlaying.title}» (${nowPlaying.artist ?? "—"})\n`;
    } else {
      text += `📻 *Сейчас в эфире:* тишина (ожидание треков)\n`;
    }
    text += `📁 *В библиотеке ротации:* ${libraryCount} треков\n\n`;

    if (fromId && isAdmin(fromId)) {
      text += `✨ *Как добавить треки из Google Flow Music:*\n`;
      text += `Просто отправь мне аудиофайл (MP3/WAV/FLAC) сюда в диалог! Я сразу скачаю его, замерю время и поставлю в бесконечный эфир.\n\n`;
      text += `*Команды администратора:*\n`;
      text += `/status — Текущее состояние эфира\n`;
      text += `/tracks — Список треков в ротации\n`;
      text += `/skip — Пропустить текущий трек\n`;
      text += `/delete <id> — Удалить трек из библиотеки`;
    } else {
      text += `Слушать радио онлайн: https://404nfd.net`;
    }

    await sendTelegram(botToken, "sendMessage", { chat_id: chatId, text, parse_mode: "Markdown" });
    return;
  }

  if (command === "/status") {
    const nowPlaying = db.prepare("SELECT title, artist, duration_seconds FROM now_playing WHERE id = 1").get() as any;
    const libraryCount = (db.prepare("SELECT count(*) as count FROM library_tracks").get() as any).count;
    const queueCount = (db.prepare("SELECT count(*) as count FROM queue").get() as any).count;

    let text = `📊 *Статус 404NFD Radio*\n\n`;
    text += `🎵 В эфире: ${nowPlaying ? `«${nowPlaying.title}» (${nowPlaying.artist})` : "Тишина"}\n`;
    text += `⏳ В очереди заказов: ${queueCount}\n`;
    text += `📁 В библиотеке ротации: ${libraryCount}\n`;
    text += `🌐 Сайт: https://404nfd.net`;

    await sendTelegram(botToken, "sendMessage", { chat_id: chatId, text, parse_mode: "Markdown" });
    return;
  }

  if (command === "/skip") {
    if (!fromId || !isAdmin(fromId)) return;
    const next = advanceQueueIfEmpty();
    const text = next
      ? `⏭ Трек пропущен. Сейчас играет: «${next.title}»`
      : "⏹ Эфир остановлен (очередь и библиотека пусты).";
    await sendTelegram(botToken, "sendMessage", { chat_id: chatId, text });
    return;
  }

  if (command === "/tracks") {
    if (!fromId || !isAdmin(fromId)) return;
    const tracks = db
      .prepare("SELECT id, title, artist, duration_seconds, play_count FROM library_tracks ORDER BY id DESC LIMIT 25")
      .all() as any[];

    if (tracks.length === 0) {
      await sendTelegram(botToken, "sendMessage", {
        chat_id: chatId,
        text: "📁 В библиотеке ротации пока нет треков. Отправь мне MP3 файл, чтобы добавить!",
      });
      return;
    }

    let text = `📁 *Треки в ротации (всего ${tracks.length}):*\n\n`;
    for (const t of tracks) {
      text += `#${t.id}: *${t.title}* (${formatDuration(t.duration_seconds)}) — сыгран ${t.play_count} раз\n`;
    }
    text += `\nЧтобы удалить трек: \`/delete <номер>\``;
    await sendTelegram(botToken, "sendMessage", { chat_id: chatId, text, parse_mode: "Markdown" });
    return;
  }

  if (command === "/delete") {
    if (!fromId || !isAdmin(fromId)) return;
    const id = Number(args.trim());
    if (!id) {
      await sendTelegram(botToken, "sendMessage", {
        chat_id: chatId,
        text: "Укажи номер трека: `/delete 1`",
        parse_mode: "Markdown",
      });
      return;
    }

    const row = db.prepare("SELECT file_path, title FROM library_tracks WHERE id = ?").get(id) as any;
    if (!row) {
      await sendTelegram(botToken, "sendMessage", { chat_id: chatId, text: "Трек с таким номером не найден." });
      return;
    }

    db.prepare("DELETE FROM library_tracks WHERE id = ?").run(id);
    if (fs.existsSync(row.file_path)) {
      try {
        fs.unlinkSync(row.file_path);
      } catch (e) {
        console.error("Failed to delete file:", e);
      }
    }

    await sendTelegram(botToken, "sendMessage", {
      chat_id: chatId,
      text: `🗑 Трек «${row.title}» удален из библиотеки.`,
    });
    return;
  }
}

export function startTelegramBot(): void {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    console.log("Telegram bot poller disabled (missing BOT_TOKEN)");
    return;
  }

  console.log("Telegram bot polling started for @NFD404_bot");

  let offset = 0;
  let running = true;

  const poll = async () => {
    while (running) {
      try {
        const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=25`;
        const res = await fetch(url);
        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }

        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            offset = Math.max(offset, update.update_id + 1);

            const msg = update.message;
            if (!msg) continue;

            if (msg.audio || (msg.document && msg.document.mime_type?.startsWith("audio/")) || (msg.document && /\.(mp3|wav|m4a|flac|ogg)$/i.test(msg.document.file_name ?? ""))) {
              await handleAudioMessage(botToken, msg).catch((err) => {
                console.error("Audio handling failed:", err);
              });
              continue;
            }

            if (typeof msg.text === "string" && msg.text.startsWith("/")) {
              const [cmd, ...rest] = msg.text.split(" ");
              const cleanCmd = cmd.split("@")[0]; // handle /start@NFD404_bot
              await handleCommand(botToken, msg, cleanCmd, rest.join(" ")).catch((err) => {
                console.error("Command handling failed:", err);
              });
            }
          }
        }
      } catch (err) {
        // Network / timeout glitch — wait briefly and retry
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  };

  void poll();
}
