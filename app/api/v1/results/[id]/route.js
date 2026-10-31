import { query, queryOne } from "@/lib/db";
import { route, json, fail, questionImage } from "@/lib/api";

const PASS_PERCENT = 50;

export const GET = route(async ({ user, params }) => {
  const attempt = await queryOne(
    "SELECT a.*, t.title FROM attempts a JOIN tests t ON t.id = a.test_id WHERE a.id = ? AND a.user_id = ?",
    [Number(params.id), user.id]
  );
  if (!attempt) return fail(404, "Result not found.", "not_found");
  const rows = await query(
    `SELECT aa.selected, aa.is_correct, q.id AS qid, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
            q.correct_option, q.marks, q.section, q.has_image, q.image_url, q.video_id, q.feedback, q.feedback_correct
     FROM attempt_answers aa JOIN questions q ON q.id = aa.question_id WHERE aa.attempt_id = ? ORDER BY q.id`,
    [attempt.id]
  );
  const percent = attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0;
  const bySection = new Map();
  for (const r of rows) {
    const name = r.section || "General";
    const s = bySection.get(name) || { name, got: 0, total: 0 };
    s.total += r.marks;
    if (r.is_correct) s.got += r.marks;
    bySection.set(name, s);
  }
  return json({
    result: {
      id: attempt.id,
      title: attempt.title,
      score: attempt.score,
      total: attempt.total,
      percent,
      passed: percent >= PASS_PERCENT,
      timedOut: Boolean(attempt.timed_out),
      submittedAt: attempt.submitted_at,
      correct: rows.filter((r) => r.is_correct).length,
      skipped: rows.filter((r) => !r.selected).length,
      // Section breakdown only when at least one question has a section (matches the web page).
      sections: rows.some((r) => r.section)
        ? [...bySection.values()].map((s) => ({ ...s, percent: s.total ? (s.got / s.total) * 100 : 0 }))
        : [],
    },
    answers: rows.map((r) => ({
      questionId: r.qid,
      text: r.text,
      options: { A: r.option_a, B: r.option_b, C: r.option_c, D: r.option_d },
      selected: r.selected,
      correctOption: r.correct_option,
      isCorrect: Boolean(r.is_correct),
      section: r.section,
      imageUrl: questionImage(r),
      videoId: r.video_id,
      feedback: r.is_correct ? r.feedback_correct : r.feedback,
    })),
  });
});
