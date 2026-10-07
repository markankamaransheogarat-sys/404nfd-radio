import { useEffect } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import Widget from "./pages/Widget";
import AuthBadge from "./components/AuthBadge";
import PlayerBar from "./components/PlayerBar";
import ReactionOverlay from "./components/ReactionOverlay";
import BootScreen from "./components/BootScreen";
import CommandPalette from "./components/CommandPalette";
import { initPlayer } from "./player/player";
import { startPresence } from "./presence";
import { useAuthUser } from "./auth";
import Home from "./pages/Home";
import Schedule from "./pages/Schedule";
import Show from "./pages/Show";
import Contact from "./pages/Contact";
import History from "./pages/History";
import MyTracks from "./pages/MyTracks";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative border-b-2 px-1 py-1 text-xs uppercase tracking-[0.15em] transition-colors ${
    isActive
      ? "border-accent text-accent [text-shadow:0_0_10px_rgba(255,26,47,0.6)]"
      : "border-transparent text-dim hover:border-line hover:text-fg"
  }`;

export default function App() {
  const user = useAuthUser();
  const location = useLocation();

  const isWidget = location.pathname === "/widget";

  useEffect(() => {
    // The embeddable badge (<iframe src=".../widget">) has no business booting the player or
    // presence tracking — it's a tiny standalone card, not a full listener session.
    if (isWidget) return;
    initPlayer();
    startPresence();
  }, [isWidget]);

  if (isWidget) return <Widget />;

  return (
    <div className="scanlines relative min-h-screen">
      <BootScreen />
      <CommandPalette />

      {/* Large screens leave wide empty margins beside the centered content column — this fills
          them with an oversized, barely-there wordmark instead of flat black. Hidden below lg
          since there's no room for it once the column takes most of the viewport. */}
      <span
        aria-hidden="true"
        className="pointer-events-none fixed -right-10 -top-10 hidden select-none text-[22rem] font-bold leading-none text-white/[0.025] lg:block"
      >
        404
      </span>

      {/* Slow-drifting ambient glow blob — the body's own gradient is static, this gives the
          background a faint pulse of life without being distracting. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/4 top-0 h-[500px] w-[500px] animate-drift-glow blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(255,26,47,0.16), transparent 70%)" }}
      />

      {/* Two fixed rows instead of one flex-wrapping row: a login widget or long username can't
          push the nav tabs off-screen this way on narrow viewports. */}
      <header
        className="sticky top-0 z-40 border-b border-line bg-black/80 px-4 py-3 backdrop-blur-md"
        style={{ boxShadow: "0 1px 0 0 rgba(255,26,47,0.15), 0 8px 24px -12px rgba(0,0,0,0.8)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-bold tracking-[0.2em]">
            <img src="/logo.png" alt="" className="h-6 w-6 rounded-sm shadow-glow-sm" />
            404<span className="text-accent [text-shadow:0_0_12px_rgba(255,26,47,0.7)]">NFD</span>
          </span>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
              className="hidden items-center gap-1 border border-line px-2 py-1 text-[10px] uppercase tracking-widest text-dim transition-colors hover:border-accent hover:text-accent sm:flex"
              title="Command palette"
            >
              <kbd>⌘K</kbd>
            </button>
            <a
              href="https://t.me/NFD404radio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs uppercase tracking-widest text-dim transition-colors hover:text-accent"
              title="Join the Telegram channel"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M21.94 4.64c.28-1.13-.42-1.6-1.17-1.32L2.7 10.6c-1.1.43-1.08 1.05-.19 1.32l4.53 1.41 1.75 5.4c.21.58.44.81.9.81.44 0 .65-.2.9-.44l2.17-2.1 4.5 3.33c.83.46 1.42.22 1.63-.77l3.05-14.52zM8.5 13.67l9.24-5.83c.44-.27.84-.12.51.18l-7.79 7.03-.3 3.24-1.66-4.62z" />
              </svg>
              <span className="hidden sm:inline">Channel</span>
            </a>
            <AuthBadge />
          </div>
        </div>
        <nav className="mt-2 flex gap-6 overflow-x-auto">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/schedule" className={navLinkClass}>
            Schedule
          </NavLink>
          <NavLink to="/history" className={navLinkClass}>
            History
          </NavLink>
          {user && (
            <NavLink to="/mine" className={navLinkClass}>
              Mine
            </NavLink>
          )}
          <NavLink to="/contact" className={navLinkClass}>
            Contact
          </NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/history" element={<History />} />
        <Route path="/mine" element={<MyTracks />} />
        <Route path="/shows/:id" element={<Show />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>

      <ReactionOverlay />

      {/* Rendered once at the app root — route changes above never unmount it, so audio never stops. */}
      <PlayerBar />
    </div>
  );
}
