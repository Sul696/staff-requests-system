// routes/requests.js
// مسارات الطلبات: تقديم طلب (مع إمكانية إرفاق ملف)، عرض الطلبات، تعليقات، تصدير CSV،
// تعديل بيانات الطلب، تحديث الحالة (مع إشعار بريدي للموظف)، حذف طلب — مع تسجيل كل إجراء بسجل التدقيق.

const express = require('express');
const { get, all, run } = require('../db/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { logAction } = require('../lib/audit');
const { sendStatusChangeEmail } = require('../lib/mailer');

const router = express.Router();
router.use(verifyToken); // كل مسارات الطلبات تتطلب تسجيل دخول

const VALID_STATUS = ['قيد المراجعة', 'قيد التنفيذ', 'تمت الموافقة', 'مرفوض'];
const VALID_PRIORITY = ['عادية', 'عاجلة'];
const MAX_ATTACHMENT_BASE64_LENGTH = 2_800_000; // يعادل تقريبًا 2 ميغابايت للملف الأصلي بعد فك ترميز Base64

function asyncRoute(handler) {
  return (req, res) => handler(req, res).catch(err => {
    console.error('خطأ غير متوقع:', err);
    res.status(500).json({ error: 'حدث خطأ بالخادم، حاول مجددًا' });
  });
}

async function isValidType(type) {
  const row = await get('SELECT id FROM request_types WHERE name = ?', [type]);
  return !!row;
}

// أعمدة القائمة الخفيفة (بدون بيانات المرفق الثقيلة) لتسريع جلب القوائم
const LIST_COLUMNS = `
  r.id, r.user_id, r.type, r.title, r.description, r.priority, r.status, r.admin_note,
  r.attachment_name, r.attachment_type, r.created_at, r.updated_at
`;

// GET /api/requests
router.get('/', asyncRoute(async (req, res) => {
  const { status, type } = req.query;

  if (req.user.role === 'admin') {
    let sql = `
      SELECT ${LIST_COLUMNS}, u.name AS employee_name, u.department AS employee_department
      FROM requests r JOIN users u ON r.user_id = u.id
      WHERE 1 = 1
    `;
    const params = [];
    if (status && VALID_STATUS.includes(status)) { sql += ' AND r.status = ?'; params.push(status); }
    if (type && await isValidType(type)) { sql += ' AND r.type = ?'; params.push(type); }
    sql += ' ORDER BY r.created_at DESC';

    const rows = await all(sql, params);
    return res.json(rows);
  }

  const rows = await all(`SELECT ${LIST_COLUMNS} FROM requests r WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id]);
  res.json(rows);
}));

// GET /api/requests/stats/overview -> إحصائيات شاملة للوحة المؤشرات (المسؤول فقط)
router.get('/stats/overview', requireAdmin, asyncRoute(async (req, res) => {
  const totalRequests = (await get('SELECT COUNT(*) AS c FROM requests')).c;
  const byStatus = await all('SELECT status, COUNT(*) AS c FROM requests GROUP BY status');
  const byType = await all('SELECT type, COUNT(*) AS c FROM requests GROUP BY type ORDER BY c DESC');
  const byDepartment = await all(`
    SELECT u.department AS department, COUNT(*) AS c
    FROM requests r JOIN users u ON r.user_id = u.id
    GROUP BY u.department ORDER BY c DESC
  `);
  const last7Days = (await get(`
    SELECT COUNT(*) AS c FROM requests WHERE created_at >= datetime('now', '-7 days')
  `)).c;
  const totalUsers = (await get('SELECT COUNT(*) AS c FROM users')).c;
  const totalEmployees = (await get("SELECT COUNT(*) AS c FROM users WHERE role = 'employee'")).c;
  const totalAdmins = (await get("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")).c;
  const unverifiedUsers = (await get('SELECT COUNT(*) AS c FROM users WHERE email_verified = 0')).c;
  const overdue = (await get(`
    SELECT COUNT(*) AS c FROM requests WHERE status = 'قيد المراجعة' AND created_at <= datetime('now', '-3 days')
  `)).c;

  res.json({
    totalRequests, byStatus, byType, byDepartment, last7Days, overdue,
    totalUsers, totalEmployees, totalAdmins, unverifiedUsers
  });
}));

// GET /api/requests/export.csv -> تصدير كل الطلبات كملف CSV يفتح مباشرة في Excel (المسؤول فقط)
router.get('/export.csv', requireAdmin, asyncRoute(async (req, res) => {
  const rows = await all(`
    SELECT r.id, u.name AS employee_name, u.department, r.type, r.title, r.description,
           r.priority, r.status, r.admin_note, r.created_at, r.updated_at
    FROM requests r JOIN users u ON r.user_id = u.id
    ORDER BY r.created_at DESC
  `);

  const headers = ['رقم الطلب', 'الموظف', 'الإدارة', 'النوع', 'العنوان', 'التفاصيل', 'الأولوية', 'الحالة', 'ملاحظة الإدارة', 'تاريخ التقديم', 'آخر تحديث'];
  const escapeCsv = (val) => {
    const s = (val === null || val === undefined) ? '' : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escapeCsv).join(',')];
  rows.forEach(r => {
    lines.push([
      r.id, r.employee_name, r.department, r.type, r.title, r.description || '',
      r.priority, r.status, r.admin_note || '', r.created_at, r.updated_at
    ].map(escapeCsv).join(','));
  });

  const csv = '\uFEFF' + lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="requests-export-${Date.now()}.csv"`);
  await logAction({ actorId: req.user.id, actorName: req.user.name, action: 'export', targetType: 'request', details: `تصدير ${rows.length} طلب كملف CSV` });
  res.send(csv);
}));

// GET /api/requests/:id -> تفاصيل طلب واحد (المالك أو المسؤول فقط)
router.get('/:id', asyncRoute(async (req, res) => {
  const row = await get(`
    SELECT r.*, u.name AS employee_name, u.department AS employee_department
    FROM requests r JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `, [req.params.id]);

  if (!row) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (req.user.role !== 'admin' && row.user_id !== req.user.id) {
    return res.status(403).json({ error: 'لا تملك صلاحية عرض هذا الطلب' });
  }
  res.json(row);
}));

// GET /api/requests/:id/comments -> عرض تعليقات طلب (المالك أو المسؤول فقط)
router.get('/:id/comments', asyncRoute(async (req, res) => {
  const request = await get('SELECT id, user_id FROM requests WHERE id = ?', [req.params.id]);
  if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (req.user.role !== 'admin' && request.user_id !== req.user.id) {
    return res.status(403).json({ error: 'لا تملك صلاحية عرض هذا الطلب' });
  }
  const comments = await all(`
    SELECT c.id, c.message, c.created_at, c.user_id, u.name AS author_name, u.role AS author_role
    FROM request_comments c JOIN users u ON c.user_id = u.id
    WHERE c.request_id = ? ORDER BY c.created_at ASC
  `, [req.params.id]);
  res.json(comments);
}));

// POST /api/requests/:id/comments -> إضافة تعليق (المالك أو المسؤول فقط)
router.post('/:id/comments', asyncRoute(async (req, res) => {
  const message = (req.body.message || '').trim();
  if (!message) return res.status(400).json({ error: 'نص التعليق مطلوب' });

  const request = await get('SELECT id, user_id FROM requests WHERE id = ?', [req.params.id]);
  if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (req.user.role !== 'admin' && request.user_id !== req.user.id) {
    return res.status(403).json({ error: 'لا تملك صلاحية التعليق على هذا الطلب' });
  }

  const result = await run('INSERT INTO request_comments (request_id, user_id, message) VALUES (?, ?, ?)', [req.params.id, req.user.id, message]);

  const created = await get(`
    SELECT c.id, c.message, c.created_at, c.user_id, u.name AS author_name, u.role AS author_role
    FROM request_comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `, [result.lastInsertRowid]);
  res.status(201).json(created);
}));

// POST /api/requests -> تقديم طلب جديد
router.post('/', asyncRoute(async (req, res) => {
  const { type, title, description, priority, employee_id, attachment_name, attachment_type, attachment_data } = req.body;

  let targetUserId = req.user.id;
  if (req.user.role === 'admin') {
    if (!employee_id) {
      return res.status(400).json({ error: 'اختر الموظف الذي سيُنشأ الطلب باسمه' });
    }
    const employee = await get("SELECT id FROM users WHERE id = ? AND role = 'employee'", [employee_id]);
    if (!employee) return res.status(400).json({ error: 'الموظف المحدد غير موجود' });
    targetUserId = employee.id;
  }

  if (!type || !title) {
    return res.status(400).json({ error: 'نوع الطلب وعنوانه حقلان مطلوبان' });
  }
  if (!(await isValidType(type))) {
    return res.status(400).json({ error: 'نوع الطلب غير صالح' });
  }
  if (attachment_data && attachment_data.length > MAX_ATTACHMENT_BASE64_LENGTH) {
    return res.status(400).json({ error: 'حجم المرفق يتجاوز الحد المسموح (2 ميغابايت تقريبًا)' });
  }
  const finalPriority = VALID_PRIORITY.includes(priority) ? priority : 'عادية';

  const result = await run(`
    INSERT INTO requests (user_id, type, title, description, priority, attachment_name, attachment_type, attachment_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    targetUserId, type, title, description || '', finalPriority,
    attachment_name || null, attachment_type || null, attachment_data || null
  ]);

  const created = await get(`
    SELECT ${LIST_COLUMNS}, u.name AS employee_name, u.department AS employee_department
    FROM requests r JOIN users u ON r.user_id = u.id WHERE r.id = ?
  `, [result.lastInsertRowid]);

  await logAction({ actorId: req.user.id, actorName: req.user.name, action: 'create', targetType: 'request', targetId: created.id, details: created.title });
  res.status(201).json(created);
}));

// PATCH /api/requests/:id -> تحديث الطلب (المسؤول فقط)
router.patch('/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { status, admin_note, type, title, description, priority, attachment_name, attachment_type, attachment_data } = req.body;
  const existing = await get(`
    SELECT r.*, u.email AS employee_email, u.name AS employee_name
    FROM requests r JOIN users u ON r.user_id = u.id WHERE r.id = ?
  `, [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'الطلب غير موجود' });

  if (status && !VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: 'حالة غير صالحة' });
  }
  if (type && !(await isValidType(type))) {
    return res.status(400).json({ error: 'نوع الطلب غير صالح' });
  }
  if (priority && !VALID_PRIORITY.includes(priority)) {
    return res.status(400).json({ error: 'الأولوية غير صالحة' });
  }
  if (attachment_data && attachment_data.length > MAX_ATTACHMENT_BASE64_LENGTH) {
    return res.status(400).json({ error: 'حجم المرفق يتجاوز الحد المسموح (2 ميغابايت تقريبًا)' });
  }

  await run(`
    UPDATE requests
    SET status           = COALESCE(?, status),
        admin_note       = COALESCE(?, admin_note),
        type             = COALESCE(?, type),
        title            = COALESCE(?, title),
        description      = COALESCE(?, description),
        priority         = COALESCE(?, priority),
        attachment_name  = COALESCE(?, attachment_name),
        attachment_type  = COALESCE(?, attachment_type),
        attachment_data  = COALESCE(?, attachment_data),
        updated_at       = datetime('now')
    WHERE id = ?
  `, [
    status || null, admin_note ?? null, type || null, title || null, description ?? null,
    priority || null, attachment_name || null, attachment_type || null, attachment_data || null,
    req.params.id
  ]);

  const updated = await get(`
    SELECT ${LIST_COLUMNS}, u.name AS employee_name, u.department AS employee_department
    FROM requests r JOIN users u ON r.user_id = u.id WHERE r.id = ?
  `, [req.params.id]);

  const statusChanged = status && status !== existing.status;
  await logAction({
    actorId: req.user.id, actorName: req.user.name,
    action: statusChanged ? 'status_change' : 'update',
    targetType: 'request', targetId: updated.id,
    details: statusChanged ? `${existing.status} ← ${status}` : updated.title
  });

  if (statusChanged) {
    sendStatusChangeEmail(existing.employee_email, {
      requestTitle: existing.title,
      newStatus: status,
      adminNote: admin_note || existing.admin_note
    }).catch(() => {});
  }

  res.json(updated);
}));

// DELETE /api/requests/:id -> حذف طلب نهائيًا (المسؤول فقط)
router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  const existing = await get('SELECT id, title FROM requests WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'الطلب غير موجود' });
  await run('DELETE FROM requests WHERE id = ?', [req.params.id]);
  await logAction({ actorId: req.user.id, actorName: req.user.name, action: 'delete', targetType: 'request', targetId: existing.id, details: existing.title });
  res.json({ success: true });
}));

module.exports = router;
