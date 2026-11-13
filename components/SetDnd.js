"use client";

import { useEffect, useRef, useTransition } from "react";
import { moveSet } from "@/app/actions";

// Drag-and-drop for set rows inside one category: reorder within a folder / the loose list, or drop on another
// folder (or a row inside it) to move the set there. Rows carry data-set-id; drop zones carry data-drop-folder
// ("" = loose sets). Plain DOM listeners in the capture phase keep this independent of the folder/category sorters
// that wrap it (they also use drag events) and the server re-render after the action updates the lists.
export default function SetDnd({ children }) {
  const ref = useRef(null);
  const [busy, start] = useTransition();
  const busyRef = useRef(false);
  useEffect(() => { busyRef.current = busy; }, [busy]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let dragId = null;
    let marks = [];
    const clear = () => { marks.forEach(([el, c]) => el.classList.remove(c)); marks = []; };
    const mark = (el, c) => { el.classList.add(c); marks.push([el, c]); };

    // Where would a drop at this event land? { zone, row, after } or null.
    const locate = (e) => {
      const zone = e.target.closest?.("[data-drop-folder]");
      if (!zone || !root.contains(zone)) return null;
      let row = e.target.closest(".cat-set[data-set-id]");
      if (row && row.closest("[data-drop-folder]") !== zone) row = null;
      if (row?.dataset.setId === dragId) return { zone, row: null, self: true };
      const r = row?.getBoundingClientRect();
      return { zone, row, after: row ? e.clientY > r.top + r.height / 2 : false };
    };

    const onStart = (e) => {
      const row = e.target.closest?.(".cat-set[data-set-id]");
      if (!row || !root.contains(row)) return;
      e.stopPropagation();
      if (busyRef.current) return e.preventDefault(); // wait for the previous move to finish
      dragId = row.dataset.setId;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `set:${dragId}`);
      row.classList.add("set-dragging");
    };
    // Hovering Prev/Next while dragging flips pages (repeats) so a set can be dropped on any page.
    let flipBtn = null;
    let flipTimer = null;
    const stopFlip = () => { clearInterval(flipTimer); flipTimer = null; flipBtn = null; };
    const onOver = (e) => {
      if (dragId === null) return;
      e.stopPropagation();
      const btn = e.target.closest?.(".pager button:not(:disabled)");
      if (btn !== flipBtn) {
        stopFlip();
        if (btn) { flipBtn = btn; flipTimer = setInterval(() => (btn.disabled ? stopFlip() : btn.click()), 600); }
      }
      const hit = locate(e);
      clear();
      if (!hit || hit.self) return;
      e.preventDefault();
      if (hit.row) mark(hit.row, hit.after ? "set-drop-after" : "set-drop-before");
      else mark(hit.zone, "set-drop-into");
    };
    const onDrop = (e) => {
      if (dragId === null) return;
      e.stopPropagation();
      const hit = locate(e);
      const id = dragId;
      finish();
      if (!hit || hit.self) return;
      e.preventDefault();
      start(() => moveSet(Number(id), hit.zone.dataset.dropFolder, hit.row ? Number(hit.row.dataset.setId) : null, !!hit.after));
    };
    const finish = () => {
      clear();
      stopFlip();
      root.querySelectorAll(".set-dragging").forEach((el) => el.classList.remove("set-dragging"));
      dragId = null;
    };

    root.addEventListener("dragstart", onStart, true);
    root.addEventListener("dragover", onOver, true);
    root.addEventListener("drop", onDrop, true);
    root.addEventListener("dragend", finish, true);
    return () => {
      root.removeEventListener("dragstart", onStart, true);
      root.removeEventListener("dragover", onOver, true);
      root.removeEventListener("drop", onDrop, true);
      root.removeEventListener("dragend", finish, true);
      stopFlip();
    };
  }, [start]);

  return (
    <div ref={ref} className={busy ? "set-busy" : undefined} aria-busy={busy}>
      {busy && <div className="set-busy-badge" role="status"><span className="set-spinner" aria-hidden="true" /> Moving set…</div>}
      {children}
    </div>
  );
}
