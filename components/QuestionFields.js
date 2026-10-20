"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { JFT_SECTIONS } from "@/lib/sections";
import { deleteSection } from "@/app/actions";

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

// Options + correct answer with undo/redo history. Consecutive typing in one field is a single undo step.
function optReducer(st, a) {
  const snap = { opts: st.opts, correct: st.correct };
  const push = (next, last = null) => ({ ...next, past: [...st.past, snap].slice(-100), future: [], last });
  switch (a.type) {
    case "type": {
      const next = { opts: st.opts.map((x, j) => (j === a.i ? a.v : x)), correct: st.correct };
      return st.last === a.i ? { ...st, ...next, future: [] } : push(next, a.i);
    }
    case "set": return push({ opts: a.opts, correct: a.correct });
    case "undo": {
      if (!st.past.length) return st;
      const prev = st.past[st.past.length - 1];
      return { ...prev, past: st.past.slice(0, -1), future: [snap, ...st.future], last: null };
    }
    case "redo": {
      if (!st.future.length) return st;
      const [nx, ...rest] = st.future;
      return { ...nx, past: [...st.past, snap], future: rest, last: null };
    }
    case "reset": return { opts: ["", ""], correct: 0, past: [], future: [], last: null };
    default: return st;
  }
}

// Google-Form style: tick the radio beside an option to mark it correct; feedback is shown to students in their result review.
export default function QuestionFields({ q, sections = [] }) {
  const [section, setSection] = useState(q?.section ?? "");
  const [sections_, setSections] = useState(sections);
  useEffect(() => setSections(sections), [sections]);
  const initial = () => {
    const o = OPTS.map((k) => q?.[`option_${k.toLowerCase()}`] ?? "").filter(Boolean);
    while (o.length < 2) o.push("");
    return o;
  };
  const [{ opts, correct, past, future }, dispatch] = useReducer(optReducer, null, () => {
    const letters = OPTS.filter((k) => q?.[`option_${k.toLowerCase()}`]);
    return { opts: initial(), correct: Math.max(0, letters.indexOf(q?.correct_option ?? "A")), past: [], future: [], last: null };
  });
  const anchor = useRef(null);
  const [newImg, setNewImg] = useState(null);
  useEffect(() => () => newImg && URL.revokeObjectURL(newImg), [newImg]);
  // React resets the add form after a successful submit; mirror that for the controlled option state.
  useEffect(() => {
    const form = anchor.current?.closest("form");
    const reset = () => { dispatch({ type: "reset" }); setNewImg(null); setSection(""); setFb({ incorrect: "", correct: "" }); };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);
  const setOpt = (i, v) => dispatch({ type: "type", i, v });
  const removeOpt = (i) =>
    dispatch({ type: "set", opts: opts.filter((_, j) => j !== i), correct: correct === i ? 0 : correct > i ? correct - 1 : correct });
  const [removeImage, setRemoveImage] = useState(false);
  const [fb, setFb] = useState({ incorrect: q?.feedback ?? "", correct: q?.feedback_correct ?? "" });
  const [fbOpen, setFbOpen] = useState(false);
  const [fbTab, setFbTab] = useState("incorrect");
  const [draft, setDraft] = useState(fb);
  return (
    <>
      <span ref={anchor} hidden />
      <div className="stack" style={{ gap: 8 }}>
        <label>Section
          <select name="section" value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">— No section —</option>
            {sections_.map((s) => <option key={s} value={s}>{JFT_SECTIONS.find((j) => j.value === s)?.label ?? s}</option>)}
            {section && section !== "__new__" && !sections_.includes(section) && <option value={section}>{section}</option>}
            <option value="__new__">+ Add new section…</option>
          </select>
        </label>
        {section === "__new__" && (
          <input name="section_new" required maxLength={100} placeholder="New section name, e.g. Grammar" autoFocus />
        )}
        {sections_.includes(section) && (
          <div>
            <button
              type="button"
              className="sm danger"
              onClick={async () => {
                if (!confirm(`Delete section "${section}" from the list? Questions already using it keep their section name.`)) return;
                await deleteSection(section);
                setSections((l) => l.filter((x) => x !== section));
                setSection("");
              }}
            >
              Delete this section
            </button>
          </div>
        )}
      </div>
      <label>Question<textarea name="text" rows={2} required defaultValue={q?.text} /></label>
      <div className="two-col">
      <label>YouTube link (optional, for listening)
        <input name="video" placeholder="https://www.youtube.com/watch?v=..." defaultValue={q?.video_id ? `https://youtu.be/${q.video_id}` : ""} />
      </label>
      <label>Image (optional, PNG/JPG/WebP/GIF, max 4 MB)
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setNewImg(f ? URL.createObjectURL(f) : null);
          }}
        />
      </label>
      </div>
      {newImg && (
        <div className="row" style={{ gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={newImg} alt="New question" style={{ maxHeight: 90, borderRadius: 8 }} />
          <span className="muted">New image — replaces the current one when you save.</span>
        </div>
      )}
      {q?.has_image && !newImg ? (
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

      <div
        className="stack"
        style={{ gap: 8 }}
        onKeyDown={(e) => {
          if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
          const k = e.key.toLowerCase();
          if (k === "z" && !e.shiftKey) { e.preventDefault(); dispatch({ type: "undo" }); }
          else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); dispatch({ type: "redo" }); }
        }}
      >
        <div className="row between">
          <div className="opt-head">
            <strong>Options — select the correct answer</strong>
            <span className="undo-redo">
              <button type="button" className="icon-btn" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!past.length} onClick={() => dispatch({ type: "undo" })}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg></button>
              <button type="button" className="icon-btn" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!future.length} onClick={() => dispatch({ type: "redo" })}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg></button>
            </span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <input name="marks" type="number" min="1" defaultValue={q?.marks ?? 1} aria-label="Points" style={{ width: 70 }} />
            <span className="muted">points</span>
          </div>
        </div>
        {opts.map((text, i) => {
          const o = OPTS[i];
          return (
            <div key={i} className={`opt-row ${correct === i ? "correct" : ""}`}>
              <input
                type="radio"
                name="correct"
                value={o}
                checked={correct === i}
                onChange={() => dispatch({ type: "set", opts, correct: i })}
                aria-label={`Option ${o} is correct`}
                style={{ width: "auto" }}
              />
              <input
                name={`option_${o}`}
                required
                placeholder={`Option ${o}`}
                value={text}
                onChange={(e) => setOpt(i, e.target.value)}
                onPaste={(e) => {
                  const parts = splitOptions(e.clipboardData.getData("text"));
                  if (parts.length < 2) return;
                  e.preventDefault();
                  const next = [...opts];
                  let nc = correct;
                  parts.slice(0, OPTS.length - i).forEach((p, n) => {
                    next[i + n] = p.text;
                    if (p.ticked) nc = i + n;
                  });
                  dispatch({ type: "set", opts: next, correct: nc });
                }}
              />
              {correct === i && <span className="opt-check" aria-hidden="true">✓</span>}
              {opts.length > 2 && (
                <button type="button" className="opt-del" aria-label={`Delete option ${o}`} onClick={() => removeOpt(i)}>×</button>
              )}
            </div>
          );
        })}
        {opts.length < OPTS.length && (
          <div><button type="button" className="link-btn" onClick={() => dispatch({ type: "set", opts: [...opts, ""], correct })}>+ Add option</button></div>
        )}
      </div>

      <input type="hidden" name="feedback" value={fb.incorrect} />
      <input type="hidden" name="feedback_correct" value={fb.correct} />
      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="link-btn" onClick={() => { setDraft(fb); setFbTab("incorrect"); setFbOpen(true); }}>
          📋 {fb.incorrect || fb.correct ? "Edit answer feedback" : "Add answer feedback"}
        </button>
        {(fb.incorrect || fb.correct) && <span className="muted">{[fb.correct && "correct", fb.incorrect && "incorrect"].filter(Boolean).join(" + ")}</span>}
      </div>

      {fbOpen && (
        <div
          className="modal-backdrop fb-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Add feedback"
          onMouseDown={(e) => e.target === e.currentTarget && setFbOpen(false)}
          onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setFbOpen(false); } }}
        >
          <div className="fb-dialog">
            <h3>Add feedback</h3>
            <div className="fb-tabs" role="tablist">
              {[["incorrect", "Incorrect answers"], ["correct", "Correct answers"]].map(([k, label]) => (
                <button type="button" role="tab" aria-selected={fbTab === k} key={k} className={fbTab === k ? "active" : ""} onClick={() => setFbTab(k)}>{label}</button>
              ))}
            </div>
            <textarea
              key={fbTab}
              autoFocus
              rows={3}
              maxLength={2000}
              placeholder="Enter feedback"
              value={draft[fbTab]}
              onChange={(e) => setDraft((d) => ({ ...d, [fbTab]: e.target.value }))}
            />
            <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setFbOpen(false)}>Cancel</button>
              <button type="button" className="primary" onClick={() => { setFb(draft); setFbOpen(false); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
