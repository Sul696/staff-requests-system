// routes/auth.js
// مسارات المصادقة: تسجيل حساب موظف جديد، تفعيل البريد الإلكتروني، تسجيل الدخول،
// نسيان/إعادة تعيين كلمة المرور، وتعديل بيانات الحساب الشخصي.

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { sendVerificationCode, sendPasswordResetCode } = require('../lib/mailer');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // رمز من 6 أرقام
}

// يلتقط أي خطأ غير متوقع من مسارات async ويحوّله لرد 500 بدل تعليق الطلب
function asyncRoute(handler) {
  return (req, res) => handler(req, res).catch(err => {
    console.error('خطأ غير متوقع:', err);
    res.status(500).json({ error: 'حدث خطأ بالخادم، حاول مجددًا' });
  });
}

// POST /api/auth/register -> تسجيل موظف جديد (الدور دائمًا "employee")
router.post('/register', asyncRoute(async (req, res) => {
  const { name, email, password, department } = req.body;

  if (!name || !email || !password || !department) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة: الاسم، البريد الإلكتروني، كلمة المرور، الإدارة' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور عن 8 أحرف' });
  }

  const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'يوجد حساب مسجل مسبقًا بهذا البريد الإلكتروني' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const code = generateCode();

  await run(`
    INSERT INTO users (name, email, password_hash, department, role, email_verified, verification_code)
    VALUES (?, ?, ?, ?, 'employee', 0, ?)
  `, [name, email, passwordHash, department, code]);

  const mailResult = await sendVerificationCode(email, code);
  res.status(201).json({
    pending_verification: true,
    email,
    message: mailResult.sent
      ? 'تم إرسال رمز التفعيل إلى بريدك الإلكتروني'
      : 'وضع العرض التجريبي: لا يوجد خادم بريد مُفعّل، استخدم الرمز الظاهر أدناه',
    dev_code: mailResult.sent ? undefined : mailResult.devCode,
    dev_error: mailResult.sent ? undefined : mailResult.error
  });
}));

// POST /api/auth/verify-email -> تأكيد رمز التفعيل وتسجيل الدخول تلقائيًا بعد النجاح
router.post('/verify-email', asyncRoute(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'البريد الإلكتروني والرمز مطلوبان' });

  const row = await get('SELECT * FROM users WHERE email = ?', [email]);
  if (!row) return res.status(404).json({ error: 'الحساب غير موجود' });
  if (row.email_verified) return res.status(400).json({ error: 'هذا الحساب مُفعَّل مسبقًا' });
  if (row.verification_code !== code) return res.status(400).json({ error: 'رمز التفعيل غير صحيح' });

  await run('UPDATE users SET email_verified = 1, verification_code = NULL WHERE id = ?', [row.id]);

  const user = { id: row.id, name: row.name, email: row.email, department: row.department, role: row.role };
  const token = signToken(user);
  res.json({ token, user });
}));

// POST /api/auth/resend-verification -> إعادة توليد رمز جديد وإرساله
router.post('/resend-verification', asyncRoute(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });

  const row = await get('SELECT * FROM users WHERE email = ?', [email]);
  if (!row) return res.status(404).json({ error: 'الحساب غير موجود' });
  if (row.email_verified) return res.status(400).json({ error: 'هذا الحساب مُفعَّل مسبقًا' });

  const code = generateCode();
  await run('UPDATE users SET verification_code = ? WHERE id = ?', [code, row.id]);

  const mailResult = await sendVerificationCode(email, code);
  res.json({
    message: mailResult.sent ? 'تم إرسال رمز جديد' : 'وضع العرض التجريبي: استخدم الرمز الظاهر أدناه',
    dev_code: mailResult.sent ? undefined : mailResult.devCode,
    dev_error: mailResult.sent ? undefined : mailResult.error
  });
}));

// POST /api/auth/forgot-password -> إرسال رمز إعادة تعيين كلمة المرور
router.post('/forgot-password', asyncRoute(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });

  const genericResponse = {
    message: 'إذا كان البريد الإلكتروني مسجّلًا لدينا، ستصلك رسالة تحتوي على رمز إعادة التعيين'
  };

  const row = await get('SELECT * FROM users WHERE email = ?', [email]);
  if (!row) return res.json(genericResponse); // لا نكشف عدم وجود الحساب

  const code = generateCode();
  const expires = new Date(Date.now() + 15 * 60000).toISOString().slice(0, 19);
  await run('UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?', [code, expires, row.id]);

  const mailResult = await sendPasswordResetCode(email, code);
  res.json({
    ...genericResponse,
    dev_code: mailResult.sent ? undefined : mailResult.devCode,
    dev_error: mailResult.sent ? undefined : mailResult.error
  });
}));

// POST /api/auth/reset-password -> تعيين كلمة مرور جديدة باستخدام رمز صالح
router.post('/reset-password', asyncRoute(async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور الجديدة عن 8 أحرف' });
  }

  const row = await get('SELECT * FROM users WHERE email = ?', [email]);
  if (!row || !row.reset_code) return res.status(400).json({ error: 'رمز غير صالح أو منتهي الصلاحية' });
  if (row.reset_code !== code) return res.status(400).json({ error: 'رمز غير صحيح' });

  const expiresMs = new Date(row.reset_expires + 'Z').getTime();
  if (Date.now() > expiresMs) {
    return res.status(400).json({ error: 'انتهت صلاحية الرمز، اطلب رمزًا جديدًا' });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await run(`
    UPDATE users
    SET password_hash = ?, reset_code = NULL, reset_expires = NULL, failed_attempts = 0, locked_until = NULL
    WHERE id = ?
  `, [passwordHash, row.id]);

  res.json({ message: 'تم تحديث كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن' });
}));

// POST /api/auth/login -> تسجيل الدخول لأي مستخدم (موظف أو مسؤول)
// يشمل قفل مؤقت للحساب بعد عدد من المحاولات الفاشلة المتتالية، حماية من التخمين العشوائي.
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

router.post('/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' });
  }

  const row = await get('SELECT * FROM users WHERE email = ?', [email]);
  const genericError = { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };

  if (!row) return res.status(401).json(genericError);

  // الحساب مقفل مؤقتًا بسبب محاولات فاشلة سابقة
  if (row.locked_until) {
    const lockedUntilMs = new Date(row.locked_until + 'Z').getTime();
    if (lockedUntilMs > Date.now()) {
      const minutesLeft = Math.max(1, Math.ceil((lockedUntilMs - Date.now()) / 60000));
      return res.status(429).json({
        error: `تم قفل الحساب مؤقتًا بسبب محاولات دخول فاشلة متكررة. حاول مجددًا بعد ${minutesLeft} دقيقة تقريبًا.`,
        locked: true
      });
    }
    // انتهت مدة القفل — تصفير العداد قبل المتابعة
    await run('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [row.id]);
    row.failed_attempts = 0;
    row.locked_until = null;
  }

  const passwordMatches = bcrypt.compareSync(password, row.password_hash);
  if (!passwordMatches) {
    const attempts = (row.failed_attempts || 0) + 1;
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString().slice(0, 19);
      await run('UPDATE users SET failed_attempts = 0, locked_until = ? WHERE id = ?', [lockUntil, row.id]);
      return res.status(429).json({
        error: `تم قفل الحساب مؤقتًا لمدة ${LOCK_MINUTES} دقيقة بسبب محاولات دخول فاشلة متكررة.`,
        locked: true
      });
    }
    await run('UPDATE users SET failed_attempts = ? WHERE id = ?', [attempts, row.id]);
    return res.status(401).json(genericError);
  }

  // نجاح تسجيل الدخول — تصفير عداد المحاولات الفاشلة
  if (row.failed_attempts > 0 || row.locked_until) {
    await run('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [row.id]);
  }

  if (!row.email_verified) {
    return res.status(403).json({ error: 'يجب تفعيل بريدك الإلكتروني أولًا', needs_verification: true, email: row.email });
  }

  const user = { id: row.id, name: row.name, email: row.email, department: row.department, role: row.role };
  const token = signToken(user);
  res.json({ token, user });
}));

// GET /api/auth/me -> بيانات الحساب الحالي
router.get('/me', verifyToken, asyncRoute(async (req, res) => {
  const row = await get('SELECT id, name, email, department, role FROM users WHERE id = ?', [req.user.id]);
  if (!row) return res.status(404).json({ error: 'الحساب غير موجود' });
  res.json(row);
}));

// PATCH /api/auth/me -> تعديل بيانات الحساب الشخصي (الاسم، الإدارة، كلمة المرور) — متاح لأي مستخدم مسجّل دخول
router.patch('/me', verifyToken, asyncRoute(async (req, res) => {
  const { name, department, password } = req.body;
  if (password && password.length < 8) {
    return res.status(400).json({ error: 'يجب ألا تقل كلمة المرور الجديدة عن 8 أحرف' });
  }
  const passwordHash = password ? bcrypt.hashSync(password, 10) : null;

  await run(`
    UPDATE users
    SET name          = COALESCE(?, name),
        department    = COALESCE(?, department),
        password_hash = COALESCE(?, password_hash)
    WHERE id = ?
  `, [name || null, department || null, passwordHash, req.user.id]);

  const row = await get('SELECT id, name, email, department, role FROM users WHERE id = ?', [req.user.id]);
  const token = signToken(row);
  res.json({ token, user: row });
}));

module.exports = router;
