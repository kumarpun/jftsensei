import { gradeAndSaveAttempt } from "@/lib/customer";
import { route, body, json, fail } from "@/lib/api";

// POST { answers: { "<questionId>": "A".."D" }, timedOut?: boolean } -> 201 { attemptId, score, total }
export const POST = route(async ({ req, user, params }) => {
  const b = await body(req);
  const answers = b.answers && typeof b.answers === "object" ? b.answers : {};
  const res = await gradeAndSaveAttempt(user, Number(params.id), answers, b.timedOut === true);
  if (res.error === "not_found") return fail(404, "Test not found.", "not_found");
  if (res.error === "no_access") return fail(403, "Buy a package to unlock this set.", "locked");
  return json(res, 201);
});
