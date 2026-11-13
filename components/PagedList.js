"use client";

import { Children, useState } from "react";

// Shows `size` items per page with Prev/Next below once there are more than `size`.
export default function PagedList({ children, size: initial = 10, className = "" }) {
  const items = Children.toArray(children);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(initial);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const cur = Math.min(page, pages - 1);
  // Every page stays mounted (hidden) so a set being dragged survives page flips while hovering Prev/Next.
  return (
    <>
      {Array.from({ length: pages }, (_, i) => (
        <div key={i} className={className} style={i !== cur ? { display: "none" } : undefined}>{items.slice(i * size, i * size + size)}</div>
      ))}
      {items.length > initial && (
        <div className="pager">
          <select className="sm" value={size} aria-label="Page size" onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button type="button" className="sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>‹ Prev</button>
          <span className="muted">{cur * size + 1}–{Math.min(items.length, cur * size + size)} of {items.length}</span>
          <button type="button" className="sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next ›</button>
        </div>
      )}
    </>
  );
}
