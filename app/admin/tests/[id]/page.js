import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { addQuestion, updateQuestion, deleteQuestion } from "@/app/actions";
import { getCategories } from "@/lib/categories";
import EditTestForm from "@/components/EditTestForm";
import { formatDuration } from "@/lib/duration";
import QuestionFields from "@/components/QuestionFields";

export default async function AdminTestDetail({ params, searchParams }) {
  const { id } = await params;
  const { edit } = await searchParams;
  const editId = Number(edit) || null;
  const test = await queryOne("SELECT * FROM tests WHERE id = ?", [Number(id)]);
  if (!test) notFound();
  const questions = await query("SELECT * FROM questions WHERE test_id = ? ORDER BY id", [test.id]);

  return (
    <>
      <Link href="/admin" className="back">← All tests</Link>
      <div className="page-head">
        <div>
          <h1>{test.title}</h1>
          <p className="muted">{formatDuration(test.duration_seconds)} · {questions.length} question{questions.length === 1 ? "" : "s"}</p>
        </div>
        <span className={`badge ${test.is_published ? "ok" : ""}`}>{test.is_published ? "Published" : "Draft"}</span>
      </div>

      <EditTestForm test={test} categories={await getCategories()} />

      <form action={addQuestion} className="card stack">
        <h3>Add question</h3>
        <input type="hidden" name="test_id" value={test.id} />
        <QuestionFields />
        <div><button className="primary">Add question</button></div>
      </form>

      <h2 style={{ margin: "24px 0 12px" }}>Questions</h2>
      {questions.map((q, i) =>
        q.id === editId ? (
          <form action={updateQuestion} className="card stack" key={q.id} id={`q-${q.id}`} style={{ borderColor: "var(--primary)" }}>
            <h3>Edit question {i + 1}</h3>
            <input type="hidden" name="id" value={q.id} />
            <input type="hidden" name="test_id" value={test.id} />
            <QuestionFields q={q} />
            <div className="row">
              <button className="primary">Save changes</button>
              <Link href={`/admin/tests/${test.id}`} className="btn">Cancel</Link>
            </div>
          </form>
        ) : (
          <div className="card" key={q.id}>
            <div className="q-head">
              <span className="q-num">{i + 1}</span>
              <div className="q-text">{q.text}</div>
              <span className="badge">{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
            </div>
            <ul className="q-admin-opts">
              {["A", "B", "C", "D"].filter((o) => q[`option_${o.toLowerCase()}`]).map((o) => (
                <li key={o} className={q.correct_option === o ? "good" : ""}>
                  {o}. {q[`option_${o.toLowerCase()}`]}{q.correct_option === o && " ✓"}
                </li>
              ))}
            </ul>
            <div className="row" style={{ gap: 8 }}>
              <Link href={`/admin/tests/${test.id}?edit=${q.id}#q-${q.id}`} className="btn sm">Edit</Link>
              <form action={deleteQuestion}>
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="test_id" value={test.id} />
                <button className="sm danger">Delete</button>
              </form>
            </div>
          </div>
        )
      )}
      {questions.length === 0 && <div className="card empty">No questions yet. Add your first one above.</div>}
    </>
  );
}
