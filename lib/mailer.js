// lib/mailer.js
// إرسال بريد التحقق والإشعارات عبر Brevo HTTPS API (وليس SMTP).
// السبب: منصات الاستضافة المجانية (مثل Render) تمنع أي اتصال SMTP صادر (المنافذ 587/465/25)،
// بينما HTTPS (المنفذ 443) غير محظور أبدًا ويعمل في كل بيئة.
// إذا لم يُضبط BREVO_API_KEY في .env، يعمل النظام في "وضع العرض التجريبي":
// لا يُرسل بريد فعلي، ويُعاد رمز التحقق مباشرة في استجابة الـ API ليظهر بالواجهة (لأغراض المشروع التدريبي فقط).

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

function isConfigured() {
  return !!process.env.BREVO_API_KEY;
}

async function sendViaBrevoApi({ to, subject, text, html }) {
  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: process.env.SMTP_FROM || process.env.SMTP_USER,
        name: 'رداد — نظام الطلبات الإدارية',
      },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
  return res.json();
}

// يرسل رمز التحقق. يعيد { sent: true } إذا أُرسل فعليًا،
// أو { sent: false, devCode } إذا كان النظام يعمل بدون بريد حقيقي (وضع العرض).
async function sendVerificationCode(toEmail, code) {
  if (!isConfigured()) {
    return { sent: false, devCode: code };
  }
  try {
    await sendViaBrevoApi({
      to: toEmail,
      subject: 'رمز تفعيل حسابك — نظام الطلبات الإدارية',
      text: `رمز تفعيل حسابك هو: ${code}\nهذا الرمز صالح لمرة واحدة.`,
      html: `<div dir="rtl" style="font-family:sans-serif;font-size:15px">
               <p>رمز تفعيل حسابك في نظام الطلبات الإدارية هو:</p>
               <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
             </div>`,
    });
    return { sent: true };
  } catch (err) {
    console.error('فشل إرسال بريد التحقق، سيتم استخدام وضع العرض التجريبي بدلًا:', err.message);
    return { sent: false, devCode: code, error: err.message };
  }
}

// يرسل إشعارًا للموظف عند تغيّر حالة طلبه.
async function sendStatusChangeEmail(toEmail, { requestTitle, newStatus, adminNote }) {
  if (!isConfigured()) return { sent: false };
  try {
    await sendViaBrevoApi({
      to: toEmail,
      subject: `تحديث حالة طلبك: ${requestTitle}`,
      text: `تم تحديث حالة طلبك "${requestTitle}" إلى: ${newStatus}${adminNote ? `\nملاحظة الإدارة: ${adminNote}` : ''}`,
      html: `<div dir="rtl" style="font-family:sans-serif;font-size:15px">
               <p>تم تحديث حالة طلبك:</p>
               <p><b>${requestTitle}</b></p>
               <p>الحالة الجديدة: <b>${newStatus}</b></p>
               ${adminNote ? `<p>ملاحظة الإدارة: ${adminNote}</p>` : ''}
             </div>`,
    });
    return { sent: true };
  } catch (err) {
    console.error('فشل إرسال إشعار تغيّر الحالة:', err.message);
    return { sent: false };
  }
}

module.exports = { sendVerificationCode, sendStatusChangeEmail, sendPasswordResetCode, isConfigured };

// يرسل رمز إعادة تعيين كلمة المرور (نفس منطق وضع العرض التجريبي إن لم يكن هناك مفتاح API).
async function sendPasswordResetCode(toEmail, code) {
  if (!isConfigured()) {
    return { sent: false, devCode: code };
  }
  try {
    await sendViaBrevoApi({
      to: toEmail,
      subject: 'إعادة تعيين كلمة المرور — نظام الطلبات الإدارية',
      text: `رمز إعادة تعيين كلمة المرور هو: ${code}\nصالح لمدة 15 دقيقة فقط.`,
      html: `<div dir="rtl" style="font-family:sans-serif;font-size:15px">
               <p>طلبت إعادة تعيين كلمة المرور لحسابك. الرمز هو:</p>
               <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
               <p style="color:#888;font-size:13px">صالح لمدة 15 دقيقة فقط. إذا لم تطلب هذا، تجاهل الرسالة.</p>
             </div>`,
    });
    return { sent: true };
  } catch (err) {
    console.error('فشل إرسال رمز إعادة التعيين:', err.message);
    return { sent: false, devCode: code, error: err.message };
  }
}
