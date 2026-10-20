import { query } from "./db";

// Section names offered when writing a question; admins can add and delete them.
export async function getSections() {
  const rows = await query("SELECT name FROM sections ORDER BY id");
  return rows.map((r) => r.name);
}
