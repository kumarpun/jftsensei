"use client";

import { useActionState } from "react";
import { addScriptQuestions, addGoogleFormQuestions } from "@/app/actions";

// Adds questions to an existing set from a pasted Apps Script (kind="script") or a public Google Form (kind="form").
export default function AddQuestionsImport({ testId, kind }) {
  const isScript = kind === "script";
  const [state, formAction, pending] = useActionState(isScript ? addScriptQuestions : addGoogleFormQuestions, null);
  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="test_id" value={testId} />
      {isScript ? (
        <>
          <p className="muted" style={{ margin: 0 }}>
            Paste the Google Apps Script quiz (with a <code>questionsData</code> list of <code>q</code>, <code>choices</code>, <code>correctIndex</code>). It is read, not executed. Questions are added to this set.
          </p>
          <textarea name="script" rows={8} required spellCheck={false} placeholder="function createQuiz() { var questionsData = [ ... ]; }" defaultValue={state?.script} style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }} />
        </>
      ) : (
        <>
          <p className="muted" style={{ margin: 0 }}>
            Paste a public Google Form link. Its multiple-choice questions are added to this set. Google does not share correct answers, so add an answer key (otherwise every answer defaults to A).
          </p>
          <label>Google Form link<input name="form_url" type="url" required placeholder="https://docs.google.com/forms/d/e/.../viewform" defaultValue={state?.form_url} /></label>
          <label>Answer key (optional)<input name="answer_key" placeholder="e.g. A C B D B A … (one letter per question, in order)" defaultValue={state?.answer_key} /></label>
        </>
      )}
      {state?.error && <div className="error">{state.error}</div>}
      {state?.ok && <div className="muted" role="status">{state.message}</div>}
      <div><button className="primary" disabled={pending}>{pending ? "Adding…" : isScript ? "Generate questions" : "Import questions"}</button></div>
    </form>
  );
}
