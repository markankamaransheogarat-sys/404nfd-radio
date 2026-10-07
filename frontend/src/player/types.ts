export interface PlayerState {
  isPlaying: boolean;
  isReady: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0..1
}

export interface PlayerTransport {
  loadVideoById(videoId: string, startSeconds?: number): void;
  /** Loads and buffers a video WITHOUT playing it — used to pre-warm a hidden standby player
   * with the next queued track before it's actually due, so the on-air swap has zero load lag. */
  cueVideoById(videoId: string): void;
  play(): void;
  pause(): void;
  setVolume(v: number): void; // 0..1
  seek(seconds: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  onStateChange(cb: (state: PlayerState) => void): void;
  onEnded(cb: () => void): void;
  onError(cb: (message: string) => void): void;
}
