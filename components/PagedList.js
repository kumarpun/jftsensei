"use client";

import { Children, useState } from "react";

// Shows `size` items per page with Prev/Next below once there are more than `size`.
export default function PagedList({ children, size = 10, className = "" }) {
  const items = Children.toArray(children);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const cur = Math.min(page, pages - 1);
  const slice = items.slice(cur * size, cur * size + size);
  return (
    <>
      <div className={className}>{slice}</div>
      {pages > 1 && (
        <div className="pager">
          <button type="button" className="sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>‹ Prev</button>
          <span className="muted">{cur * size + 1}–{Math.min(items.length, cur * size + size)} of {items.length}</span>
          <button type="button" className="sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next ›</button>
        </div>
      )}
    </>
  );
}
