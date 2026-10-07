import { useEffect, useState } from "react";
import { loginWithTelegram } from "../auth";

const BOT_ID = 8763499774; // @NFD404_bot

declare global {
  interface Window {
    Telegram?: {
      Login: {
        auth: (
          options: { bot_id: number; request_access?: string; lang?: string },
          callback: (user: Record<string, unknown> | false) => void
        ) => void;
      };
    };
  }
}

function loadTelegramWidgetScript(): Promise<void> {
  if (window.Telegram?.Login) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export default function TelegramLogin() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadTelegramWidgetScript().then(() => setReady(true));
  }, []);

  const handleClick = () => {
    if (!window.Telegram?.Login) return;
    setBusy(true);
    window.Telegram.Login.auth({ bot_id: BOT_ID, request_access: "write" }, (payload) => {
      setBusy(false);
      if (!payload) return; // user cancelled
      void loginWithTelegram(payload);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={!ready || busy}
      className="flex shrink-0 items-center gap-1.5 border border-accent px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-accent transition active:scale-95 hover:bg-accent hover:text-black disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
        <path d="M21.94 4.64c.28-1.13-.42-1.6-1.17-1.32L2.7 10.6c-1.1.43-1.08 1.05-.19 1.32l4.53 1.41 1.75 5.4c.21.58.44.81.9.81.44 0 .65-.2.9-.44l2.17-2.1 4.5 3.33c.83.46 1.42.22 1.63-.77l3.05-14.52zM8.5 13.67l9.24-5.83c.44-.27.84-.12.51.18l-7.79 7.03-.3 3.24-1.66-4.62z" />
      </svg>
      {busy ? "…" : "Login"}
    </button>
  );
}
