import { EventEmitter } from "node:events";

// Same fire-and-forget SSE fanout pattern as nowPlayingEvents — reactions have no state to
// persist, they just need to reach everyone currently connected within the same instant.
export const reactionEvents = new EventEmitter();
reactionEvents.setMaxListeners(0); // one listener per connected SSE client

export interface ReactionEvent {
  emoji: string;
}

export function broadcastReaction(emoji: string): void {
  reactionEvents.emit("reaction", { emoji } satisfies ReactionEvent);
}
