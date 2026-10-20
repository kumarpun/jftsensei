import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

const conn = await mysql.createConnection({
  host: DB_HOST,
  port: Number(DB_PORT || 3306),
  user: DB_USER,
  password: DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
  multipleStatements: true,
});

await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4`);
await conn.changeUser({ database: DB_NAME });

await conn.query(`
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(30) NULL UNIQUE,
  email VARCHAR(190) NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('admin','customer') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 30,
  duration_seconds INT NOT NULL DEFAULT 1800,
  form_url VARCHAR(500) NULL,
  category VARCHAR(100) NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_id INT NOT NULL,
  text TEXT NOT NULL,
  option_a VARCHAR(500) NOT NULL,
  option_b VARCHAR(500) NOT NULL,
  option_c VARCHAR(500) NOT NULL,
  option_d VARCHAR(500) NOT NULL,
  correct_option CHAR(1) NOT NULL,
  marks INT NOT NULL DEFAULT 1,
  video_id VARCHAR(20) NULL,
  has_image TINYINT(1) NOT NULL DEFAULT 0,
  section VARCHAR(100) NULL,
  feedback TEXT NULL,
  feedback_correct TEXT NULL,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS question_images (
  question_id INT PRIMARY KEY,
  mime VARCHAR(50) NOT NULL,
  data MEDIUMBLOB NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  days INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS package_categories (
  package_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  PRIMARY KEY (package_id, category),
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS package_tests (
  package_id INT NOT NULL,
  test_id INT NOT NULL,
  PRIMARY KEY (package_id, test_id),
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  package_id INT NOT NULL,
  status ENUM('pending','active','rejected') NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  starts_at DATETIME NULL,
  expires_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  has_image TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS announcement_images (
  announcement_id INT PRIMARY KEY,
  mime VARCHAR(50) NOT NULL,
  data MEDIUMBLOB NOT NULL,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS categories (
  name VARCHAR(100) PRIMARY KEY
);
INSERT IGNORE INTO categories (name) SELECT DISTINCT category FROM tests WHERE category IS NOT NULL AND category <> '';
CREATE TABLE IF NOT EXISTS sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);
INSERT IGNORE INTO sections (name) VALUES
  ('Script and Vocabulary'), ('Conversation and Expression'), ('Listening Comprehension'), ('Reading Comprehension');
CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  test_id INT NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  timed_out TINYINT(1) NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS attempt_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT NOT NULL,
  question_id INT NOT NULL,
  selected CHAR(1) NULL,
  is_correct TINYINT(1) NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
`);

// Columns added after the first release: CREATE TABLE IF NOT EXISTS won't add them to existing tables.
const [fb] = await conn.query(
  "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'questions' AND column_name = 'feedback'"
);
if (fb.length === 0) await conn.query("ALTER TABLE questions ADD COLUMN feedback TEXT NULL");
const [fbc] = await conn.query(
  "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'questions' AND column_name = 'feedback_correct'"
);
if (fbc.length === 0) await conn.query("ALTER TABLE questions ADD COLUMN feedback_correct TEXT NULL");

// Category-level default price: sets made paid inside a category use it.
for (const [col, ddl] of [["price", "DECIMAL(10,2) NULL"], ["original_price", "DECIMAL(10,2) NULL"], ["days", "INT NULL"]]) {
  const [has] = await conn.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'categories' AND column_name = ?", [col]
  );
  if (has.length === 0) await conn.query(`ALTER TABLE categories ADD COLUMN ${col} ${ddl}`);
}

// Images live on freeimage.host; older rows keep their blob in question_images / announcement_images.
for (const table of ["questions", "announcements"]) {
  const [has] = await conn.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'image_url'", [table]
  );
  if (has.length === 0) await conn.query(`ALTER TABLE ${table} ADD COLUMN image_url VARCHAR(500) NULL`);
}

const [admins] = await conn.query("SELECT id FROM users WHERE email = ?", [ADMIN_EMAIL]);
if (admins.length === 0) {
  await conn.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
    ["Admin", ADMIN_EMAIL, await bcrypt.hash(ADMIN_PASSWORD, 10)]
  );
  console.log(`Admin created: ${ADMIN_EMAIL}`);
}

const [tests] = await conn.query("SELECT id FROM tests LIMIT 1");
if (tests.length === 0) {
  const [r] = await conn.query(
    "INSERT INTO tests (title, description, duration_minutes, duration_seconds, is_published) VALUES (?, ?, ?, ?, 1)",
    ["Sample General Knowledge Test", "A short sample test to try the app.", 5, 300]
  );
  const qs = [
    ["What is the capital of France?", "Berlin", "Madrid", "Paris", "Rome", "C"],
    ["Which planet is known as the Red Planet?", "Venus", "Mars", "Jupiter", "Saturn", "B"],
    ["What is 12 x 12?", "124", "144", "132", "156", "B"],
  ];
  for (const q of qs) {
    await conn.query(
      "INSERT INTO questions (test_id, text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [r.insertId, ...q]
    );
  }
  console.log("Sample test created");
}

await conn.end();
console.log("DB ready");
