import { query } from "@/lib/db";
import { route, json } from "@/lib/api";

export const GET = route(async ({ user }) => {
  const [packages, titles, mine] = await Promise.all([
    query("SELECT * FROM packages WHERE is_active = 1 ORDER BY price, id"),
    query(
      `SELECT pc.package_id, t.id, t.title, t.category
       FROM package_categories pc JOIN tests t ON t.category = pc.category AND t.is_published = 1
       UNION
       SELECT pt.package_id, t.id, t.title, t.category
       FROM package_tests pt JOIN tests t ON t.id = pt.test_id AND t.is_published = 1 ORDER BY id`
    ),
    query(
      `SELECT package_id, status, expires_at FROM purchases
       WHERE user_id = ? AND (status = 'pending' OR (status = 'active' AND expires_at > NOW()))`,
      [user.id]
    ),
  ]);
  // Only packages with at least one published set are on sale.
  return json({
    packages: packages
      .filter((p) => titles.some((r) => r.package_id === p.id))
      .map((p) => {
        const own = mine.find((m) => m.package_id === p.id);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          days: p.days,
          price: Number(p.price),
          originalPrice: p.original_price === null ? null : Number(p.original_price),
          tests: titles.filter((r) => r.package_id === p.id).map((t) => ({ id: t.id, title: t.title, category: t.category })),
          myStatus: own ? own.status : null, // "pending" | "active" | null
          expiresAt: own?.status === "active" ? own.expires_at : null,
        };
      }),
  });
});
