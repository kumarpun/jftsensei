// One-off, idempotent migration: categories become identified by an integer id instead of their name,
// so two categories may share a name.
//
//   categories      name PK            -> id AUTO_INCREMENT PK, name (not unique)
//   tests           category (name)    -> + category_id
//   folders         PK (category,name) -> id PK, category_id, name   (folder names stay unique per category)
//   package_categories PK (package_id, category) -> PK (package_id, category_id)
//
// TiDB cannot change a clustered primary key in place, so each table is rebuilt (CREATE new, INSERT..SELECT, swap).
// Old tables are kept as bak_<table>_<timestamp> so the change can be rolled back with RENAME TABLE.
// The legacy name columns on tests/folders/package_categories are left in place (display only) and can be dropped later.
//
// Run: node --env-file=.env scripts/migrate-category-id.mjs [--dry]
import mysql from "mysql2/promise";

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
const dry = process.argv.includes("--dry");

const conn = await mysql.createConnection({
  host: DB_HOST,
  port: Number(DB_PORT || 3306),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
});

const run = async (sql, params) => {
  console.log(`${dry ? "[dry] " : ""}${sql.replace(/\s+/g, " ").trim()}`);
  if (!dry) return conn.query(sql, params);
};
const hasCol = async (table, col) =>
  (await conn.query("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?", [table, col]))[0].length > 0;

if (await hasCol("categories", "id")) {
  console.log("categories already has id - nothing to do.");
  await conn.end();
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const bak = (t) => `bak_${t}_${stamp}`;

// 0. Safety: refuse to run with orphans we cannot map (a set/folder/link pointing at a missing category).
await run("INSERT IGNORE INTO categories (name) SELECT DISTINCT category FROM tests WHERE category IS NOT NULL AND category <> ''");
await run("INSERT IGNORE INTO categories (name) SELECT DISTINCT category FROM folders");
await run("INSERT IGNORE INTO categories (name) SELECT DISTINCT category FROM package_categories");

// 1. Backups (full copies of the four tables that change).
for (const t of ["categories", "tests", "folders", "package_categories"]) {
  await run(`CREATE TABLE ${bak(t)} AS SELECT * FROM ${t}`);
}

// 2. categories: rebuild with an auto-increment id; existing rows keep their data.
await run(`CREATE TABLE categories_new (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NULL,
  original_price DECIMAL(10,2) NULL,
  days INT NULL,
  duration_seconds INT NULL,
  position INT NOT NULL DEFAULT 0,
  sub_name VARCHAR(100) NULL,
  link_id VARCHAR(36) NULL,
  link_rank INT NOT NULL DEFAULT 0,
  KEY idx_categories_name (name)
)`);
await run(`INSERT INTO categories_new (name, price, original_price, days, duration_seconds, position, sub_name, link_id, link_rank)
  SELECT name, price, original_price, days, duration_seconds, position, sub_name, link_id, link_rank FROM categories ORDER BY position, name`);

// 3. tests.category_id, backfilled by name (names were unique until now, so the join is exact).
await run("ALTER TABLE tests ADD COLUMN category_id INT NULL");
await run("UPDATE tests t JOIN categories_new c ON c.name = t.category SET t.category_id = c.id");
await run("ALTER TABLE tests ADD KEY idx_tests_category_id (category_id)");

// 4. folders: id PK + category_id.
await run(`CREATE TABLE folders_new (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  category VARCHAR(100) NULL,
  name VARCHAR(100) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_folder (category_id, name)
)`);
await run(`INSERT INTO folders_new (category_id, category, name, position)
  SELECT c.id, f.category, f.name, f.position FROM folders f JOIN categories_new c ON c.name = f.category`);

// 5. package_categories: PK (package_id, category_id).
await run(`CREATE TABLE package_categories_new (
  package_id INT NOT NULL,
  category_id INT NOT NULL,
  category VARCHAR(100) NULL,
  PRIMARY KEY (package_id, category_id)
)`);
await run(`INSERT INTO package_categories_new (package_id, category_id, category)
  SELECT pc.package_id, c.id, pc.category FROM package_categories pc JOIN categories_new c ON c.name = pc.category`);

// 6. Verify row counts before swapping.
if (!dry) {
  const n = async (t) => (await conn.query(`SELECT COUNT(*) AS n FROM ${t}`))[0][0].n;
  const [[a, b], [c, d], [e, f]] = [
    [await n("categories"), await n("categories_new")],
    [await n("folders"), await n("folders_new")],
    [await n("package_categories"), await n("package_categories_new")],
  ];
  const [[{ miss }]] = await conn.query("SELECT COUNT(*) AS miss FROM tests WHERE category IS NOT NULL AND category <> '' AND category_id IS NULL");
  console.log({ categories: [a, b], folders: [c, d], package_categories: [e, f], tests_without_id: miss });
  if (a !== b || c !== d || e !== f || miss) {
    console.error("Row counts do not match - NOT swapping. New tables left as *_new; backups intact.");
    process.exit(1);
  }
}

// 7. Swap.
for (const t of ["categories", "folders", "package_categories"]) {
  await run(`RENAME TABLE ${t} TO ${t}_old_${stamp}, ${t}_new TO ${t}`);
}
console.log(`Done. Backups: bak_*_${stamp}; replaced tables kept as *_old_${stamp}.`);
await conn.end();
