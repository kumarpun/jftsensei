"use client";

import { useEffect, useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { createTest } from "@/app/actions";

// Pop-up form. kind="category": only a category name (then the category opens so sets can be added there).
// kind="set": set title, time limit and description for a fixed category (then opens the question page).
export default function ManualSetWizard({ kind = "set", category = "", folder = "", label , open: openProp, setOpen: setOpenProp, hideTrigger }) {
  const [openOwn, setOpenOwn] = useState(false);
  const open = openProp ?? openOwn;
  const setOpen = setOpenProp ?? setOpenOwn;
  const [link, setLink] = useState(false);
  const isCat = kind === "category";
  const isFolder = kind === "folder";
  const title = isCat ? "Add category" : isFolder ? `Add folder to ${category}` : `Add set to ${folder || category}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      {!hideTrigger && <button type="button" className={isCat ? "primary" : "btn sm"} onClick={() => setOpen(true)}>{label || (isCat ? "+ Add category" : isFolder ? "+ Add folder" : "+ Add set")}</button>}
      <div className="modal-backdrop edit-backdrop" hidden={!open} onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
        <form action={createTest} className="wizard" role="dialog" aria-modal="true" aria-label={title}>
          <div className="wizard-head">
            <h2>{title}</h2>
            <button type="button" className="sm" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>
          {isFolder ? (
            <div className="stack">
              <input type="hidden" name="categories" value={category} />
              <label>Folder name<input name="folder_new" required placeholder="e.g. December" autoFocus={open} /></label>
              <div className="muted">A folder groups sets inside {category}. It shares the category price, days and time limit.</div>
            </div>
          ) : isCat ? (
            <div className="stack">
              <label>Category name<input name="category_new" placeholder="e.g. JFT Basic" autoFocus={open} /></label>
              <div className="muted">After it is created, add sets inside the category.</div>
            </div>
          ) : (
            <div className="stack">
              <input type="hidden" name="categories" value={category} />
              <input type="hidden" name="folder" value={folder} />
              <label>Set title<input name="title" placeholder="e.g. Set 01" /></label>
              <div>
                <button type="button" className={`pkg-badge link-badge${link ? " on" : ""}`} aria-pressed={link} onClick={() => setLink((v) => !v)}>Google link</button>
              </div>
              {link && (
                <label>Google Form link<input name="form_url" type="url" required placeholder="https://docs.google.com/forms/..." /></label>
              )}
              <label>Description<textarea name="description" rows={2} placeholder="Short description (optional)" /></label>
            </div>
          )}
          <div className="wizard-actions">
            <SubmitButton className="primary" pendingText="Creating…">{isCat ? "Create category" : isFolder ? "Create folder" : link ? "Save" : "Create & add questions"}</SubmitButton>
          </div>
        </form>
      </div>
    </>
  );
}
