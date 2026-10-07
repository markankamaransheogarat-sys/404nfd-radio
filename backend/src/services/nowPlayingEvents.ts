import { EventEmitter } from "node:events";
import type { NowPlayingDto } from "../db/dto.js";

// Lets SSE clients (routes/nowPlayingStream.ts) hear about track changes the instant
// queueService advances, instead of finding out up to a poll-interval later.
export const nowPlayingEvents = new EventEmitter();
nowPlayingEvents.setMaxListeners(0); // one listener per connected SSE client

export function broadcastNowPlaying(dto: NowPlayingDto | null): void {
  nowPlayingEvents.emit("change", dto);
}
