import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getUser } from "@/lib/session";

const PASS_PERCENT = 50;
const COLORS = ["#5f8a6f", "#6f9ec2", "#5a3a5e", "#d1a577", "#c2736f"];

export default async function ResultDetail({ params }) {
  const { id } = await params;
  const user = await getUser();
  const attempt = await queryOne(
    `SELECT a.*, t.title FROM attempts a JOIN tests t ON t.id = a.test_id
     WHERE a.id = ? AND a.user_id = ?`,
    [Number(id), user.id]
  );
  if (!attempt) notFound();
  const answers = await query(
    `SELECT aa.selected, aa.is_correct, q.text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.id AS qid, q.marks, q.section, q.has_image, q.video_id, q.feedback
     FROM attempt_answers aa JOIN questions q ON q.id = aa.question_id
     WHERE aa.attempt_id = ? ORDER BY q.id`,
    [attempt.id]
  );
  const pct = attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0;
  const correct = answers.filter((a) => a.is_correct).length;
  const skipped = answers.filter((a) => !a.selected).length;
  const passed = pct >= PASS_PERCENT;
  const bySection = new Map();
  for (const a of answers) {
    const name = a.section || "General";
    const t = bySection.get(name) || { name, got: 0, total: 0 };
    t.total += a.marks;
    if (a.is_correct) t.got += a.marks;
    bySection.set(name, t);
  }
  // Show the breakdown as soon as any question has a section; unsectioned ones fall under "General".
  const sections = answers.some((a) => a.section)
    ? [...bySection.values()].map((t) => ({ ...t, pct: t.total ? (t.got / t.total) * 100 : 0 }))
    : [];

  return (
    <>
      <Link href="/customer/results" className="back">← My results</Link>
      <div className="card result-card">
        <h2 className="result-label">Result</h2>
        <h1 className="result-title">Your Exam Results</h1>
        <div className="result-score">
          <div className="result-num">{attempt.score} / {attempt.total}</div>
          <div className={`result-status ${passed ? "pass" : "fail"}`}>{passed ? "🎉 PASSED" : "NOT PASSED"}</div>
          {attempt.timed_out ? <span className="badge bad" style={{ marginTop: 8 }}>Incomplete · time limit exceeded</span> : null}
        </div>
        <div className="row" style={{ gap: 8, justifyContent: "center", margin: "12px 0" }}>
          <span className="badge">{pct}%</span>
          <span className="badge ok">{correct} correct</span>
          <span className="badge bad">{answers.length - correct - skipped} wrong</span>
          <span className="badge">{skipped} not answered</span>
        </div>
        <h3 className="result-label">{attempt.title}</h3>
        <p className="muted" style={{ margin: "0 0 14px" }}>Submitted {new Date(attempt.submitted_at).toLocaleString()}</p>
        {sections.length > 0 && (
          <>
            <h3 className="result-label">Section Breakdown</h3>
            {sections.map((sec, i) => (
              <div className="sec" key={sec.name}>
                <div className="sec-row"><span>{sec.name}</span><span className="muted">{sec.pct.toFixed(1)}%</span></div>
                <div className="sec-track"><div className="sec-fill" style={{ width: `${sec.pct}%`, background: COLORS[i % COLORS.length] }} /></div>
              </div>
            ))}
          </>
        )}
      </div>

      <h2 style={{ margin: "24px 0 12px" }}>Review</h2>
      {answers.map((a, i) => (
        <div className="card" key={i}>
          <div className="q-head">
            <span className="q-num">{i + 1}</span>
            <div className="q-text">{a.text}</div>
            <span className={`badge ${a.is_correct ? "ok" : a.selected ? "bad" : ""}`}>
              {a.is_correct ? "Correct" : a.selected ? "Wrong" : "Not answered"}
            </span>
          </div>
          {a.has_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="exam-img" src={`/img/q/${a.qid}`} alt={`Illustration for question ${i + 1}`} />
          ) : null}
          <div className="options">
            {["A", "B", "C", "D"].filter((o) => a[`option_${o.toLowerCase()}`]).map((o) => {
              const cls = o === a.correct_option ? "correct" : o === a.selected ? "wrong" : "";
              return (
                <div key={o} className={`option ${cls}`}>
                  <span className="letter">{o}</span>
                  {a[`option_${o.toLowerCase()}`]}
                  <span className="tag">
                    {o === a.correct_option ? (o === a.selected ? "Your answer ✓" : "Correct answer") : o === a.selected ? "Your answer" : ""}
                  </span>
                </div>
              );
            })}
          </div>
          {a.feedback && <div className="q-feedback"><strong>Feedback:</strong> {a.feedback}</div>}
        </div>
      ))}
    </>
  );
}
