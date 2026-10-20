import { setCategoryPrice } from "@/app/actions";

// Default price for a category: sets made paid inside it use this price.
export default function CategoryPrice({ category, cat, paidCount, total }) {
  const priced = cat?.price !== null && cat?.price !== undefined;
  return (
    <details className="paid-control">
      <summary className={`badge ${priced ? "ok" : ""}`} style={{ cursor: "pointer" }}>
        {priced ? `Price ${Number(cat.price)} · ${cat.days}d · ${paidCount}/${total} sets paid` : "No price · set category price"}
      </summary>
      <form action={setCategoryPrice} className="row" style={{ gap: 8, marginTop: 8, alignItems: "flex-end" }}>
        <input type="hidden" name="target" value={category} />
        <label style={{ width: 90 }}>Days<input name="days" type="number" min="1" required defaultValue={cat?.days ?? 5} /></label>
        <label style={{ width: 120 }}>Original price<input name="original_price" type="number" min="0" step="0.01" defaultValue={cat?.original_price ?? ""} /></label>
        <label style={{ width: 120 }}>Price<input name="price" type="number" min="0" step="0.01" required defaultValue={cat?.price ?? ""} /></label>
        <button className="sm primary" name="mode" value="save">Save price</button>
        <button className="sm" name="mode" value="all">Save &amp; make all sets paid</button>
        <button className="sm danger" name="mode" value="free" formNoValidate>Make all free</button>
      </form>
    </details>
  );
}
