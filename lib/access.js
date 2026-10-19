import { queryOne } from "@/lib/db";

// A test whose category is in any active package is locked until the customer holds a live (approved, unexpired)
// purchase of a package that includes that category.
export async function hasTestAccess(userId, testId) {
  const row = await queryOne(
    `SELECT
       (SELECT COUNT(*) FROM tests t JOIN package_categories pc ON pc.category = t.category
          JOIN packages p ON p.id = pc.package_id WHERE t.id = ? AND p.is_active = 1) AS gated,
       (SELECT COUNT(*) FROM tests t JOIN package_categories pc ON pc.category = t.category
          JOIN purchases pu ON pu.package_id = pc.package_id
          WHERE t.id = ? AND pu.user_id = ? AND pu.status = 'active' AND pu.expires_at > NOW()) AS owned`,
    [testId, testId, userId]
  );
  return Number(row.gated) === 0 || Number(row.owned) > 0;
}
