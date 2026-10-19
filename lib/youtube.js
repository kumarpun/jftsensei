// Accepts a YouTube URL (watch, youtu.be, embed, shorts) or a bare 11-char id; returns the id or "".
export function parseYouTubeId(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : "";
}
