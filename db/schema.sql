-- ============================================================
-- مخطط قاعدة البيانات: نظام الطلبات الإدارية
-- محرك القاعدة: SQLite / libSQL (متوافق تمامًا مع SQLite)
-- محليًا: يعمل على ملف requests.db. على الاستضافة السحابية: يعمل على Turso (قاعدة بيانات
-- libSQL دائمة عبر الشبكة) حتى لا تُفقد البيانات مع كل إعادة نشر على منصات مثل Render.
-- ملاحظة: هذا الملف للتوثيق والمرجعية أثناء عرض المشروع.
-- الجداول تُنشأ فعليًا وتُدار برمجيًا من db/database.js عند تشغيل الخادم.
-- ============================================================

-- جدول المستخدمين (الموظفون والمسؤولون)
CREATE TABLE IF NOT EXISTS users (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    name               TEXT NOT NULL,
    email              TEXT NOT NULL UNIQUE,
    password_hash      TEXT NOT NULL,              -- مشفّرة عبر bcrypt، لا تُخزَّن أبدًا كنص صريح
    department         TEXT NOT NULL,
    role               TEXT NOT NULL DEFAULT 'employee'
                       CHECK (role IN ('employee', 'admin')),
    email_verified     INTEGER NOT NULL DEFAULT 0,   -- 0 = بانتظار تفعيل البريد، 1 = مُفعَّل
    verification_code  TEXT,                          -- رمز تفعيل البريد المؤقت
    failed_attempts    INTEGER NOT NULL DEFAULT 0,   -- عداد محاولات الدخول الفاشلة المتتالية
    locked_until       TEXT,                          -- وقت انتهاء القفل المؤقت للحساب (إن وجد)
    reset_code         TEXT,                          -- رمز إعادة تعيين كلمة المرور المؤقت
    reset_expires      TEXT,                          -- وقت انتهاء صلاحية رمز إعادة التعيين
    created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- جدول الطلبات
CREATE TABLE IF NOT EXISTS requests (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL,
    type             TEXT NOT NULL,                  -- يشير إلى اسم في جدول request_types
    title            TEXT NOT NULL,
    description      TEXT,
    priority         TEXT NOT NULL DEFAULT 'عادية'
                     CHECK (priority IN ('عادية', 'عاجلة')),
    status           TEXT NOT NULL DEFAULT 'قيد المراجعة'
                     CHECK (status IN ('قيد المراجعة', 'قيد التنفيذ', 'تمت الموافقة', 'مرفوض')),
    admin_note       TEXT,
    attachment_name  TEXT,                            -- اسم الملف المرفق (إن وجد)
    attachment_type  TEXT,                            -- نوع MIME للملف المرفق
    attachment_data  TEXT,                            -- محتوى الملف بترميز Base64 (حتى 2 ميغابايت)
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول أنواع الطلبات (قابل للتعديل الكامل من لوحة المسؤول)
CREATE TABLE IF NOT EXISTS request_types (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- جدول تعليقات الطلبات (محادثة بين الموظف صاحب الطلب والمسؤول)
CREATE TABLE IF NOT EXISTS request_comments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    message     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول سجل التدقيق (يسجّل كل إجراء إداري: إنشاء/تعديل/حذف/تصدير)
CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id    INTEGER,
    actor_name  TEXT NOT NULL,
    action      TEXT NOT NULL,                        -- create | update | delete | status_change | export
    target_type TEXT NOT NULL,                         -- request | user | request_type
    target_id   INTEGER,
    details     TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status  ON requests(status);
CREATE INDEX IF NOT EXISTS idx_comments_request  ON request_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_created      ON audit_log(created_at);
