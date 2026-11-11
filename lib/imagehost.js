// Uploads an image to freeimage.host and returns its public URL.
// Returns null when FREEIMAGE_KEY is not configured or the host rejects/fails the upload, so callers fall back to the DB.
export async function uploadImage(file) {
  const key = process.env.FREEIMAGE_KEY;
  if (!key) return null;
  try {
    const body = new FormData();
    body.set("key", key);
    body.set("action", "upload");
    body.set("format", "json");
    body.set("source", file);
    const res = await fetch("https://freeimage.host/api/1/upload", { method: "POST", body });
    const json = await res.json().catch(() => null);
    const url = json?.image?.url;
    if (!res.ok || !url) throw new Error(json?.error?.message || json?.status_txt || res.status);
    return url;
  } catch (e) {
    console.warn(`[imagehost] upload failed, storing in DB instead: ${e.message}`);
    return null;
  }
}
