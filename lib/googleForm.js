// Reads a public Google Form's questions from its page (FB_PUBLIC_LOAD_DATA_).
// Google never exposes a quiz's answer key to the public page, so only text + choices come back.

export function toViewUrl(url) {
  return url.replace(/\/(formResponse|edit)(?=[?#]|$)/, "/viewform");
}

export async function fetchGoogleForm(url) {
  let html;
  try {
    const res = await fetch(toViewUrl(url), { headers: { "Accept-Language": "en", "User-Agent": "Mozilla/5.0" }, redirect: "follow", cache: "no-store" });
    if (!res.ok) return { error: `Could not open the form (HTTP ${res.status}). Make sure it is public and the link is correct.` };
    html = await res.text();
  } catch {
    return { error: "Could not reach Google Forms. Try again." };
  }
  const m = /FB_PUBLIC_LOAD_DATA_ = (.*?);<\/script>/s.exec(html);
  if (!m) return { error: "Could not read this form. It may require sign-in." };
  let data;
  try { data = JSON.parse(m[1]); } catch { return { error: "Could not parse the form." }; }
  const info = data?.[1];
  const items = [];
  let section = null;
  for (const it of info?.[1] || []) {
    const type = it[3];
    if (type === 8) { const t = String(it[1] || "").trim(); section = t && t !== "Untitled section" ? t.slice(0, 100) : null; continue; }
    if (type !== 2 && type !== 3) continue; // multiple choice / dropdown only
    const entry = it[4]?.[0];
    const choices = (entry?.[1] || []).map((c) => String(c[0] ?? "").trim()).filter(Boolean).slice(0, 4);
    const text = String(it[1] || "").trim();
    if (!text || choices.length < 2) continue;
    items.push({ text, choices, section });
  }
  if (items.length === 0) return { error: "No multiple-choice questions found in this form." };
  return { title: String(data[3] || "").trim(), description: String(info?.[0] || "").trim().slice(0, 1000), items };
}
