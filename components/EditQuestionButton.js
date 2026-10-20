"use client";

import { useEffect, useState, useTransition } from "react";
import { updateQuestion } from "@/app/actions";
import QuestionFields from "@/components/QuestionFields";

// Edits a question in a popup so the page keeps its scroll position and the admin stays on the same question.
export default function EditQuestionButton({ q, testId, number, sections }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    // Lock page scroll behind the popup; restore on close/unmount.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function save(formData) {
    start(async () => {
      await updateQuestion(formData);
      setOpen(false);
    });
  }

  return (
    <>
      <button type="button" className="sm" onClick={() => setOpen(true)}>Edit</button>
      {open && (
        <div className="modal-backdrop edit-backdrop" role="dialog" aria-modal="true" aria-labelledby={`eq-${q.id}`} onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <form action={save} className="edit-modal stack">
            <h3 id={`eq-${q.id}`}>Edit question {number}</h3>
            <input type="hidden" name="id" value={q.id} />
            <input type="hidden" name="test_id" value={testId} />
            <QuestionFields q={q} sections={sections} />
            <div className="row">
              <button className="primary" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
              <button type="button" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
