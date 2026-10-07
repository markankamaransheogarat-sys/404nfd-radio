import { logout, useAuthUser } from "../auth";
import TelegramLogin from "./TelegramLogin";

export default function AuthBadge() {
  const user = useAuthUser();

  if (user === undefined) return null; // still loading

  if (!user) {
    return (
      <div className="shrink-0">
        <TelegramLogin />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 text-xs">
      <span className="text-dim">
        &gt; <span className="text-fg">{user.username ?? user.firstName}</span>
      </span>
      <button
        onClick={() => void logout()}
        className="border border-line px-2 py-1 uppercase tracking-widest text-dim transition-colors active:scale-95 hover:border-accent hover:text-accent"
      >
        Logout
      </button>
    </div>
  );
}
