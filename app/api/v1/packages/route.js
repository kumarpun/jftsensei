import { query } from "@/lib/db";
import { subNameMap } from "@/lib/linked";
import { route, json } from "@/lib/api";

export const GET = route(async ({ user }) => {
  const label = await subNameMap();
  const [packages, titles, mine, included, pkgCats] = await Promise.all([
    query("SELECT * FROM packages WHERE is_active = 1 ORDER BY price, id"),
    query(
      `SELECT pc.package_id, t.id, t.title, t.category, t.form_url, t.duration_seconds, (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count
       FROM package_categories pc JOIN tests t ON t.category = pc.category AND t.is_published = 1
       UNION
       SELECT pt.package_id, t.id, t.title, t.category, t.form_url, t.duration_seconds, (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count
       FROM package_tests pt JOIN tests t ON t.id = pt.test_id AND t.is_published = 1 ORDER BY id`
    ),
    query(
      `SELECT package_id, status, expires_at FROM purchases
       WHERE user_id = ? AND (status = 'pending' OR (status = 'active' AND expires_at > NOW()))`,
      [user.id]
    ),
    query(
      `SELECT pc.package_id, pc.category, COUNT(t.id) AS sets
       FROM package_categories pc JOIN tests t ON t.category = pc.category AND t.is_published = 1
       GROUP BY pc.package_id, pc.category ORDER BY pc.category`
    ),
    query(
      `SELECT pt.package_id, t.category FROM package_tests pt JOIN tests t ON t.id = pt.test_id WHERE t.category IS NOT NULL AND t.category <> ''`
    ),
  ]);
  // Only packages with at least one published set are on sale.
  return json({
    packages: packages
      .filter((p) => titles.some((r) => r.package_id === p.id))
      .map((p) => {
        const own = mine.find((m) => m.package_id === p.id);
        const cats = included.filter((r) => r.package_id === p.id);
        const setCats = [...new Set(pkgCats.filter((r) => r.package_id === p.id).map((r) => r.category))].filter((c) => !cats.some((x) => x.category === c));
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          days: p.days,
          price: Number(p.price),
          originalPrice: p.original_price === null ? null : Number(p.original_price),
          tests: titles.filter((r) => r.package_id === p.id).map((t) => ({ id: t.id, title: t.title, category: label(t.category), formUrl: t.form_url, durationSeconds: t.duration_seconds, questionCount: Number(t.question_count) })),
          // Whole categories sold in the package (sub-category name shown when set) and categories of individually added sets.
          categories: cats.map((c) => ({ name: label(c.category), sets: Number(c.sets) })),
          setCategories: setCats.map(label),
          myStatus: own ? own.status : null, // "pending" | "active" | null
          expiresAt: own?.status === "active" ? own.expires_at : null,
        };
      }),
  });
});
