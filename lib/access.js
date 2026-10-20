import { queryOne } from "@/lib/db";

// SQL condition: test `t` is sold in an active package, either through its whole category or as an individual set.
export const GATED_SQL = `(
  EXISTS (SELECT 1 FROM package_categories pc JOIN packages p ON p.id = pc.package_id WHERE pc.category = t.category AND p.is_active = 1)
  OR EXISTS (SELECT 1 FROM package_tests pt JOIN packages p ON p.id = pt.package_id WHERE pt.test_id = t.id AND p.is_active = 1)
)`;

// A test sold in any active package is locked until the customer holds a live (approved, unexpired)
// purchase of a package that includes it (by category or as an individual set). Other sets are free.
export async function hasTestAccess(userId, testId) {
  const row = await queryOne(
    `SELECT
       (SELECT COUNT(*) FROM tests t WHERE t.id = ? AND ${GATED_SQL}) AS gated,
       (SELECT COUNT(*) FROM purchases pu JOIN tests t ON t.id = ?
          WHERE pu.user_id = ? AND pu.status = 'active' AND pu.expires_at > NOW()
            AND (EXISTS (SELECT 1 FROM package_categories pc WHERE pc.package_id = pu.package_id AND pc.category = t.category)
              OR EXISTS (SELECT 1 FROM package_tests pt WHERE pt.package_id = pu.package_id AND pt.test_id = t.id))) AS owned`,
    [testId, testId, userId]
  );
  return Number(row.gated) === 0 || Number(row.owned) > 0;
}
