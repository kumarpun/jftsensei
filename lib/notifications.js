import { query, queryOne } from "@/lib/db";

// In-app inbox. audience 'admin' = every admin sees it (user_id NULL); audience 'user' = only that customer.
// Table is created on first use, like lib/settings.js.
let ready;
const ensure = () =>
  (ready ??= query(
    `CREATE TABLE IF NOT EXISTS notifications (
       id INT AUTO_INCREMENT PRIMARY KEY,
       audience VARCHAR(10) NOT NULL,
       user_id INT NULL,
       kind VARCHAR(30) NOT NULL,
       title VARCHAR(200) NOT NULL,
       body VARCHAR(500) NOT NULL DEFAULT '',
       purchase_id INT NULL,
       is_read TINYINT(1) NOT NULL DEFAULT 0,
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       INDEX idx_aud (audience, user_id, is_read, id)
     )`
  ).catch((e) => {
    ready = null;
    throw e;
  }));

export async function notify({ audience, userId = null, kind, title, body = "", purchaseId = null }) {
  await ensure();
  await query("INSERT INTO notifications (audience, user_id, kind, title, body, purchase_id) VALUES (?, ?, ?, ?, ?, ?)", [
    audience, userId, kind, String(title).slice(0, 200), String(body).slice(0, 500), purchaseId,
  ]);
}

const where = (audience, userId) => (audience === "admin" ? ["audience = 'admin'", []] : ["audience = 'user' AND user_id = ?", [userId]]);

export async function listNotifications(audience, userId, limit = 50) {
  await ensure();
  const [w, p] = where(audience, userId);
  return query(`SELECT id, kind, title, body, purchase_id, is_read, created_at FROM notifications WHERE ${w} ORDER BY id DESC LIMIT ${Number(limit)}`, p);
}

export async function unreadCount(audience, userId) {
  await ensure();
  const [w, p] = where(audience, userId);
  const r = await queryOne(`SELECT COUNT(*) AS n FROM notifications WHERE ${w} AND is_read = 0`, p);
  return Number(r?.n || 0);
}

export async function markAllRead(audience, userId) {
  await ensure();
  const [w, p] = where(audience, userId);
  await query(`UPDATE notifications SET is_read = 1 WHERE ${w} AND is_read = 0`, p);
}

// Was an admin notification of this kind for this purchase created in the last [minutes]? (resend rate limit)
export async function recentAdminNotice(purchaseId, kind, minutes) {
  await ensure();
  const r = await queryOne(
    "SELECT COUNT(*) AS n FROM notifications WHERE audience = 'admin' AND kind = ? AND purchase_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)",
    [kind, purchaseId, minutes]
  );
  return Number(r?.n || 0) > 0;
}
