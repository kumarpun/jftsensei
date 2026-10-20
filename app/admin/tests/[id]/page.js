import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { addQuestion, deleteQuestion } from "@/app/actions";
import { getCategories } from "@/lib/categories";
import EditTestForm from "@/components/EditTestForm";
import { formatDuration } from "@/lib/duration";
import QuestionFields from "@/components/QuestionFields";
import EditQuestionButton from "@/components/EditQuestionButton";

export default async function AdminTestDetail({ params }) {
  const { id } = await params;
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

      <details className="card collapse">
        <summary><h3>Add question</h3></summary>
        <form action={addQuestion} className="stack" style={{ marginTop: 16 }}>
          <input type="hidden" name="test_id" value={test.id} />
          <QuestionFields />
          <div><button className="primary">Add question</button></div>
        </form>
      </details>

      <h2 style={{ margin: "24px 0 12px" }}>Questions</h2>
      {questions.map((q, i) => (
        <div className="card" key={q.id} id={`q-${q.id}`}>
          <div className="q-head">
            <span className="q-num">{i + 1}</span>
            <div className="q-text">{q.text}</div>
            <span className="badge">{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
          </div>
          {q.has_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="exam-img admin-q-img" src={`/img/q/${q.id}`} alt={`Illustration for question ${i + 1}`} loading="lazy" />
          ) : null}
          <ul className="q-admin-opts">
            {["A", "B", "C", "D"].filter((o) => q[`option_${o.toLowerCase()}`]).map((o) => (
              <li key={o} className={q.correct_option === o ? "good" : ""}>
                {o}. {q[`option_${o.toLowerCase()}`]}{q.correct_option === o && " ✓"}
              </li>
            ))}
          </ul>
          <div className="row" style={{ gap: 8 }}>
            <EditQuestionButton q={q} testId={test.id} number={i + 1} />
            <form action={deleteQuestion}>
              <input type="hidden" name="id" value={q.id} />
              <input type="hidden" name="test_id" value={test.id} />
              <button className="sm danger">Delete</button>
            </form>
          </div>
        </div>
      ))}
      {questions.length === 0 && <div className="card empty">No questions yet. Add your first one above.</div>}
    </>
  );
}
