import { fmtDate } from "@/lib/dates";

export default function AnnouncementCard({ a, children }) {
  return (
    <div className="card stack" style={{ padding: 0, overflow: "hidden", maxWidth: 520 }}>
      {a.has_image ? <img src={a.image_url || `/img/a/${a.id}`} alt="" style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block" }} /> : null}
      <div className="stack" style={{ padding: 16 }}>
        <div className="row between"><h3 style={{ margin: 0 }}>{a.title}</h3>{a.secs_left <= 0 && <span className="muted">Expired</span>}</div>
        {a.body && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{a.body}</p>}
        <span className="muted">{fmtDate(a.created_at)}</span>
        {children}
      </div>
    </div>
  );
}
