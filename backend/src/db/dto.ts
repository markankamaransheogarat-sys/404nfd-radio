// Maps snake_case SQLite rows to the camelCase shape the frontend's `NowPlaying` type expects.
// Without this, e.g. `row.videoId` is undefined (the column is `video_id`), and an undefined
// videoId silently reaches the YouTube player as loadVideoById(undefined) -> "Invalid video".

interface NowPlayingRow {
  video_id: string;
  title: string;
  artist: string | null;
  thumbnail_url: string | null;
  phrase_text: string | null;
  phrase_author: string | null;
  duration_seconds: number;
  started_at: string;
}

export interface NowPlayingDto {
  videoId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  phraseText: string | null;
  phraseAuthor: string | null;
  durationSeconds: number;
  startedAt: string;
}

// SQLite's datetime('now') returns UTC as "YYYY-MM-DD HH:MM:SS" (no 'T', no offset), which
// JS's Date parser handles inconsistently across browsers (some treat it as local time). Force
// it into unambiguous ISO-8601 UTC so every client computes the same elapsed-time-since-start.
function toIsoUtc(sqliteDatetime: string): string {
  return sqliteDatetime.replace(" ", "T") + "Z";
}

export function toNowPlayingDto(row: NowPlayingRow): NowPlayingDto {
  return {
    videoId: row.video_id,
    title: row.title,
    artist: row.artist,
    thumbnailUrl: row.thumbnail_url,
    phraseText: row.phrase_text,
    phraseAuthor: row.phrase_author,
    durationSeconds: row.duration_seconds,
    startedAt: toIsoUtc(row.started_at),
  };
}

interface QueueRow {
  video_id: string;
  title: string;
  artist: string | null;
  thumbnail_url: string | null;
  phrase_text: string | null;
  phrase_author: string | null;
  duration_seconds: number;
}

interface HistoryRow {
  video_id: string;
  title: string;
  artist: string | null;
  thumbnail_url: string | null;
  started_at: string;
  username: string | null;
  first_name: string | null;
}

export interface HistoryEntryDto {
  videoId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  startedAt: string;
  submittedBy: string | null;
}

export function toHistoryEntryDto(row: HistoryRow): HistoryEntryDto {
  return {
    videoId: row.video_id,
    title: row.title,
    artist: row.artist,
    thumbnailUrl: row.thumbnail_url,
    startedAt: toIsoUtc(row.started_at),
    submittedBy: row.username ? `@${row.username}` : row.first_name,
  };
}

interface TopUserRow {
  telegram_id: number;
  plays: number;
  username: string | null;
  first_name: string | null;
  photo_url: string | null;
}

export interface TopUserDto {
  telegramId: number;
  plays: number;
  displayName: string;
  photoUrl: string | null;
}

export function toTopUserDto(row: TopUserRow): TopUserDto {
  return {
    telegramId: row.telegram_id,
    plays: row.plays,
    displayName: row.username ? `@${row.username}` : row.first_name ?? "anonymous",
    photoUrl: row.photo_url,
  };
}

/** Same shape as toNowPlayingDto, for a queue row being promoted to now-playing (no started_at column). */
export function queueRowToNowPlayingDto(row: QueueRow): NowPlayingDto {
  return {
    videoId: row.video_id,
    title: row.title,
    artist: row.artist,
    thumbnailUrl: row.thumbnail_url,
    phraseText: row.phrase_text,
    phraseAuthor: row.phrase_author,
    durationSeconds: row.duration_seconds,
    startedAt: new Date().toISOString(),
  };
}
