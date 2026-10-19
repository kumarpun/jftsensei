export default function PackageFields({ p, categories, selected = [] }) {
  return (
    <>
      <label>Package (category)
        <select name="category" required defaultValue={selected[0] ?? ""}>
          <option value="" disabled>— Select a category —</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category} ({c.test_count} {Number(c.test_count) === 1 ? "set" : "sets"})
            </option>
          ))}
        </select>
        <span className="muted" style={{ fontWeight: 400 }}>Buying this package unlocks every set in the category.</span>
      </label>
      <div className="row">
        <label style={{ width: 130 }}>Days<input name="days" type="number" min="1" required defaultValue={p?.days ?? 5} /></label>
        <label style={{ width: 160 }}>Original price<input name="original_price" type="number" min="0" step="0.01" placeholder="e.g. 300" defaultValue={p?.original_price ?? ""} /></label>
        <label style={{ width: 160 }}>Price<input name="price" type="number" min="0" step="0.01" required placeholder="e.g. 200" defaultValue={p?.price} /></label>
      </div>
      <label>Description (shown under &ldquo;Learn More&rdquo;)<textarea name="description" rows={2} defaultValue={p?.description || ""} /></label>
      {categories.length === 0 && <span className="muted">No categories yet — set a category on your tests first.</span>}
    </>
  );
}
