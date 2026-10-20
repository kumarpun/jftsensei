"use client";

import { useState } from "react";

const NEW = "__new__";

// titleOptional: picking "+ Add new category…" makes the form's set-name input optional.
export default function CategoryField({ categories = [], defaultValue = "", titleOptional = false, withPrice = false }) {
  const options = defaultValue && !categories.includes(defaultValue) ? [...categories, defaultValue] : categories;
  const [value, setValue] = useState(defaultValue || "");
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label>Category
        <select name="category" value={value} onChange={(e) => {
          setValue(e.target.value);
          const title = titleOptional && e.target.form?.elements.title;
          if (title) title.required = e.target.value !== NEW;
        }}>
          <option value="">— No category —</option>
          {options.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value={NEW}>+ Add new category…</option>
        </select>
      </label>
      {value === NEW && (
        <input name="category_new" required maxLength={100} placeholder="New category name, e.g. Kanji, Listening, Full mock" autoFocus />
      )}
      {value === NEW && withPrice && (
        <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
          <label style={{ width: 70 }}>Days<input name="cat_days" type="number" min="1" defaultValue={5} /></label>
          <label style={{ width: 100 }}>Original price<input name="cat_original_price" type="number" min="0" step="0.01" /></label>
          <label style={{ width: 100 }}>Price<input name="cat_price" type="number" min="0" step="0.01" placeholder="optional" /></label>
        </div>
      )}
    </div>
  );
}
