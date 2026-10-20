"use server";

import bcrypt from "bcryptjs";
import { parseDuration } from "@/lib/duration";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { createSession, destroySession, requireRole } from "@/lib/session";
import { parseYouTubeId } from "@/lib/youtube";
import { parseFormScript } from "@/lib/formScript";
import { hasTestAccess } from "@/lib/access";
import { fetchGoogleForm } from "@/lib/googleForm";

const OPTS = ["A", "B", "C", "D"];
const IMG_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
// feedback = shown on wrong/unanswered; feedback_correct = shown on a correct answer (Google Form style).
const feedbackOf = (formData, key = "feedback") => String(formData.get(key) || "").trim().slice(0, 2000) || null;
// "+ Add new section…" sends section=__new__ plus section_new; the new name is remembered for the section dropdown.
async function sectionOf(formData) {
  const v = String(formData.get("section") || "");
  const name = (v === "__new__" ? String(formData.get("section_new") || "") : v).trim().slice(0, 100);
  if (!name) return null;
  if (v === "__new__") await query("INSERT IGNORE INTO sections (name) VALUES (?)", [name]);
  return name;
}

// Removes a section from the dropdown; questions already using it keep their section text.
export async function deleteSection(name) {
  await requireRole("admin");
  await query("DELETE FROM sections WHERE name = ?", [String(name)]);
  revalidatePath("/admin", "layout");
}
const IMG_MAX = 4 * 1024 * 1024;
const categoryOf = (formData) => {
  const v = String(formData.get("category") || "");
  return (v === "__new__" ? String(formData.get("category_new") || "") : v).trim().slice(0, 100) || null;
};

// Remembers the category so it exists even while it has no sets.
const saveCategory = (name) => name && query("INSERT IGNORE INTO categories (name) VALUES (?)", [name]);

// Set name is optional when the admin is adding a new category: the category then gets an "Untitled set" to hold it.
const titleOf = (formData) => {
  const t = String(formData.get("title") || "").trim();
  return t || (categoryOf(formData) && formData.get("category") === "__new__" ? "Untitled set" : "");
};

// Stores an uploaded image for a question (or removes it when `remove_image` is set).
async function saveImage(questionId, formData) {
  const file = formData.get("image");
  if (file && typeof file === "object" && file.size > 0 && IMG_TYPES.includes(file.type) && file.size <= IMG_MAX) {
    const data = Buffer.from(await file.arrayBuffer());
    await query(
      "REPLACE INTO question_images (question_id, mime, data) VALUES (?, ?, ?)",
      [questionId, file.type, data]
    );
    await query("UPDATE questions SET has_image = 1 WHERE id = ?", [questionId]);
  } else if (formData.get("remove_image")) {
    await query("DELETE FROM question_images WHERE question_id = ?", [questionId]);
    await query("UPDATE questions SET has_image = 0 WHERE id = ?", [questionId]);
  }
}

// ---------- auth ----------
export async function login(_prev, formData) {
  const identifier = String(formData.get("identifier") || "").trim();
  const id = identifier.toLowerCase();
  const password = String(formData.get("password") || "");
  const user = id ? await queryOne("SELECT * FROM users WHERE email = ?", [id]) : null;
  // Legacy customers still have generated access codes; accept them with or without dashes/spaces/case.
  const normalized = password.replace(/[\s-]/g, "").toUpperCase();
  const ok =
    user &&
    ((await bcrypt.compare(password, user.password_hash)) ||
      (user.role === "customer" && normalized && (await bcrypt.compare(normalized, user.password_hash))));
  if (!ok) return { error: "Invalid email or password", identifier };
  await createSession(user);
  redirect(user.role === "admin" ? "/admin" : "/customer/packages");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ---------- customer: sign up ----------
export async function signup(_prev, formData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const keep = { name, email };
  if (!name) return { ...keep, error: "Name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return { ...keep, error: "Enter a valid email address." };
  if (password.length < 6) return { ...keep, error: "Password must be at least 6 characters." };
  if (await queryOne("SELECT id FROM users WHERE email = ? OR username = ?", [email, email])) {
    return { ...keep, error: "An account with this email already exists. Please log in." };
  }
  const res = await query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'customer')",
    [name, email, await bcrypt.hash(password, 10)]
  );
  await createSession({ id: res.insertId, role: "customer" });
  redirect("/customer/packages");
}

// ---------- admin: customers ----------
export async function deleteCustomer(formData) {
  await requireRole("admin");
  await query("DELETE FROM users WHERE id = ? AND role = 'customer'", [Number(formData.get("id"))]);
  revalidatePath("/admin/customers");
}

// Signs the customer out everywhere so they can log in on a new device.
export async function resetDevices(formData) {
  await requireRole("admin");
  await query("DELETE FROM sessions WHERE user_id = ?", [Number(formData.get("id"))]);
  revalidatePath("/admin/customers");
}

// ---------- admin: tests ----------
export async function createTest(formData) {
  await requireRole("admin");
  const category = categoryOf(formData);
  await saveCategory(category);
  const title = String(formData.get("title") || "").trim();
  if (!title) {
    // Category only: no set is created; sets are added later from inside the category.
    if (!category) return;
    revalidatePath("/admin", "layout");
    redirect(`/admin?cat=${encodeURIComponent(category)}`);
  }
  const seconds = parseDuration(formData);
  const res = await query(
    "INSERT INTO tests (title, description, duration_seconds, duration_minutes, category) VALUES (?, ?, ?, ?, ?)",
    [title, String(formData.get("description") || ""), seconds, Math.ceil(seconds / 60), category]
  );
  redirect(`/admin/tests/${res.insertId}`);
}

// Imports every multiple-choice question of a public Google Form into a new set.
// The form's answer key is not public, so correct answers come from the optional key (A-D letters in order), else default to A.
export async function importGoogleForm(_prev, formData) {
  await requireRole("admin");
  const url = String(formData.get("form_url") || "").trim();
  const title = titleOf(formData);
  const keyText = String(formData.get("answer_key") || "");
  const keep = { form_url: url, title, answer_key: keyText };
  if (!title) return { ...keep, error: "Set name is required." };
  if (!/^https:\/\/(docs\.google\.com\/forms|forms\.gle)\/\S+$/.test(url)) return { ...keep, error: "Enter a valid Google Form link." };
  const form = await fetchGoogleForm(url);
  if (form.error) return { ...keep, error: form.error };
  const key = (keyText.match(/[A-Da-d]/g) || []).map((c) => c.toUpperCase());
  if (key.length && key.length !== form.items.length) {
    return { ...keep, error: `Answer key has ${key.length} answers but the form has ${form.items.length} questions.` };
  }
  const seconds = parseDuration(formData);
  const publish = formData.get("publish") ? 1 : 0;
  await saveCategory(categoryOf(formData));
  const res = await query(
    "INSERT INTO tests (title, description, duration_seconds, duration_minutes, is_published, category) VALUES (?, ?, ?, ?, ?, ?)",
    [title, String(formData.get("description") || form.description || ""), seconds, Math.ceil(seconds / 60), publish, categoryOf(formData)]
  );
  await query(
    "INSERT INTO questions (test_id, text, option_a, option_b, option_c, option_d, correct_option, marks, section) VALUES ?",
    [form.items.map((q, i) => [res.insertId, q.text, q.choices[0], q.choices[1], q.choices[2] || "", q.choices[3] || "", key[i] && key[i].charCodeAt(0) - 65 < q.choices.length ? key[i] : "A", 1, q.section])]
  );
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  redirect(`/admin/tests/${res.insertId}`);
}

// Creates a whole test from a pasted Google Apps Script quiz generator.
export async function importScript(_prev, formData) {
  await requireRole("admin");
  const script = String(formData.get("script") || "");
  const parsed = parseFormScript(script);
  const typedTitle = titleOf(formData);
  if (parsed.error) return { error: parsed.error, script, title: typedTitle };
  if (!typedTitle) return { error: "Set name is required.", script };
  const title = typedTitle;
  const seconds = parseDuration(formData);
  const publish = formData.get("publish") ? 1 : 0;
  await saveCategory(categoryOf(formData));
  const res = await query(
    "INSERT INTO tests (title, description, duration_seconds, duration_minutes, is_published, category) VALUES (?, ?, ?, ?, ?, ?)",
    [title, parsed.description || "", seconds, Math.ceil(seconds / 60), publish, categoryOf(formData)]
  );
  await query(
    "INSERT INTO questions (test_id, text, option_a, option_b, option_c, option_d, correct_option, marks, section) VALUES ?",
    [parsed.items.map((q) => [res.insertId, q.text, q.choices[0], q.choices[1], q.choices[2] || "", q.choices[3] || "", q.correct, q.marks, q.section])]
  );
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  redirect(`/admin/tests/${res.insertId}`);
}

export async function updateTest(_prev, formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  if (!title) return { ok: false, message: "Title is required.", at: Date.now() };
  const seconds = parseDuration(formData);
  const formUrl = String(formData.get("form_url") || "").trim();
  if (formUrl && !/^https:\/\/\S+$/.test(formUrl)) {
    return { ok: false, message: "Form link must start with https://", at: Date.now() };
  }
  await query(
    "UPDATE tests SET title = ?, description = ?, duration_seconds = ?, duration_minutes = ?, form_url = ?, category = ? WHERE id = ?",
    [title, String(formData.get("description") || ""), seconds, Math.ceil(seconds / 60), formUrl || null, categoryOf(formData), id]
  );
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  return { ok: true, message: "Test details saved successfully.", at: Date.now() };
}

export async function togglePublish(formData) {
  await requireRole("admin");
  await query("UPDATE tests SET is_published = 1 - is_published WHERE id = ?", [
    Number(formData.get("id")),
  ]);
  revalidatePath("/admin", "layout");
}

export async function deleteTest(formData) {
  await requireRole("admin");
  await query("DELETE FROM tests WHERE id = ?", [Number(formData.get("id"))]);
  await dropEmptyPackages();
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

// Duplicates a set (settings, questions, answers, feedback, images) as an unpublished draft and opens it.
export async function copyTest(formData) {
  await requireRole("admin");
  const src = await queryOne("SELECT * FROM tests WHERE id = ?", [Number(formData.get("id"))]);
  if (!src) return;
  const res = await query(
    "INSERT INTO tests (title, description, duration_seconds, duration_minutes, form_url, category, is_published) VALUES (?, ?, ?, ?, ?, ?, 0)",
    [`${src.title} (copy)`.slice(0, 200), src.description, src.duration_seconds, src.duration_minutes, src.form_url, src.category]
  );
  const questions = await query("SELECT * FROM questions WHERE test_id = ? ORDER BY id", [src.id]);
  for (const q of questions) {
    const r = await query(
      `INSERT INTO questions (test_id, text, option_a, option_b, option_c, option_d, correct_option, marks, video_id, has_image, section, feedback, feedback_correct)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [res.insertId, q.text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.marks, q.video_id, q.has_image, q.section, q.feedback, q.feedback_correct]
    );
    if (q.has_image) {
      await query("INSERT INTO question_images (question_id, mime, data) SELECT ?, mime, data FROM question_images WHERE question_id = ?", [r.insertId, q.id]);
    }
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/tests/${res.insertId}`);
}

// Deletes a category: every set in it (questions/attempts cascade) plus its package links.
export async function deleteCategory(formData) {
  await requireRole("admin");
  const category = String(formData.get("category") || "").trim();
  if (!category) return;
  await query("DELETE FROM tests WHERE category = ?", [category]);
  await query("DELETE FROM categories WHERE name = ?", [category]);
  await query("DELETE FROM package_categories WHERE category = ?", [category]);
  await dropEmptyPackages();
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  redirect("/admin");
}

// ---------- admin: questions ----------
export async function addQuestion(formData) {
  await requireRole("admin");
  const testId = Number(formData.get("test_id"));
  const correct = String(formData.get("correct") || "");
  const text = String(formData.get("text") || "").trim();
  const opts = OPTS.map((o) => String(formData.get(`option_${o}`) || "").trim());
  if (!text || !opts[0] || !opts[1] || !OPTS.includes(correct) || !opts[OPTS.indexOf(correct)]) return;
  const res = await query(
    `INSERT INTO questions (test_id, text, option_a, option_b, option_c, option_d, correct_option, marks, video_id, section, feedback, feedback_correct)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [testId, text, ...opts, correct, Math.max(1, Number(formData.get("marks")) || 1), parseYouTubeId(formData.get("video")) || null, await sectionOf(formData), feedbackOf(formData), feedbackOf(formData, "feedback_correct")]
  );
  await saveImage(res.insertId, formData);
  revalidatePath(`/admin/tests/${testId}`);
}

export async function updateQuestion(formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const testId = Number(formData.get("test_id"));
  const correct = String(formData.get("correct") || "");
  const text = String(formData.get("text") || "").trim();
  const opts = OPTS.map((o) => String(formData.get(`option_${o}`) || "").trim());
  if (!text || !opts[0] || !opts[1] || !OPTS.includes(correct) || !opts[OPTS.indexOf(correct)]) return;
  await query(
    `UPDATE questions SET text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?,
            correct_option = ?, marks = ?, video_id = ?, section = ?, feedback = ?, feedback_correct = ? WHERE id = ? AND test_id = ?`,
    [text, ...opts, correct, Math.max(1, Number(formData.get("marks")) || 1), parseYouTubeId(formData.get("video")) || null, await sectionOf(formData), feedbackOf(formData), feedbackOf(formData, "feedback_correct"), id, testId]
  );
  await saveImage(id, formData);
  revalidatePath(`/admin/tests/${testId}`);
}

export async function deleteQuestion(formData) {
  await requireRole("admin");
  await query("DELETE FROM questions WHERE id = ?", [Number(formData.get("id"))]);
  revalidatePath(`/admin/tests/${Number(formData.get("test_id"))}`);
}

// ---------- customer: submit ----------
export async function submitTest(formData) {
  const user = await requireRole("customer");
  const testId = Number(formData.get("test_id"));
  const test = await queryOne("SELECT id FROM tests WHERE id = ? AND is_published = 1", [testId]);
  if (!test) redirect("/customer");
  if (!(await hasTestAccess(user.id, testId))) redirect("/customer/packages");

  const questions = await query("SELECT * FROM questions WHERE test_id = ?", [testId]);
  let score = 0;
  let total = 0;
  const graded = questions.map((q) => {
    const picked = String(formData.get(`q_${q.id}`) || "");
    const selected = OPTS.includes(picked) ? picked : null;
    const ok = selected === q.correct_option;
    total += q.marks;
    if (ok) score += q.marks;
    return [q.id, selected, ok ? 1 : 0];
  });

  const res = await query(
    "INSERT INTO attempts (user_id, test_id, score, total, timed_out) VALUES (?, ?, ?, ?, ?)",
    [user.id, testId, score, total, formData.get("timed_out") === "1" ? 1 : 0]
  );
  if (graded.length) {
    await query(
      "INSERT INTO attempt_answers (attempt_id, question_id, selected, is_correct) VALUES ?",
      [graded.map((g) => [res.insertId, ...g])]
    );
  }
  redirect(`/customer/results/${res.insertId}`);
}

// ---------- packages ----------
const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

function refreshPackages() {
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
}

// A package left with no sets/categories is useless; remove it (and its purchases cascade).
async function dropEmptyPackages() {
  await query(
    `DELETE FROM packages
     WHERE id NOT IN (SELECT package_id FROM package_categories)
       AND id NOT IN (SELECT package_id FROM package_tests)`
  );
}

// Sets a category's default price/days; paid sets in it follow the new price.
export async function setCategoryPrice(_prev, formData) {
  await requireRole("admin");
  const category = String(formData.get("target") || "").trim();
  const days = Math.floor(Number(formData.get("days")));
  const price = money(formData.get("price"));
  const original = money(formData.get("original_price"));
  if (!category || !(days >= 1) || price === null) return { ok: false, message: "Enter days (1+) and a price.", at: Date.now() };
  const orig = original !== null && original > price ? original : null;
  await query(
    "INSERT INTO categories (name, days, price, original_price) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE days = VALUES(days), price = VALUES(price), original_price = VALUES(original_price)",
    [category, days, price, orig]
  );
  await query(
    `UPDATE packages p JOIN package_tests pt ON pt.package_id = p.id JOIN tests t ON t.id = pt.test_id
     SET p.days = ?, p.price = ?, p.original_price = ? WHERE t.category = ?`,
    [days, price, orig, category]
  );
  refreshPackages();
  return { ok: true, message: "Price saved.", at: Date.now() };
}

async function createSetPackage(t, { days, price, orig }) {
  const res = await query("INSERT INTO packages (name, description, days, price, original_price) VALUES (?, '', ?, ?, ?)", [String(t.title).slice(0, 150), days, price, orig]);
  await query("INSERT INTO package_tests (package_id, test_id) VALUES (?, ?)", [res.insertId, t.id]);
}

// Toggles one set paid (at its category's price) or free.
export async function toggleSetPaid(formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const t = await queryOne("SELECT id, title, category FROM tests WHERE id = ?", [id]);
  if (!t) return;
  const has = await queryOne("SELECT 1 AS x FROM package_tests WHERE test_id = ?", [id]);
  if (has) {
    await query("DELETE FROM package_tests WHERE test_id = ?", [id]);
    await dropEmptyPackages();
  } else {
    const c = await queryOne("SELECT days, price, original_price FROM categories WHERE name = ?", [t.category]);
    if (!c || c.price === null) return;
    await createSetPackage(t, { days: c.days, price: c.price, orig: c.original_price });
  }
  refreshPackages();
}

// Sets one set paid (at its category's price) or free; used by the set page's Free/Paid switch.
export async function setSetPaid(_prev, formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const paid = formData.get("paid") === "1";
  const t = await queryOne("SELECT id, title, category FROM tests WHERE id = ?", [id]);
  if (!t) return { ok: false, message: "Set not found.", at: Date.now() };
  const has = await queryOne("SELECT 1 AS x FROM package_tests WHERE test_id = ?", [id]);
  if (paid && !has) {
    const c = await queryOne("SELECT days, price, original_price FROM categories WHERE name = ?", [t.category]);
    if (!c || c.price === null) return { ok: false, message: "Set a price on the category first (Dashboard → category → Price).", at: Date.now() };
    await createSetPackage(t, { days: c.days, price: c.price, orig: c.original_price });
  } else if (!paid && has) {
    await query("DELETE FROM package_tests WHERE test_id = ?", [id]);
    await dropEmptyPackages();
  }
  refreshPackages();
  return { ok: true, message: paid ? "Set is now paid." : "Set is now free.", at: Date.now() };
}

const WHATSAPP_NUMBER = "9779714393399";

export async function requestPackage(formData) {
  const user = await requireRole("customer");
  const id = Number(formData.get("id"));
  const pkg = await queryOne("SELECT id, name, days, price FROM packages WHERE id = ? AND is_active = 1", [id]);
  if (!pkg) redirect("/customer/packages");
  const open = await queryOne(
    "SELECT id, status FROM purchases WHERE user_id = ? AND package_id = ? AND (status = 'pending' OR (status = 'active' AND expires_at > NOW()))",
    [user.id, id]
  );
  if (open?.status === "active") redirect("/customer/my-packages");
  if (!open) {
    await query("INSERT INTO purchases (user_id, package_id) VALUES (?, ?)", [user.id, id]);
    revalidatePath("/admin/packages");
  }
  // Payment is arranged over WhatsApp; the request above stays pending until an admin approves it.
  const text = `Hello JFT Sensei, I am ${user.name} (${user.email}). I want to buy the "${pkg.name}" package (${pkg.days} days, ${Number(pkg.price)}). Please share the payment details.`;
  redirect(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`);
}

export async function reviewPurchase(formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision"));
  if (decision === "approve") {
    const pu = await queryOne(
      "SELECT pu.id, p.days FROM purchases pu JOIN packages p ON p.id = pu.package_id WHERE pu.id = ? AND pu.status = 'pending'",
      [id]
    );
    if (pu) {
      await query(
        "UPDATE purchases SET status = 'active', starts_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id = ?",
        [pu.days, id]
      );
    }
  } else if (decision === "reject") {
    await query("UPDATE purchases SET status = 'rejected' WHERE id = ? AND status = 'pending'", [id]);
  } else if (decision === "remove") {
    await query("DELETE FROM purchases WHERE id = ?", [id]);
  }
  refreshPackages();
}

export async function createAnnouncement(formData) {
  await requireRole("admin");
  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const body = String(formData.get("body") || "").trim();
  const file = formData.get("image");
  const hasImage = file && typeof file === "object" && file.size > 0 && IMG_TYPES.includes(file.type) && file.size <= IMG_MAX;
  if (!title || (!body && !hasImage)) return;
  // Works like a status: visible to customers for 24 hours.
  const res = await query(
    "INSERT INTO announcements (title, body, has_image, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))",
    [title, body, hasImage ? 1 : 0]
  );
  if (hasImage) {
    await query("INSERT INTO announcement_images (announcement_id, mime, data) VALUES (?, ?, ?)", [res.insertId, file.type, Buffer.from(await file.arrayBuffer())]);
  }
  revalidatePath("/admin/announcements");
  revalidatePath("/customer/announcements");
}

export async function updateAnnouncement(formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const body = String(formData.get("body") || "").trim();
  if (!id || !title) return;
  const file = formData.get("image");
  const newImage = file && typeof file === "object" && file.size > 0 && IMG_TYPES.includes(file.type) && file.size <= IMG_MAX;
  await query("UPDATE announcements SET title = ?, body = ? WHERE id = ?", [title, body, id]);
  if (newImage) {
    await query("REPLACE INTO announcement_images (announcement_id, mime, data) VALUES (?, ?, ?)", [id, file.type, Buffer.from(await file.arrayBuffer())]);
    await query("UPDATE announcements SET has_image = 1 WHERE id = ?", [id]);
  } else if (formData.get("remove_image")) {
    await query("DELETE FROM announcement_images WHERE announcement_id = ?", [id]);
    await query("UPDATE announcements SET has_image = 0 WHERE id = ?", [id]);
  }
  revalidatePath("/admin/announcements");
  revalidatePath("/customer/announcements");
  redirect("/admin/announcements");
}

export async function deleteAnnouncement(formData) {
  await requireRole("admin");
  await query("DELETE FROM announcements WHERE id = ?", [Number(formData.get("id"))]);
  revalidatePath("/admin/announcements");
  revalidatePath("/customer/announcements");
}
