// Parses a Google Apps Script quiz generator (the `questionsData = [{ q, choices, correctIndex }]` style)
// WITHOUT executing it: a small literal parser handles objects, arrays, strings, numbers and comments.

class Reader {
  constructor(src, i) { this.s = src; this.i = i; }
  ws() {
    for (;;) {
      const s = this.s;
      while (this.i < s.length && /\s/.test(s[this.i])) this.i++;
      if (s.startsWith("//", this.i)) { while (this.i < s.length && s[this.i] !== "\n") this.i++; }
      else if (s.startsWith("/*", this.i)) { const e = s.indexOf("*/", this.i + 2); this.i = e < 0 ? s.length : e + 2; }
      else return;
    }
  }
  fail(msg) { throw new Error(msg); }
  value() {
    this.ws();
    const c = this.s[this.i];
    if (c === "[") return this.array();
    if (c === "{") return this.object();
    if (c === '"' || c === "'" || c === "`") return this.string() + this.concat();
    const m = /^-?\d+(\.\d+)?/.exec(this.s.slice(this.i, this.i + 24));
    if (m) { this.i += m[0].length; return Number(m[0]); }
    const w = /^(true|false|null)\b/.exec(this.s.slice(this.i, this.i + 6));
    if (w) { this.i += w[0].length; return w[1] === "true" ? true : w[1] === "false" ? false : null; }
    return this.fail("Unsupported value in script");
  }
  // "a" + "b" string concatenation
  concat() {
    let out = "";
    for (;;) {
      const save = this.i;
      this.ws();
      if (this.s[this.i] !== "+") { this.i = save; return out; }
      this.i++;
      this.ws();
      if (!/["'`]/.test(this.s[this.i])) { this.i = save; return out; }
      out += this.string();
    }
  }
  string() {
    const q = this.s[this.i++];
    let out = "";
    while (this.i < this.s.length) {
      const c = this.s[this.i++];
      if (c === q) return out;
      if (c !== "\\") { out += c; continue; }
      const n = this.s[this.i++];
      if (n === "n") out += "\n";
      else if (n === "t") out += "\t";
      else if (n === "r") out += "";
      else if (n === "u") { out += String.fromCharCode(parseInt(this.s.slice(this.i, this.i + 4), 16)); this.i += 4; }
      else out += n;
    }
    return this.fail("Unterminated string");
  }
  array() {
    this.i++;
    const out = [];
    for (;;) {
      this.ws();
      if (this.s[this.i] === "]") { this.i++; return out; }
      out.push(this.value());
      this.ws();
      if (this.s[this.i] === ",") this.i++;
      else if (this.s[this.i] !== "]") this.fail("Expected , or ]");
    }
  }
  object() {
    this.i++;
    const out = {};
    for (;;) {
      this.ws();
      if (this.s[this.i] === "}") { this.i++; return out; }
      let key;
      if (/["']/.test(this.s[this.i])) key = this.string();
      else {
        const m = /^[A-Za-z_$][\w$]*/.exec(this.s.slice(this.i));
        if (!m) this.fail("Expected key");
        key = m[0];
        this.i += key.length;
      }
      this.ws();
      if (this.s[this.i++] !== ":") this.fail("Expected :");
      out[key] = this.value();
      this.ws();
      if (this.s[this.i] === ",") this.i++;
      else if (this.s[this.i] !== "}") this.fail("Expected , or }");
    }
  }
}

// Removes a leading option marker: Ⓐ / (A) / A. / A)
function cleanChoice(t) {
  return String(t).replace(/^\s*(?:[Ⓐ-ⓩ]|\(?[A-Da-d][.)）])\s*/, "").trim();
}

function firstString(src, re) {
  const m = re.exec(src);
  if (!m) return "";
  try { return new Reader(m[1], 0).string(); } catch { return ""; }
}

export function parseFormScript(src) {
  const code = String(src || "");
  let questions = null;
  let lastErr = "";
  const re = /=\s*\[/g;
  for (let m; (m = re.exec(code)); ) {
    try {
      const arr = new Reader(code, m.index + m[0].length - 1).array();
      if (arr.length && arr.every((o) => o && typeof o === "object" && Array.isArray(o.choices))) { questions = arr; break; }
    } catch (e) { lastErr = e.message; }
  }
  if (!questions) {
    return { error: `Couldn't find a list of questions ({ q, choices, correctIndex }) in the script.${lastErr ? ` (${lastErr})` : ""}` };
  }

  const items = [];
  for (let n = 0; n < questions.length; n++) {
    const o = questions[n];
    const text = String(o.q ?? o.question ?? o.text ?? "").replace(/^\s*問(?:\([^)]*\))?題(?:\([^)]*\))?\s*[:：]\s*/, "").trim();
    const choices = o.choices.map(cleanChoice).filter(Boolean);
    const idx = Number(o.correctIndex ?? o.correct ?? o.answer);
    if (!text) return { error: `Question ${n + 1} has no text.` };
    if (choices.length < 2 || choices.length > 4) return { error: `Question ${n + 1} needs 2–4 choices (found ${choices.length}).` };
    if (!Number.isInteger(idx) || idx < 0 || idx >= choices.length) return { error: `Question ${n + 1} has no valid correctIndex.` };
    items.push({ text, choices, correct: "ABCD"[idx], section: String(o.section ?? "").trim().slice(0, 100) || null, marks: Math.max(1, Number(o.points ?? o.marks) || 1) });
  }

  const title =
    firstString(code, /var\s+formTitle\s*=\s*(["'`][^\n]*?["'`])\s*;/) ||
    firstString(code, /FormApp\.create\(\s*(["'`][^\n]*?["'`])\s*\)/) ||
    "Imported question set";
  const description = firstString(code, /setDescription\(\s*(["'`][^\n]*?["'`])\s*\)/);
  return { title, description, items };
}
