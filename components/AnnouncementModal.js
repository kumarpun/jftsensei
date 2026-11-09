"use client";

import { useEffect, useState, useTransition } from "react";
import { createAnnouncement, updateAnnouncement } from "@/app/actions";

// Create (no `a`) or edit (`a`) an announcement in a popup, so the table keeps its place.
export default function AnnouncementModal({ a, className = "sm", children }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function save(formData) {
    start(async () => {
      await (a ? updateAnnouncement : createAnnouncement)(formData);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      {open && (
        <div className="modal-backdrop edit-backdrop" role="dialog" aria-modal="true" aria-labelledby={`an-${a?.id ?? "new"}`} onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <form action={save} className="edit-modal stack">
            <h3 id={`an-${a?.id ?? "new"}`}>{a ? "Edit announcement" : "Post an announcement"}</h3>
            {a && <input type="hidden" name="id" value={a.id} />}
            <label>Title<input name="title" required maxLength={200} defaultValue={a?.title} autoFocus /></label>
            <label>Message<textarea name="body" rows={4} defaultValue={a?.body} /></label>
            {a?.has_image ? <img src={a.image_url || `/img/a/${a.id}`} alt="" style={{ maxWidth: 200, borderRadius: 8 }} /> : null}
            <label>{a?.has_image ? "Replace image" : "Image"} (optional, max 4 MB)<input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /></label>
            {a?.has_image ? <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" name="remove_image" style={{ width: "auto" }} /> Remove current image</label> : null}
            <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" name="featured" defaultChecked={!!a?.featured} style={{ width: "auto" }} /> Featured (banner above free sets, no expiry until unfeatured)</label>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
              <button type="submit" className="primary" disabled={pending}>{pending ? "Saving…" : a ? "Save" : "Post"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
