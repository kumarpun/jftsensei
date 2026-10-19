"use client";

import { useEffect, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

// Live countdown. Takes seconds remaining (computed by the DB, so no timezone drift) and ticks locally.
export default function Countdown({ seconds }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const end = Date.now() + seconds * 1000;
    const tick = () => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000)));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [seconds]);
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{d}d {pad(h)}:{pad(m)}:{pad(s)}</span>;
}
