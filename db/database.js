// db/database.js
// طبقة قاعدة البيانات باستخدام libSQL (متوافقة مع SQLite).
// محليًا: يعمل على ملف SQLite محلي (بدون أي اعتماد على مكتبات أصلية تحتاج بناء/تجميع).
// على Render (أو أي استضافة سحابية): إذا تم ضبط TURSO_DATABASE_URL و TURSO_AUTH_TOKEN،
// يتصل النظام بقاعدة بيانات Turso السحابية الدائمة — حتى لا تُفقد البيانات عند كل إعادة نشر
// (خوادم Render المجانية تستخدم تخزينًا مؤقتًا يُمسح مع كل Deploy أو إعادة تشغيل).

const path = require('path');
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const useRemote = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

const db = useRemote
  ? createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
  : createClient({ url: 'file:' + path.join(__dirname, '..', 'requests.db') });

if (useRemote) {
  console.log('✔ قاعدة البيانات: متصلة بـ Turso (سحابية دائمة)');
} else {
  console.log('✔ قاعدة البيانات: ملف SQLite محلي (requests.db)');
}

// ---------- دوال مساعدة تبسّط الاستعلامات (تحوّل BigInt الناتج عن libSQL إلى Number عادي) ----------
async function get(sql, args = []) {
  const rs = await db.execute({ sql, args });
  return rs.rows[0] || null;
}
async function all(sql, args = []) {
  const rs = await db.execute({ sql, args });
  return rs.rows;
}
async function run(sql, args = []) {
  const rs = await db.execute({ sql, args });
  return {
    lastInsertRowid: rs.lastInsertRowid !== undefined && rs.lastInsertRowid !== null ? Number(rs.lastInsertRowid) : undefined,
    changes: rs.rowsAffected
  };
}

async function initSchema() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        name               TEXT NOT NULL,
        email              TEXT NOT NULL UNIQUE,
        password_hash      TEXT NOT NULL,
        department         TEXT NOT NULL,
        role               TEXT NOT NULL DEFAULT 'employee'
                           CHECK (role IN ('employee', 'admin')),
        email_verified     INTEGER NOT NULL DEFAULT 0,
        verification_code  TEXT,
        failed_attempts    INTEGER NOT NULL DEFAULT 0,
        locked_until       TEXT,
        reset_code         TEXT,
        reset_expires      TEXT,
        created_at         TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS requests (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id          INTEGER NOT NULL,
        type             TEXT NOT NULL,
        title            TEXT NOT NULL,
        description      TEXT,
        priority         TEXT NOT NULL DEFAULT 'عادية'
                         CHECK (priority IN ('عادية', 'عاجلة')),
        status           TEXT NOT NULL DEFAULT 'قيد المراجعة'
                         CHECK (status IN ('قيد المراجعة', 'قيد التنفيذ', 'تمت الموافقة', 'مرفوض')),
        admin_note       TEXT,
        attachment_name  TEXT,
        attachment_type  TEXT,
        attachment_data  TEXT,
        created_at       TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS request_types (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL UNIQUE,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS request_comments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id  INTEGER NOT NULL,
        user_id     INTEGER NOT NULL,
        message     TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id    INTEGER,
        actor_name  TEXT NOT NULL,
        action      TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id   INTEGER,
        details     TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status  ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_comments_request  ON request_comments(request_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created      ON audit_log(created_at);
  `);
}

// يزرع أنواع الطلبات الافتراضية عند أول تشغيل فقط (الجدول فارغ)
async function seedRequestTypes() {
  const row = await get('SELECT COUNT(*) AS c FROM request_types');
  if (row.c > 0) return;
  const defaults = ['إجازة', 'صيانة', 'دعم فني', 'حجز قاعة اجتماعات', 'مستلزمات مكتبية', 'أخرى'];
  for (const name of defaults) {
    await run('INSERT INTO request_types (name) VALUES (?)', [name]);
  }
}

// يزيل قيد CHECK القديم على عمود type في requests (كان يقصر الأنواع على قائمة ثابتة)
// حتى يسمح النظام بأنواع طلبات يضيفها المسؤول ديناميكيًا. إعادة بناء الجدول تنفَّذ مرة واحدة فقط.
async function migrateRequestsTypeCheck() {
  const row = await get("SELECT sql FROM sqlite_master WHERE type='table' AND name='requests'");
  if (!row || !row.sql || !row.sql.includes('CHECK (type IN')) return;

  await db.executeMultiple(`
    ALTER TABLE requests RENAME TO requests_old;

    CREATE TABLE requests (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id          INTEGER NOT NULL,
        type             TEXT NOT NULL,
        title            TEXT NOT NULL,
        description      TEXT,
        priority         TEXT NOT NULL DEFAULT 'عادية'
                         CHECK (priority IN ('عادية', 'عاجلة')),
        status           TEXT NOT NULL DEFAULT 'قيد المراجعة'
                         CHECK (status IN ('قيد المراجعة', 'قيد التنفيذ', 'تمت الموافقة', 'مرفوض')),
        admin_note       TEXT,
        attachment_name  TEXT,
        attachment_type  TEXT,
        attachment_data  TEXT,
        created_at       TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    INSERT INTO requests (id,user_id,type,title,description,priority,status,admin_note,created_at,updated_at)
    SELECT id,user_id,type,title,description,priority,status,admin_note,created_at,updated_at FROM requests_old;
    DROP TABLE requests_old;

    CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status  ON requests(status);
  `);
  console.log('✔ تم تحديث جدول الطلبات ليدعم أنواع طلبات مخصصة');
}

// يضيف الأعمدة الجديدة على قاعدة بيانات موجودة مسبقًا من إصدار سابق للنظام
async function migrate() {
  const userCols = (await all("PRAGMA table_info(users)")).map(c => c.name);
  if (!userCols.includes('email_verified')) {
    await db.executeMultiple("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;");
    await run('UPDATE users SET email_verified = 1');
  }
  if (!userCols.includes('verification_code')) {
    await db.executeMultiple("ALTER TABLE users ADD COLUMN verification_code TEXT;");
  }
  if (!userCols.includes('failed_attempts')) {
    await db.executeMultiple("ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;");
  }
  if (!userCols.includes('locked_until')) {
    await db.executeMultiple("ALTER TABLE users ADD COLUMN locked_until TEXT;");
  }
  if (!userCols.includes('reset_code')) {
    await db.executeMultiple("ALTER TABLE users ADD COLUMN reset_code TEXT;");
  }
  if (!userCols.includes('reset_expires')) {
    await db.executeMultiple("ALTER TABLE users ADD COLUMN reset_expires TEXT;");
  }

  const reqCols = (await all("PRAGMA table_info(requests)")).map(c => c.name);
  if (!reqCols.includes('attachment_name')) {
    await db.executeMultiple("ALTER TABLE requests ADD COLUMN attachment_name TEXT;");
  }
  if (!reqCols.includes('attachment_type')) {
    await db.executeMultiple("ALTER TABLE requests ADD COLUMN attachment_type TEXT;");
  }
  if (!reqCols.includes('attachment_data')) {
    await db.executeMultiple("ALTER TABLE requests ADD COLUMN attachment_data TEXT;");
  }
}

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@moe.gov.sa';
  const existing = await get('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (existing) return;

  const passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@12345', 10);
  await run(`
    INSERT INTO users (name, email, password_hash, department, role, email_verified)
    VALUES (?, ?, ?, ?, 'admin', 1)
  `, [
    process.env.ADMIN_NAME || 'مسؤول النظام',
    adminEmail,
    passwordHash,
    process.env.ADMIN_DEPARTMENT || 'إدارة تقنية المعلومات'
  ]);

  console.log(`✔ تم إنشاء حساب المسؤول الافتراضي: ${adminEmail}`);
}

let readyPromise = null;
function initDatabase() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await db.execute('PRAGMA foreign_keys = ON');
      await initSchema();
      await migrate();
      await migrateRequestsTypeCheck();
      await seedRequestTypes();
      await seedAdmin();
    })();
  }
  return readyPromise;
}

module.exports = { db, get, all, run, initDatabase };
