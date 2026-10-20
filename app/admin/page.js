import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import CategoryField from "@/components/CategoryField";
import { getCategories } from "@/lib/categories";
import ImportGoogleForm from "@/components/ImportGoogleForm";
import ImportScript from "@/components/ImportScript";
import SetTabs from "@/components/SetTabs";
import DurationFields from "@/components/DurationFields";
import { formatDuration } from "@/lib/duration";
import DeleteCategoryForm from "@/components/DeleteCategoryForm";
import { deleteCategory, createTest, copyTest, togglePublish, deleteTest } from "@/app/actions";

export default async function AdminTests({ searchParams }) {
  const { cat } = await searchParams;
  const tests = await query(`
    SELECT t.*, (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count,
           (SELECT COUNT(*) FROM attempts a WHERE a.test_id = t.id) AS attempt_count
    FROM tests t ORDER BY t.id ASC`);
  const categories = await getCategories();
  const groups = [...new Set(tests.map((t) => t.category || ""))].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map((name) => ({ name, sets: tests.filter((t) => (t.category || "") === name) }));
  const stats = await queryOne(`
    SELECT (SELECT COUNT(*) FROM tests) AS tests,
           (SELECT COUNT(*) FROM questions) AS questions,
           (SELECT COUNT(*) FROM attempts) AS attempts,
           (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customers`);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Manage tests, questions and see how customers are doing.</p>
        </div>
      </div>

      <div className="grid cols-4 keep2" style={{ marginBottom: 16 }}>
        {[["Tests", stats.tests], ["Questions", stats.questions], ["Attempts", stats.attempts], ["Customers", stats.customers]].map(([label, num]) => (
          <div className="card stat" key={label}>
            <span className="num">{num}</span>
            <span className="label">{label}</span>
          </div>
        ))}
      </div>

      <div id="new-set">
        <SetTabs
          manual={
            <form action={createTest} className="card stack">
              <h3>{cat ? `Add a set to “${cat}”` : "Create a new set"}</h3>
              <CategoryField key={cat || ""} titleOptional categories={categories} defaultValue={cat || ""} />
              <div className="row">
                <label className="grow" style={{ flex: "3 1 240px" }}>Set title<input name="title" required placeholder="e.g. Set 01" /></label>
                <div style={{ flex: "1 1 240px" }}><div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Time limit</div><DurationFields /></div>
              </div>
              <label>Description<textarea name="description" rows={2} placeholder="Short description (optional)" /></label>
              <div><button className="primary">Create &amp; add questions</button></div>
            </form>
          }
          script={<ImportScript categories={categories} />}
          link={<ImportGoogleForm categories={categories} defaultCategory={cat || ""} />}
        />
      </div>

      <div className="card-head" style={{ padding: "0 4px" }}>
        <h3>Categories &amp; sets</h3>
        <span className="muted">{groups.filter((g) => g.name).length} categories · {tests.length} sets</span>
      </div>
      <div className="stack" style={{ gap: 14 }}>
        {groups.map((g) => {
          return (
            <details className="cat-card" key={g.name} open={cat === g.name || groups.length === 1}>
              <summary>
                <div className="pkg-badges">
                  <span className="pkg-badge solid">{g.sets.length} {g.sets.length === 1 ? "set" : "sets"}</span>
                </div>
                <div className="cat-title">{g.name || "No category"}</div>
                <span className="cat-more">Manage sets <span className="cat-chev" aria-hidden="true">⌄</span></span>
              </summary>
              <div className="cat-sets">
                {g.sets.map((t, i) => (
                  <div className="cat-set" key={t.id}>
                    <div className="grow">
                      <span className="muted">{String(i + 1).padStart(2, "0")}</span>{" "}
                      <Link href={`/admin/tests/${t.id}`}><strong>{t.title}</strong></Link>
                      <div className="muted">{formatDuration(t.duration_seconds)} · {t.question_count} questions · {t.attempt_count} attempts</div>
                    </div>
                    <span className={`badge ${t.is_published ? "ok" : ""}`}>{t.is_published ? "Published" : "Draft"}</span>
                    <div className="row" style={{ gap: 8 }}>
                      <Link href={`/admin/tests/${t.id}`} className="btn sm">Edit</Link>
                      <form action={togglePublish}><input type="hidden" name="id" value={t.id} /><button className="sm">{t.is_published ? "Unpublish" : "Publish"}</button></form>
                      <form action={copyTest}><input type="hidden" name="id" value={t.id} /><button className="sm">Copy</button></form>
                      <form action={deleteTest}><input type="hidden" name="id" value={t.id} /><button className="sm danger">Delete</button></form>
                    </div>
                  </div>
                ))}
                {g.name && (
                  <div className="row between">
                    <Link href={`/admin?cat=${encodeURIComponent(g.name)}#new-set`} className="btn sm">+ Add set</Link>
                    <DeleteCategoryForm action={deleteCategory} category={g.name} count={g.sets.length} />
                  </div>
                )}
              </div>
            </details>
          );
        })}
        {tests.length === 0 && <div className="card empty">No sets yet — create your first one above.</div>}
      </div>
    </>
  );
}
