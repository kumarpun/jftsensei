import { query } from "@/lib/db";
import { subNameMap } from "@/lib/linked";
import { route, json } from "@/lib/api";
import { categoryRank, setOrder } from "@/lib/categories";

export const GET = route(async ({ user }) => {
  const label = await subNameMap();
  const rank = await categoryRank();
  const [purchases, tests] = await Promise.all([
    query(
      `SELECT pu.id, pu.package_id, pu.status, pu.expires_at, p.name, p.days,
              (pu.status = 'active' AND pu.expires_at > NOW()) AS live,
              TIMESTAMPDIFF(SECOND, NOW(), pu.expires_at) AS secs_left
       FROM purchases pu JOIN packages p ON p.id = pu.package_id
       WHERE pu.user_id = ? AND pu.status <> 'rejected' ORDER BY pu.id DESC`,
      [user.id]
    ),
    query(
      `SELECT pc.package_id, t.id, t.title, t.category, t.category_id, t.folder, t.position, t.form_url, t.duration_seconds, (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count FROM package_categories pc
       JOIN tests t ON t.category_id = pc.category_id AND t.is_published = 1
       UNION
       SELECT pt.package_id, t.id, t.title, t.category, t.category_id, t.folder, t.position, t.form_url, t.duration_seconds, (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count FROM package_tests pt
       JOIN tests t ON t.id = pt.test_id AND t.is_published = 1 ORDER BY id`
    ),
  ]);
  // Follow the admin's category order: sets by their category, purchases by their earliest category (newest first within a tie).
  const pkgRank = (id) => Math.min(1e9, ...tests.filter((t) => t.package_id === id).map((t) => rank(t.category_id)));
  tests.sort(await setOrder()); // admin set order (folders, then position)
  purchases.sort((a, b) => pkgRank(a.package_id) - pkgRank(b.package_id) || b.id - a.id);
  return json({
    purchases: purchases.map((p) => {
      const live = Boolean(Number(p.live));
      return {
        id: p.id,
        packageId: p.package_id,
        name: p.name,
        days: p.days,
        // "active" (live) | "pending" | "expired"
        status: live ? "active" : p.status === "pending" ? "pending" : "expired",
        expiresAt: p.expires_at,
        secondsLeft: live ? Math.max(0, Number(p.secs_left)) : null,
        tests: tests.filter((t) => t.package_id === p.package_id).sort((a, b) => rank(a.category_id) - rank(b.category_id)).map((t) => ({ id: t.id, title: t.title, category: label(t.category_id, t.category), folder: t.folder || null, formUrl: t.form_url, durationSeconds: t.duration_seconds, questionCount: Number(t.question_count) })),
      };
    }),
  });
});
