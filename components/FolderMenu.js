"use client";

import { useState } from "react";
import AddSetsToFolder from "@/components/AddSetsToFolder";
import ManualSetWizard from "@/components/ManualSetWizard";
import { deleteFolder } from "@/app/actions";

// 3-dot menu for a folder: manage which sets are inside, create a new set in it, or delete it.
export default function FolderMenu({ category, folder, sets, count }) {
  const [menu, setMenu] = useState(false);
  const [manage, setManage] = useState(false);
  const [adding, setAdding] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="setmenu-btn" aria-haspopup="menu" aria-expanded={menu} aria-label="Folder options" onClick={() => setMenu((m) => !m)}>⋮</button>
      {menu && (
        <>
          <div className="setmenu-shade" onClick={() => setMenu(false)} />
          <div className="setmenu-list" role="menu">
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
      <AddSetsToFolder category={category} folder={folder} sets={sets} open={manage} setOpen={setManage} hideTrigger />
      <ManualSetWizard kind="set" category={category} folder={folder} open={adding} setOpen={setAdding} hideTrigger />
    </div>
  );
}
