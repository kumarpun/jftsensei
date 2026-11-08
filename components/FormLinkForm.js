"use client";

import { useState } from "react";
import CategoryField from "@/components/CategoryField";
import DurationFields from "@/components/DurationFields";
import SubmitButton from "@/components/SubmitButton";
import { createForm } from "@/app/actions";

export default function FormLinkForm({ categories, defaultCategory = "" }) {
  const [paid, setPaid] = useState(false);
  return (
    <form action={createForm} className="card stack">
      <h3>Add a Google Form link</h3>
      <CategoryField categories={categories} defaultValue={defaultCategory} />
      <label>Set title<input name="title" required maxLength={200} placeholder="e.g. Feedback form" /></label>
      <div><div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Time limit (optional)</div><DurationFields optional seconds={0} /></div>
      <label>Description (optional)<textarea name="description" rows={2} /></label>
      <label>Google Form link<input name="url" type="url" required maxLength={500} placeholder="https://docs.google.com/forms/d/…" /></label>
      <div className="row" style={{ gap: 16 }}>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="radio" name="access" value="free" checked={!paid} onChange={() => setPaid(false)} style={{ width: "auto" }} /> Free (shown in Free Sets)</label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="radio" name="access" value="paid" checked={paid} onChange={() => setPaid(true)} style={{ width: "auto" }} /> Paid (sold as a package)</label>
      </div>
      {paid && (
        <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
          <label style={{ width: 80 }}>Days<input name="days" type="number" min="1" defaultValue={5} required /></label>
          <label style={{ width: 120 }}>Original price<input name="original_price" type="number" min="0" step="0.01" /></label>
          <label style={{ width: 120 }}>Price<input name="price" type="number" min="0" step="0.01" required /></label>
        </div>
      )}
      <div><SubmitButton className="primary" pendingText="Adding…">Add form</SubmitButton></div>
    </form>
  );
}
