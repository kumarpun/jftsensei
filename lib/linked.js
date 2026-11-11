import { query } from "@/lib/db";

// Categories made by "Copy category" share a link_id. For customers, linked categories collapse into the oldest one
// (link_rank lowest): its name is shown, and a free set that exists in several linked categories (same origin) is listed once.
// `tests` must carry `category_id` and `id` (and optionally `origin_id`). Returns them filtered, each with `category` (and `category_id`) set to the lead category.
// Paid sets show a category's sub-category name when it has one (falls back to the category name).
export async function subNameMap() {
  const rows = await query("SELECT id, sub_name FROM categories WHERE sub_name IS NOT NULL AND sub_name <> ''");
  const m = new Map(rows.map((r) => [Number(r.id), r.sub_name]));
  // label(id, name): the sub-category name when set, else the category name.
  return (id, name) => m.get(Number(id)) || name;
}

export async function mergeLinkedFree(tests) {
  const rows = await query("SELECT id, name, link_id, link_rank FROM categories WHERE link_id IS NOT NULL");
  if (!rows.length) return tests;
  const info = new Map(rows.map((r) => [Number(r.id), { link: r.link_id, rank: Number(r.link_rank) || 0 }]));
  const lead = new Map();
  for (const r of rows) {
    const cur = lead.get(r.link_id);
    if (!cur || (Number(r.link_rank) || 0) < cur.rank) lead.set(r.link_id, { id: r.id, name: r.name, rank: Number(r.link_rank) || 0 });
  }
  // Keep, per (group, origin), the set from the lowest-ranked category that has it.
  const best = new Map();
  for (const t of tests) {
    const c = info.get(Number(t.category_id));
    if (!c) continue;
    const key = `${c.link}:${t.origin_id ?? t.id}`;
    if (!best.has(key) || c.rank < best.get(key).rank) best.set(key, { rank: c.rank, id: t.id });
  }
  return tests
    .filter((t) => {
      const c = info.get(Number(t.category_id));
      return !c || best.get(`${c.link}:${t.origin_id ?? t.id}`).id === t.id;
    })
    .map((t) => {
      const c = info.get(Number(t.category_id));
      return c ? { ...t, category: lead.get(c.link).name, category_id: lead.get(c.link).id } : t;
    });
}
