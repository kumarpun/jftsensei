"use client";

import Link from "next/link";
import { useState } from "react";
import { togglePublish, copyTest, deleteTest } from "@/app/actions";

// 3-dot menu for a set row: Edit, Publish/Unpublish, Copy, Delete.
export default function SetRowMenu({ id, published, title }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="setmenu-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Options for ${title}`} onClick={() => setOpen((o) => !o)}>⋮</button>
      {open && (
        <>
          <div className="setmenu-shade" onClick={() => setOpen(false)} />
          <div className="setmenu-list" role="menu" style={{ minWidth: 160 }}>
            <Link href={`/admin/tests/${id}`} role="menuitem">Edit</Link>
            <form action={togglePublish}><input type="hidden" name="id" value={id} /><button role="menuitem">{published ? "Unpublish" : "Publish"}</button></form>
            <form action={copyTest}><input type="hidden" name="id" value={id} /><button role="menuitem">Copy</button></form>
            <form action={deleteTest} onSubmit={(e) => { if (!confirm(`Delete "${title}"? This cannot be undone.`)) e.preventDefault(); }}>
              <input type="hidden" name="id" value={id} /><button role="menuitem" style={{ color: "var(--danger, #c62828)" }}>Delete</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
