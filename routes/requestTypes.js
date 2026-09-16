// routes/requestTypes.js
// إدارة أنواع الطلبات: أي مستخدم مسجّل دخول يقدر يشوف القائمة (لتعبئة النماذج)،
// وإضافة/تعديل/حذف النوع حصرية لمسؤول النظام.

const express = require('express');
const { get, all, run } = require('../db/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { logAction } = require('../lib/audit');

const router = express.Router();
router.use(verifyToken);

function asyncRoute(handler) {
  return (req, res) => handler(req, res).catch(err => {
    console.error('خطأ غير متوقع:', err);
    res.status(500).json({ error: 'حدث خطأ بالخادم، حاول مجددًا' });
  });
}

// GET /api/request-types -> القائمة الكاملة (لأي مستخدم مسجّل دخول)
router.get('/', asyncRoute(async (req, res) => {
  const rows = await all('SELECT id, name FROM request_types ORDER BY id ASC');
  res.json(rows);
}));

// POST /api/request-types -> إضافة نوع جديد (المسؤول فقط)
router.post('/', requireAdmin, asyncRoute(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'اسم نوع الطلب مطلوب' });

  const existing = await get('SELECT id FROM request_types WHERE name = ?', [name]);
  if (existing) return res.status(409).json({ error: 'هذا النوع موجود مسبقًا' });

  const result = await run('INSERT INTO request_types (name) VALUES (?)', [name]);
  await logAction({ actorId: req.user.id, actorName: req.user.name, action: 'create', targetType: 'request_type', targetId: result.lastInsertRowid, details: name });
  res.status(201).json({ id: result.lastInsertRowid, name });
}));

// PATCH /api/request-types/:id -> إعادة تسمية نوع (المسؤول فقط)
router.patch('/:id', requireAdmin, asyncRoute(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'اسم نوع الطلب مطلوب' });

  const existing = await get('SELECT * FROM request_types WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'نوع الطلب غير موجود' });

  const duplicate = await get('SELECT id FROM request_types WHERE name = ? AND id != ?', [name, req.params.id]);
  if (duplicate) return res.status(409).json({ error: 'يوجد نوع آخر بنفس الاسم' });

  const oldName = existing.name;
  await run('UPDATE request_types SET name = ? WHERE id = ?', [name, req.params.id]);
  await run('UPDATE requests SET type = ? WHERE type = ?', [name, oldName]);

  await logAction({ actorId: req.user.id, actorName: req.user.name, action: 'update', targetType: 'request_type', targetId: Number(req.params.id), details: `${oldName} ← ${name}` });
  res.json({ id: Number(req.params.id), name });
}));

// DELETE /api/request-types/:id -> حذف نوع (المسؤول فقط)
router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  const existing = await get('SELECT id, name FROM request_types WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'نوع الطلب غير موجود' });
  await run('DELETE FROM request_types WHERE id = ?', [req.params.id]);
  await logAction({ actorId: req.user.id, actorName: req.user.name, action: 'delete', targetType: 'request_type', targetId: existing.id, details: existing.name });
  res.json({ success: true });
}));

module.exports = router;
