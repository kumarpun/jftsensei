import { query } from "@/lib/db";
import AnnouncementModal from "@/components/AnnouncementModal";
import { fmtDate } from "@/lib/dates";
import AnnouncementMenu from "@/components/AnnouncementMenu";
import { toggleAnnouncementVisible } from "@/app/actions";

export default async function AdminAnnouncements() {
  const items = await query("SELECT id, title, body, has_image, image_url, featured, created_at, visible FROM announcements ORDER BY featured DESC, id DESC");
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Announcements</h1>
          <p className="muted">Shown to customers (web and mobile app) until you hide it. Featured ones also show as a banner above free sets.</p>
        </div>
        <AnnouncementModal className="primary">+ Create announcement</AnnouncementModal>
      </div>
      <div className="card flush">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Announcement</th><th>Status</th><th>Posted</th><th /></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td data-label="Announcement">
                    <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
                      {a.has_image ? <img src={a.image_url || `/img/a/${a.id}`} alt="" width={48} height={48} style={{ objectFit: "cover", borderRadius: 8, flex: "none" }} /> : null}
                      <div>
                        <strong>{a.title}</strong>
                        {a.body && <div className="muted" style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.body}</div>}
                      </div>
                    </div>
                  </td>
                  <td data-label="Status">
                    <div className="row" style={{ gap: 10, flexWrap: "nowrap", alignItems: "center" }}>
                      <form action={toggleAnnouncementVisible} style={{ display: "flex" }}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className={`switch${a.visible ? " on" : ""}`} role="switch" aria-checked={!!a.visible} aria-label={a.visible ? "Hide from customers" : "Show to customers"} title={a.visible ? "Shown — click to hide" : "Hidden — click to show"}><span /></button>
                      </form>
                      <span className={a.visible ? "ann-state on" : "ann-state"}>{a.visible ? "Shown" : "Hidden"}</span>
                      {!!a.featured && <span className="badge">★ Banner</span>}
                    </div>
                  </td>
                  <td data-label="Posted">{fmtDate(a.created_at)}</td>
                  <td className="actions">
                    <div className="row" style={{ gap: 8, justifyContent: "flex-end", flexWrap: "nowrap" }}>
                      <AnnouncementModal a={a}>Edit</AnnouncementModal>
                      <AnnouncementMenu id={a.id} title={a.title} featured={!!a.featured} />
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td className="empty" colSpan={4}>No announcements yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
