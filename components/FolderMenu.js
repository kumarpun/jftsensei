"use client";

import { useActionState, useEffect, useState } from "react";
import AddSetsToFolder from "@/components/AddSetsToFolder";
import ManualSetWizard from "@/components/ManualSetWizard";
import { deleteFolder, renameFolder } from "@/app/actions";

// 3-dot menu for a folder: rename it, manage which sets are inside, create a new set in it, or delete it.
export default function FolderMenu({ category, categoryName, folder, sets, count }) {
  const [menu, setMenu] = useState(false);
  const [manage, setManage] = useState(false);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [rState, rAction, rPending] = useActionState(renameFolder, null);
  const [seenAt, setSeenAt] = useState(0);
  const [dismissedAt, setDismissedAt] = useState(0);
  // Close the pop-up once the save succeeds (adjust state during render, not in an effect).
  if (rState && rState.at !== seenAt) {
    setSeenAt(rState.at);
    if (rState.ok) setRenaming(false);
  }
  const toast = rState && rState.at !== dismissedAt ? rState : null;
  useEffect(() => {
    if (!rState) return;
    const t = setTimeout(() => setDismissedAt(rState.at), 3500);
    return () => clearTimeout(t);
  }, [rState]);
  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="setmenu-btn" aria-haspopup="menu" aria-expanded={menu} aria-label="Folder options" onClick={() => setMenu((m) => !m)}>⋮</button>
      {menu && (
        <>
          <div className="setmenu-shade" onClick={() => setMenu(false)} />
          <div className="setmenu-list" role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenu(false); setRenaming(true); }}>Rename folder</button>
            <button type="button" role="menuitem" onClick={() => { setMenu(false); setManage(true); }}>Manage sets</button>
            <button type="button" role="menuitem" onClick={() => { setMenu(false); setAdding(true); }}>Add set</button>
            <form
              action={deleteFolder}
              onSubmit={(e) => {
                if (!confirm(`Delete folder "${folder}"? Its ${count} set(s), with their questions and attempts, will be permanently deleted.`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="folder" value={folder} />
              <button role="menuitem" className="menu-danger">Delete folder</button>
            </form>
          </div>
        </>
      )}
      <div className="modal-backdrop edit-backdrop" hidden={!renaming} onMouseDown={(e) => e.target === e.currentTarget && setRenaming(false)}>
        <form action={rAction} className="wizard" role="dialog" aria-modal="true" aria-label="Rename folder">
          <div className="wizard-head">
            <h2>Rename folder</h2>
            <button type="button" className="sm" onClick={() => setRenaming(false)} aria-label="Close">✕</button>
          </div>
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="folder" value={folder} />
          <label>Folder name
            <input name="name" required maxLength={100} defaultValue={folder} autoFocus={renaming} />
          </label>
          {rState && !rState.ok && <div className="toast bad" role="alert" style={{ position: "static" }}>{rState.message}</div>}
          <div className="wizard-actions" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn" onClick={() => setRenaming(false)}>Cancel</button>
            <button className="primary" disabled={rPending}>{rPending ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
      {toast?.ok && (
        <div className="toast ok" role="status" aria-live="polite">
          <span className="toast-icon">✓</span>{toast.message}
        </div>
      )}
      <AddSetsToFolder category={category} categoryName={categoryName} folder={folder} sets={sets} open={manage} setOpen={setManage} hideTrigger />
      <ManualSetWizard kind="set" category={category} categoryName={categoryName} folder={folder} open={adding} setOpen={setAdding} hideTrigger />
    </div>
  );
}
