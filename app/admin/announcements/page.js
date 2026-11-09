import { query } from "@/lib/db";
import AnnouncementModal from "@/components/AnnouncementModal";
import { fmtDate } from "@/lib/dates";
import { deleteAnnouncement, toggleFeatured } from "@/app/actions";

export default async function AdminAnnouncements() {
  const items = await query("SELECT id, title, body, has_image, image_url, featured, created_at, TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS secs_left FROM announcements ORDER BY featured DESC, id DESC");
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Announcements</h1>
          <p className="muted">Posted like a status: customers see it for 24 hours, then it expires. Featured ones show as a banner above free sets until unfeatured.</p>
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
                    {a.featured ? <span className="badge ok">Featured</span> : Number(a.secs_left) > 0 ? <span className="badge">Active</span> : <span className="badge bad">Expired</span>}
                  </td>
                  <td data-label="Posted">{fmtDate(a.created_at)}</td>
                  <td className="actions">
                    <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                      <AnnouncementModal a={a}>Edit</AnnouncementModal>
                      <form action={toggleFeatured}><input type="hidden" name="id" value={a.id} /><button className="sm">{a.featured ? "Unfeature" : "Feature"}</button></form>
                      <form action={deleteAnnouncement}><input type="hidden" name="id" value={a.id} /><button className="sm">Delete</button></form>
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
