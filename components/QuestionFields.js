import { JFT_SECTIONS } from "@/lib/sections";

const OPTS = ["A", "B", "C", "D"];

export default function QuestionFields({ q }) {
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
      <div className="grid cols-2">
        {OPTS.map((o) => (
          <label key={o}>
            Option {o}{o === "A" || o === "B" ? "" : " (optional)"}
            <input name={`option_${o}`} required={o === "A" || o === "B"} defaultValue={q?.[`option_${o.toLowerCase()}`]} />
          </label>
        ))}
      </div>
      <label>YouTube link (optional, for listening)
        <input name="video" placeholder="https://www.youtube.com/watch?v=..." defaultValue={q?.video_id ? `https://youtu.be/${q.video_id}` : ""} />
      </label>
      <label>Image (optional, PNG/JPG/WebP/GIF, max 4 MB)
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
      </label>
      {q?.has_image ? (
        <div className="row" style={{ gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/img/q/${q.id}`} alt="Current question" style={{ maxHeight: 90, borderRadius: 8 }} />
          <label className="row" style={{ gap: 6 }}><input type="checkbox" name="remove_image" style={{ width: "auto" }} /> Remove image</label>
        </div>
      ) : null}
      <div className="row">
        <label style={{ width: 160 }}>Correct answer
          <select name="correct" defaultValue={q?.correct_option ?? "A"}>
            {OPTS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label style={{ width: 100 }}>Marks<input name="marks" type="number" min="1" defaultValue={q?.marks ?? 1} /></label>
      </div>
    </>
  );
}
