// Customer domain logic shared by the web server actions (app/actions.js) and the mobile JSON API (app/api/v1).
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { sendPasswordResetEmail } from "@/lib/mail";
import { query, queryOne } from "@/lib/db";
import { notify } from "@/lib/notifications";
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

const sha256 = (v) => createHash("sha256").update(v).digest("hex");

// Always resolves the same way whether or not the email exists, so it can't be used to probe for accounts.
export async function requestPasswordReset(email) {
  email = String(email || "").trim().toLowerCase();
  if (!email || email.length > 190) return;
  const user = await queryOne("SELECT id, name, email FROM users WHERE email = ?", [email]);
  if (!user) return;
  // Throttle: at most one reset email per minute per account.
  if (await queryOne("SELECT 1 AS x FROM password_resets WHERE user_id = ? AND created_at > NOW() - INTERVAL 60 SECOND", [user.id])) return;
  const token = randomBytes(32).toString("base64url");
  await query("DELETE FROM password_resets WHERE user_id = ?", [user.id]);
  await query(
    "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, NOW() + INTERVAL 1 HOUR)",
    [sha256(token), user.id]
  );
  try {
    await sendPasswordResetEmail(user, token);
  } catch (e) {
    console.error("[mail] password reset email failed", e);
  }
}

// Returns {} on success or { error: "invalid_token" | "weak_password" } with the code the API surfaces.
export async function resetPassword(token, password) {
  token = String(token || "");
  password = String(password || "");
  if (password.length < 6) return { error: "weak_password" };
  if (!token) return { error: "invalid_token" };
  const hash = sha256(token);
  // Atomic single-use claim: a double submit or replay gets affectedRows 0.
  const claim = await query(
    "UPDATE password_resets SET used_at = NOW() WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()",
    [hash]
  );
  if (claim.affectedRows !== 1) return { error: "invalid_token" };
  const row = await queryOne("SELECT user_id FROM password_resets WHERE token_hash = ?", [hash]);
  await query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(password, 10), row.user_id]);
  // Sign out every device: whoever knew the old password must not keep a live session.
  await query("DELETE FROM sessions WHERE user_id = ?", [row.user_id]);
  return {};
}

// Returns {} on success or { error: "wrong_password" | "weak_password" | "same_password" }.
// Signs out every other device but keeps the session `keepSid` (the one making the change).
export async function changePassword(user, keepSid, current, next) {
  next = String(next || "");
  if (next.length < 6) return { error: "weak_password" };
  const row = await queryOne("SELECT id, email, password_hash FROM users WHERE id = ?", [user.id]);
  if (!row || !(await authenticate(row.email, current))) return { error: "wrong_password" };
  if (String(current) === next) return { error: "same_password" };
  await query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(next, 10), user.id]);
  await query("DELETE FROM sessions WHERE user_id = ? AND id <> ?", [user.id, keepSid || ""]);
  await query("DELETE FROM password_resets WHERE user_id = ?", [user.id]);
  return {};
}

export const CHANGE_ERRORS = {
  wrong_password: "Current password is incorrect.",
  weak_password: "New password must be at least 6 characters.",
  same_password: "New password must be different from the current one.",
};

export const RESET_ERRORS = {
  invalid_token: "This reset link is invalid or has expired. Request a new one.",
  weak_password: "Password must be at least 6 characters.",
};

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
  if (!open) {
    const ins = await query("INSERT INTO purchases (user_id, package_id) VALUES (?, ?)", [user.id, packageId]);
    await notify({ audience: "admin", kind: "request", title: `${user.name} requested a package`, body: `${pkg.name} · ${user.email}`, purchaseId: ins.insertId }).catch(() => {});
  }
  // Payment is arranged over WhatsApp; the request stays pending until an admin approves it.
  const text = `Hello JFT Sensei, I am ${user.name} (${user.email}). I want to buy the "${pkg.name}" package (${pkg.days} days, ${Number(pkg.price)}). Please share the payment details.`;
  return { status: "pending", created: !open, whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}` };
}

// Finds or creates the category-wide package (price/days from the category's per-set packages).
export async function ensureCategoryPackage(categoryId) {
  const cat = await queryOne("SELECT id, name FROM categories WHERE id = ?", [categoryId]);
  if (!cat) return null;
  const found = await queryOne(
    `SELECT p.id FROM packages p JOIN package_categories pc ON pc.package_id = p.id
     WHERE pc.category_id = ? AND p.is_active = 1
       AND (SELECT COUNT(*) FROM package_categories x WHERE x.package_id = p.id) = 1
       AND NOT EXISTS (SELECT 1 FROM package_tests pt WHERE pt.package_id = p.id) LIMIT 1`,
    [cat.id]
  );
  if (found) return found.id;
  const src = await queryOne(
    `SELECT p.days, p.price, p.original_price FROM packages p JOIN package_tests pt ON pt.package_id = p.id
     JOIN tests t ON t.id = pt.test_id WHERE t.category_id = ? AND p.is_active = 1 ORDER BY p.id LIMIT 1`,
    [cat.id]
  );
  if (!src) return null;
  const res = await query("INSERT INTO packages (name, description, days, price, original_price) VALUES (?, '', ?, ?, ?)", [cat.name.slice(0, 150), src.days, src.price, src.original_price]);
  await query("INSERT INTO package_categories (package_id, category_id, category) VALUES (?, ?, ?)", [res.insertId, cat.id, cat.name]);
  return res.insertId;
}

// Permanently deletes a customer account. Sessions, purchases, attempts and reset tokens go with the user row
// (ON DELETE CASCADE); notifications have no foreign key, so they are removed explicitly. Admins are never deleted here.
export async function deleteCustomerAccount(user) {
  if (user.role !== "customer") return { error: "forbidden" };
  try {
    await query("DELETE FROM notifications WHERE audience = 'customer' AND user_id = ?", [user.id]);
  } catch {} // table is created lazily; nothing to delete if it never existed
  await query("DELETE FROM users WHERE id = ? AND role = 'customer'", [user.id]);
  return {};
}
