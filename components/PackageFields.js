export default function PackageFields({ p, categories, selected = [] }) {
  return (
    <>
      <label>Package name<input name="name" required maxLength={150} placeholder="e.g. JFT (Standard) 5days_55FullSet" defaultValue={p?.name} /></label>
      <div className="row">
        <label style={{ width: 130 }}>Days<input name="days" type="number" min="1" required defaultValue={p?.days ?? 5} /></label>
        <label style={{ width: 160 }}>Original price<input name="original_price" type="number" min="0" step="0.01" placeholder="e.g. 300" defaultValue={p?.original_price ?? ""} /></label>
        <label style={{ width: 160 }}>Price<input name="price" type="number" min="0" step="0.01" required placeholder="e.g. 200" defaultValue={p?.price} /></label>
      </div>
      <label>Description (shown under &ldquo;Learn More&rdquo;)<textarea name="description" rows={2} defaultValue={p?.description || ""} /></label>
      <fieldset style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
        <legend className="muted" style={{ fontSize: 13, padding: "0 6px" }}>Categories included (every set in a category is unlocked)</legend>
        <div className="stack" style={{ gap: 6 }}>
          {categories.map((c) => (
            <label key={c.category} className="row" style={{ gap: 8 }}>
              <input type="checkbox" name="categories" value={c.category} defaultChecked={selected.includes(c.category)} style={{ width: "auto" }} />
              {c.category}<span className="badge">{c.test_count} {Number(c.test_count) === 1 ? "set" : "sets"}</span>
            </label>
          ))}
          {categories.length === 0 && <span className="muted">No categories yet — set a category on your tests first.</span>}
        </div>
      </fieldset>
    </>
  );
}
