"use client";

import { useRef, useState } from "react";
import { deleteAnnouncement, toggleFeatured } from "@/app/actions";

// 3-dot menu for an announcement row: Feature/Unfeature, Delete.
export default function AnnouncementMenu({ id, title, featured }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({});
  const btn = useRef(null);
  const toggle = () => {
    if (!open && btn.current) {
      const r = btn.current.getBoundingClientRect();
      const up = window.innerHeight - r.bottom < 160;
      setPos({ position: "fixed", right: Math.max(8, window.innerWidth - r.right), ...(up ? { bottom: window.innerHeight - r.top + 4, top: "auto" } : { top: r.bottom + 4 }) });
    }
    setOpen((o) => !o);
  };
  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="setmenu-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Options for ${title}`} ref={btn} onClick={toggle}>⋮</button>
      {open && (
        <>
          <div className="setmenu-shade" onClick={() => setOpen(false)} />
          <div className="setmenu-list" role="menu" style={{ minWidth: 180, ...pos }}>
            <form action={toggleFeatured} onSubmit={() => setOpen(false)}>
              <input type="hidden" name="id" value={id} />
              <button role="menuitem"><span className="mi">★</span>{featured ? "Remove from banner" : "Feature as banner"}</button>
            </form>
            <div className="menu-sep" />
            <form action={deleteAnnouncement} onSubmit={(e) => { if (!confirm(`Delete "${title}"? This cannot be undone.`)) e.preventDefault(); else setOpen(false); }}>
              <input type="hidden" name="id" value={id} />
              <button role="menuitem" className="menu-danger"><span className="mi">🗑</span>Delete</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
