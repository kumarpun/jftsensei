// Customer domain logic shared by the web server actions (app/actions.js) and the mobile JSON API (app/api/v1).
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db";
import { hasTestAccess } from "@/lib/access";

const OPTS = ["A", "B", "C", "D"];

// Returns the user row, or null on bad credentials.
export async function authenticate(identifier, password) {
  const id = String(identifier || "").trim().toLowerCase();
  const pw = String(password || "");
  const user = id ? await queryOne("SELECT * FROM users WHERE email = ?", [id]) : null;
  // Legacy customers still have generated access codes; accept them with or without dashes/spaces/case.
  const normalized = pw.replace(/[\s-]/g, "").toUpperCase();
  const ok =
    user &&
    ((await bcrypt.compare(pw, user.password_hash)) ||
      (user.role === "customer" && normalized && (await bcrypt.compare(normalized, user.password_hash))));
  return ok ? user : null;
}

// Returns { user } on success or { error } with a user-facing message.
export async function registerCustomer({ name, email, password }) {
  name = String(name || "").trim();
  email = String(email || "").trim().toLowerCase();
  password = String(password || "");
  if (!name) return { error: "Name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return { error: "Enter a valid email address." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (await queryOne("SELECT id FROM users WHERE email = ? OR username = ?", [email, email])) {
    return { error: "An account with this email already exists. Please log in." };
  }
  const res = await query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'customer')",
    [name, email, await bcrypt.hash(password, 10)]
  );
  return { user: { id: res.insertId, name, email, role: "customer" } };
}

// answers: { [questionId]: "A" | "B" | "C" | "D" }. Returns { attemptId, score, total } or { error: "not_found" | "no_access" }.
export async function gradeAndSaveAttempt(user, testId, answers, timedOut) {
  const test = await queryOne("SELECT id FROM tests WHERE id = ? AND is_published = 1", [testId]);
  if (!test) return { error: "not_found" };
  if (!(await hasTestAccess(user.id, testId))) return { error: "no_access" };

  const questions = await query("SELECT * FROM questions WHERE test_id = ?", [testId]);
  let score = 0;
  let total = 0;
  const graded = questions.map((q) => {
    const picked = String(answers[q.id] || "");
    const selected = OPTS.includes(picked) ? picked : null;
    const ok = selected === q.correct_option;
    total += q.marks;
    if (ok) score += q.marks;
    return [q.id, selected, ok ? 1 : 0];
  });

  const res = await query(
    "INSERT INTO attempts (user_id, test_id, score, total, timed_out) VALUES (?, ?, ?, ?, ?)",
    [user.id, testId, score, total, timedOut ? 1 : 0]
  );
  if (graded.length) {
    await query(
      "INSERT INTO attempt_answers (attempt_id, question_id, selected, is_correct) VALUES ?",
      [graded.map((g) => [res.insertId, ...g])]
    );
  }
  return { attemptId: res.insertId, score, total };
}

export const WHATSAPP_NUMBER = "9779714393399";

// Creates a pending purchase unless one is already pending/active.
// Returns { error: "not_found" } | { status: "active" } | { status: "pending", whatsappUrl }.
export async function requestPurchase(user, packageId) {
  const pkg = await queryOne("SELECT id, name, days, price FROM packages WHERE id = ? AND is_active = 1", [packageId]);
  if (!pkg) return { error: "not_found" };
  const open = await queryOne(
    "SELECT id, status FROM purchases WHERE user_id = ? AND package_id = ? AND (status = 'pending' OR (status = 'active' AND expires_at > NOW()))",
    [user.id, packageId]
  );
  if (open?.status === "active") return { status: "active" };
  if (!open) await query("INSERT INTO purchases (user_id, package_id) VALUES (?, ?)", [user.id, packageId]);
  // Payment is arranged over WhatsApp; the request stays pending until an admin approves it.
  const text = `Hello JFT Sensei, I am ${user.name} (${user.email}). I want to buy the "${pkg.name}" package (${pkg.days} days, ${Number(pkg.price)}). Please share the payment details.`;
  return { status: "pending", created: !open, whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}` };
}
