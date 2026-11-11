import PagedList from "@/components/PagedList";
import Link from "next/link";
import { query } from "@/lib/db";
import CategoryChecks from "@/components/CategoryChecks";
import CategoryField from "@/components/CategoryField";
import { getCategories } from "@/lib/categories";
import CategoryPrice from "@/components/CategoryPrice";
import { toggleSetPaid } from "@/app/actions";
import SetRowMenu from "@/components/SetRowMenu";
import NoPriceHint from "@/components/NoPriceHint";
import FolderMenu from "@/components/FolderMenu";
import SortableFolders from "@/components/SortableFolders";
import ManualSetWizard from "@/components/ManualSetWizard";
import SubmitButton from "@/components/SubmitButton";
import DurationFields from "@/components/DurationFields";
import { formatDuration } from "@/lib/duration";

export default async function AdminTests({ searchParams }) {
  const { cat } = await searchParams;
  const tests = await query(`
    SELECT t.*, (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count,
           (SELECT COUNT(*) FROM attempts a WHERE a.test_id = t.id) AS attempt_count
    FROM tests t ORDER BY t.id ASC`);
  const categories = await getCategories();
  const groups = [...new Set([...tests.map((t) => t.category || ""), ...categories])].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map((name) => ({ name, sets: tests.filter((t) => (t.category || "") === name) }));
  const folderRows = await query("SELECT category, name, position FROM folders");
  const catRows = await query("SELECT name, price, original_price, days, duration_seconds, position, sub_name FROM categories");
  const catPos = new Map(catRows.map((c) => [c.name, Number(c.position) || 1e9]));
  groups.sort((a, b) => (a.name === "" ? 1 : b.name === "" ? -1 : (catPos.get(a.name) ?? 1e9) - (catPos.get(b.name) ?? 1e9) || a.name.localeCompare(b.name)));
  const pkgRows = await query(
    `SELECT pc.category AS target, 'category' AS kind, p.* FROM package_categories pc JOIN packages p ON p.id = pc.package_id
     UNION ALL
     SELECT CAST(pt.test_id AS CHAR), 'test', p.* FROM package_tests pt JOIN packages p ON p.id = pt.package_id`
  );
  const paidOf = (kind, target) => pkgRows.find((r) => r.kind === kind && String(r.target) === String(target));

  const setRow = (t, i) => (
    <div className="cat-set" key={t.id}>
      <div className="grow">
        <span className="muted">{String(i + 1).padStart(2, "0")}</span>{" "}
        <Link href={`/admin/tests/${t.id}`}><strong>{t.title}</strong></Link>
        <div className="muted">{t.form_url && t.question_count === 0 ? `Google Form${t.duration_seconds > 0 ? ` · ${formatDuration(t.duration_seconds)}` : ""}` : `${t.duration_seconds > 0 ? `${formatDuration(t.duration_seconds)} · ` : ""}${t.question_count} questions · ${t.attempt_count} attempts`}</div>
      </div>
      {paidOf("test", t.id) ? (
        <form action={toggleSetPaid}><input type="hidden" name="id" value={t.id} /><button className="sm" title="Click to make this set free"><span className="badge ok">Paid · {Number(paidOf("test", t.id).price)}</span></button></form>
      ) : catRows.find((c) => c.name === t.category)?.price != null ? (
        <form action={toggleSetPaid}><input type="hidden" name="id" value={t.id} /><button className="sm" title="Make this set paid at the category price">Free · make paid</button></form>
      ) : <NoPriceHint />}
      <span className={`badge ${t.is_published ? "ok" : ""}`}>{t.is_published ? "Published" : "Draft"}</span>
      <SetRowMenu id={t.id} published={!!t.is_published} title={t.title} />
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sets</h1>
          <p className="muted">Manage categories, sets and questions.</p>
        </div>
      </div>

      <div className="card-head" style={{ padding: "0 4px 8px" }}>
        <h3>Categories &amp; sets</h3>
        <div className="row" style={{ gap: 12, alignItems: "center" }}>
          <span className="muted">{groups.filter((g) => g.name).length} categories · {tests.length} sets</span>
          <ManualSetWizard kind="category" />
        </div>
      </div>
      <div className="stack" style={{ gap: 14 }}>
        {(() => {
          const cards = groups.map((g) => {
          return (
            <div className="cat-wrap" key={g.name}>
            {g.name && <div className="cat-price-corner"><CategoryPrice category={g.name} cat={catRows.find((c) => c.name === g.name)} paidCount={g.sets.filter((t) => paidOf("test", t.id)).length} total={g.sets.length} /></div>}
            <details className="cat-card" open={cat === g.name || groups.length === 1}>
              <summary>
                <div className="pkg-badges">
                  <span className="pkg-badge solid">{g.sets.length} {g.sets.length === 1 ? "set" : "sets"}</span>
                </div>
                <div className="cat-title">{g.name || "No category"}{catRows.find((c) => c.name === g.name)?.sub_name && <> (<strong>{catRows.find((c) => c.name === g.name).sub_name}</strong>)</>}</div>
                <span className="cat-more">Manage sets <span className="cat-chev" aria-hidden="true">⌄</span></span>
              </summary>
              <div className="cat-sets">
                {g.name && (
                  <div className="row" style={{ gap: 8 }}>
                    <ManualSetWizard kind="set" category={g.name} />
                    <ManualSetWizard kind="folder" category={g.name} />
                  </div>
                )}
                {g.name && (() => {
                  const pos = new Map(folderRows.filter((f) => f.category === g.name).map((f) => [f.name, Number(f.position) || 1e9]));
                  const names = [...new Set([...pos.keys(), ...g.sets.map((t) => t.folder).filter(Boolean)])]
                    .sort((x, y) => (pos.get(x) ?? 1e9) - (pos.get(y) ?? 1e9) || x.localeCompare(y));
                  return (
                    <SortableFolders key={names.join("|")} category={g.name} names={names}>
                      {names.map((fname, fi) => {
                        const fsets = g.sets.filter((t) => t.folder === fname);
                        return (
                          <div className="folder-wrap" key={fname}>
                            <details className="folder-card" open={fi === 0}>
                              <summary>
                                <span className="folder-ico" aria-hidden="true">📁</span>
                                <strong className="grow">{fname}</strong>
                                <span className="muted">{fsets.length} {fsets.length === 1 ? "set" : "sets"}</span>
                                <span className="cat-chev" aria-hidden="true">⌄</span>
                              </summary>
                              <PagedList className="cat-sets set-scroll">{fsets.map(setRow)}</PagedList>
                            </details>
                            <div className="folder-menu">
                              <FolderMenu key={fsets.map((t) => t.id).join(",")} category={g.name} folder={fname} count={fsets.length} sets={g.sets.map((t) => ({ id: t.id, title: t.title, folder: t.folder || "" }))} />
                            </div>
                          </div>
                        );
                      })}
                    </SortableFolders>
                  );
                })()}
                <PagedList className="cat-sets set-scroll">{g.sets.filter((t) => !t.folder).map(setRow)}</PagedList>
              </div>
            </details>
            </div>
          );
          });
          const named = groups.map((g, i) => [g.name, cards[i]]).filter(([n]) => n);
          return (
            <>
              <SortableFolders key={named.map(([n]) => n).join("|")} kind="category" names={named.map(([n]) => n)}>{named.map(([, c]) => c)}</SortableFolders>
              {groups.map((g, i) => (g.name ? null : cards[i]))}
            </>
          );
        })()}
        {groups.length === 0 && <div className="card empty">No sets yet — add a category to get started.</div>}
      </div>
    </>
  );
}
