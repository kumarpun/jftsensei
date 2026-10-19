import { query } from "@/lib/db";
import AnnouncementCard from "@/components/AnnouncementCard";
import Link from "next/link";
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/app/actions";

export default async function AdminAnnouncements({ searchParams }) {
  const { edit } = await searchParams;
  const items = await query("SELECT id, title, body, has_image, created_at, TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS secs_left FROM announcements ORDER BY id DESC");
  const editing = items.find((a) => a.id === Number(edit));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Announcements</h1>
          <p className="muted">Posted like a status: customers see it under &ldquo;New announcement&rdquo; for 24 hours, then it expires.</p>
        </div>
      </div>
      {editing ? (
        <form action={updateAnnouncement} className="card stack" encType="multipart/form-data">
          <h3>Edit announcement</h3>
          <input type="hidden" name="id" value={editing.id} />
          <label>Title<input name="title" required maxLength={200} defaultValue={editing.title} /></label>
          <label>Message<textarea name="body" rows={4} defaultValue={editing.body} /></label>
          {editing.has_image ? <img src={`/img/a/${editing.id}`} alt="" style={{ maxWidth: 240, borderRadius: 8 }} /> : null}
          <label>{editing.has_image ? "Replace image" : "Image"} (optional, max 4 MB)<input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /></label>
          {editing.has_image ? <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" name="remove_image" style={{ width: "auto" }} /> Remove current image</label> : null}
          <div className="row"><button className="primary">Save</button><Link href="/admin/announcements" className="btn">Cancel</Link></div>
        </form>
      ) : (
      <form action={createAnnouncement} className="card stack" encType="multipart/form-data">
          <h3>Post an announcement</h3>
          <label>Title<input name="title" required maxLength={200} /></label>
          <label>Message<textarea name="body" rows={4} /></label>
          <label>Image (optional, max 4 MB)<input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /></label>
          <div><button className="primary">Post</button></div>
        </form>
      )}

      <div className="stack">
        {items.map((a) => (
          <AnnouncementCard key={a.id} a={a}>
            <div className="row"><Link href={`/admin/announcements?edit=${a.id}`} className="btn sm">Edit</Link><form action={deleteAnnouncement}><input type="hidden" name="id" value={a.id} /><button className="sm">Delete</button></form></div>
          </AnnouncementCard>
        ))}
        {items.length === 0 && <div className="card empty">No announcements yet.</div>}
      </div>
    </>
  );
}
