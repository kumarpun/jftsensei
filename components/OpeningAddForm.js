"use client";

import { useRef, useState } from "react";
import { addOpeningDate } from "@/app/actions";

// Title + date are required; time is optional. With a time, the form sends an absolute ISO moment (admin's local time zone).
export default function OpeningAddForm() {
  const ref = useRef(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const at = date && time ? new Date(`${date}T${time}`).toISOString() : "";
  return (
    <form ref={ref} action={async (fd) => { await addOpeningDate(fd); ref.current?.reset(); setDate(""); setTime(""); }} className="stack">
      <label>Title<input name="label" required maxLength={100} placeholder="e.g. JFT-Basic Form Opening Date" /></label>
      <label>Date<input name="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label>Time <span className="muted">(optional)</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      <input type="hidden" name="at" value={at} />
      <div><button className="btn primary">Add</button></div>
    </form>
  );
}
