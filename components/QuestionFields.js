"use client";

import { useState } from "react";
import { JFT_SECTIONS } from "@/lib/sections";

const OPTS = ["A", "B", "C", "D"];

// Pasting several lines (e.g. "A. x / B. y ✓ / C. z") fills consecutive option fields; a ✓ marks the correct one.
function splitOptions(text) {
  let lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) lines = text.split(/\s(?=[A-DＡ-Ｄ][.．)）]\s*)/).map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => {
    const ticked = /[✓✔]\s*$/.test(l);
    return { text: l.replace(/[✓✔]\s*$/, "").replace(/^[A-DＡ-Ｄ][.．)）]\s*/, "").trim(), ticked };
  });
}

// Google-Form style: tick the radio beside an option to mark it correct; feedback is shown to students in their result review.
export default function QuestionFields({ q }) {
  const [correct, setCorrect] = useState(q?.correct_option ?? "A");
  const [removeImage, setRemoveImage] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(Boolean(q?.feedback));
  return (
    <>
      <label>Section (JFT exam)
        <select name="section" defaultValue={q?.section ?? ""}>
          <option value="">— No section —</option>
          {JFT_SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          {q?.section && !JFT_SECTIONS.some((s) => s.value === q.section) && <option value={q.section}>{q.section}</option>}
        </select>
      </label>
      <label>Question<textarea name="text" rows={2} required defaultValue={q?.text} /></label>
      <div className="two-col">
      <label>YouTube link (optional, for listening)
        <input name="video" placeholder="https://www.youtube.com/watch?v=..." defaultValue={q?.video_id ? `https://youtu.be/${q.video_id}` : ""} />
      </label>
      <label>Image (optional, PNG/JPG/WebP/GIF, max 4 MB)
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
      </label>
      </div>
      {q?.has_image ? (
        <div className="row" style={{ gap: 12 }}>
          {removeImage ? (
            <span className="muted">Image will be removed when you save.</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/img/q/${q.id}`} alt="Current question" style={{ maxHeight: 90, borderRadius: 8 }} />
          )}
          {removeImage && <input type="hidden" name="remove_image" value="1" />}
          <button type="button" className={`sm ${removeImage ? "" : "danger"}`} onClick={() => setRemoveImage((v) => !v)}>
            {removeImage ? "Undo" : "Remove image"}
          </button>
        </div>
      ) : null}

      <div className="stack" style={{ gap: 8 }}>
        <div className="row between">
          <strong>Options — select the correct answer</strong>
          <div className="row" style={{ gap: 8 }}>
            <input name="marks" type="number" min="1" defaultValue={q?.marks ?? 1} aria-label="Points" style={{ width: 70 }} />
            <span className="muted">points</span>
          </div>
        </div>
        {OPTS.map((o) => (
          <div key={o} className={`opt-row ${correct === o ? "correct" : ""}`}>
            <input
              type="radio"
              name="correct"
              value={o}
              checked={correct === o}
              onChange={() => setCorrect(o)}
              aria-label={`Option ${o} is correct`}
              style={{ width: "auto" }}
            />
            <input
              name={`option_${o}`}
              required={o === "A" || o === "B"}
              placeholder={`Option ${o}${o === "A" || o === "B" ? "" : " (optional)"}`}
              defaultValue={q?.[`option_${o.toLowerCase()}`]}
              onPaste={(e) => {
                const parts = splitOptions(e.clipboardData.getData("text"));
                if (parts.length < 2) return;
                e.preventDefault();
                const form = e.currentTarget.form;
                parts.slice(0, OPTS.length - OPTS.indexOf(o)).forEach((p, i) => {
                  const k = OPTS[OPTS.indexOf(o) + i];
                  form.elements[`option_${k}`].value = p.text;
                  if (p.ticked) setCorrect(k);
                });
              }}
            />
            {correct === o && <span className="opt-check" aria-hidden="true">✓</span>}
          </div>
        ))}
      </div>

      {feedbackOpen ? (
        <label>Answer feedback (shown to students when they review their result)
          <textarea name="feedback" rows={2} defaultValue={q?.feedback ?? ""} placeholder="e.g. 始めて = to begin. Use the te-form + みようと思います." />
        </label>
      ) : (
        <div><button type="button" className="link-btn" onClick={() => setFeedbackOpen(true)}>📋 Add answer feedback</button></div>
      )}
    </>
  );
}
