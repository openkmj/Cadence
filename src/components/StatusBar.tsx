import type { DbInfo } from "../lib/types";
import { fmtBytes, fmtNum } from "../lib/format";

interface Props {
  db: DbInfo | null;
  dbPath?: string;
  lastFlushAgo: number | null; // seconds ago, null if never
}

export function StatusBar({ db, dbPath, lastFlushAgo }: Props) {
  return (
    <footer className="statusbar">
      <span className="sb-left">
        <span className="sb-dot sb-ok" /> listening · tap=HID · flush=5s
      </span>
      <span className="sb-meta">
        rows{" "}
        <b>
          {db ? fmtNum(db.minute_rows) : "—"} / {db ? fmtNum(db.key_rows) : "—"}
        </b>
      </span>
      <span className="sb-meta">
        size <b>{db ? fmtBytes(db.size_bytes) : "—"}</b>
      </span>
      <span className="sb-meta">
        schema <b>v{db?.schema_version ?? "—"}</b>
      </span>
      <span className="sb-meta">
        last flush <b>{lastFlushAgo === null ? "—" : `${lastFlushAgo}s ago`}</b>
      </span>
      {dbPath && (
        <span className="sb-meta sb-path" title={dbPath}>
          {dbPath.replace(/^.*[\\/]/, "")}
        </span>
      )}
    </footer>
  );
}
