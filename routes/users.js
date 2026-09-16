// routes/users.js
// إدارة المستخدمين — متاحة لمسؤول النظام فقط: عرض، إضافة، تعديل، حذف.

const express = require('express');
const bcrypt = require('bcryptjs');
const { get, all, run } = require('../db/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { logAction } = require('../lib/audit');

const router = express.Router();
router.use(verifyToken, requireAdmin);

function asyncRoute(handler) {
  return (req, res) => handler(req, res).catch(err => {
    console.error('خطأ غير متوقع:', err);
    res.status(500).json({ error: 'حدث خطأ بالخادم، حاول مجددًا' });
  });
}

// GET /api/users -> قائمة كل المستخدمين (بدون كلمات المرور)
router.get('/', asyncRoute(async (req, res) => {
  const rows = await all('SELECT id, name, email, department, role, created_at FROM users ORDER BY created_at DESC');
  res.json(rows);
}));

// POST /api/users -> إنشاء مستخدم جديد (موظف أو مسؤول) من قبل المسؤول
router.post('/', asyncRoute(async (req, res) => {
  const { name, email, password, department, role } = req.body;
  if (!name || !email || !password || !department) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة: الاسم، البريد الإلكتروني، كلمة المرور، الإدارة' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور عن 8 أحرف' });
  }
  const finalRole = role === 'admin' ? 'admin' : 'employee';

  const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'يوجد حساب مسجل مسبقًا بهذا البريد الإلكتروني' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = await run(`
    INSERT INTO users (name, email, password_hash, department, role, email_verified)
    VALUES (?, ?, ?, ?, ?, 1)
  `, [name, email, passwordHash, department, finalRole]);

  const created = await get('SELECT id, name, email, department, role, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
  await logAction({ actorId: req.user.id, actorName: req.user.name, action: 'create', targetType: 'user', targetId: created.id, details: `${created.name} (${created.email})` });
  res.status(201).json(created);
}));

// PATCH /api/users/:id -> تعديل بيانات مستخدم (الاسم، الإدارة، الدور، وكلمة مرور جديدة اختياريًا)
router.patch('/:id', asyncRoute(async (req, res) => {
  const { name, department, role, password } = req.body;
  const existing = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'المستخدم غير موجود' });

  if (role && !['employee', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'دور غير صالح' });
  }
  if (password && password.length < 8) {
    return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور الجديدة عن 8 أحرف' });
  }
  if (Number(req.params.id) === req.user.id && role && role !== 'admin') {
    return res.status(400).json({ error: 'لا يمكنك تغيير صلاحيتك الخاصة' });
  }

  const passwordHash = password ? bcrypt.hashSync(password, 10) : null;

  await run(`
    UPDATE users
    SET name          = COALESCE(?, name),
        department    = COALESCE(?, department),
        role          = COALESCE(?, role),
        password_hash = COALESCE(?, password_hash)
    WHERE id = ?
  `, [name || null, department || null, role || null, passwordHash, req.params.id]);

  const updated = await get('SELECT id, name, email, department, role, created_at FROM users WHERE id = ?', [req.params.id]);
  await logAction({ actorId: req.user.id, actorName: req.user.name, action: 'update', targetType: 'user', targetId: updated.id, details: `${updated.name}${password ? ' (تغيير كلمة المرور)' : ''}` });
  res.json(updated);
}));

// DELETE /api/users/:id -> حذف مستخدم (لا يمكن للمسؤول حذف حسابه الخاص)
router.delete('/:id', asyncRoute(async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص' });
  }
  const existing = await get('SELECT id, name, email FROM users WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'المستخدم غير موجود' });
  await run('DELETE FROM users WHERE id = ?', [req.params.id]);
  await logAction({ actorId: req.user.id, actorName: req.user.name, action: 'delete', targetType: 'user', targetId: existing.id, details: `${existing.name} (${existing.email})` });
  res.json({ success: true });
}));

module.exports = router;
