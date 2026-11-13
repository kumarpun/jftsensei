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
