// server.js
// نقطة تشغيل الخادم: يهيّئ قاعدة البيانات أولًا (بشكل غير متزامن)، ثم Express والمسارات.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDatabase } = require('./db/database');

const authRoutes = require('./routes/auth');
const requestsRoutes = require('./routes/requests');
const usersRoutes = require('./routes/users');
const requestTypesRoutes = require('./routes/requestTypes');
const auditRoutes = require('./routes/audit');

async function main() {
  await initDatabase(); // ينشئ الجداول ويرحّلها ويزرع حساب المسؤول قبل قبول أي طلب

  const app = express();

  app.disable('etag'); // يمنع Express من توليد ETag تلقائيًا لاستجابات JSON (كان يسبب 304 وبيانات قديمة معروضة)
  app.use(cors());
  app.use(express.json({ limit: '5mb' })); // حد أعلى لدعم إرفاق ملفات صغيرة (Base64) مع الطلبات

  // يمنع أي تخزين مؤقت (Cache) من المتصفح لاستجابات الـ API — البيانات دايمًا يجب أن تكون طازجة
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api/auth', authRoutes);
  app.use('/api/requests', requestsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/request-types', requestTypesRoutes);
  app.use('/api/audit-log', auditRoutes);

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // أي مسار غير معروف يعيد توجيه المستخدم لواجهة الصفحة الرئيسية (تطبيق صفحة واحدة)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✔ الخادم يعمل على المنفذ ${PORT}`);
    console.log(`  افتح المتصفح على: http://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error('فشل تشغيل الخادم:', err);
  process.exit(1);
});
