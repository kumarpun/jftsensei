import { query } from "@/lib/db";
import { subNameMap } from "@/lib/linked";
import { route, json } from "@/lib/api";

export const GET = route(async ({ user }) => {
  const label = await subNameMap();
  const catName = new Map((await query("SELECT id, name FROM categories")).map((r) => [r.id, r.name]));
  const [packages, titles, mine, included, pkgCats] = await Promise.all([
    query("SELECT * FROM packages WHERE is_active = 1 ORDER BY price, id"),
    query(
      `SELECT pc.package_id, t.id, t.title, t.category, t.category_id, t.folder, t.form_url, t.duration_seconds, (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count
       FROM package_categories pc JOIN tests t ON t.category_id = pc.category_id AND t.is_published = 1
       UNION
       SELECT pt.package_id, t.id, t.title, t.category, t.category_id, t.folder, t.form_url, t.duration_seconds, (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count
       FROM package_tests pt JOIN tests t ON t.id = pt.test_id AND t.is_published = 1 ORDER BY id`
    ),
    query(
      `SELECT package_id, status, expires_at FROM purchases
       WHERE user_id = ? AND (status = 'pending' OR (status = 'active' AND expires_at > NOW()))`,
      [user.id]
    ),
    query(
      `SELECT pc.package_id, pc.category_id, MAX(t.category) AS category, COUNT(t.id) AS sets
       FROM package_categories pc JOIN tests t ON t.category_id = pc.category_id AND t.is_published = 1
       GROUP BY pc.package_id, pc.category_id ORDER BY category, pc.category_id`
    ),
    query(
      `SELECT pt.package_id, t.category_id, t.category FROM package_tests pt JOIN tests t ON t.id = pt.test_id WHERE t.category_id IS NOT NULL`
    ),
  ]);
  // Only packages with at least one published set are on sale.
  const onSale = packages.filter((p) => titles.some((r) => r.package_id === p.id));
  const kind = (p) => {
    const cats = included.filter((r) => r.package_id === p.id);
    const setCats = [...new Set(pkgCats.filter((r) => r.package_id === p.id).map((r) => r.category_id))].filter((c) => !cats.some((x) => x.category_id === c));
    return { cats, setCats };
  };
  // Sets sold one by one collapse into one entry per category; buying it requests a category-wide package.
  const groups = new Map();
  const rest = [];
  for (const p of onSale) {
    const { cats, setCats } = kind(p);
    if (cats.length === 0 && setCats.length === 1) groups.set(setCats[0], [...(groups.get(setCats[0]) || []), p]);
    else rest.push(p);
  }
  const catPkg = new Map();
  const standalone = [];
  for (const p of rest) {
    const { cats, setCats } = kind(p);
    if (cats.length === 1 && setCats.length === 0 && groups.has(cats[0].category_id) && !catPkg.has(cats[0].category_id)) catPkg.set(cats[0].category_id, p);
    else standalone.push(p);
  }
  const testJson = (t) => ({ id: t.id, title: t.title, category: label(t.category_id, t.category), folder: t.folder || null, formUrl: t.form_url, durationSeconds: t.duration_seconds, questionCount: Number(t.question_count) });
  const grouped = [...groups].map(([c, list]) => {
    const p = list[0];
    const cp = catPkg.get(c);
    const cpOwn = cp && mine.find((m) => m.package_id === cp.id);
    const owns = list.map((x) => mine.find((m) => m.package_id === x.id));
    const active = cpOwn?.status === "active" || owns.every((o) => o?.status === "active");
    const pending = !active && (cpOwn?.status === "pending" || owns.every((o) => o));
    const seen = new Set();
    const tests = list.flatMap((x) => titles.filter((r) => r.package_id === x.id)).filter((t) => !seen.has(t.id) && seen.add(t.id));
    return {
      id: p.id,
      category: String(c), // category id; POSTed back to /packages/category/request
      name: label(c, catName.get(c)),
      description: "",
      days: p.days,
      price: Number(p.price),
      originalPrice: p.original_price === null ? null : Number(p.original_price),
      tests: tests.map(testJson),
      categories: [],
      setCategories: [],
      myStatus: active ? "active" : pending ? "pending" : null,
      expiresAt: active ? (cpOwn?.status === "active" ? cpOwn.expires_at : owns[0]?.expires_at) : null,
    };
  });
  return json({
    packages: [...grouped, ...standalone
      .map((p) => {
        const own = mine.find((m) => m.package_id === p.id);
        const cats = included.filter((r) => r.package_id === p.id);
        const setCats = [...new Set(pkgCats.filter((r) => r.package_id === p.id).map((r) => r.category_id))].filter((c) => !cats.some((x) => x.category_id === c));
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          days: p.days,
          price: Number(p.price),
          originalPrice: p.original_price === null ? null : Number(p.original_price),
          tests: titles.filter((r) => r.package_id === p.id).map(testJson),
          // Whole categories sold in the package (sub-category name shown when set) and categories of individually added sets.
          categories: cats.map((c) => ({ name: label(c.category_id, c.category), sets: Number(c.sets) })),
          setCategories: setCats.map((c) => label(c, catName.get(c))),
          myStatus: own ? own.status : null, // "pending" | "active" | null
          expiresAt: own?.status === "active" ? own.expires_at : null,
        };
      })],
  });
});
