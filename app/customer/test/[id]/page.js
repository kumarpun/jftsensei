import { formatDuration } from "@/lib/duration";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getUser } from "@/lib/session";
import { hasTestAccess } from "@/lib/access";
import { submitTest } from "@/app/actions";
import TestForm from "@/components/TestForm";

export default async function TakeTest({ params }) {
  const { id } = await params;
  const user = await getUser();
  const test = await queryOne("SELECT * FROM tests WHERE id = ? AND is_published = 1", [Number(id)]);
  if (!test) notFound();
  if (!(await hasTestAccess(user.id, test.id))) redirect("/customer/packages");
  const questions = await query(
    "SELECT id, text, option_a, option_b, option_c, option_d, marks, video_id, has_image, section FROM questions WHERE test_id = ? ORDER BY id",
    [test.id]
  );
  if (questions.length === 0) notFound();

  return (
    <>
      <Link href="/customer" className="back">← Back to tests</Link>
      <div className="page-head">
        <div>
          <p className="muted">{questions.length} questions · {formatDuration(test.duration_seconds)}</p>
        </div>
      </div>
      <TestForm action={submitTest} testId={test.id} title={test.title} candidate={user.name} seconds={test.duration_seconds} questions={questions} />
    </>
  );
}
