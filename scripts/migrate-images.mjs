// One-off: moves images stored as blobs in the DB to freeimage.host and clears the blobs.
// Run: node --env-file=.env.local scripts/migrate-images.mjs
import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
});

async function upload(mime, data) {
  const body = new FormData();
  body.set("key", process.env.FREEIMAGE_KEY);
  body.set("action", "upload");
  body.set("format", "json");
  body.set("source", new File([data], "image", { type: mime }));
  const res = await fetch("https://freeimage.host/api/1/upload", { method: "POST", body });
  const json = await res.json().catch(() => null);
  if (!json?.image?.url) throw new Error(json?.error?.message || res.status);
  return json.image.url;
}

for (const [blobTable, idCol, table] of [["question_images", "question_id", "questions"], ["announcement_images", "announcement_id", "announcements"]]) {
  const [rows] = await conn.query(`SELECT ${idCol} AS id, mime, data FROM ${blobTable}`);
  let done = 0;
  for (const r of rows) {
    try {
      const url = await upload(r.mime, r.data);
      await conn.query(`UPDATE ${table} SET image_url = ?, has_image = 1 WHERE id = ?`, [url, r.id]);
      await conn.query(`DELETE FROM ${blobTable} WHERE ${idCol} = ?`, [r.id]);
      done++;
    } catch (e) {
      console.log(`${table} ${r.id}: failed — ${e.message}`);
    }
  }
  console.log(`${table}: moved ${done}/${rows.length}`);
}
await conn.end();
