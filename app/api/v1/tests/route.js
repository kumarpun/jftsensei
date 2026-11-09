import { query } from "@/lib/db";
import { GATED_SQL } from "@/lib/access";
import { mergeLinkedFree } from "@/lib/linked";
import { route, json } from "@/lib/api";

// Free sets only (sets sold in a package appear under /my-packages).
export const GET = route(async ({ user }) => {
  const rows = await query(
    `SELECT t.id, t.origin_id, t.title, t.description, t.category, t.folder, t.duration_seconds, t.form_url,
            (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count,
            (SELECT MAX(a.score / a.total) FROM attempts a WHERE a.test_id = t.id AND a.user_id = ? AND a.total > 0) AS best
     FROM tests t WHERE t.is_published = 1 AND NOT ${GATED_SQL} ORDER BY t.id DESC`,
    [user.id]
  );
  // Linked (copied) categories collapse into the lead one, same as the customer site.
  const tests = await mergeLinkedFree(rows);
  return json({
    tests: tests.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      folder: t.folder || null,
      durationSeconds: t.duration_seconds,
      formUrl: t.form_url,
      questionCount: Number(t.question_count),
      bestPercent: t.best === null ? null : Math.round(Number(t.best) * 100),
    })),
  });
});
