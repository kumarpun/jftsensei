"use client";

import { useState } from "react";

// Shows one panel at a time; the others stay mounted (hidden) so typed input survives a switch.
// A 3-dot menu picks the panel. panels: [{ id, label, node }]
export default function SetTabs({ panels, initial, ariaLabel = "More ways to add" }) {
  const [active, setActive] = useState(initial || panels[0].id);
  const [menu, setMenu] = useState(false);
  const current = panels.find((p) => p.id === active) || panels[0];
  return (
    <div>
      <div className="setmenu">
        <strong className="setmenu-title">{current.label}</strong>
        <button type="button" className="setmenu-btn" aria-haspopup="menu" aria-expanded={menu} aria-label={ariaLabel} onClick={() => setMenu((m) => !m)}>⋮</button>
        {menu && (
          <>
            <div className="setmenu-shade" onClick={() => setMenu(false)} />
            <div className="setmenu-list" role="menu">
              {panels.map((p) => (
                <button key={p.id} type="button" role="menuitem" className={active === p.id ? "active" : ""} onClick={() => { setActive(p.id); setMenu(false); }}>
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {panels.map((p) => (
        <div key={p.id} hidden={active !== p.id}>{p.node}</div>
      ))}
    </div>
  );
}
