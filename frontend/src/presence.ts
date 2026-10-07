import { sendHeartbeat } from "./api";

const STORAGE_KEY = "404nfd_client_id";
const HEARTBEAT_MS = 15_000;

export function getClientId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

let started = false;

/** Call once at app startup. Pings the backend every 15s so it can count live listeners. */
export function startPresence(): void {
  if (started) return;
  started = true;
  const clientId = getClientId();
  const ping = () => void sendHeartbeat(clientId).catch(() => {});
  ping();
  setInterval(ping, HEARTBEAT_MS);
}
