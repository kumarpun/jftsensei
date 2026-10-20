"use client";

import { useState } from "react";

const NEW = "__new__";

// titleOptional: picking "+ Add new category…" makes the form's set-name input optional.
export default function CategoryField({ categories = [], defaultValue = "", titleOptional = false }) {
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
    </div>
  );
}
