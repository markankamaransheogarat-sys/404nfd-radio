// In-memory listener presence. No persistence needed — "who's listening right now" is
// meaningless after a restart anyway, and this avoids adding a websocket server for a number
// that only needs to be roughly accurate within ~30s.

const HEARTBEAT_TIMEOUT_MS = 30_000;

interface Entry {
  lastSeen: number;
  telegramId: number | null; // null for anonymous (not logged in) listeners
}

// Keyed by identity (tg:<id> for logged-in listeners, the anonymous clientId otherwise) so the
// same person open in two tabs still counts once.
const listeners = new Map<string, Entry>();

function prune(): void {
  const cutoff = Date.now() - HEARTBEAT_TIMEOUT_MS;
  for (const [id, entry] of listeners) {
    if (entry.lastSeen < cutoff) listeners.delete(id);
  }
}

export function heartbeat(identity: string, telegramId: number | null): void {
  listeners.set(identity, { lastSeen: Date.now(), telegramId });
}

export function countListeners(): number {
  prune();
  return listeners.size;
}

/** Telegram IDs of currently active, logged-in listeners — for showing "who's listening" avatars. */
export function activeTelegramIds(): number[] {
  prune();
  const ids: number[] = [];
  for (const entry of listeners.values()) {
    if (entry.telegramId !== null) ids.push(entry.telegramId);
  }
  return ids;
}
