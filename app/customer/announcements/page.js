import { query } from "@/lib/db";
import AnnouncementCard from "@/components/AnnouncementCard";
import CustomerTabs from "@/components/CustomerTabs";

export default async function CustomerAnnouncements() {
  const items = await query("SELECT id, title, body, has_image, created_at, TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS secs_left FROM announcements WHERE expires_at > NOW() ORDER BY id DESC LIMIT 50");
  return (
    <>
      <div className="page-head">
        <div>
          <h1>New announcement</h1>
          <p className="muted">Status updates from the team — each stays up for 24 hours.</p>
        </div>
      </div>
      <CustomerTabs active="/customer/announcements" />
      <div className="stack">
        {items.map((a) => <AnnouncementCard key={a.id} a={a} />)}
        {items.length === 0 && <div className="card empty">No active announcements.</div>}
      </div>
    </>
  );
}
