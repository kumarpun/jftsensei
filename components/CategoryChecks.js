"use client";

import { useState } from "react";

// Dropdown multi-select: pick any number of existing categories (a copy of the new set goes into each) and/or type one new category.
export default function CategoryChecks({ categories = [] }) {
  const [selected, setSelected] = useState([]);
  const [adding, setAdding] = useState(false);
  const setTitleRequired = (form, required) => { if (form?.elements.title) form.elements.title.required = required; };
  const toggle = (c) => setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  const row = { gap: 8, flexDirection: "row", alignItems: "center", padding: "6px 4px", cursor: "pointer" };
  const label = [...selected, ...(adding ? ["New category"] : [])].join(", ") || "Select categories…";
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="muted" style={{ fontSize: 13 }}>Categories (select one or more — the set is added to each)</div>
      <details className="multi-select" style={{ position: "relative" }}>
        <summary className="input" style={{ cursor: "pointer", padding: "10px 12px", border: "1px solid var(--border, #d9dce5)", borderRadius: 10, background: "#fff" }}>{label}</summary>
        <div className="card stack" style={{ gap: 0, padding: 8, marginTop: 4, maxHeight: 240, overflowY: "auto" }}>
          {categories.map((c) => (
            <label key={c} style={row}>
              <input type="checkbox" name="categories" value={c} checked={selected.includes(c)} onChange={() => toggle(c)} style={{ width: "auto" }} /> {c}
            </label>
          ))}
          <label style={row}>
            <input
              type="checkbox"
              checked={adding}
              onChange={(e) => {
                setAdding(e.target.checked);
                setTitleRequired(e.target.form, !e.target.checked);
                if (e.target.checked) setSelected([]);
              }}
              style={{ width: "auto" }}
            /> + New category
          </label>
        </div>
      </details>
      {adding && (
        <>
          <input name="category_new" required maxLength={100} placeholder="New category name, e.g. Kanji, Listening, Full mock" autoFocus />
          <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
            <label style={{ width: 70 }}>Days<input name="cat_days" type="number" min="1" defaultValue={5} /></label>
            <label style={{ width: 100 }}>Original price<input name="cat_original_price" type="number" min="0" step="0.01" /></label>
            <label style={{ width: 100 }}>Price<input name="cat_price" type="number" min="0" step="0.01" placeholder="optional" /></label>
          </div>
        </>
      )}
    </div>
  );
}
