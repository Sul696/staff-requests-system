// routes/audit.js
// عرض سجل التدقيق (Audit Log) — للمسؤول فقط، آخر 200 إجراء.

const express = require('express');
const { all } = require('../db/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ بالخادم' });
  }
});

module.exports = router;
