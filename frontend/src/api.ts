import { authHeaders } from "./auth";

export const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = typeof body.error === "string" ? body.error : body.error ? JSON.stringify(body.error) : null;
    throw new Error(message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface SearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number;
}

export function searchTracks(q: string) {
  return request<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`);
}

export interface NowPlaying {
  videoId: string;
  title: string;
  artist?: string | null;
  thumbnailUrl?: string | null;
  phraseText?: string | null;
  phraseAuthor?: string | null;
  durationSeconds?: number;
  startedAt: string;
}

export function getNowPlaying() {
  return request<NowPlaying | null>("/api/now-playing");
}

export function advanceQueue(expectedVideoId?: string) {
  return request<NowPlaying | null>("/api/now-playing/advance", {
    method: "POST",
    body: JSON.stringify({ videoId: expectedVideoId }),
  });
}

export interface QueueItem {
  id: number;
  video_id: string;
  title: string;
  artist: string | null;
  thumbnail_url: string | null;
  phrase_text: string | null;
  phrase_author: string | null;
}

export function getQueue() {
  return request<QueueItem[]>("/api/queue");
}

export function addToQueue(track: Omit<NowPlaying, "startedAt"> & { clientId: string }) {
  return request<QueueItem>("/api/queue", { method: "POST", body: JSON.stringify(track) });
}

export function attachPhrase(videoId: string, text: string, author?: string) {
  return request("/api/phrase", { method: "POST", body: JSON.stringify({ videoId, text, author }) });
}

export function sendContact(name: string, email: string, message: string) {
  return request("/api/contact", { method: "POST", body: JSON.stringify({ name, email, message }) });
}

export interface ScheduleSlot {
  id: number;
  day_of_week: number;
  start_time: string;
  show_id: string;
  show_title: string;
}

export function getSchedule() {
  return request<ScheduleSlot[]>("/api/schedule");
}

export interface Show {
  id: string;
  title: string;
  description: string;
}

export function getShow(id: string) {
  return request<Show>(`/api/shows/${id}`);
}

export interface ListenerPreview {
  telegramId: number;
  displayName: string;
  photoUrl: string | null;
}

export interface Stats {
  listeners: number;
  queueLength: number;
  secondsRemaining: number;
  listenersPreview: ListenerPreview[];
}

export function getStats() {
  return request<Stats>("/api/stats");
}

export function sendHeartbeat(clientId: string) {
  return request("/api/stats/heartbeat", { method: "POST", body: JSON.stringify({ clientId }) });
}

export function sendReaction(emoji: string, clientId: string) {
  return request("/api/reactions", { method: "POST", body: JSON.stringify({ emoji, clientId }) });
}

export interface SkipStatus {
  active: boolean;
  votes: number;
  needed: number;
  voted: boolean;
}

export function getSkipStatus(clientId: string) {
  return request<SkipStatus>(`/api/vote-skip?clientId=${encodeURIComponent(clientId)}`);
}

export function voteSkip(clientId: string) {
  return request<SkipStatus>("/api/vote-skip", { method: "POST", body: JSON.stringify({ clientId }) });
}

export interface HistoryEntry {
  videoId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  startedAt: string;
  submittedBy: string | null;
}

export function getHistory() {
  return request<HistoryEntry[]>("/api/history");
}

export interface TopUser {
  telegramId: number;
  plays: number;
  displayName: string;
  photoUrl: string | null;
}

export function getTopUsers() {
  return request<TopUser[]>("/api/history/top-users");
}

export function getMyHistory() {
  return request<HistoryEntry[]>("/api/history/mine");
}
