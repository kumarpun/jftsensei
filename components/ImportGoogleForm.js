"use client";

import { useActionState } from "react";
import { importGoogleForm } from "@/app/actions";
import CategoryField from "@/components/CategoryField";
import DurationFields from "@/components/DurationFields";

export default function ImportGoogleForm({ categories, defaultCategory = "" }) {
  const [state, formAction, pending] = useActionState(importGoogleForm, null);
  return (
    <form action={formAction} className="card stack">
      <h3>Import from a Google Form link</h3>
      <p className="muted" style={{ margin: 0 }}>
        Paste a public Google Form link. All its multiple-choice questions are copied into a new set.
        Google does not share a quiz&rsquo;s correct answers, so add an answer key below (otherwise every answer defaults to A) and check them on the set page.
      </p>
      <CategoryField withPrice titleOptional key={`gf-${defaultCategory}`} categories={categories} defaultValue={defaultCategory} />
      <label>Google Form link<input name="form_url" type="url" required placeholder="https://docs.google.com/forms/d/e/.../viewform" defaultValue={state?.form_url} /></label>
      <div className="row">
        <label className="grow" style={{ flex: "3 1 240px" }}>Set name<input name="title" required placeholder="e.g. Set 01" defaultValue={state?.title} /></label>
        <div style={{ flex: "1 1 240px" }}><div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Time limit</div><DurationFields /></div>
      </div>
      <label>Answer key (optional)
        <input name="answer_key" placeholder="e.g. A C B D B A … (one letter per question, in order)" defaultValue={state?.answer_key} />
      </label>
      <label className="row" style={{ gap: 8 }}><input type="checkbox" name="publish" style={{ width: "auto" }} /> Publish immediately (leave off until answers are checked)</label>
      {state?.error && <div className="error">{state.error}</div>}
      <div><button className="primary" disabled={pending}>{pending ? "Importing…" : "Import questions"}</button></div>
    </form>
  );
}
