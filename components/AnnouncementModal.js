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
          <form action={save} className="edit-modal ann-modal">
            <div className="ann-head">
              <h3 id={`an-${a?.id ?? "new"}`}>{a ? "Edit announcement" : "Post an announcement"}</h3>
              <button type="button" className="sm" onClick={() => setOpen(false)} disabled={pending} aria-label="Close">✕</button>
            </div>
            {a && <input type="hidden" name="id" value={a.id} />}
            <label>Title<input name="title" required maxLength={200} defaultValue={a?.title} autoFocus /></label>
            <label>Message<textarea name="body" rows={4} defaultValue={a?.body} placeholder="Optional details" /></label>
            <div className="ann-image">
              {a?.has_image ? <img src={a.image_url || `/img/a/${a.id}`} alt="Current image" /> : null}
              <div className="ann-image-side">
                <label><span>{a?.has_image ? "Replace image" : "Image"} <span className="muted">(optional, max 4 MB)</span></span><input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /></label>
                {a?.has_image ? <label className="ann-check"><input type="checkbox" name="remove_image" /> Remove current image</label> : null}
              </div>
            </div>
            <label className="ann-check ann-feature">
              <input type="checkbox" name="featured" defaultChecked={!!a?.featured} />
              <span><strong>Featured</strong><small>Shown as a banner above free sets, no expiry until unfeatured.</small></span>
            </label>
            <div className="ann-actions">
              <button type="button" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
              <button type="submit" className="primary" disabled={pending}>{pending ? "Saving…" : a ? "Save" : "Post"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
