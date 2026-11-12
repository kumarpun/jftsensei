"use server";

import { uploadImage } from "@/lib/imagehost";
import { parseDuration } from "@/lib/duration";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { createSession, destroySession, requireRole, getUser, getSessionId } from "@/lib/session";
import { parseYouTubeId } from "@/lib/youtube";
import { parseFormScript } from "@/lib/formScript";
import { authenticate, registerCustomer, requestPasswordReset, resetPassword, RESET_ERRORS, changePassword, CHANGE_ERRORS, gradeAndSaveAttempt, requestPurchase, ensureCategoryPackage } from "@/lib/customer";
import { fetchGoogleForm } from "@/lib/googleForm";
import { setSetting } from "@/lib/settings";
import { ensureOpenings } from "@/lib/openings";
import { notify, markAllRead, markRead, deleteNotifications } from "@/lib/notifications";

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
// Categories are identified by id (two categories may share a name). Forms post an id as `category`,
// or "__new__" plus `category_new` to create a new one.
const isNewCategory = (formData) => formData.get("category") === "__new__";

// Resolves the posted category to { id, name } (creating it when new, with an optional default price). null = no category.
// A brand-new category may also carry a default price (cat_days / cat_original_price / cat_price).
async function saveCategory(formData) {
  if (isNewCategory(formData)) {
    const name = String(formData.get("category_new") || "").trim().slice(0, 100);
    if (!name) return null;
    const { insertId: id } = await query("INSERT INTO categories (name) VALUES (?)", [name]);
    const days = Math.floor(Number(formData.get("cat_days")));
    const price = money(formData.get("cat_price"));
    if (days >= 1 && price !== null && formData.get("cat_price") !== "") {
      const original = money(formData.get("cat_original_price"));
      await query("UPDATE categories SET days = ?, price = ?, original_price = ? WHERE id = ?",
        [days, price, original !== null && original > price ? original : null, id]);
    }
    return { id, name };
  }
  const id = Number(formData.get("category"));
  return Number.isInteger(id) && id > 0 ? (await queryOne("SELECT id, name FROM categories WHERE id = ?", [id])) || null : null;
}

// Set name is optional when the admin is adding a new category: the category then gets an "Untitled set" to hold it.
const titleOf = (formData) => {
  const t = String(formData.get("title") || "").trim();
  return t || (isNewCategory(formData) && String(formData.get("category_new") || "").trim() ? "Untitled set" : "");
};

// Stores an uploaded image for a question (or removes it when `remove_image` is set).
async function saveImage(questionId, formData) {
  const file = formData.get("image");
  if (file && typeof file === "object" && file.size > 0 && IMG_TYPES.includes(file.type) && file.size <= IMG_MAX) {
    const url = await uploadImage(file);
    if (url) {
      await query("DELETE FROM question_images WHERE question_id = ?", [questionId]);
    } else {
      await query(
        "REPLACE INTO question_images (question_id, mime, data) VALUES (?, ?, ?)",
        [questionId, file.type, Buffer.from(await file.arrayBuffer())]
      );
    }
    await query("UPDATE questions SET has_image = 1, image_url = ? WHERE id = ?", [url, questionId]);
  } else if (formData.get("remove_image")) {
    await query("DELETE FROM question_images WHERE question_id = ?", [questionId]);
    await query("UPDATE questions SET has_image = 0, image_url = NULL WHERE id = ?", [questionId]);
  }
}

// ---------- auth ----------
export async function login(_prev, formData) {
  const identifier = String(formData.get("identifier") || "").trim();
  const user = await authenticate(identifier, formData.get("password"));
  if (!user) return { error: "Invalid email or password", identifier };
  await createSession(user);
  redirect(user.role === "admin" ? "/admin" : "/customer/packages");
}

export async function forgotPassword(_prev, formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  await requestPasswordReset(email);
  return { sent: true, email };
}

export async function resetPasswordAction(_prev, formData) {
  const res = await resetPassword(formData.get("token"), formData.get("password"));
  if (res.error) return { error: RESET_ERRORS[res.error] };
  redirect("/login?reset=1");
}

export async function changePasswordAction(_prev, formData) {
  const user = await getUser();
  if (!user) redirect("/login");
  const confirm = String(formData.get("confirm") || "");
  if (String(formData.get("password") || "") !== confirm) return { error: "New passwords do not match." };
  const res = await changePassword(user, await getSessionId(), formData.get("current"), formData.get("password"));
  if (res.error) return { error: CHANGE_ERRORS[res.error] };
  return { ok: true };
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ---------- customer: sign up ----------
export async function signup(_prev, formData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const keep = { name, email };
  const res = await registerCustomer({ name, email, password: formData.get("password") });
  if (res.error) return { ...keep, error: res.error };
  await createSession(res.user);
  redirect("/customer/packages");
}

// ---------- admin: customers ----------
export async function deleteCustomer(formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  // notifications has no foreign key, so remove the customer's rows explicitly (everything else cascades).
  await query("DELETE FROM notifications WHERE user_id = ? AND user_id IN (SELECT id FROM users WHERE role = 'customer')", [id]);
  await query("DELETE FROM users WHERE id = ? AND role = 'customer'", [id]);
  revalidatePath("/admin/customers");
}

// ---------- admin: tests ----------
export async function createTest(formData) {
  await requireRole("admin");
  const newName = String(formData.get("category_new") || "").trim().slice(0, 100);
  let newCat = null;
  if (newName) {
    const f = new FormData();
    for (const [k, v] of formData) f.append(k, v);
    f.set("category", "__new__");
    newCat = await saveCategory(f);
  }
  const catIds = [...new Set([...formData.getAll("categories").map(Number).filter((n) => Number.isInteger(n) && n > 0), ...(newCat ? [newCat.id] : [])])];
  const cats = [];
  for (const id of catIds) {
    const row = await queryOne("SELECT id, name FROM categories WHERE id = ?", [id]);
    if (row) cats.push(row);
  }
  // Folder only: create an empty folder inside the category, no set.
  const folderNew = String(formData.get("folder_new") || "").trim().slice(0, 100);
  if (folderNew && cats[0]) {
    await query("INSERT IGNORE INTO folders (category_id, name) VALUES (?, ?)", [cats[0].id, folderNew]);
    revalidatePath("/admin", "layout");
    redirect(`/admin?cat=${cats[0].id}`);
  }
  const folder = String(formData.get("folder") || "").trim().slice(0, 100) || null;
  const title = String(formData.get("title") || "").trim() || (newName ? "" : "Untitled set");
  if (!title) {
    // Category only: no set is created; sets are added later from inside the category.
    if (!newCat) return;
    revalidatePath("/admin", "layout");
    redirect(`/admin?cat=${newCat.id}`);
  }
  // Optional Google Form link: the set is created ready to publish and we stay on the dashboard.
  const rawLink = String(formData.get("form_url") || "").trim();
  const link = rawLink ? cleanFormUrl(rawLink) : "";
  if (rawLink && (!link || link.length > 500)) return;
  const ids = [];
  for (const category of cats.length ? cats : [null]) {
    // A set takes its category's time limit (none when the category has no limit).
    const catRow = category ? await queryOne("SELECT duration_seconds FROM categories WHERE id = ?", [category.id]) : null;
    const seconds = Number(catRow?.duration_seconds) || 0;
    const res = link
      ? await query(
          "INSERT INTO tests (title, description, duration_seconds, duration_minutes, form_url, category, category_id, folder, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
          [title, String(formData.get("description") || ""), seconds, Math.ceil(seconds / 60), link, category?.name ?? null, category?.id ?? null, category ? folder : null]
        )
      : await query(
          "INSERT INTO tests (title, description, duration_seconds, duration_minutes, category, category_id, folder, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
          [title, String(formData.get("description") || ""), seconds, Math.ceil(seconds / 60), category?.name ?? null, category?.id ?? null, category ? folder : null]
        );
    ids.push(res.insertId);
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  if (link) redirect(`/admin?cat=${cats[0]?.id ?? ""}`);
  // One set: open it. Several: back to the dashboard on the first category.
  redirect(ids.length === 1 ? `/admin/tests/${ids[0]}` : `/admin?cat=${cats[0]?.id ?? ""}`);
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
  const cat = await saveCategory(formData);
  const res = await query(
    "INSERT INTO tests (title, description, duration_seconds, duration_minutes, is_published, category, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [title, String(formData.get("description") || form.description || ""), seconds, Math.ceil(seconds / 60), publish, cat?.name ?? null, cat?.id ?? null]
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
  const cat = await saveCategory(formData);
  const res = await query(
    "INSERT INTO tests (title, description, duration_seconds, duration_minutes, is_published, category, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [title, parsed.description || "", seconds, Math.ceil(seconds / 60), publish, cat?.name ?? null, cat?.id ?? null]
  );
  await query(
    "INSERT INTO questions (test_id, text, option_a, option_b, option_c, option_d, correct_option, marks, section) VALUES ?",
    [parsed.items.map((q) => [res.insertId, q.text, q.choices[0], q.choices[1], q.choices[2] || "", q.choices[3] || "", q.correct, q.marks, q.section])]
  );
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  redirect(`/admin/tests/${res.insertId}`);
}

const QUESTION_INSERT =
  "INSERT INTO questions (test_id, text, option_a, option_b, option_c, option_d, correct_option, marks, section) VALUES ?";

// Appends the questions of a pasted Apps Script quiz to an existing set.
export async function addScriptQuestions(_prev, formData) {
  await requireRole("admin");
  const testId = Number(formData.get("test_id"));
  const script = String(formData.get("script") || "");
  const parsed = parseFormScript(script);
  if (parsed.error) return { error: parsed.error, script };
  if (!(await queryOne("SELECT id FROM tests WHERE id = ?", [testId]))) return { error: "Set not found.", script };
  await query(QUESTION_INSERT, [parsed.items.map((q) => [testId, q.text, q.choices[0], q.choices[1], q.choices[2] || "", q.choices[3] || "", q.correct, q.marks, q.section])]);
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  return { ok: true, message: `Added ${parsed.items.length} questions.`, at: Date.now() };
}

// Appends the multiple-choice questions of a public Google Form to an existing set.
export async function addGoogleFormQuestions(_prev, formData) {
  await requireRole("admin");
  const testId = Number(formData.get("test_id"));
  const url = String(formData.get("form_url") || "").trim();
  const keyText = String(formData.get("answer_key") || "");
  const keep = { form_url: url, answer_key: keyText };
  if (!/^https:\/\/(docs\.google\.com\/forms|forms\.gle)\/\S+$/.test(url)) return { ...keep, error: "Enter a valid Google Form link." };
  if (!(await queryOne("SELECT id FROM tests WHERE id = ?", [testId]))) return { ...keep, error: "Set not found." };
  const form = await fetchGoogleForm(url);
  if (form.error) return { ...keep, error: form.error };
  const key = (keyText.match(/[A-Da-d]/g) || []).map((c) => c.toUpperCase());
  if (key.length && key.length !== form.items.length) {
    return { ...keep, error: `Answer key has ${key.length} answers but the form has ${form.items.length} questions.` };
  }
  await query(QUESTION_INSERT, [form.items.map((q, i) => [testId, q.text, q.choices[0], q.choices[1], q.choices[2] || "", q.choices[3] || "", key[i] && key[i].charCodeAt(0) - 65 < q.choices.length ? key[i] : "A", 1, q.section])]);
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  return { ok: true, message: `Imported ${form.items.length} questions. Check the answers below.`, at: Date.now() };
}

export async function updateTest(_prev, formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  if (!title) return { ok: false, message: "Title is required.", at: Date.now() };
  const formUrl = String(formData.get("form_url") || "").trim();
  const seconds = parseDuration(formData, "duration", true);
  if (formUrl && !/^https:\/\/\S+$/.test(formUrl)) {
    return { ok: false, message: "Form link must start with https://", at: Date.now() };
  }
  const cat = await saveCategory(formData);
  await query(
    "UPDATE tests SET title = ?, description = ?, duration_seconds = ?, duration_minutes = ?, form_url = ?, category = ?, category_id = ? WHERE id = ?",
    [title, String(formData.get("description") || ""), seconds, Math.ceil(seconds / 60), formUrl || null, cat?.name ?? null, cat?.id ?? null, id]
  );
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  return { ok: true, message: "Test details saved successfully.", at: Date.now() };
}

// Attaches (or replaces) a Google Form link on an existing set.
export async function setFormLink(_prev, formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const url = cleanFormUrl(formData.get("form_url"));
  if (!id || !url || url.length > 500) return { ok: false, message: "Enter a valid Google Form link.", at: Date.now() };
  await query("UPDATE tests SET form_url = ? WHERE id = ?", [url, id]);
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  return { ok: true, message: "Google Form link saved.", at: Date.now() };
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
// Clones a set row with its questions and images. Lands as a draft unless `published` is set.
async function cloneSet(src, { title, category, folder, published = false, linked = false }) {
  const res = await query(
    "INSERT INTO tests (title, description, duration_seconds, duration_minutes, form_url, category, category_id, folder, is_published, origin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [title.slice(0, 200), src.description, src.duration_seconds, src.duration_minutes, src.form_url, category?.name ?? null, category?.id ?? null, folder, published ? 1 : 0, linked ? (src.origin_id ?? src.id) : null]
  );
  const questions = await query("SELECT * FROM questions WHERE test_id = ? ORDER BY id", [src.id]);
  for (const q of questions) {
    const r = await query(
      `INSERT INTO questions (test_id, text, option_a, option_b, option_c, option_d, correct_option, marks, video_id, has_image, image_url, section, feedback, feedback_correct)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [res.insertId, q.text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.marks, q.video_id, q.has_image, q.image_url, q.section, q.feedback, q.feedback_correct]
    );
    if (q.has_image) {
      await query("INSERT INTO question_images (question_id, mime, data) SELECT ?, mime, data FROM question_images WHERE question_id = ?", [r.insertId, q.id]);
    }
  }
  return res.insertId;
}

export async function copyTest(formData) {
  await requireRole("admin");
  const src = await queryOne("SELECT * FROM tests WHERE id = ?", [Number(formData.get("id"))]);
  if (!src) return;
  const id = await cloneSet(src, { title: `${src.title} (copy)`, category: src.category_id ? { id: src.category_id, name: src.category } : null, folder: src.folder });
  revalidatePath("/admin", "layout");
  redirect(`/admin/tests/${id}`);
}

// Copies a category: its price/days/time settings, folders, every set (with questions), each set's published state, and the paid packages (set-level and category-level).
export async function copyCategory(formData) {
  await requireRole("admin");
  const srcId = Number(formData.get("category"));
  if (!Number.isInteger(srcId) || srcId <= 0) return;
  const src = await queryOne("SELECT * FROM categories WHERE id = ?", [srcId]);
  if (!src) return;
  const category = src.name;
  const sets = await query("SELECT * FROM tests WHERE category_id = ? ORDER BY id", [srcId]);
  const name = `${category} (copy)`.slice(0, 100);
  // Copies stay linked to the original: same link_id, a higher link_rank (the lowest rank is the one customers see).
  const linkId = src.link_id || randomUUID();
  if (!src.link_id) await query("UPDATE categories SET link_id = ?, link_rank = 0 WHERE id = ?", [linkId, srcId]);
  const [{ top }] = await query("SELECT COALESCE(MAX(link_rank), 0) AS top FROM categories WHERE link_id = ?", [linkId]);
  const { insertId: newCatId } = await query(
    "INSERT INTO categories (name, price, original_price, days, duration_seconds, sub_name, link_id, link_rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [name, src.price ?? null, src.original_price ?? null, src.days ?? null, src.duration_seconds ?? null, src.sub_name ?? null, linkId, Number(top) + 1]
  );
  await query("INSERT IGNORE INTO folders (category_id, name, position) SELECT ?, name, position FROM folders WHERE category_id = ?", [newCatId, srcId]);
  const newIds = new Map();
  for (const t of sets) newIds.set(t.id, await cloneSet(t, { title: t.title, category: { id: newCatId, name }, folder: t.folder, published: !!t.is_published, linked: true }));
  const oldIds = [...newIds.keys()];
  const pkgs = await query(
    `SELECT * FROM packages WHERE id IN (SELECT package_id FROM package_categories WHERE category_id = ?)
     ${oldIds.length ? `OR id IN (SELECT package_id FROM package_tests WHERE test_id IN (${oldIds.map(() => "?").join(",")}))` : ""}`,
    [srcId, ...oldIds]
  );
  for (const p of pkgs) {
    const res = await query(
      "INSERT INTO packages (name, description, days, price, original_price, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      [p.name, p.description, p.days, p.price, p.original_price, p.is_active]
    );
    await query("INSERT INTO package_categories (package_id, category_id, category) SELECT ?, ?, ? FROM package_categories WHERE package_id = ? AND category_id = ?", [res.insertId, newCatId, name, p.id, srcId]);
    const linked = oldIds.length ? await query(`SELECT test_id FROM package_tests WHERE package_id = ? AND test_id IN (${oldIds.map(() => "?").join(",")})`, [p.id, ...oldIds]) : [];
    for (const l of linked) await query("INSERT INTO package_tests (package_id, test_id) VALUES (?, ?)", [res.insertId, newIds.get(l.test_id)]);
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  redirect(`/admin?cat=${newCatId}`);
}

// Deletes a category: every set in it (questions/attempts cascade) plus its package links.
export async function deleteCategory(formData) {
  await requireRole("admin");
  const category = Number(formData.get("category"));
  if (!Number.isInteger(category) || category <= 0) return;
  await query("DELETE FROM tests WHERE category_id = ?", [category]);
  await query("DELETE FROM categories WHERE id = ?", [category]);
  await query("DELETE FROM folders WHERE category_id = ?", [category]);
  await query("DELETE FROM package_categories WHERE category_id = ?", [category]);
  await dropEmptyPackages();
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  redirect("/admin");
}

// Deleting a folder keeps its sets: they move back to the category's top level.
// Syncs a folder's membership to the ticked sets: ticked sets move in (out of any other folder), unticked sets that were in it go back to the category top level.
export async function addSetsToFolder(formData) {
  await requireRole("admin");
  const category = Number(formData.get("category"));
  const folder = String(formData.get("folder") || "").trim().slice(0, 100);
  const ids = formData.getAll("ids").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!(category > 0) || !folder) return;
  const marks = ids.map(() => "?").join(",");
  await query("INSERT IGNORE INTO folders (category_id, name) VALUES (?, ?)", [category, folder]);
  await query(`UPDATE tests SET folder = NULL WHERE category_id = ? AND folder = ?${ids.length ? ` AND id NOT IN (${marks})` : ""}`, [category, folder, ...ids]);
  if (ids.length) await query(`UPDATE tests SET folder = ? WHERE category_id = ? AND id IN (${marks})`, [folder, category, ...ids]);
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  redirect(`/admin?cat=${category}`);
}

// Saves the drag-and-drop order of a category's folders (names in display order).
export async function saveFolderOrder(category, names) {
  await requireRole("admin");
  category = Number(category);
  if (!(category > 0) || !Array.isArray(names)) return;
  for (const [i, n] of names.entries()) {
    const name = String(n || "").trim().slice(0, 100);
    if (!name) continue;
    await query("INSERT INTO folders (category_id, name, position) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE position = VALUES(position)", [category, name, i + 1]);
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
}

// Saves the drag-and-drop order of categories (ids in display order).
export async function saveCategoryOrder(ids) {
  await requireRole("admin");
  if (!Array.isArray(ids)) return;
  for (const [i, v] of ids.entries()) {
    const id = Number(v);
    if (Number.isInteger(id) && id > 0) await query("UPDATE categories SET position = ? WHERE id = ?", [i + 1, id]);
  }
  revalidatePath("/admin", "layout");
}

export async function deleteFolder(formData) {
  await requireRole("admin");
  const category = Number(formData.get("category"));
  const name = String(formData.get("folder") || "").trim();
  if (!(category > 0) || !name) return;
  await query("DELETE FROM tests WHERE category_id = ? AND folder = ?", [category, name]);
  await query("DELETE FROM folders WHERE category_id = ? AND name = ?", [category, name]);
  await dropEmptyPackages();
  revalidatePath("/admin", "layout");
  redirect(`/admin?cat=${category}`);
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
  const answers = {};
  for (const [k, v] of formData.entries()) if (k.startsWith("q_")) answers[k.slice(2)] = v;
  const res = await gradeAndSaveAttempt(user, testId, answers, formData.get("timed_out") === "1");
  if (res.error === "not_found") redirect("/customer");
  if (res.error === "no_access") redirect("/customer/packages");
  redirect(`/customer/results/${res.attemptId}`);
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
  const category = Number(formData.get("target"));
  const days = Math.floor(Number(formData.get("days")));
  const blankPrice = String(formData.get("price") ?? "").trim() === "";
  const price = blankPrice ? null : money(formData.get("price"));
  const original = money(formData.get("original_price"));
  if (!(category > 0)) return { ok: false, message: "Category missing.", at: Date.now() };
  if (price === null) {
    // Price is optional: blank clears the category price (existing set packages are left as they are).
    await query(
      "UPDATE categories SET days = NULL, price = NULL, original_price = NULL WHERE id = ?",
      [category]
    );
    refreshPackages();
    return { ok: true, message: "Price removed.", at: Date.now() };
  }
  if (!(days >= 1)) return { ok: false, message: "Enter days (1 or more).", at: Date.now() };
  const orig = original !== null && original > price ? original : null;
  await query(
    "UPDATE categories SET days = ?, price = ?, original_price = ? WHERE id = ?",
    [days, price, orig, category]
  );
  await query(
    `UPDATE packages p JOIN package_tests pt ON pt.package_id = p.id JOIN tests t ON t.id = pt.test_id
     SET p.days = ?, p.price = ?, p.original_price = ? WHERE t.category_id = ?`,
    [days, price, orig, category]
  );
  await query(
    `UPDATE packages p JOIN package_categories pc ON pc.package_id = p.id
     SET p.days = ?, p.price = ?, p.original_price = ?
     WHERE pc.category_id = ? AND (SELECT COUNT(*) FROM package_categories x WHERE x.package_id = p.id) = 1
       AND NOT EXISTS (SELECT 1 FROM package_tests pt WHERE pt.package_id = p.id)`,
    [days, price, orig, category]
  );
  refreshPackages();
  return { ok: true, message: "Price saved.", at: Date.now() };
}

// Time limit for a whole category: stored on the category (new sets inherit it) and applied to its existing sets.
// Renames a category everywhere it is referenced (sets, folders, package links). Refuses a name already in use.
export async function renameCategory(_prev, formData) {
  await requireRole("admin");
  const id = Number(formData.get("target"));
  const to = String(formData.get("name") || "").trim();
  if (!(id > 0)) return { ok: false, message: "Category missing.", at: Date.now() };
  if (!to) return { ok: false, message: "Enter a name.", at: Date.now() };
  if (to.length > 100) return { ok: false, message: "Name is too long (max 100).", at: Date.now() };
  const subName = String(formData.get("sub_name") || "").trim().slice(0, 100) || null;
  // Categories are identified by id, so several may share a name.
  await query("UPDATE categories SET name = ?, sub_name = ? WHERE id = ?", [to, subName, id]);
  await query("UPDATE tests SET category = ? WHERE category_id = ?", [to, id]);
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  return { ok: true, message: "Saved.", at: Date.now() };
}

export async function setCategoryTime(_prev, formData) {
  await requireRole("admin");
  const category = Number(formData.get("target"));
  if (!(category > 0)) return { ok: false, message: "Category missing.", at: Date.now() };
  const seconds = parseDuration(formData, "duration", true);
  await query("UPDATE categories SET duration_seconds = ? WHERE id = ?", [seconds, category]);
  await query("UPDATE tests SET duration_seconds = ?, duration_minutes = ? WHERE category_id = ?", [seconds, Math.ceil(seconds / 60), category]);
  revalidatePath("/admin", "layout");
  revalidatePath("/customer", "layout");
  return { ok: true, message: seconds ? "Time limit saved." : "Time limit removed.", at: Date.now() };
}

async function createSetPackage(t, { days, price, orig }) {
  const res = await query("INSERT INTO packages (name, description, days, price, original_price) VALUES (?, '', ?, ?, ?)", [String(t.title).slice(0, 150), days, price, orig]);
  await query("INSERT INTO package_tests (package_id, test_id) VALUES (?, ?)", [res.insertId, t.id]);
}

// Toggles one set paid (at its category's price) or free.
export async function toggleSetPaid(formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const t = await queryOne("SELECT id, title, category_id FROM tests WHERE id = ?", [id]);
  if (!t) return;
  const has = await queryOne("SELECT 1 AS x FROM package_tests WHERE test_id = ?", [id]);
  if (has) {
    await query("DELETE FROM package_tests WHERE test_id = ?", [id]);
    await dropEmptyPackages();
  } else {
    const c = await queryOne("SELECT days, price, original_price FROM categories WHERE id = ?", [t.category_id]);
    if (!c || c.price === null) return;
    await createSetPackage(t, { days: c.days, price: c.price, orig: c.original_price });
  }
  refreshPackages();
}

// Sets one set paid (at its category's price) or free and published or draft; used by the set page's Access switch.
export async function setSetPaid(_prev, formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const paid = formData.get("paid") === "1";
  const t = await queryOne("SELECT id, title, category_id FROM tests WHERE id = ?", [id]);
  if (!t) return { ok: false, message: "Set not found.", at: Date.now() };
  const has = await queryOne("SELECT 1 AS x FROM package_tests WHERE test_id = ?", [id]);
  if (formData.get("published") !== null) await query("UPDATE tests SET is_published = ? WHERE id = ?", [formData.get("published") === "1" ? 1 : 0, id]);
  if (paid && !has) {
    const c = await queryOne("SELECT days, price, original_price FROM categories WHERE id = ?", [t.category_id]);
    if (!c || c.price === null) return { ok: false, message: "Set a price on the category first (Sets → category → Price).", at: Date.now() };
    await createSetPackage(t, { days: c.days, price: c.price, orig: c.original_price });
  } else if (!paid && has) {
    await query("DELETE FROM package_tests WHERE test_id = ?", [id]);
    await dropEmptyPackages();
  }
  refreshPackages();
  return { ok: true, message: "Saved.", at: Date.now() };
}

export async function requestPackage(formData) {
  const user = await requireRole("customer");
  // A grouped category card posts the category: one purchase of a category-wide package unlocks all its sets.
  const category = Number(formData.get("category"));
  const id = category > 0 ? await ensureCategoryPackage(category) : Number(formData.get("id"));
  const res = id ? await requestPurchase(user, id) : { error: "not_found" };
  if (res.error) redirect("/customer/packages");
  if (res.status === "active") redirect("/customer/my-packages");
  if (res.created) revalidatePath("/admin/packages");
  redirect(res.whatsappUrl);
}

export async function reviewPurchase(formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision"));
  if (decision === "approve") {
    const pu = await queryOne(
      "SELECT pu.id, pu.user_id, p.name, p.days FROM purchases pu JOIN packages p ON p.id = pu.package_id WHERE pu.id = ? AND pu.status = 'pending'",
      [id]
    );
    if (pu) {
      await query(
        "UPDATE purchases SET status = 'active', starts_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id = ?",
        [pu.days, id]
      );
      await notify({ audience: "user", userId: pu.user_id, kind: "approved", title: "Purchase approved", body: `Your purchase of "${pu.name}" has been approved. It is now active and ready to use.`, purchaseId: id });
    }
  } else if (decision === "reject") {
    const pu = await queryOne("SELECT pu.user_id, p.name FROM purchases pu JOIN packages p ON p.id = pu.package_id WHERE pu.id = ? AND pu.status = 'pending'", [id]);
    await query("UPDATE purchases SET status = 'rejected' WHERE id = ? AND status = 'pending'", [id]);
    if (pu) await notify({ audience: "user", userId: pu.user_id, kind: "rejected", title: "Purchase rejected", body: `Your purchase request for "${pu.name}" was not approved. Please contact support if you think this is a mistake.`, purchaseId: id });
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
  const featured = formData.get("featured") ? 1 : 0;
  // Shown until the admin hides it (expires_at is legacy; kept far in the future).
  const url = hasImage ? await uploadImage(file) : null;
  const res = await query(
    "INSERT INTO announcements (title, body, has_image, image_url, featured, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 YEAR))",
    [title, body, hasImage ? 1 : 0, url, featured]
  );
  if (hasImage && !url) {
    await query("INSERT INTO announcement_images (announcement_id, mime, data) VALUES (?, ?, ?)", [res.insertId, file.type, Buffer.from(await file.arrayBuffer())]);
  }
  revalidatePath("/admin/announcements");
  revalidatePath("/customer/announcements");
  revalidatePath("/customer");
}

export async function updateAnnouncement(formData) {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const body = String(formData.get("body") || "").trim();
  if (!id || !title) return;
  const file = formData.get("image");
  const newImage = file && typeof file === "object" && file.size > 0 && IMG_TYPES.includes(file.type) && file.size <= IMG_MAX;
  await query("UPDATE announcements SET title = ?, body = ?, featured = ? WHERE id = ?", [title, body, formData.get("featured") ? 1 : 0, id]);
  if (newImage) {
    const url = await uploadImage(file);
    if (url) await query("DELETE FROM announcement_images WHERE announcement_id = ?", [id]);
    else await query("REPLACE INTO announcement_images (announcement_id, mime, data) VALUES (?, ?, ?)", [id, file.type, Buffer.from(await file.arrayBuffer())]);
    await query("UPDATE announcements SET has_image = 1, image_url = ? WHERE id = ?", [url, id]);
  } else if (formData.get("remove_image")) {
    await query("DELETE FROM announcement_images WHERE announcement_id = ?", [id]);
    await query("UPDATE announcements SET has_image = 0, image_url = NULL WHERE id = ?", [id]);
  }
  revalidatePath("/admin/announcements");
  revalidatePath("/customer/announcements");
  revalidatePath("/customer");
  redirect("/admin/announcements");
}

export async function toggleFeatured(formData) {
  await requireRole("admin");
  await query("UPDATE announcements SET featured = 1 - featured WHERE id = ?", [Number(formData.get("id"))]);
  revalidatePath("/admin/announcements");
  revalidatePath("/customer/announcements");
  revalidatePath("/customer");
  revalidatePath("/customer");
}

export async function toggleAnnouncementVisible(formData) {
  await requireRole("admin");
  await query("UPDATE announcements SET visible = 1 - visible WHERE id = ?", [Number(formData.get("id"))]);
  revalidatePath("/admin/announcements");
  revalidatePath("/customer/announcements");
  revalidatePath("/customer");
}

export async function deleteAnnouncement(formData) {
  await requireRole("admin");
  await query("DELETE FROM announcements WHERE id = ?", [Number(formData.get("id"))]);
  revalidatePath("/admin/announcements");
  revalidatePath("/customer/announcements");
  revalidatePath("/customer");
}

function cleanFormUrl(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 1000) : null;
  } catch {
    return null;
  }
}

// Adds a Google Form link as a set (no questions): it appears in the category list, and customers
// see it under Free Sets, or under Buy/My Packages when the admin marks it paid.
export async function createForm(formData) {
  await requireRole("admin");
  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const description = String(formData.get("description") || "").trim();
  const url = cleanFormUrl(formData.get("url"));
  if (!title || !url || url.length > 500) return;
  const paid = formData.get("access") === "paid";
  const days = Math.floor(Number(formData.get("days")));
  const price = money(formData.get("price"));
  if (paid && (!(days >= 1) || price === null || formData.get("price") === "")) return;
  const seconds = parseDuration(formData, "duration", true);
  const cat = await saveCategory(formData);
  const res = await query(
    "INSERT INTO tests (title, description, duration_seconds, duration_minutes, form_url, category, category_id, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
    [title, description, seconds, Math.ceil(seconds / 60), url, cat?.name ?? null, cat?.id ?? null]
  );
  if (paid) {
    const original = money(formData.get("original_price"));
    await createSetPackage({ id: res.insertId, title }, { days, price, orig: original !== null && original > price ? original : null });
  }
  refreshPackages();
}

// Admin switch: whether the mobile app blocks screenshots and screen recording.
export async function setScreenshotsBlocked(formData) {
  await requireRole("admin");
  await setSetting("screenshots_blocked", formData.get("blocked") === "0" ? "0" : "1");
  revalidatePath("/admin/settings");
}

// Admin: add / delete opening-date notices (title + date, both required). Customers see the upcoming ones with a countdown.
export async function addOpeningDate(formData) {
  await requireRole("admin");
  const label = String(formData.get("label") || "").trim().slice(0, 100);
  const date = String(formData.get("date") || "");
  if (!label || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  await ensureOpenings();
  const ms = Date.parse(String(formData.get("at") || ""));
  await query("INSERT INTO opening_dates (label, open_date, open_at) VALUES (?, ?, ?)", [label, date, Number.isNaN(ms) ? null : new Date(ms).toISOString()]);
  revalidatePath("/admin/opening-date");
  revalidatePath("/customer");
}

export async function deleteOpeningDate(formData) {
  await requireRole("admin");
  await ensureOpenings();
  await query("DELETE FROM opening_dates WHERE id = ?", [Number(formData.get("id"))]);
  revalidatePath("/admin/opening-date");
  revalidatePath("/customer");
}

export async function markAdminNotificationsRead() {
  await requireRole("admin");
  await markAllRead("admin", null);
  revalidatePath("/admin/notifications");
  revalidatePath("/", "layout");
}

export async function markAdminNotificationRead(id) {
  await requireRole("admin");
  await markRead("admin", null, id);
  revalidatePath("/", "layout");
}

export async function deleteAdminNotification(formData) {
  await requireRole("admin");
  const id = formData.get("id");
  await deleteNotifications("admin", null, id ? Number(id) : null);
  revalidatePath("/admin/notifications");
  revalidatePath("/", "layout");
}
