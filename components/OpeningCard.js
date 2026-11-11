"use client";

import { useEffect, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

// Customer notice: title, the opening date, and a live countdown to the start of that day (viewer's time). Hidden once the day starts.
export default function OpeningCard({ label, date, at }) {
  const [y, m, d] = date.split("-").map(Number);
  const target = at ? Date.parse(at) : new Date(y, m - 1, d).getTime();
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.round((target - Date.now()) / 1000)));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [target]);
  if (left === 0) return null;
  const when = new Date(target).toLocaleString("en-GB", at ? { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kathmandu" } : { day: "numeric", month: "long", year: "numeric" }) + (at ? " NPT" : "");
  const days = left === null ? null : Math.floor(left / 86400);
  return (
    <div className="card opening-card">
      <h3>{label}</h3>
      <div className="row between">
        <span suppressHydrationWarning>{when}</span>
        <b style={{ fontVariantNumeric: "tabular-nums" }}>{left === null ? " " : `${days}d ${pad(Math.floor((left % 86400) / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`}</b>
      </div>
    </div>
  );
}
