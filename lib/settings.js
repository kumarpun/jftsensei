import { query, queryOne } from "@/lib/db";

// Tiny key/value store for app-wide admin switches. The table is created on first use so no migration step is required.
let ready;
const ensure = () =>
  (ready ??= query("CREATE TABLE IF NOT EXISTS app_settings (name VARCHAR(50) PRIMARY KEY, value VARCHAR(255) NOT NULL)").catch((e) => {
    ready = null;
    throw e;
  }));

export async function getSetting(name, fallback) {
  await ensure();
  const row = await queryOne("SELECT value FROM app_settings WHERE name = ?", [name]);
  return row ? row.value : fallback;
}

export async function setSetting(name, value) {
  await ensure();
  await query("INSERT INTO app_settings (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [name, String(value)]);
}

// Screenshots / screen recording on the mobile app are blocked unless an admin explicitly allows them.
export const screenshotsBlocked = async () => (await getSetting("screenshots_blocked", "1")) !== "0";

// "Opening date" notice: a label plus a moment (stored as an ISO UTC string). Shown to customers as a countdown until the moment passes.
export async function openingDate() {
  const label = await getSetting("opening_label", "");
  const at = await getSetting("opening_at", "");
  const ms = Date.parse(at);
  if (!label || Number.isNaN(ms)) return null;
  const secondsLeft = Math.round((ms - Date.now()) / 1000);
  if (secondsLeft <= 0) return null;
  return { label, at: new Date(ms).toISOString(), secondsLeft };
}
