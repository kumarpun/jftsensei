import { query } from "@/lib/db";

// All categories (admin also sees ones with no sets yet) as { id, name }. Names may repeat; the id is the identity.
export async function getCategories() {
  const rows = await query("SELECT id, name FROM categories ORDER BY name, id");
  return rows.map((r) => ({ id: r.id, name: r.name }));
}
