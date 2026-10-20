"use client";

import { useActionState } from "react";
import { importScript } from "@/app/actions";
import CategoryField from "@/components/CategoryField";
import DurationFields from "@/components/DurationFields";

export default function ImportScript({ categories }) {
  const [state, formAction, pending] = useActionState(importScript, null);
  return (
    <form action={formAction} className="card stack">
      <h3>Generate from Google Apps Script</h3>
      <p className="muted" style={{ margin: 0 }}>
        Paste the same script you would run in Google Forms (with a <code>questionsData</code> list of
        <code> q</code>, <code>choices</code>, <code>correctIndex</code>). The script is read, not executed.
      </p>
      <CategoryField withPrice titleOptional categories={categories} />
      <textarea
        name="script"
        rows={8}
        required
        spellCheck={false}
        placeholder="function createQuiz() { var questionsData = [ ... ]; }"
        defaultValue={state?.script}
        style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}
      />
      <div className="row">
        <label className="grow" style={{ flex: "3 1 240px" }}>Set name<input name="title" required placeholder="e.g. Nursing Care JP – Mock Test 1" defaultValue={state?.title} /></label>
        <div style={{ flex: "1 1 240px" }}><div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Time limit</div><DurationFields /></div>
      </div>
      <label className="row" style={{ gap: 8 }}><input type="checkbox" name="publish" defaultChecked style={{ width: "auto" }} /> Publish immediately</label>
      {state?.error && <div className="error">{state.error}</div>}
      <div><button className="primary" disabled={pending}>{pending ? "Generating…" : "Generate question set"}</button></div>
    </form>
  );
}
