import { useEffect, useState } from "react";
import { getSkipStatus, voteSkip, type SkipStatus } from "../api";
import { useAuthUser } from "../auth";
import { getClientId } from "../presence";

const POLL_MS = 6000;

export default function SkipVote({ videoId }: { videoId: string }) {
  const user = useAuthUser();
  const [status, setStatus] = useState<SkipStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const clientId = getClientId();

  useEffect(() => {
    const load = () => void getSkipStatus(clientId).then(setStatus).catch(() => {});
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  if (!status?.active) return null;

  const vote = async () => {
    setBusy(true);
    try {
      setStatus(await voteSkip(clientId));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={vote}
      disabled={!user || status.voted || busy}
      title={!user ? "Log in with Telegram to vote" : status.voted ? "You voted to skip this track" : "Vote to skip this track"}
      className="shrink-0 border border-line px-3 py-2 text-xs uppercase tracking-widest text-dim transition active:scale-95 hover:border-accent hover:text-accent disabled:opacity-50"
    >
      ⏭ {status.votes}/{status.needed}
    </button>
  );
}
