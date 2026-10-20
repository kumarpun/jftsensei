import { query } from "@/lib/db";

export async function getCategories(onlyPublished = false) {
  // Admin also sees categories that have no sets yet.
  const rows = await query(
    onlyPublished
      ? `SELECT DISTINCT category FROM tests WHERE category IS NOT NULL AND category <> '' AND is_published = 1 ORDER BY category`
      : `SELECT category FROM (SELECT category FROM tests WHERE category IS NOT NULL AND category <> '' UNION SELECT name AS category FROM categories) c ORDER BY category`
  );
  return rows.map((r) => r.category);
}
