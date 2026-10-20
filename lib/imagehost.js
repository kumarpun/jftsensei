// Uploads an image to freeimage.host and returns its public URL.
// Returns null when FREEIMAGE_KEY is not configured so callers can fall back to the DB.
export async function uploadImage(file) {
  const key = process.env.FREEIMAGE_KEY;
  if (!key) return null;
  const body = new FormData();
  body.set("key", key);
  body.set("action", "upload");
  body.set("format", "json");
  body.set("source", file);
  const res = await fetch("https://freeimage.host/api/1/upload", { method: "POST", body });
  const json = await res.json().catch(() => null);
  const url = json?.image?.url;
  if (!res.ok || !url) throw new Error(`Image upload failed: ${json?.error?.message || json?.status_txt || res.status}`);
  return url;
}
