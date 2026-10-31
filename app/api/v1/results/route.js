import { query } from "@/lib/db";
import { route, json } from "@/lib/api";

export const GET = route(async ({ user }) => {
  const rows = await query(
    `SELECT a.id, a.score, a.total, a.timed_out, a.submitted_at, t.title
     FROM attempts a JOIN tests t ON t.id = a.test_id WHERE a.user_id = ? ORDER BY a.id DESC`,
    [user.id]
  );
  return json({
    results: rows.map((r) => ({
      id: r.id,
      title: r.title,
      score: r.score,
      total: r.total,
      percent: r.total ? Math.round((r.score / r.total) * 100) : 0,
      timedOut: Boolean(r.timed_out),
      submittedAt: r.submitted_at,
    })),
  });
});
