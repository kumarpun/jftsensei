import { query } from "@/lib/db";

// Opening-date notices (title + date). The table is created on first use so no migration step is required.
let ready;
export const ensureOpenings = () =>
  (ready ??= query(
    "CREATE TABLE IF NOT EXISTS opening_dates (id INT AUTO_INCREMENT PRIMARY KEY, label VARCHAR(100) NOT NULL, open_date DATE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
  )
    // Optional exact moment (ISO UTC) for entries that also have a time; older tables get the column here.
    .then(() => query("ALTER TABLE opening_dates ADD COLUMN open_at VARCHAR(30) NULL").catch((e) => { if (!/duplicate column/i.test(String(e?.message))) throw e; }))
    .catch((e) => {
      ready = null;
      throw e;
    }));

// All notices, soonest first. `date` is "YYYY-MM-DD"; `at` is an ISO UTC moment when a time was set, else null (the day starts at local midnight).
export async function allOpenings() {
  await ensureOpenings();
  return query("SELECT id, label, DATE_FORMAT(open_date, '%Y-%m-%d') AS date, open_at AS at FROM opening_dates ORDER BY open_date, id");
}

// Notices customers should still see: today's date and later (the client hides one once its day starts).
export async function upcomingOpenings() {
  await ensureOpenings();
  return query("SELECT id, label, DATE_FORMAT(open_date, '%Y-%m-%d') AS date, open_at AS at FROM opening_dates WHERE open_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) ORDER BY open_date, id");
}
