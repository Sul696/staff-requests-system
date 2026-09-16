// middleware/auth.js
// وسائط (middleware) للتحقق من هوية المستخدم وصلاحياته قبل الوصول لمسارات محمية.

const jwt = require('jsonwebtoken');

// يتحقق من وجود توكن صالح في ترويسة Authorization: Bearer <token>
function verifyToken(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول للوصول إلى هذا المورد' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, name, email, role, department }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'الجلسة غير صالحة أو منتهية، الرجاء تسجيل الدخول مجددًا' });
  }
}

// يُستخدم بعد verifyToken للتأكد أن المستخدم مسؤول نظام
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'هذا الإجراء متاح لمسؤول النظام فقط' });
  }
  next();
}

module.exports = { verifyToken, requireAdmin };
