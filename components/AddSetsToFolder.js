"use client";

import { useEffect, useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { addSetsToFolder } from "@/app/actions";

// Pop-up listing every set of the category. Ticked = in this folder; unticking removes a set from it.
export default function AddSetsToFolder({ category, folder, sets , open: openProp, setOpen: setOpenProp, hideTrigger }) {
  const [openOwn, setOpenOwn] = useState(false);
  const open = openProp ?? openOwn;
  const setOpen = setOpenProp ?? setOpenOwn;
  const initial = sets.filter((t) => t.folder === folder).map((t) => t.id);
  const [picked, setPicked] = useState(initial);
  const changed = picked.length !== initial.length || picked.some((id) => !initial.includes(id));

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <>
      {!hideTrigger && <button type="button" className="btn sm" onClick={() => setOpen(true)}>Manage sets</button>}
      <div className="modal-backdrop edit-backdrop" hidden={!open} onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
        <form action={addSetsToFolder} className="wizard" role="dialog" aria-modal="true" aria-label={`Add sets to ${folder}`}>
          <div className="wizard-head">
            <h2>Sets in {folder}</h2>
            <button type="button" className="sm" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="folder" value={folder} />
          {sets.length === 0 ? (
            <div className="muted">{category} has no sets yet.</div>
          ) : (
            <div className="pick-table" role="group" aria-label="Sets">
              <label className="pick-row pick-headrow">
                <input type="checkbox" checked={picked.length === sets.length} onChange={() => setPicked(picked.length === sets.length ? [] : sets.map((t) => t.id))} aria-label="Select all" />
                <span>Set</span>
                <span>Current folder</span>
              </label>
              {sets.map((t) => (
                <label key={t.id} className={`pick-row${picked.includes(t.id) ? " on" : ""}`}>
                  <input type="checkbox" name="ids" value={t.id} checked={picked.includes(t.id)} onChange={() => toggle(t.id)} />
                  <span className="pick-name">{t.title}</span>
                  <span className="muted">{t.folder || "—"}</span>
                </label>
              ))}
            </div>
          )}
          <div className="wizard-actions">
            <SubmitButton className="primary" pendingText="Saving…" disabled={!changed}>Save</SubmitButton>
          </div>
        </form>
      </div>
    </>
  );
}
