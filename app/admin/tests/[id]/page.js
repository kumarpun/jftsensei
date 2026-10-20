import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { addQuestion, deleteQuestion } from "@/app/actions";
import { getCategories } from "@/lib/categories";
import EditTestForm from "@/components/EditTestForm";
import { formatDuration } from "@/lib/duration";
import QuestionFields from "@/components/QuestionFields";
import { getSections } from "@/lib/sectionList";
import EditQuestionButton from "@/components/EditQuestionButton";

export default async function AdminTestDetail({ params, searchParams }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const responsesTab = tab === "responses";
  const test = await queryOne("SELECT * FROM tests WHERE id = ?", [Number(id)]);
  const sections = await getSections();
  if (!test) notFound();
  const [questions, attempts] = await Promise.all([
    query("SELECT * FROM questions WHERE test_id = ? ORDER BY id", [test.id]),
    query(
      `SELECT a.id, a.score, a.total, a.timed_out, a.submitted_at, u.name, u.username, u.email
       FROM attempts a JOIN users u ON u.id = a.user_id WHERE a.test_id = ? ORDER BY a.id DESC LIMIT 500`,
      [test.id]
    ),
  ]);
  const totalPoints = questions.reduce((n, q) => n + q.marks, 0);
  const students = new Set(attempts.map((a) => `${a.name}|${a.username || a.email}`)).size;
  const pcts = attempts.map((a) => (a.total ? (a.score / a.total) * 100 : 0));
  const avg = pcts.length ? Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length) : 0;
  const passRate = pcts.length ? Math.round((pcts.filter((x) => x >= 50).length / pcts.length) * 100) : 0;

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

      <div className="tabs set-tabs">
        <Link className={`tab ${!responsesTab ? "active" : ""}`} href={`/admin/tests/${test.id}`}>Questions</Link>
        <Link className={`tab ${responsesTab ? "active" : ""}`} href={`/admin/tests/${test.id}?tab=responses`}>
          Responses <span className="count-pill">{attempts.length}</span>
        </Link>
        <span className="set-total">Total points: {totalPoints}</span>
      </div>

      {responsesTab ? (
        <>
          <div className="grid cols-4" style={{ marginBottom: 16 }}>
            <div className="card"><div className="muted">Responses</div><h2 style={{ margin: 0 }}>{attempts.length}</h2></div>
            <div className="card"><div className="muted">Students</div><h2 style={{ margin: 0 }}>{students}</h2></div>
            <div className="card"><div className="muted">Average score</div><h2 style={{ margin: 0 }}>{avg}%</h2></div>
            <div className="card"><div className="muted">Pass rate (≥50%)</div><h2 style={{ margin: 0 }}>{passRate}%</h2></div>
          </div>
          <div className="card flush">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Student</th><th>Score</th><th>Submitted</th></tr></thead>
                <tbody>
                  {attempts.map((r) => {
                    const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
                    return (
                      <tr key={r.id}>
                        <td data-label="Student"><strong>{r.name}</strong><div className="muted">{r.username || r.email}</div></td>
                        <td data-label="Score">
                          <span className={`badge ${pct >= 50 ? "ok" : "bad"}`}>{r.score}/{r.total} · {pct}%</span>
                          {r.timed_out ? <span className="badge" style={{ marginLeft: 6 }}>Timed out</span> : null}
                        </td>
                        <td data-label="Submitted">{new Date(r.submitted_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {attempts.length === 0 && <tr><td className="empty" colSpan={3}>No responses yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
      <EditTestForm test={test} categories={await getCategories()} />

      <details className="card collapse">
        <summary><h3>Add question</h3></summary>
        <form action={addQuestion} className="stack" style={{ marginTop: 16 }}>
          <input type="hidden" name="test_id" value={test.id} />
          <QuestionFields sections={sections} />
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
          {(q.has_image || q.video_id) && (
            <div className="admin-media">
            {q.has_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="exam-img admin-q-img" src={`/img/q/${q.id}`} alt={`Illustration for question ${i + 1}`} loading="lazy" />
            ) : null}
            {q.video_id && (
              <div className="video">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${q.video_id}`}
                  title={`Video for question ${i + 1}`}
                  allow="encrypted-media; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            )}
            </div>
          )}
          <ul className="q-admin-opts">
            {["A", "B", "C", "D"].filter((o) => q[`option_${o.toLowerCase()}`]).map((o) => (
              <li key={o} className={q.correct_option === o ? "good" : ""}>
                {o}. {q[`option_${o.toLowerCase()}`]}{q.correct_option === o && " ✓"}
              </li>
            ))}
          </ul>
          <div className="row" style={{ gap: 8 }}>
            <EditQuestionButton sections={sections} q={q} testId={test.id} number={i + 1} />
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
      )}
    </>
  );
}
