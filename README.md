# 📻 404nfd Radio

<p align="center">
  <img src="https://raw.githubusercontent.com/markankamaransheogarat-sys/404nfd-radio/main/frontend/public/favicon.svg" alt="404nfd Radio Logo" width="120" height="120" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3075/3075908.png'" />
</p>

<p align="center">
  <strong>Retro-Cyberpunk Community Internet Radio Station with Synchronized Global Clock, Hybrid Audio Engine, Real-time SSE Streams, and Telegram Bot Auto-DJ.</strong><br>
  <em>Zero-latency synchronized broadcasting, procedural WebAudio static synthesis, democratic vote-skipping, and real-time emoji barrage overlays.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-22_LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 22" />
  <img src="https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Telegram_Bot-Integrated-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram Bot" />
  <img src="https://img.shields.io/badge/Docker-Multi--Stage-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## ⚡ What is 404nfd Radio?

**404nfd Radio** is a full-stack, real-time cybernetic internet radio station designed for communities, developers, and music enthusiasts. Unlike traditional streaming servers (Shoutcast/Icecast) that incur 10–30s of buffering delay, 404nfd Radio uses a **centralized virtual broadcast clock** and **Server-Sent Events (SSE)** to keep every listener on Earth synchronized down to the exact millisecond.

When listener A in Tokyo and listener B in London open the station, they hear the exact same guitar riff, see the exact same waveform visualizer, and can react together with floating real-time emoji bursts.

---

## 🎮 Architecture & Core Innovations

### 1. ⏱️ Global Virtual Broadcast Clock (`radioClock.ts`)
- A sub-second authoritative server clock maintains continuous playback state.
- When new listeners connect, they receive the exact server playback offset (`elapsedSeconds = now - startedAt`).
- Client-side **smart drift correction** monitors browser clock skew against the server and performs micro-adjustments without audible audio popping or buffering interruptions.

### 2. 🎛️ Hybrid Audio Transport (`hybridTransport.ts`)
- Seamlessly plays across multiple audio backends without interrupting listener sessions:
  - **Native Local Audio Engine**: Streams high-fidelity MP3/AAC audio files directly from local storage with HTTP 206 `Accept-Ranges` support.
  - **YouTube Media Streamer**: Streams tracks from YouTube via embedded API wrapper.
  - **Procedural Analog White Noise Generator (`staticNoise.ts`)**: Synthesizes genuine retro analog radio static using the WebAudio API (`AudioContext` + `createScriptProcessor`) between station handoffs or when off-air.

### 3. 📡 Server-Sent Events (SSE) Live Bus
- **`/api/now-playing-stream`**: Real-time push notifications of current track, elapsed time, artist, cover art, and submitter info.
- **`/api/reactions-stream`**: Broadcasts listener reactions (🔥, 💀, 🖤, ⚡, 📻) in real-time, rendering floating particle overlays across all connected browser viewports.

### 4. 🤖 Telegram Bot & Community Auto-DJ (`telegramBot.ts`)
- **Direct Track Submissions**: Users can send MP3 audio files or YouTube links directly to the Telegram bot to enqueue them.
- **Personal DM Notification**: The bot sends a direct Telegram message to the submitter the exact millisecond their requested track begins playing live!
- **Channel Announcer**: Automatically posts the currently playing track and album artwork to your public Telegram broadcast channel.
- **Democratic Vote-Skip (`voteSkip.ts`)**: Real-time listener vote-skip threshold. If the room votes to skip, the Auto-DJ triggers an immediate fade-out and queues the next track.

### 5. 🖥️ Cyberpunk Retro-Terminal Interface
- **Analog Noise Visualizer**: Custom HTML5 Canvas rendering audio frequency bars and analog static scanlines.
- **Boot Sequence & Command Palette**: Interactive CRT terminal boot animation with `Cmd+K` keyboard shortcut navigation.
- **Dynamic OpenGraph Meta Card Generator**: Dynamic server-side HTML rendering (`ogHtml.ts`) ensuring preview cards on Twitter, Discord, and Telegram display live track art and titles.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Listeners ["Web Client (React + WebAudio)"]
        UI[Cyberpunk SPA Interface]
        Noise[WebAudio Static Synthesizer]
        Player[Hybrid Audio Player]
        Vis[Canvas Frequency Visualizer]
    end

    subgraph Server ["Express.js Broadcast Server (:8004)"]
        Clock[Radio Clock & Drift Sync Engine]
        SSE[SSE Live Event Streamers]
        Queue[Auto-DJ & Queue Manager]
        Static[Static Media Server (HTTP 206)]
        DB[(Embedded SQLite WAL)]
    end

    subgraph Telegram ["Telegram Integration"]
        Bot[Telegram Bot Engine]
        Channel[Broadcast Channel @NFD404radio]
        DM[Direct Listener Alerts]
    end

    subgraph Sources ["Media Backends"]
        LocalFS[Local Storage (backend/media/*.mp3)]
        YT[YouTube Data API]
    end

    UI <-->|SSE: Now Playing & Reactions| SSE
    UI <-->|REST API & Vote-Skip| Queue
    Player <-->|HTTP Byte-Ranges| Static
    Static --> LocalFS
    Queue <--> DB
    Clock <--> Queue
    Clock --> SSE
    Bot <--> Queue
    Bot --> Channel
    Bot --> DM
    Queue --> YT
```

---

## 🛠️ Tech Stack & Technologies

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Backend Runtime** | **Node.js 22 LTS**, **Express.js**, **TypeScript** | High-performance asynchronous API & streaming server |
| **Database** | **SQLite3** via `better-sqlite3` (WAL Mode) | Zero-maintenance, in-process, crash-resilient persistence |
| **Real-time Comms** | **Server-Sent Events (SSE)**, **HTTP Range Requests** | Real-time state replication & audio byte-range streaming |
| **Frontend SPA** | **React 18**, **TypeScript**, **Vite 6**, **TailwindCSS** | Ultra-responsive retro cyberpunk client |
| **Audio Synthesis** | **WebAudio API**, **HTML5 Audio**, **YouTube IFrame API** | Multi-source audio playback & analog noise generation |
| **Telegram Bot** | **Telegram Bot API (Long-Polling & Webhooks)** | Audio file upload, track search, notifications |
| **DevOps / Infra** | **Docker (Multi-Stage)**, **Docker Compose**, **systemd** | Single-container deployment or native Linux service |

---

## 🚀 Quick Start Guide

### Option 1: Docker Compose (One-Command Run)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/markankamaransheogarat-sys/404nfd-radio.git
   cd 404nfd-radio
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit with your Telegram bot token (optional, radio works offline too)
   nano .env
   ```

3. **Start the radio station:**
   ```bash
   docker compose up -d --build
   ```

Open `http://localhost:8004` in your browser. The station is immediately live with pre-bundled tracks!

---

### Option 2: Native Server Installation (Ubuntu/Debian)

Run the automated server deployment script:
```bash
chmod +x deploy/setup-server.sh
./deploy/setup-server.sh
```

To manage the radio station via **systemd**:
```bash
sudo cp deploy/systemd/404nfd-radio.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now 404nfd-radio
```

Check station logs:
```bash
journalctl -u 404nfd-radio -f
```

---

## 📡 API Reference

### Real-Time Live Streams
- `GET /api/now-playing-stream`
  - Server-Sent Events (SSE) stream broadcasting current track, duration, and elapsed time every second.
- `GET /api/reactions-stream`
  - Real-time SSE stream of listener emoji reactions.

### Core Endpoints
- `GET /api/now-playing`
  - Returns current track metadata, elapsed seconds, and station status.
- `GET /api/queue`
  - Returns current playback queue.
- `POST /api/queue`
  - Enqueue a track by YouTube video ID or library track ID.
- `POST /api/vote-skip`
  - Casts a vote to skip the current track. Automatically skips when threshold is met.
- `POST /api/reactions`
  - Submits an emoji reaction (e.g. `🔥`, `💀`, `⚡`) to broadcast to all listeners.
- `GET /api/history`
  - Retrieves playback history of recently played tracks.
- `GET /api/schedule` & `GET /api/shows`
  - Returns weekly show schedules and programming descriptions.
- `GET /health`
  - Returns `{"status": "ok"}` for container health monitoring.

---

## 🎧 Managing the Music Library

1. **Via Telegram Bot**:
   - Send any `.mp3` audio file directly to your configured `@bot`. The bot automatically tags metadata (title, artist, duration) and adds it to rotation.
2. **Via Local Directory**:
   - Place MP3 audio files into `backend/media/`. The server automatically indexes them into the SQLite database on startup.

---

## 📄 License

Distributed under the **Apache-2.0 License**. See [LICENSE](LICENSE) for more details.

---

<p align="center">
  Broadcasted with love for cyber-audio and decentralized radio culture.
</p>
