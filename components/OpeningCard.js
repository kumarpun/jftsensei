"use client";

import { useEffect, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

// Customer notice: title, the opening date, and a live countdown. Disappears when the time arrives.
export default function OpeningCard({ label, at, seconds }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const end = Date.now() + seconds * 1000;
    const tick = () => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000)));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [at, seconds]);
  if (left <= 0) return null;
  const when = new Date(at).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  return (
    <div className="card opening-card">
      <h3>{label}</h3>
      <div className="row between">
        <span>{when || " "}</span>
        <b style={{ fontVariantNumeric: "tabular-nums" }}>{d}d {pad(h)}:{pad(m)}:{pad(left % 60)}</b>
      </div>
    </div>
  );
}
