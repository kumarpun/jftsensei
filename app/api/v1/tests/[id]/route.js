import { query, queryOne } from "@/lib/db";
import { hasTestAccess } from "@/lib/access";
import { route, json, fail, questionImage } from "@/lib/api";

// Questions WITHOUT correct answers or feedback.
export const GET = route(async ({ user, params }) => {
  const test = await queryOne("SELECT * FROM tests WHERE id = ? AND is_published = 1", [Number(params.id)]);
  if (!test) return fail(404, "Test not found.", "not_found");
  if (!(await hasTestAccess(user.id, test.id))) return fail(403, "Buy a package to unlock this set.", "locked");
  const questions = await query(
    "SELECT id, text, option_a, option_b, option_c, option_d, marks, video_id, has_image, image_url, section FROM questions WHERE test_id = ? ORDER BY id",
    [test.id]
  );
  if (questions.length === 0) return fail(404, "This set has no questions yet.", "not_found");
  return json({
    test: { id: test.id, title: test.title, durationSeconds: test.duration_seconds },
    questions: questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
      marks: q.marks,
      section: q.section,
      videoId: q.video_id,
      imageUrl: questionImage(q),
    })),
  });
});
