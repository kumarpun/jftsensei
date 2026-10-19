import { query } from "@/lib/db";

export async function getCategories(onlyPublished = false) {
  const rows = await query(
    `SELECT DISTINCT category FROM tests WHERE category IS NOT NULL AND category <> ''${onlyPublished ? " AND is_published = 1" : ""} ORDER BY category`
  );
  return rows.map((r) => r.category);
}
