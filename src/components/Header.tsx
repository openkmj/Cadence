import { useEffect, useState } from "react";
import { fmtDuration } from "../lib/format";

interface Props {
  startedAtUnix: number;
  platform: string;
}

export function Header({ startedAtUnix, platform }: Props) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const session = Math.max(0, now - startedAtUnix);
  const date = new Date();
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo-dot" />
        <span className="brand-name">CADENCE</span>
        <span className="brand-ver">v0.1.0</span>
      </div>
      <div className="topbar-meta">
        <span className="pill pill-live">
          <span className="pill-dot" /> LIVE
        </span>
        <span className="meta-item">
          <span className="meta-k">PLATFORM</span>
          <span className="meta-v">{platform}</span>
        </span>
        <span className="meta-item">
          <span className="meta-k">SESSION</span>
          <span className="meta-v mono">{fmtDuration(session)}</span>
        </span>
        <span className="meta-item">
          <span className="meta-k">DATE</span>
          <span className="meta-v">{dateStr}</span>
        </span>
      </div>
    </header>
  );
}
