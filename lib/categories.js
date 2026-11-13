import { query } from "@/lib/db";

// All categories (admin also sees ones with no sets yet) as { id, name }. Names may repeat; the id is the identity.
export async function getCategories() {
  const rows = await query("SELECT id, name FROM categories ORDER BY name, id");
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

// Admin drag-and-drop order (categories.position). Returns rank(categoryId): lower = earlier; unordered/unknown categories sort last.
export async function categoryRank() {
  const rows = await query("SELECT id, position FROM categories");
  const m = new Map(rows.map((r) => [Number(r.id), Number(r.position) || 1e9]));
  return (id) => m.get(Number(id)) ?? 1e9;
}

// Admin drag-and-drop order of sets. Returns a comparator: folders first (in folder order), then loose sets;
// inside each, by tests.position (0 = never ordered, goes last) then id. Works on raw test rows.
export async function setOrder() {
  const rows = await query("SELECT category_id, name, position FROM folders");
  const fp = new Map(rows.map((r) => [`${r.category_id}:${r.name}`, Number(r.position) || 1e9]));
  const key = (t) => (t.folder ? fp.get(`${t.category_id}:${t.folder}`) ?? 1e9 : 2e9); // ungrouped sets sort before/after folders consistently (finite, so a - b never NaN)
  const pos = (t) => Number(t.position) || 1e9;
  return (a, b) => key(a) - key(b) || String(a.folder || "").localeCompare(String(b.folder || "")) || pos(a) - pos(b) || a.id - b.id;
}
