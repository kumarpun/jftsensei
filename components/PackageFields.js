const cb = { width: "auto" };

// A package sells whole categories and/or individual sets; anything not in an active package stays free.
export default function PackageFields({ p, categories, tests = [], selected = [], selectedTests = [] }) {
  const groups = [...new Set(tests.map((t) => t.category || ""))].map((name) => ({ name, sets: tests.filter((t) => (t.category || "") === name) }));
  return (
    <>
      <label>Package name
        <input name="name" maxLength={150} placeholder="Leave blank to use the first category's name" defaultValue={p?.name || ""} />
      </label>
      <div className="stack" style={{ gap: 6 }}>
        <strong>Whole categories</strong>
        <span className="muted">Paid: every set in the category, including sets added later.</span>
        {categories.map((c) => (
          <label className="row" style={{ gap: 8, flexDirection: "row", alignItems: "center" }} key={c.category}>
            <input type="checkbox" name="category" value={c.category} defaultChecked={selected.includes(c.category)} style={cb} />
            {c.category} <span className="muted">({c.test_count} {Number(c.test_count) === 1 ? "set" : "sets"})</span>
          </label>
        ))}
        {categories.length === 0 && <span className="muted">No categories yet.</span>}
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <strong>Individual sets</strong>
        <span className="muted">Paid: only the ticked sets. Unticked sets stay free.</span>
        {groups.map((g) => (
          <details key={g.name} open={g.sets.some((t) => selectedTests.includes(t.id))}>
            <summary>{g.name || "No category"} <span className="muted">({g.sets.length})</span></summary>
            <div className="stack" style={{ gap: 6, padding: "8px 0 0 12px" }}>
              {g.sets.map((t) => (
                <label className="row" style={{ gap: 8, flexDirection: "row", alignItems: "center" }} key={t.id}>
                  <input type="checkbox" name="test_id" value={t.id} defaultChecked={selectedTests.includes(t.id)} style={cb} />
                  {t.title}
                </label>
              ))}
            </div>
          </details>
        ))}
        {tests.length === 0 && <span className="muted">No sets yet.</span>}
      </div>
      <div className="row">
        <label style={{ width: 130 }}>Days<input name="days" type="number" min="1" required defaultValue={p?.days ?? 5} /></label>
        <label style={{ width: 160 }}>Original price<input name="original_price" type="number" min="0" step="0.01" placeholder="e.g. 300" defaultValue={p?.original_price ?? ""} /></label>
        <label style={{ width: 160 }}>Price<input name="price" type="number" min="0" step="0.01" required placeholder="e.g. 200" defaultValue={p?.price} /></label>
      </div>
      <label>Description (shown under &ldquo;Learn More&rdquo;)<textarea name="description" rows={2} defaultValue={p?.description || ""} /></label>
    </>
  );
}
