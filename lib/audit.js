// lib/audit.js
// يسجّل كل إجراء إداري مهم (إنشاء/تعديل/حذف) في جدول audit_log لأغراض التدقيق والمساءلة.

const { run } = require('../db/database');

async function logAction({ actorId, actorName, action, targetType, targetId, details }) {
  try {
    await run(`
      INSERT INTO audit_log (actor_id, actor_name, action, target_type, target_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      actorId || null,
      actorName || 'غير معروف',
      action,
      targetType,
      targetId || null,
      details ? String(details) : null
    ]);
  } catch (err) {
    // لا نكسر الطلب الأساسي لو فشل تسجيل التدقيق لأي سبب
    console.error('تعذر تسجيل سجل التدقيق:', err.message);
  }
}

module.exports = { logAction };
