"use client";

import { useState } from "react";

// Switches between the manual "create set" form and the script import form.
// Both stay mounted (just hidden) so typed input survives a tab switch.
export default function SetTabs({ manual, script, link, initial = "manual" }) {
  const [active, setActive] = useState(initial);
  const tabs = [
    { id: "manual", label: "Create manually" },
    { id: "script", label: "Generate from script" },
    { id: "link", label: "Import from Google Form" },
  ];
  return (
    <div>
      <div className="tabs" role="tablist" aria-label="Add a set">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            className={`tab ${active === t.id ? "active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div hidden={active !== "manual"}>{manual}</div>
      <div hidden={active !== "script"}>{script}</div>
      <div hidden={active !== "link"}>{link}</div>
    </div>
  );
}
