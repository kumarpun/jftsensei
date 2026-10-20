"use client";

import { useEffect, useRef, useState } from "react";

const SECTION_SIZE = 12;

export default function TestForm({ action, testId, title, candidate, seconds, questions }) {
  const formRef = useRef(null);
  const timeUp = useRef(false);
  const [left, setLeft] = useState(seconds);
  const [answered, setAnswered] = useState({});
  const [cur, setCur] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);

  useEffect(() => {
    const end = Date.now() + seconds * 1000;
    const t = setInterval(() => {
      const remaining = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(t);
        timeUp.current = true;
        setTimedOut(true);
        setShowTimeUp(true);
      }
    }, 500);
    return () => clearInterval(t);
  }, [seconds]);

  const count = Object.keys(answered).length;
  const s = Math.max(0, left);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  const last = cur === questions.length - 1;
  // A section ends where the section name changes; sets without section names fall back to blocks of 12.
  const hasSections = questions.some((q) => q.section);
  const sectionEnd = (i) =>
    hasSections ? questions[i].section !== (questions[i + 1]?.section ?? null) : (i + 1) % SECTION_SIZE === 0;

  function onSubmit(e) {
    if (!timeUp.current && count < questions.length) {
      const ok = confirm(`You have ${questions.length - count} unanswered question(s). Submit anyway?`);
      if (!ok) return e.preventDefault();
    }
    setSubmitting(true);
  }

  return (
    <form ref={formRef} action={action} onSubmit={onSubmit} className="exam">
      <input type="hidden" name="test_id" value={testId} />
      <input type="hidden" name="timed_out" value={timedOut ? "1" : "0"} />

      <div className="exam-head">
        <div className="exam-top">
          <div className="exam-where">
            <div><b>Question:</b> {cur + 1}</div>
            {questions[cur].section && <div><b>Section:</b> {questions[cur].section}</div>}
          </div>
          <div className={`exam-clock ${s <= 60 ? "low" : ""}`}>
            <span className="exam-clock-icon" aria-hidden="true">◷</span>
            <div>
              <div>Time Remaining</div>
              <div className="exam-clock-time">{hh}:{mm}:{ss}</div>
            </div>
          </div>
          <button className="exam-finish-btn" disabled={submitting}>Finish Test</button>
        </div>
        <div className="exam-bar">
          <span className="exam-title"><b>Test:</b> {title}</span>
          <span className="exam-cand"><b>Candidate:</b> {candidate}</span>
        </div>
      </div>

      <div className="exam-body">
        <nav className="exam-nav" aria-label="Questions">
          {questions.map((q, i) => (
            <button
              type="button"
              key={q.id}
              className={`exam-num ${i === cur ? "current" : answered[q.id] ? "done" : ""}`}
              aria-current={i === cur ? "step" : undefined}
              onClick={() => setCur(i)}
            >
              {i + 1}
            </button>
          ))}
        </nav>

        <div className="exam-main">
          {questions.map((q, i) => (
            <div key={q.id} hidden={i !== cur}>
              <div className="exam-instruction">{q.text}</div>
              {q.has_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="exam-img" src={q.image_url || `/img/q/${q.id}`} alt={`Illustration for question ${i + 1}`} />
              ) : null}
              {q.video_id && (
                <div className="video">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${q.video_id}`}
                    title={`Listening audio for question ${i + 1}`}
                    allow="encrypted-media; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              )}
              <div className="exam-options">
                {["A", "B", "C", "D"].filter((o) => q[`option_${o.toLowerCase()}`]).map((o) => (
                  <label className="exam-option" key={o}>
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={o}
                      onChange={() => setAnswered((a) => ({ ...a, [q.id]: o }))}
                    />
                    <b>{o}.</b> {q[`option_${o.toLowerCase()}`]}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="exam-actions">
            <span className="muted">{count}/{questions.length} answered</span>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" disabled={cur === 0} onClick={() => setCur((c) => c - 1)}>← Previous</button>
              {!last && (
                <button type="button" className={`primary ${sectionEnd(cur) ? "section-btn" : ""}`} onClick={() => setCur((c) => c + 1)}>
                  {sectionEnd(cur) ? "Finish section": "Next →"}
                </button>
              )}
              {last && <button className="primary" disabled={submitting}>{submitting ? "Submitting…" : "Submit test"}</button>}
            </div>
          </div>
        </div>
      </div>

      {showTimeUp && (
        <div className="modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="timeup-title">
          <div className="modal">
            <div className="modal-icon">⏱</div>
            <h2 id="timeup-title">Time limit exceeded</h2>
            <p className="muted">
              You needed to complete the test within the time limit. Your attempt will be
              submitted as <strong>incomplete</strong>, and unanswered questions will be marked as not answered.
            </p>
            <button
              type="button"
              className="primary lg"
              disabled={submitting}
              onClick={() => formRef.current?.requestSubmit()}
            >
              {submitting ? "Submitting…" : "View result"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
