// public/js/app.js
// واجهة أمامية بدون إطار عمل، تتواصل مع الـ API عبر fetch.
// التوكن يُحفظ في localStorage لإبقاء المستخدم مسجّل الدخول بعد تحديث الصفحة.

const API = '/api';

function typeNames() { return state.requestTypes.map(rt => rt.name); }
const STATUS_LIST = ["قيد المراجعة","قيد التنفيذ","تمت الموافقة","مرفوض"];

/* ---------------- i18n ---------------- */
const T = {
  ar: {
    appTitle: 'رداد', appSubtitle: 'في خدمتكم دائمًا',
    loginTab: 'تسجيل الدخول', registerTab: 'حساب جديد',
    loginTitle: 'تسجيل الدخول', loginSub: 'أدخل بياناتك للوصول إلى النظام',
    registerTitle: 'إنشاء حساب موظف جديد', registerSub: 'سيتم إنشاء الحساب كموظف افتراضيًا',
    emailLabel: 'البريد الإلكتروني', passwordLabel: 'كلمة المرور', nameLabel: 'الاسم الكامل',
    deptLabel: 'الإدارة / القسم', passwordHint: 'كلمة المرور (8 أحرف على الأقل)',
    loginBtn: 'دخول', registerBtn: 'إنشاء الحساب',
    registerHint: 'حساب المسؤول لا يُنشأ من هذه الصفحة؛ يُزرع تلقائيًا عند أول تشغيل للخادم، أو يُنشئه مسؤول آخر من لوحة إدارة المستخدمين.',
    logout: 'تسجيل الخروج', settings: 'الإعدادات',
    myRequests: 'طلباتي', myRequestsSub: 'تابع حالة طلباتك المقدّمة أو أضف طلبًا جديدًا',
    newRequest: '+ تقديم طلب جديد', addRequest: '+ إضافة طلب',
    total: 'إجمالي الطلبات', pending: 'قيد المراجعة', inProgress: 'قيد التنفيذ', approved: 'تمت الموافقة',
    noRequests: 'لا توجد طلبات بعد — ابدأ بتقديم طلبك الأول من الزر أعلاه.',
    colType: 'نوع الطلب', colTitle: 'العنوان', colDate: 'التاريخ', colStatus: 'الحالة',
    requestsTab: 'الطلبات', usersTab: 'المستخدمون', typesTab: 'أنواع الطلبات', indicatorsTab: 'المؤشرات', auditTab: 'سجل التدقيق',
    requestsBoardTitle: 'لوحة متابعة الطلبات', requestsBoardSub: 'مراجعة الطلبات المقدّمة من جميع الموظفين واتخاذ الإجراء المناسب',
    usersBoardTitle: 'إدارة المستخدمين', usersBoardSub: 'إضافة موظفين أو مسؤولين، وتعديل أو حذف الحسابات الحالية',
    newUser: '+ مستخدم جديد',
    colEmployee: 'مقدّم الطلب', colPriority: 'الأولوية',
    colName: 'الاسم', colEmail: 'البريد الإلكتروني', colDept: 'الإدارة', colRole: 'الصلاحية',
    edit: 'تعديل', delete: 'حذف', cancel: 'إلغاء', save: 'حفظ التعديلات', close: 'إغلاق',
    all: 'الكل', noneFiltered: 'لا توجد طلبات مطابقة للتصفية الحالية.', noUsers: 'لا يوجد مستخدمون بعد.',
    settingsTitle: 'الإعدادات', langSection: 'اللغة', accountSection: 'معلومات الحساب',
    newPasswordOptional: 'كلمة مرور جديدة (اتركها فارغة لعدم التغيير)', saveAccount: 'حفظ التغييرات',
    verifyTitle: 'تفعيل البريد الإلكتروني', verifyCodeLabel: 'رمز التفعيل (6 أرقام)',
    verifyBtn: 'تفعيل الحساب', resend: 'إعادة إرسال الرمز', backToLogin: 'رجوع لتسجيل الدخول',
    devModeNote: 'وضع العرض التجريبي — لا يوجد خادم بريد مُفعّل، هذا الرمز لأغراض العرض فقط:',
    addType: 'إضافة', typeNamePlaceholder: 'اسم نوع الطلب الجديد', deleteTypeConfirm: 'حذف هذا النوع؟ الطلبات القديمة تحتفظ باسمه في سجلها.',
    indicatorsSub: 'نظرة شاملة على أداء النظام بالكامل',
    totalUsersLabel: 'إجمالي المستخدمين', employeesLabel: 'الموظفون', adminsLabel: 'مسؤولو النظام',
    last7DaysLabel: 'طلبات آخر 7 أيام', unverifiedLabel: 'حسابات بانتظار التفعيل',
    byStatusTitle: 'توزيع الطلبات حسب الحالة', byTypeTitle: 'توزيع الطلبات حسب النوع', byDeptTitle: 'توزيع الطلبات حسب الإدارة',
  },
  en: {
    appTitle: 'Raddad', appSubtitle: 'Always at your service',
    loginTab: 'Log In', registerTab: 'New Account',
    loginTitle: 'Log In', loginSub: 'Enter your details to access the system',
    registerTitle: 'Create Employee Account', registerSub: 'The account will be created as an employee by default',
    emailLabel: 'Email', passwordLabel: 'Password', nameLabel: 'Full Name',
    deptLabel: 'Department', passwordHint: 'Password (min 8 characters)',
    loginBtn: 'Log In', registerBtn: 'Create Account',
    registerHint: 'Admin accounts are not created here; the first one is seeded automatically on server startup, or created by another admin from User Management.',
    logout: 'Log Out', settings: 'Settings',
    myRequests: 'My Requests', myRequestsSub: 'Track your submitted requests or add a new one',
    newRequest: '+ New Request', addRequest: '+ Add Request',
    total: 'Total Requests', pending: 'Pending', inProgress: 'In Progress', approved: 'Approved',
    noRequests: 'No requests yet — start by submitting your first one above.',
    colType: 'Type', colTitle: 'Title', colDate: 'Date', colStatus: 'Status',
    requestsTab: 'Requests', usersTab: 'Users', typesTab: 'Request Types', indicatorsTab: 'Indicators', auditTab: 'Audit Log',
    requestsBoardTitle: 'Requests Dashboard', requestsBoardSub: 'Review requests from all employees and take action',
    usersBoardTitle: 'User Management', usersBoardSub: 'Add employees or admins, edit or delete existing accounts',
    newUser: '+ New User',
    colEmployee: 'Employee', colPriority: 'Priority',
    colName: 'Name', colEmail: 'Email', colDept: 'Department', colRole: 'Role',
    edit: 'Edit', delete: 'Delete', cancel: 'Cancel', save: 'Save Changes', close: 'Close',
    all: 'All', noneFiltered: 'No requests match the current filter.', noUsers: 'No users yet.',
    settingsTitle: 'Settings', langSection: 'Language', accountSection: 'Account Info',
    newPasswordOptional: 'New password (leave empty to keep current)', saveAccount: 'Save Changes',
    verifyTitle: 'Verify Your Email', verifyCodeLabel: 'Verification Code (6 digits)',
    verifyBtn: 'Verify Account', resend: 'Resend Code', backToLogin: 'Back to Login',
    devModeNote: 'Demo mode — no email server configured, this code is for demo purposes only:',
    addType: 'Add', typeNamePlaceholder: 'New request type name', deleteTypeConfirm: 'Delete this type? Old requests keep this name in their history.',
    indicatorsSub: 'A full overview of system-wide performance',
    totalUsersLabel: 'Total Users', employeesLabel: 'Employees', adminsLabel: 'System Admins',
    last7DaysLabel: 'Requests (last 7 days)', unverifiedLabel: 'Accounts pending verification',
    byStatusTitle: 'Requests by Status', byTypeTitle: 'Requests by Type', byDeptTitle: 'Requests by Department',
  }
};
function t(key) { return (T[state.lang] && T[state.lang][key]) || T.ar[key] || key; }

// ترجمة القيم الثابتة (النوع/الحالة/الأولوية/الدور) القادمة من قاعدة البيانات بالعربي دائمًا
const TYPE_EN = { "إجازة":"Leave", "صيانة":"Maintenance", "دعم فني":"Tech Support", "حجز قاعة اجتماعات":"Meeting Room", "مستلزمات مكتبية":"Office Supplies", "أخرى":"Other" };
const STATUS_EN = { "قيد المراجعة":"Pending Review", "قيد التنفيذ":"In Progress", "تمت الموافقة":"Approved", "مرفوض":"Rejected" };
const PRIORITY_EN = { "عادية":"Normal", "عاجلة":"Urgent" };
function trType(v) { return state.lang === 'en' ? (TYPE_EN[v] || v) : v; }
function trStatus(v) { return state.lang === 'en' ? (STATUS_EN[v] || v) : v; }
function trPriority(v) { return state.lang === 'en' ? (PRIORITY_EN[v] || v) : v; }
function trRole(r) {
  if (state.lang === 'en') return r === 'admin' ? 'Admin' : 'Employee';
  return r === 'admin' ? 'مسؤول النظام' : 'موظف';
}

let state = {
  screen: 'loading',   // loading | login | verify | employee | admin
  authTab: 'login',    // login | register
  lang: localStorage.getItem('lang') || 'ar',
  theme: localStorage.getItem('theme') || 'light',
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  requests: [],
  users: [],
  requestTypes: [],
  stats: null,
  auditLog: [],
  globalError: '',
  adminTab: 'requests', // requests | users | types | indicators | audit
  activeRequest: null,
  editingRequest: false,
  showNewForm: false,
  showUserForm: false,
  showSettings: false,
  editingUser: null,   // user object being edited, or null for "new user"
  filterStatus: 'الكل',
  filterType: 'الكل',
  searchQuery: '',
  formError: '',
  verifyEmail: '',
  verifyMessage: '',
  verifyDevCode: '',
  verifyDevError: '',
  verifyError: '',
  comments: [],
  newAttachment: null,     // { name, type, data } staged for a new/edited request
  charts: {},               // Chart.js instances keyed by canvas id, so we can destroy before re-creating
  forgotStep: 'request',   // request | reset
  forgotEmail: '',
  forgotMessage: '',
  forgotDevCode: '',
  forgotDevError: '',
  forgotError: ''
};

function applyTheme() {
  document.body.setAttribute('data-theme', state.theme);
}
function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem('theme', theme);
  applyTheme();
}

function applyLangToDocument() {
  document.documentElement.lang = state.lang === 'en' ? 'en' : 'ar';
  document.documentElement.dir = state.lang === 'en' ? 'ltr' : 'rtl';
  document.body.classList.toggle('lang-en', state.lang === 'en');
}

/* ---------------- API helpers ---------------- */
async function apiFetch(path, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;

  const res = await fetch(API + path, Object.assign({}, options, { headers }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'حدث خطأ غير متوقع');
    err.data = data;
    throw err;
  }
  return data;
}

function persistSession() {
  if (state.token) localStorage.setItem('token', state.token); else localStorage.removeItem('token');
  if (state.user) localStorage.setItem('user', JSON.stringify(state.user)); else localStorage.removeItem('user');
}

function logout() {
  state.token = null;
  state.user = null;
  state.requests = [];
  state.users = [];
  persistSession();
  state.screen = 'login';
  render();
}

/* ---------------- Boot ---------------- */
async function boot() {
  applyLangToDocument();
  applyTheme();
  if (!state.token || !state.user) {
    state.screen = 'login';
    return render();
  }
  state.screen = state.user.role === 'admin' ? 'admin' : 'employee';
  render();
  await refreshRequestTypes();
  await refreshRequests();
  if (state.user.role === 'admin') {
    await refreshUsers();
    await refreshStats();
  }
}

async function refreshAuditLog() {
  try {
    state.auditLog = await apiFetch('/audit-log');
    render();
  } catch (err) {
    state.globalError = err.message;
    render();
  }
}

async function refreshRequestTypes() {
  try {
    state.requestTypes = await apiFetch('/request-types');
    render();
  } catch (err) {
    state.globalError = err.message;
    render();
  }
}

async function refreshStats() {
  try {
    state.stats = await apiFetch('/requests/stats/overview');
    render();
  } catch (err) {
    state.globalError = err.message;
    render();
  }
}

async function refreshRequests(filters = {}) {
  try {
    const qs = new URLSearchParams();
    if (filters.status && filters.status !== 'الكل') qs.set('status', filters.status);
    if (filters.type && filters.type !== 'الكل') qs.set('type', filters.type);
    const query = qs.toString() ? '?' + qs.toString() : '';
    state.requests = await apiFetch('/requests' + query);
    state.globalError = '';
    render();
  } catch (err) {
    if (err.message.includes('الجلسة')) { logout(); return; }
    state.globalError = err.message;
    render();
  }
}

async function refreshUsers() {
  try {
    state.users = await apiFetch('/users');
    state.globalError = '';
    render();
  } catch (err) {
    if (err.message.includes('الجلسة')) { logout(); return; }
    state.globalError = err.message;
    render();
  }
}

/* ---------------- Render dispatcher ---------------- */
function removeAllOverlays() {
  ['detail-overlay', 'user-overlay', 'settings-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

function render() {
  applyLangToDocument();
  applyTheme();
  removeAllOverlays();
  const root = document.getElementById('root');
  if (state.screen === 'loading') {
    root.innerHTML = `<div class="loading-screen">...</div>`;
    return;
  }
  if (state.screen === 'login') {
    root.innerHTML = renderLogin();
    attachLoginHandlers();
    return;
  }
  if (state.screen === 'verify') {
    root.innerHTML = renderVerify();
    attachVerifyHandlers();
    return;
  }
  if (state.screen === 'forgot') {
    root.innerHTML = renderForgotPassword();
    attachForgotPasswordHandlers();
    return;
  }
  root.innerHTML = renderHeader() + (state.screen === 'admin' ? renderAdmin() : renderEmployee());
  attachHeaderHandlers();
  if (state.screen === 'admin') attachAdminHandlers(); else attachEmployeeHandlers();
  if (state.activeRequest) renderRequestModal();
  if (state.showUserForm) { renderUserModal(); attachUserModalHandlers(); }
  if (state.showSettings) { renderSettingsModal(); attachSettingsHandlers(); }
}

/* ---------------- Login / Register screen (split layout) ---------------- */
function renderLogin() {
  const isLogin = state.authTab === 'login';
  return `
  <div class="auth-shell">
    <div class="auth-hero">
      <div class="hero-decor">
        <span class="float-shape shape-a"></span>
        <span class="float-shape shape-b"></span>
        <span class="float-shape shape-c"></span>
        <span class="float-ring ring-a"></span>
        <span class="float-ring ring-b"></span>
        <svg class="hero-wave" viewBox="0 0 500 80" preserveAspectRatio="none">
          <path d="M0,40 C120,80 180,0 300,35 C380,58 440,15 500,40 L500,80 L0,80 Z"></path>
        </svg>
      </div>
      <div class="auth-hero-inner">
        <div class="brand-mark pulse-ring">ر</div>
        <h1 class="reveal-up d1">${t('appTitle')}</h1>
        <p class="reveal-up d2">${state.lang === 'en'
          ? 'A unified platform for staff to submit and track administrative requests, built on real security standards.'
          : 'منصّة موحّدة لتقديم ومتابعة الطلبات الإدارية لموظفي الجهة، بمعايير أمان حقيقية من التشفير إلى الصلاحيات.'}</p>
        <ul class="auth-hero-points">
          <li class="reveal-up d3">${state.lang === 'en' ? 'Submit and track requests instantly' : 'تقديم الطلبات ومتابعتها لحظيًا'}</li>
          <li class="reveal-up d4">${state.lang === 'en' ? 'Unified admin dashboard' : 'لوحة موحّدة لمسؤول النظام'}</li>
          <li class="reveal-up d5">${state.lang === 'en' ? 'Fully encrypted, protected data' : 'بيانات مشفّرة ومحمية بالكامل'}</li>
        </ul>
        <span class="auth-hero-footer reveal-up d6">${state.lang === 'en' ? 'General Department of Resources & Support Services' : 'الإدارة العامة للموارد والخدمات المساندة'}</span>
      </div>
    </div>
    <div class="auth-panel">
      <div class="auth-card card-pop">
        <div class="lang-toggle" style="margin-bottom:18px;">
          <button id="lang-ar" class="${state.lang==='ar'?'active':''}">العربية</button>
          <button id="lang-en" class="${state.lang==='en'?'active':''}">English</button>
        </div>
        <h2>${isLogin ? t('loginTitle') : t('registerTitle')}</h2>
        <p class="sub">${isLogin ? t('loginSub') : t('registerSub')}</p>
        <div class="tabs">
          <button id="tab-login" class="${isLogin ? 'active' : ''}">${t('loginTab')}</button>
          <button id="tab-register" class="${!isLogin ? 'active' : ''}">${t('registerTab')}</button>
        </div>

        ${isLogin ? `
          <label>${t('emailLabel')}</label>
          <input id="in-email" type="email" placeholder="name@moe.gov.sa">
          <label>${t('passwordLabel')}</label>
          <input id="in-password" type="password" placeholder="••••••••">
          <p style="text-align:${state.lang==='en'?'left':'right'};margin:8px 0 0;">
            <button type="button" class="link-btn" id="btn-forgot-password">${state.lang==='en' ? 'Forgot your password?' : 'نسيت كلمة المرور؟'}</button>
          </p>
        ` : `
          <label>${t('nameLabel')}</label>
          <input id="in-name" type="text" placeholder="Sara Al-Otaibi">
          <label>${t('deptLabel')}</label>
          <input id="in-dept" type="text" placeholder="IT Department">
          <label>${t('emailLabel')}</label>
          <input id="in-email" type="email" placeholder="name@moe.gov.sa">
          <label>${t('passwordHint')}</label>
          <input id="in-password" type="password" placeholder="••••••••">
        `}

        ${state.formError ? `<div class="err">${state.formError}</div>` : ''}
        <button class="btn-primary" id="btn-submit">${isLogin ? t('loginBtn') : t('registerBtn')}</button>
        <p class="hint">${t('registerHint')}</p>
      </div>
    </div>
  </div>`;
}

function attachLoginHandlers() {
  document.getElementById('lang-ar').onclick = () => { setLang('ar'); render(); };
  document.getElementById('lang-en').onclick = () => { setLang('en'); render(); };
  document.getElementById('tab-login').onclick = () => { state.authTab = 'login'; state.formError=''; render(); };
  document.getElementById('tab-register').onclick = () => { state.authTab = 'register'; state.formError=''; render(); };
  const forgotBtn = document.getElementById('btn-forgot-password');
  if (forgotBtn) forgotBtn.onclick = () => {
    state.screen = 'forgot';
    state.forgotStep = 'request';
    state.forgotEmail = document.getElementById('in-email').value.trim();
    state.forgotMessage = ''; state.forgotDevCode = ''; state.forgotDevError = ''; state.forgotError = '';
    render();
  };

  document.getElementById('btn-submit').onclick = async () => {
    const email = document.getElementById('in-email').value.trim();
    const password = document.getElementById('in-password').value;
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;

    try {
      if (state.authTab === 'login') {
        if (!email || !password) throw new Error(state.lang==='en' ? 'Please enter your email and password' : 'الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        state.token = data.token;
        state.user = data.user;
        persistSession();
        state.formError = '';
        state.screen = state.user.role === 'admin' ? 'admin' : 'employee';
        render();
        await refreshRequests();
        if (state.user.role === 'admin') await refreshUsers();
      } else {
        const name = document.getElementById('in-name').value.trim();
        const department = document.getElementById('in-dept').value.trim();
        if (!name || !department || !email || !password) throw new Error(state.lang==='en' ? 'All fields are required' : 'جميع الحقول مطلوبة');
        const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, department }) });
        // التسجيل لا يعيد توكن مباشرة؛ الحساب بانتظار تفعيل البريد الإلكتروني
        state.verifyEmail = data.email;
        state.verifyMessage = data.message || '';
        state.verifyDevCode = data.dev_code || '';
        state.verifyDevError = data.dev_error || '';
        state.verifyError = '';
        state.formError = '';
        state.screen = 'verify';
        render();
      }
    } catch (err) {
      if (err.data && err.data.needs_verification) {
        state.verifyEmail = err.data.email || email;
        state.verifyMessage = '';
        state.verifyDevCode = '';
        state.verifyError = '';
        state.screen = 'verify';
        render();
      } else {
        state.formError = err.message;
        render();
      }
    } finally {
      btn.disabled = false;
    }
  };
}

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('lang', lang);
}

/* ---------------- Forgot / reset password screen ---------------- */
function renderForgotPassword() {
  const isRequestStep = state.forgotStep === 'request';
  return `
  <div class="login-wrap">
    <div class="login-card">
      <h2>${state.lang==='en' ? 'Reset Password' : 'إعادة تعيين كلمة المرور'}</h2>
      <p class="sub">${isRequestStep
        ? (state.lang==='en' ? 'Enter your email to receive a reset code' : 'أدخل بريدك الإلكتروني لإرسال رمز إعادة التعيين')
        : state.forgotEmail}</p>

      ${state.forgotMessage ? `<p class="hint" style="margin-top:0;">${state.forgotMessage}</p>` : ''}
      ${state.forgotDevCode ? `
        <div class="verify-code-hint">
          <div class="code">${state.forgotDevCode}</div>
          <p>${t('devModeNote')}</p>
          ${state.forgotDevError ? `<p style="color:#A23B32;font-weight:600;margin-top:8px;">${state.lang==='en' ? 'Reason:' : 'السبب:'} ${state.forgotDevError}</p>` : ''}
        </div>` : ''}

      ${isRequestStep ? `
        <label>${t('emailLabel')}</label>
        <input id="fp-email" type="email" value="${state.forgotEmail}" placeholder="name@moe.gov.sa">
        ${state.forgotError ? `<div class="err">${state.forgotError}</div>` : ''}
        <button class="btn-primary" id="fp-send">${state.lang==='en' ? 'Send Reset Code' : 'إرسال رمز إعادة التعيين'}</button>
      ` : `
        <label>${state.lang==='en' ? 'Reset Code (6 digits)' : 'رمز إعادة التعيين (6 أرقام)'}</label>
        <input id="fp-code" type="text" inputmode="numeric" maxlength="6" placeholder="000000">
        <label>${state.lang==='en' ? 'New Password (min 8 characters)' : 'كلمة المرور الجديدة (8 أحرف على الأقل)'}</label>
        <input id="fp-new-password" type="password" placeholder="••••••••">
        ${state.forgotError ? `<div class="err">${state.forgotError}</div>` : ''}
        <button class="btn-primary" id="fp-reset">${state.lang==='en' ? 'Reset Password' : 'تحديث كلمة المرور'}</button>
        <p style="text-align:center;margin-top:14px;">
          <button type="button" class="link-btn" id="fp-resend">${t('resend')}</button>
        </p>
      `}
      <p style="text-align:center;margin-top:${isRequestStep ? '16px' : '6px'};">
        <button type="button" class="link-btn" id="fp-back">${t('backToLogin')}</button>
      </p>
    </div>
  </div>`;
}

function attachForgotPasswordHandlers() {
  document.getElementById('fp-back').onclick = () => { state.screen = 'login'; state.authTab = 'login'; render(); };

  if (state.forgotStep === 'request') {
    document.getElementById('fp-send').onclick = async () => {
      const email = document.getElementById('fp-email').value.trim();
      if (!email) { state.forgotError = state.lang==='en' ? 'Email is required' : 'البريد الإلكتروني مطلوب'; render(); return; }
      try {
        const data = await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
        state.forgotEmail = email;
        state.forgotMessage = data.message || '';
        state.forgotDevCode = data.dev_code || '';
        state.forgotDevError = data.dev_error || '';
        state.forgotError = '';
        state.forgotStep = 'reset';
        render();
      } catch (err) {
        state.forgotError = err.message;
        render();
      }
    };
  } else {
    document.getElementById('fp-reset').onclick = async () => {
      const code = document.getElementById('fp-code').value.trim();
      const newPassword = document.getElementById('fp-new-password').value;
      if (!code || !newPassword) { state.forgotError = state.lang==='en' ? 'All fields are required' : 'جميع الحقول مطلوبة'; render(); return; }
      try {
        await apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email: state.forgotEmail, code, newPassword }) });
        state.screen = 'login';
        state.authTab = 'login';
        state.formError = '';
        render();
        alert(state.lang==='en' ? 'Password updated. You can log in now.' : 'تم تحديث كلمة المرور، يمكنك تسجيل الدخول الآن.');
      } catch (err) {
        state.forgotError = err.message;
        render();
      }
    };
    document.getElementById('fp-resend').onclick = async () => {
      try {
        const data = await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: state.forgotEmail }) });
        state.forgotMessage = data.message || '';
        state.forgotDevCode = data.dev_code || '';
        state.forgotDevError = data.dev_error || '';
        state.forgotError = '';
        render();
      } catch (err) {
        state.forgotError = err.message;
        render();
      }
    };
  }
}

/* ---------------- Verify email screen ---------------- */
function renderVerify() {
  return `
  <div class="login-wrap">
    <div class="login-card">
      <h2>${t('verifyTitle')}</h2>
      <p class="sub">${state.verifyEmail}</p>
      ${state.verifyMessage ? `<p class="hint" style="margin-top:0;">${state.verifyMessage}</p>` : ''}
      ${state.verifyDevCode ? `
        <div class="verify-code-hint">
          <div class="code">${state.verifyDevCode}</div>
          <p>${t('devModeNote')}</p>
          ${state.verifyDevError ? `<p style="color:#A23B32;font-weight:600;margin-top:8px;">${state.lang==='en' ? 'Reason:' : 'السبب:'} ${state.verifyDevError}</p>` : ''}
        </div>` : ''}
      <label>${t('verifyCodeLabel')}</label>
      <input id="vf-code" type="text" inputmode="numeric" maxlength="6" placeholder="000000">
      ${state.verifyError ? `<div class="err">${state.verifyError}</div>` : ''}
      <button class="btn-primary" id="vf-submit">${t('verifyBtn')}</button>
      <p style="text-align:center;margin-top:16px;">
        <button class="link-btn" id="vf-resend">${t('resend')}</button>
      </p>
      <p style="text-align:center;margin-top:6px;">
        <button class="link-btn" id="vf-back">${t('backToLogin')}</button>
      </p>
    </div>
  </div>`;
}

function attachVerifyHandlers() {
  document.getElementById('vf-submit').onclick = async () => {
    const code = document.getElementById('vf-code').value.trim();
    if (!code) { state.verifyError = state.lang==='en' ? 'Enter the verification code' : 'أدخل رمز التفعيل'; render(); return; }
    try {
      const data = await apiFetch('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email: state.verifyEmail, code }) });
      state.token = data.token;
      state.user = data.user;
      persistSession();
      state.verifyError = '';
      state.screen = state.user.role === 'admin' ? 'admin' : 'employee';
      render();
      await refreshRequests();
      if (state.user.role === 'admin') await refreshUsers();
    } catch (err) {
      state.verifyError = err.message;
      render();
    }
  };
  document.getElementById('vf-resend').onclick = async () => {
    try {
      const data = await apiFetch('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email: state.verifyEmail }) });
      state.verifyMessage = data.message || '';
      state.verifyDevCode = data.dev_code || '';
      state.verifyDevError = data.dev_error || '';
      state.verifyError = '';
      render();
    } catch (err) {
      state.verifyError = err.message;
      render();
    }
  };
  document.getElementById('vf-back').onclick = () => { state.screen = 'login'; state.authTab='login'; render(); };
}

/* ---------------- Header ---------------- */
function renderHeader() {
  return `
  <div class="topbar">
    <div class="brand">
      <div class="brand-mark small">ر</div>
      <div class="brand-text">
        <h1>${t('appTitle')}</h1>
        <p>${t('appSubtitle')}</p>
      </div>
    </div>
    <div class="who">
      <span>${state.user.name} — ${trRole(state.user.role)}</span>
      <button class="icon-btn" id="btn-settings" title="${t('settings')}">⚙</button>
      <button id="btn-logout">${t('logout')}</button>
    </div>
  </div>
  ${state.globalError ? `
    <div class="global-error">
      <span>${state.lang==='en' ? 'Something went wrong: ' : 'حدث خطأ: '}${state.globalError}</span>
      <button id="btn-dismiss-error">${state.lang==='en' ? 'Dismiss' : 'إغلاق'}</button>
    </div>` : ''}`;
}

function attachHeaderHandlers() {
  document.getElementById('btn-logout').onclick = logout;
  document.getElementById('btn-settings').onclick = () => { state.showSettings = true; state.formError=''; render(); };
  const dismissBtn = document.getElementById('btn-dismiss-error');
  if (dismissBtn) dismissBtn.onclick = () => { state.globalError = ''; render(); };
}

/* ---------------- Settings modal ---------------- */
function renderSettingsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'settings-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>${t('settingsTitle')}</h3>

      <div class="settings-section">
        <h4>${t('langSection')}</h4>
        <div class="lang-toggle">
          <button id="set-lang-ar" class="${state.lang==='ar'?'active':''}">العربية</button>
          <button id="set-lang-en" class="${state.lang==='en'?'active':''}">English</button>
        </div>
      </div>

      <div class="settings-section">
        <h4>${state.lang==='en' ? 'Appearance' : 'المظهر'}</h4>
        <div class="lang-toggle">
          <button id="set-theme-light" class="${state.theme==='light'?'active':''}">${state.lang==='en' ? 'Light' : 'فاتح'}</button>
          <button id="set-theme-dark" class="${state.theme==='dark'?'active':''}">${state.lang==='en' ? 'Dark' : 'داكن'}</button>
        </div>
      </div>

      <div class="settings-section">
        <h4>${t('accountSection')}</h4>
        <label>${t('nameLabel')}</label>
        <input id="sf-name" type="text" value="${state.user.name}">
        <label>${t('deptLabel')}</label>
        <input id="sf-dept" type="text" value="${state.user.department || ''}">
        <label>${t('newPasswordOptional')}</label>
        <input id="sf-password" type="password" placeholder="••••••••">
        ${state.formError ? `<div class="err">${state.formError}</div>` : ''}
        <button class="btn-primary" id="sf-save">${t('saveAccount')}</button>
      </div>

      <div class="modal-actions">
        <button class="btn-ghost" id="settings-close">${t('close')}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function attachSettingsHandlers() {
  const overlay = document.getElementById('settings-overlay');
  if (!overlay) return;
  overlay.onclick = (e) => { if (e.target.id === 'settings-overlay') { state.showSettings = false; render(); } };
  document.getElementById('settings-close').onclick = () => { state.showSettings = false; render(); };
  document.getElementById('set-lang-ar').onclick = () => { setLang('ar'); render(); };
  document.getElementById('set-lang-en').onclick = () => { setLang('en'); render(); };
  document.getElementById('set-theme-light').onclick = () => { setTheme('light'); render(); };
  document.getElementById('set-theme-dark').onclick = () => { setTheme('dark'); render(); };
  document.getElementById('sf-save').onclick = async () => {
    const name = document.getElementById('sf-name').value.trim();
    const department = document.getElementById('sf-dept').value.trim();
    const password = document.getElementById('sf-password').value;
    if (!name || !department) { state.formError = state.lang==='en' ? 'Name and department are required' : 'الاسم والإدارة حقلان مطلوبان'; render(); return; }
    try {
      const body = { name, department };
      if (password) body.password = password;
      const data = await apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify(body) });
      state.token = data.token;
      state.user = data.user;
      persistSession();
      state.showSettings = false;
      state.formError = '';
      render();
    } catch (err) {
      state.formError = err.message;
      render();
    }
  };
}

function fmtDate(iso) {
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString(state.lang === 'en' ? 'en-US' : 'ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}
function isOverdue(r) {
  if (r.status !== 'قيد المراجعة') return false;
  const created = new Date(r.created_at.replace(' ', 'T') + 'Z').getTime();
  return (Date.now() - created) > 3 * 24 * 60 * 60 * 1000;
}

// يفتح تفاصيل طلب: يجلب النسخة الكاملة (تشمل المرفق) ثم التعليقات، ويعرض النافذة
async function openRequestDetail(id) {
  try {
    const full = await apiFetch('/requests/' + id);
    state.activeRequest = full;
    state.editingRequest = false;
    state.comments = [];
    render();
    loadComments(id);
  } catch (err) {
    state.globalError = err.message;
    render();
  }
}

async function loadComments(id) {
  try {
    state.comments = await apiFetch('/requests/' + id + '/comments');
    renderModalOnly();
  } catch (err) {
    // فشل تحميل التعليقات لا يمنع عرض بقية تفاصيل الطلب
    console.error(err);
  }
}

async function exportRequestsCsv() {
  try {
    const res = await fetch(API + '/requests/export.csv', { headers: { Authorization: 'Bearer ' + state.token } });
    if (!res.ok) throw new Error(state.lang==='en' ? 'Export failed' : 'فشل التصدير');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requests-export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  }
}

// يقرأ ملفًا من عنصر <input type="file"> ويحوّله إلى Base64 مع التحقق من الحجم (2 ميغابايت كحد أقصى)
function readFileAsAttachment(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error(state.lang==='en' ? 'File exceeds 2MB limit' : 'حجم الملف يتجاوز 2 ميغابايت'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result; // "data:<type>;base64,<data>"
      const base64 = dataUrl.split(',')[1];
      resolve({ name: file.name, type: file.type || 'application/octet-stream', data: base64 });
    };
    reader.onerror = () => reject(new Error(state.lang==='en' ? 'Failed to read file' : 'تعذر قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

/* ---------------- Shared helpers ---------------- */
function statusClass(s) {
  if (s === 'قيد المراجعة') return 'wait';
  if (s === 'قيد التنفيذ') return 'progress';
  if (s === 'تمت الموافقة') return 'ok';
  return 'no';
}

/* ---------------- Employee dashboard ---------------- */
function renderEmployee() {
  const q = state.searchQuery.trim().toLowerCase();
  const mine = state.requests.filter(r =>
    !q || r.title.toLowerCase().includes(q) || trType(r.type).toLowerCase().includes(q)
  );
  const counts = {
    total: state.requests.length,
    wait: state.requests.filter(r => r.status === 'قيد المراجعة').length,
    progress: state.requests.filter(r => r.status === 'قيد التنفيذ').length,
    done: state.requests.filter(r => r.status === 'تمت الموافقة').length,
  };
  return `
  <div class="main">
    <div class="row-head">
      <div><h2>${t('myRequests')}</h2><p>${t('myRequestsSub')}</p></div>
      <button class="btn-gold" id="btn-new">${t('newRequest')}</button>
    </div>
    <div class="stats">
      <div class="stat"><b>${counts.total}</b><span>${t('total')}</span></div>
      <div class="stat"><b>${counts.wait}</b><span>${t('pending')}</span></div>
      <div class="stat"><b>${counts.progress}</b><span>${t('inProgress')}</span></div>
      <div class="stat"><b>${counts.done}</b><span>${t('approved')}</span></div>
    </div>
    <div class="search-row">
      <input id="search-input" type="text" value="${state.searchQuery}" placeholder="${state.lang==='en' ? 'Search by title or type...' : 'ابحث بالعنوان أو النوع...'}">
    </div>
    ${mine.length === 0 ? `<div class="empty"><p>${t('noRequests')}</p></div>` : `
      <table>
        <thead><tr><th>${t('colType')}</th><th>${t('colTitle')}</th><th>${t('colDate')}</th><th>${t('colStatus')}</th></tr></thead>
        <tbody>
          ${mine.map(r => `
            <tr data-id="${r.id}" class="row-view ${isOverdue(r) ? 'overdue-row' : ''}">
              <td data-label="${t('colType')}">${trType(r.type)}</td>
              <td data-label="${t('colTitle')}">${r.title}${r.attachment_name ? ' 📎' : ''}</td>
              <td data-label="${t('colDate')}">${fmtDate(r.created_at)}</td>
              <td data-label="${t('colStatus')}"><span class="badge ${statusClass(r.status)}">${trStatus(r.status)}</span>${isOverdue(r) ? `<span class="badge overdue-flag">${state.lang==='en'?'Overdue':'متأخر'}</span>` : ''}</td>
            </tr>`).join('')}
        </tbody>
      </table>`}
    ${state.showNewForm ? renderNewRequestModal() : ''}
  </div>`;
}

function attachEmployeeHandlers() {
  document.getElementById('btn-new').onclick = () => { state.showNewForm = true; state.newAttachment = null; render(); };
  document.getElementById('search-input').oninput = (e) => { state.searchQuery = e.target.value; render(); document.getElementById('search-input').focus(); document.getElementById('search-input').selectionStart = document.getElementById('search-input').value.length; };
  document.querySelectorAll('.row-view').forEach(row => {
    row.onclick = () => openRequestDetail(row.getAttribute('data-id'));
  });
  if (state.showNewForm) attachNewRequestHandlers();
}

/* ---------------- New request modal (shared employee + admin) ---------------- */
function renderNewRequestModal() {
  const isAdmin = state.user.role === 'admin';
  return `
  <div class="overlay" id="new-overlay">
    <div class="modal">
      <h3>${t('newRequest')}</h3>
      ${isAdmin ? `
        <label>${t('colEmployee')}</label>
        <select id="nf-employee">
          <option value="">—</option>
          ${state.users.filter(u => u.role === 'employee').map(u => `<option value="${u.id}">${u.name} — ${u.department}</option>`).join('')}
        </select>
      ` : ''}
      <label>${t('colType')}</label>
      <select id="nf-type">${typeNames().map(v => `<option value="${v}">${trType(v)}</option>`).join('')}</select>
      <label>${t('colTitle')}</label>
      <input id="nf-title" type="text">
      <label>${state.lang==='en' ? 'Additional details' : 'تفاصيل إضافية'}</label>
      <textarea id="nf-desc" rows="4"></textarea>
      <label>${t('colPriority')}</label>
      <select id="nf-priority"><option value="عادية">${trPriority('عادية')}</option><option value="عاجلة">${trPriority('عاجلة')}</option></select>
      <label>${state.lang==='en' ? 'Attachment (optional, max 2MB)' : 'مرفق (اختياري، بحد أقصى 2 ميغابايت)'}</label>
      <div class="attach-row">
        ${state.newAttachment
          ? `<span class="attach-chip">📎 ${state.newAttachment.name} <button type="button" id="nf-remove-attach" class="link-btn">${state.lang==='en'?'Remove':'إزالة'}</button></span>`
          : `<label class="file-input-wrap">${state.lang==='en' ? 'Click to choose a file' : 'اضغط لاختيار ملف'}<input id="nf-attachment" type="file" style="display:none;"></label>`}
      </div>
      ${state.formError ? `<div class="err">${state.formError}</div>` : ''}
      <div class="modal-actions">
        <button class="btn-ghost" id="nf-cancel">${t('cancel')}</button>
        <button class="btn-primary" id="nf-submit" style="margin-top:0;">${state.lang==='en'?'Submit':'إرسال الطلب'}</button>
      </div>
    </div>
  </div>`;
}

function attachNewRequestHandlers() {
  document.getElementById('new-overlay').onclick = (e) => { if (e.target.id === 'new-overlay') { state.showNewForm = false; state.formError=''; render(); } };
  document.getElementById('nf-cancel').onclick = () => { state.showNewForm = false; state.formError=''; render(); };
  const attachInput = document.getElementById('nf-attachment');
  if (attachInput) {
    attachInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        state.newAttachment = await readFileAsAttachment(file);
        state.formError = '';
        render();
      } catch (err) {
        state.formError = err.message;
        render();
      }
    };
  }
  const removeBtn = document.getElementById('nf-remove-attach');
  if (removeBtn) removeBtn.onclick = () => { state.newAttachment = null; render(); };
  document.getElementById('nf-submit').onclick = async () => {
    const title = document.getElementById('nf-title').value.trim();
    if (!title) { state.formError = state.lang==='en' ? 'Please enter a title' : 'الرجاء إدخال عنوان الطلب'; render(); return; }
    const body = {
      type: document.getElementById('nf-type').value,
      title,
      description: document.getElementById('nf-desc').value.trim(),
      priority: document.getElementById('nf-priority').value
    };
    if (state.newAttachment) {
      body.attachment_name = state.newAttachment.name;
      body.attachment_type = state.newAttachment.type;
      body.attachment_data = state.newAttachment.data;
    }
    if (state.user.role === 'admin') {
      const empSelect = document.getElementById('nf-employee');
      if (!empSelect.value) { state.formError = state.lang==='en' ? 'Choose an employee first' : 'اختر الموظف أولًا'; render(); return; }
      body.employee_id = Number(empSelect.value);
    }
    try {
      await apiFetch('/requests', { method: 'POST', body: JSON.stringify(body) });
      state.showNewForm = false;
      state.newAttachment = null;
      state.formError = '';
      await refreshRequests({ status: state.filterStatus, type: state.filterType });
    } catch (err) {
      state.formError = err.message;
      render();
    }
  };
}

/* ---------------- Admin dashboard ---------------- */
function renderAdmin() {
  return `
  <div class="main">
    <div class="admin-tabs">
      <button data-tab="requests" class="${state.adminTab === 'requests' ? 'active' : ''}">${t('requestsTab')}</button>
      <button data-tab="users" class="${state.adminTab === 'users' ? 'active' : ''}">${t('usersTab')}</button>
      <button data-tab="types" class="${state.adminTab === 'types' ? 'active' : ''}">${t('typesTab')}</button>
      <button data-tab="indicators" class="${state.adminTab === 'indicators' ? 'active' : ''}">${t('indicatorsTab')}</button>
      <button data-tab="audit" class="${state.adminTab === 'audit' ? 'active' : ''}">${t('auditTab')}</button>
    </div>
    ${state.adminTab === 'requests' ? renderAdminRequestsTab() : ''}
    ${state.adminTab === 'users' ? renderAdminUsersTab() : ''}
    ${state.adminTab === 'types' ? renderAdminTypesTab() : ''}
    ${state.adminTab === 'indicators' ? renderAdminIndicatorsTab() : ''}
    ${state.adminTab === 'audit' ? renderAdminAuditTab() : ''}
  </div>`;
}

function renderAdminRequestsTab() {
  const q = state.searchQuery.trim().toLowerCase();
  const list = state.requests.filter(r =>
    !q || r.title.toLowerCase().includes(q) || trType(r.type).toLowerCase().includes(q) || (r.employee_name || '').toLowerCase().includes(q)
  );
  const counts = {
    total: state.requests.length,
    wait: state.requests.filter(r => r.status === 'قيد المراجعة').length,
    progress: state.requests.filter(r => r.status === 'قيد التنفيذ').length,
    done: state.requests.filter(r => r.status === 'تمت الموافقة').length,
  };
  // مؤشرات إضافية: عدد الطلبات حسب النوع، عبر كل الطلبات بلا تصفية
  const typeCounts = {};
  typeNames().forEach(tp => { typeCounts[tp] = state.requests.filter(r => r.type === tp).length; });

  return `
    <div class="row-head">
      <div><h2>${t('requestsBoardTitle')}</h2><p>${t('requestsBoardSub')}</p></div>
      <div style="display:flex;gap:10px;">
        <button class="btn-export" id="btn-export-csv">${state.lang==='en' ? '⬇ Export CSV' : '⬇ تصدير CSV'}</button>
        <button class="btn-gold" id="btn-new">${t('addRequest')}</button>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><b>${counts.total}</b><span>${t('total')}</span></div>
      <div class="stat"><b>${counts.wait}</b><span>${t('pending')}</span></div>
      <div class="stat"><b>${counts.progress}</b><span>${t('inProgress')}</span></div>
      <div class="stat"><b>${counts.done}</b><span>${t('approved')}</span></div>
    </div>
    <div class="type-chips">
      ${typeNames().map(tp => `<span class="type-chip">${trType(tp)} <b>${typeCounts[tp]}</b></span>`).join('')}
    </div>
    <div class="search-row">
      <input id="search-input" type="text" value="${state.searchQuery}" placeholder="${state.lang==='en' ? 'Search by title, type, or employee...' : 'ابحث بالعنوان أو النوع أو اسم الموظف...'}">
    </div>
    <div class="filters">
      <select id="f-status">
        <option value="الكل" ${state.filterStatus==='الكل'?'selected':''}>${t('all')}</option>
        ${STATUS_LIST.map(s=>`<option value="${s}" ${state.filterStatus===s?'selected':''}>${trStatus(s)}</option>`).join('')}
      </select>
      <select id="f-type">
        <option value="الكل" ${state.filterType==='الكل'?'selected':''}>${t('all')}</option>
        ${typeNames().map(v=>`<option value="${v}" ${state.filterType===v?'selected':''}>${trType(v)}</option>`).join('')}
      </select>
    </div>
    ${list.length === 0 ? `<div class="empty"><p>${t('noneFiltered')}</p></div>` : `
      <table>
        <thead><tr><th>${t('colEmployee')}</th><th>${t('colType')}</th><th>${t('colTitle')}</th><th>${t('colPriority')}</th><th>${t('colDate')}</th><th>${t('colStatus')}</th></tr></thead>
        <tbody>
          ${list.map(r => `
            <tr data-id="${r.id}" class="row-view ${isOverdue(r) ? 'overdue-row' : ''}">
              <td data-label="${t('colEmployee')}">${r.employee_name} <span style="color:#9a9a90;">— ${r.employee_department}</span></td>
              <td data-label="${t('colType')}">${trType(r.type)}</td>
              <td data-label="${t('colTitle')}">${r.title}${r.attachment_name ? ' 📎' : ''}</td>
              <td data-label="${t('colPriority')}">${trPriority(r.priority)}</td>
              <td data-label="${t('colDate')}">${fmtDate(r.created_at)}</td>
              <td data-label="${t('colStatus')}"><span class="badge ${statusClass(r.status)}">${trStatus(r.status)}</span>${isOverdue(r) ? `<span class="badge overdue-flag">${state.lang==='en'?'Overdue':'متأخر'}</span>` : ''}</td>
            </tr>`).join('')}
        </tbody>
      </table>`}
    ${state.showNewForm ? renderNewRequestModal() : ''}
  `;
}

function renderAdminUsersTab() {
  const list = state.users;
  return `
    <div class="row-head">
      <div><h2>${t('usersBoardTitle')}</h2><p>${t('usersBoardSub')}</p></div>
      <button class="btn-gold" id="btn-new-user">${t('newUser')}</button>
    </div>
    ${list.length === 0 ? `<div class="empty"><p>${t('noUsers')}</p></div>` : `
      <table>
        <thead><tr><th>${t('colName')}</th><th>${t('colEmail')}</th><th>${t('colDept')}</th><th>${t('colRole')}</th><th></th></tr></thead>
        <tbody>
          ${list.map(u => `
            <tr data-id="${u.id}">
              <td data-label="${t('colName')}">${u.name}</td>
              <td data-label="${t('colEmail')}">${u.email}</td>
              <td data-label="${t('colDept')}">${u.department}</td>
              <td data-label="${t('colRole')}"><span class="badge ${u.role === 'admin' ? 'ok' : 'progress'}">${trRole(u.role)}</span></td>
              <td data-label="">
                <button class="row-btn edit-user" data-id="${u.id}">${t('edit')}</button>
                ${u.id !== state.user.id ? `<button class="row-btn danger delete-user" data-id="${u.id}">${t('delete')}</button>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`}
  `;
}

/* ---------------- Request types management tab ---------------- */
function renderAdminTypesTab() {
  return `
    <div class="row-head">
      <div><h2>${t('typesTab')}</h2><p>${state.lang==='en' ? 'Add, rename, or remove request categories used across the system.' : 'أضف أو أعد تسمية أو احذف أنواع الطلبات المستخدمة في النظام بالكامل.'}</p></div>
    </div>
    <div class="add-type-row">
      <input id="nt-name" type="text" placeholder="${t('typeNamePlaceholder')}">
      <button class="btn-gold" id="nt-add" style="white-space:nowrap;">${t('addType')}</button>
    </div>
    ${state.formError ? `<div class="err" style="margin-bottom:14px;">${state.formError}</div>` : ''}
    ${state.requestTypes.map(rt => `
      <div class="type-manage-row" data-id="${rt.id}">
        <input type="text" value="${rt.name}" data-original="${rt.name}">
        <button class="row-btn save-type" data-id="${rt.id}">${t('save')}</button>
        <button class="row-btn danger delete-type" data-id="${rt.id}">${t('delete')}</button>
      </div>`).join('')}
  `;
}

/* ---------------- Indicators tab ---------------- */
function renderAdminIndicatorsTab() {
  const s = state.stats;
  if (!s) return `<div class="empty"><p>${state.lang==='en' ? 'Loading indicators...' : 'جارِ تحميل المؤشرات...'}</p></div>`;

  return `
    <div class="row-head">
      <div><h2>${t('indicatorsTab')}</h2><p>${t('indicatorsSub')}</p></div>
    </div>
    <div class="indicator-grid">
      <div class="indicator-card"><b>${s.totalRequests}</b><span>${t('total')}</span></div>
      <div class="indicator-card"><b>${s.last7Days}</b><span>${t('last7DaysLabel')}</span></div>
      <div class="indicator-card"><b>${s.overdue ?? 0}</b><span>${state.lang==='en' ? 'Overdue Requests' : 'طلبات متأخرة'}</span></div>
      <div class="indicator-card"><b>${s.totalUsers}</b><span>${t('totalUsersLabel')}</span></div>
      <div class="indicator-card"><b>${s.totalEmployees}</b><span>${t('employeesLabel')}</span></div>
      <div class="indicator-card"><b>${s.totalAdmins}</b><span>${t('adminsLabel')}</span></div>
      <div class="indicator-card"><b>${s.unverifiedUsers}</b><span>${t('unverifiedLabel')}</span></div>
    </div>

    <div class="charts-grid">
      <div class="chart-card"><h4>${t('byStatusTitle')}</h4><canvas id="chart-status" height="220"></canvas></div>
      <div class="chart-card"><h4>${t('byTypeTitle')}</h4><canvas id="chart-type" height="220"></canvas></div>
      <div class="chart-card" style="grid-column:1/-1;"><h4>${t('byDeptTitle')}</h4><canvas id="chart-dept" height="180"></canvas></div>
    </div>
  `;
}

// يرسم/يحدّث رسوم Chart.js بعد إدراج عناصر <canvas> في DOM. يدمّر أي رسم سابق أولًا
// لتفادي خطأ Chart.js عند إعادة استخدام نفس عنصر canvas.
function renderIndicatorCharts() {
  const s = state.stats;
  if (!s || typeof Chart === 'undefined') return;

  Object.values(state.charts).forEach(c => c && c.destroy());
  state.charts = {};

  const palette = ['#B8874F', '#1F4B43', '#3C7A5C', '#A23B32', '#8a8a80', '#D3A466', '#2A5D80'];
  const isDark = state.theme === 'dark';
  const textColor = isDark ? '#E7EFEA' : '#1E2A28';
  const gridColor = isDark ? '#2A433C' : '#EFEBDD';

  const statusCtx = document.getElementById('chart-status');
  if (statusCtx) {
    state.charts.status = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: s.byStatus.map(x => trStatus(x.status)),
        datasets: [{ data: s.byStatus.map(x => x.c), backgroundColor: palette }]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { color: textColor, font: { family: 'IBM Plex Sans Arabic' } } } } }
    });
  }

  const typeCtx = document.getElementById('chart-type');
  if (typeCtx) {
    state.charts.type = new Chart(typeCtx, {
      type: 'bar',
      data: {
        labels: s.byType.map(x => trType(x.type)),
        datasets: [{ data: s.byType.map(x => x.c), backgroundColor: '#1F4B43', borderRadius: 6 }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor, font: { family: 'IBM Plex Sans Arabic' } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } }
        }
      }
    });
  }

  const deptCtx = document.getElementById('chart-dept');
  if (deptCtx) {
    state.charts.dept = new Chart(deptCtx, {
      type: 'bar',
      data: {
        labels: s.byDepartment.map(x => x.department),
        datasets: [{ data: s.byDepartment.map(x => x.c), backgroundColor: '#B8874F', borderRadius: 6 }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, font: { family: 'IBM Plex Sans Arabic' } }, grid: { display: false } }
        }
      }
    });
  }
}

/* ---------------- Audit log tab ---------------- */
function renderAdminAuditTab() {
  const list = state.auditLog;
  const actionLabel = (a) => {
    const map = state.lang === 'en'
      ? { create: 'Created', update: 'Updated', delete: 'Deleted', status_change: 'Status changed', export: 'Exported' }
      : { create: 'إنشاء', update: 'تعديل', delete: 'حذف', status_change: 'تغيير حالة', export: 'تصدير' };
    return map[a] || a;
  };
  const targetLabel = (tt) => {
    const map = state.lang === 'en'
      ? { user: 'User', request: 'Request', request_type: 'Request Type' }
      : { user: 'مستخدم', request: 'طلب', request_type: 'نوع طلب' };
    return map[tt] || tt;
  };
  return `
    <div class="row-head">
      <div><h2>${t('auditTab')}</h2><p>${state.lang==='en' ? 'A record of every admin action for accountability — most recent first.' : 'سجل بكل إجراء إداري للمساءلة والشفافية — الأحدث أولًا.'}</p></div>
    </div>
    ${list.length === 0 ? `<div class="empty"><p>${state.lang==='en' ? 'No actions recorded yet.' : 'لا توجد إجراءات مسجّلة بعد.'}</p></div>` : `
      <table>
        <thead><tr>
          <th>${state.lang==='en' ? 'Time' : 'الوقت'}</th>
          <th>${state.lang==='en' ? 'Actor' : 'الفاعل'}</th>
          <th>${state.lang==='en' ? 'Action' : 'الإجراء'}</th>
          <th>${state.lang==='en' ? 'Target' : 'العنصر'}</th>
          <th>${state.lang==='en' ? 'Details' : 'التفاصيل'}</th>
        </tr></thead>
        <tbody>
          ${list.map(a => `
            <tr>
              <td data-label="${state.lang==='en'?'Time':'الوقت'}">${fmtDate(a.created_at)}</td>
              <td data-label="${state.lang==='en'?'Actor':'الفاعل'}">${a.actor_name}</td>
              <td data-label="${state.lang==='en'?'Action':'الإجراء'}"><span class="audit-action ${a.action}">${actionLabel(a.action)}</span></td>
              <td data-label="${state.lang==='en'?'Target':'العنصر'}">${targetLabel(a.target_type)}</td>
              <td data-label="${state.lang==='en'?'Details':'التفاصيل'}">${a.details || '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`}
  `;
}

function attachAdminHandlers() {
  document.querySelectorAll('.admin-tabs button').forEach(btn => {
    btn.onclick = () => {
      state.adminTab = btn.getAttribute('data-tab');
      state.formError = '';
      render();
      if (state.adminTab === 'indicators') refreshStats();
      if (state.adminTab === 'audit') refreshAuditLog();
    };
  });

  if (state.adminTab === 'requests') {
    document.getElementById('btn-new').onclick = () => { state.showNewForm = true; state.newAttachment = null; render(); };
    document.getElementById('btn-export-csv').onclick = exportRequestsCsv;
    document.getElementById('search-input').oninput = (e) => {
      state.searchQuery = e.target.value;
      render();
      const el = document.getElementById('search-input');
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    };
    document.querySelectorAll('.row-view').forEach(row => {
      row.onclick = () => openRequestDetail(row.getAttribute('data-id'));
    });
    document.getElementById('f-status').onchange = (e) => { state.filterStatus = e.target.value; refreshRequests({ status: state.filterStatus, type: state.filterType }); };
    document.getElementById('f-type').onchange = (e) => { state.filterType = e.target.value; refreshRequests({ status: state.filterStatus, type: state.filterType }); };
    if (state.showNewForm) attachNewRequestHandlers();
  } else if (state.adminTab === 'users') {
    document.getElementById('btn-new-user').onclick = () => { state.showUserForm = true; state.editingUser = null; state.formError=''; render(); };
    document.querySelectorAll('.edit-user').forEach(btn => {
      btn.onclick = () => {
        state.editingUser = state.users.find(u => String(u.id) === btn.getAttribute('data-id'));
        state.showUserForm = true;
        state.formError = '';
        render();
      };
    });
    document.querySelectorAll('.delete-user').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm(state.lang==='en' ? 'Delete this user? Their request history stays, but they lose access.' : 'هل أنت متأكد من حذف هذا المستخدم؟ سيبقى سجل طلباته لكن سيفقد القدرة على الدخول.')) return;
        try {
          await apiFetch('/users/' + btn.getAttribute('data-id'), { method: 'DELETE' });
          await refreshUsers();
        } catch (err) {
          alert(err.message);
        }
      };
    });
  } else if (state.adminTab === 'types') {
    document.getElementById('nt-add').onclick = async () => {
      const input = document.getElementById('nt-name');
      const name = input.value.trim();
      if (!name) { state.formError = state.lang==='en' ? 'Enter a type name' : 'أدخل اسم النوع'; render(); return; }
      try {
        await apiFetch('/request-types', { method: 'POST', body: JSON.stringify({ name }) });
        state.formError = '';
        await refreshRequestTypes();
      } catch (err) {
        state.formError = err.message;
        render();
      }
    };
    document.querySelectorAll('.save-type').forEach(btn => {
      btn.onclick = async () => {
        const row = btn.closest('.type-manage-row');
        const input = row.querySelector('input');
        const newName = input.value.trim();
        if (!newName || newName === input.getAttribute('data-original')) return;
        try {
          await apiFetch('/request-types/' + btn.getAttribute('data-id'), { method: 'PATCH', body: JSON.stringify({ name: newName }) });
          state.formError = '';
          await refreshRequestTypes();
          await refreshRequests({ status: state.filterStatus, type: state.filterType });
        } catch (err) {
          state.formError = err.message;
          render();
        }
      };
    });
    document.querySelectorAll('.delete-type').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm(t('deleteTypeConfirm'))) return;
        try {
          await apiFetch('/request-types/' + btn.getAttribute('data-id'), { method: 'DELETE' });
          await refreshRequestTypes();
        } catch (err) {
          alert(err.message);
        }
      };
    });
  } else if (state.adminTab === 'indicators') {
    renderIndicatorCharts();
  }
}

/* ---------------- User add/edit modal ---------------- */
function renderUserModal() {
  const editing = state.editingUser;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'user-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>${editing ? t('edit') : t('newUser')}</h3>
      <label>${t('nameLabel')}</label>
      <input id="uf-name" type="text" value="${editing ? editing.name : ''}">
      ${editing ? '' : `
        <label>${t('emailLabel')}</label>
        <input id="uf-email" type="email" placeholder="name@moe.gov.sa">
      `}
      <label>${t('deptLabel')}</label>
      <input id="uf-dept" type="text" value="${editing ? editing.department : ''}">
      <label>${t('colRole')}</label>
      <select id="uf-role">
        <option value="employee" ${editing && editing.role === 'employee' ? 'selected' : ''}>${trRole('employee')}</option>
        <option value="admin" ${editing && editing.role === 'admin' ? 'selected' : ''}>${trRole('admin')}</option>
      </select>
      <label>${editing ? t('newPasswordOptional') : t('passwordHint')}</label>
      <input id="uf-password" type="password" placeholder="••••••••">
      ${state.formError ? `<div class="err">${state.formError}</div>` : ''}
      <div class="modal-actions">
        <button class="btn-ghost" id="uf-cancel">${t('cancel')}</button>
        <button class="btn-primary" id="uf-submit" style="margin-top:0;">${editing ? t('save') : t('registerBtn')}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function attachUserModalHandlers() {
  const editing = state.editingUser;
  const overlay = document.getElementById('user-overlay');
  if (!overlay) return;
  overlay.onclick = (e) => { if (e.target.id === 'user-overlay') { state.showUserForm = false; state.formError=''; render(); } };
  document.getElementById('uf-cancel').onclick = () => { state.showUserForm = false; state.formError=''; render(); };
  document.getElementById('uf-submit').onclick = async () => {
    const name = document.getElementById('uf-name').value.trim();
    const department = document.getElementById('uf-dept').value.trim();
    const role = document.getElementById('uf-role').value;
    const password = document.getElementById('uf-password').value;

    if (!name || !department) { state.formError = state.lang==='en' ? 'Name and department are required' : 'الاسم والإدارة حقلان مطلوبان'; render(); return; }

    try {
      if (editing) {
        const body = { name, department, role };
        if (password) body.password = password;
        await apiFetch('/users/' + editing.id, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        const email = document.getElementById('uf-email').value.trim();
        if (!email || !password) { state.formError = state.lang==='en' ? 'Email and password are required' : 'البريد الإلكتروني وكلمة المرور مطلوبان'; render(); return; }
        await apiFetch('/users', { method: 'POST', body: JSON.stringify({ name, email, password, department, role }) });
      }
      state.showUserForm = false;
      state.editingUser = null;
      state.formError = '';
      await refreshUsers();
    } catch (err) {
      state.formError = err.message;
      render();
    }
  };
}

/* ---------------- Request detail / edit modal ---------------- */
function renderRequestModal() {
  const r = state.activeRequest;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'detail-overlay';
  const isAdmin = state.screen === 'admin';

  if (isAdmin && state.editingRequest) {
    overlay.innerHTML = `
      <div class="modal">
        <h3>${t('edit')}</h3>
        <label>${t('colType')}</label>
        <select id="ef-type">${typeNames().map(v => `<option value="${v}" ${v===r.type?'selected':''}>${trType(v)}</option>`).join('')}</select>
        <label>${t('colTitle')}</label>
        <input id="ef-title" type="text" value="${r.title}">
        <label>${state.lang==='en' ? 'Additional details' : 'تفاصيل إضافية'}</label>
        <textarea id="ef-desc" rows="4">${r.description || ''}</textarea>
        <label>${t('colPriority')}</label>
        <select id="ef-priority">
          <option value="عادية" ${r.priority==='عادية'?'selected':''}>${trPriority('عادية')}</option>
          <option value="عاجلة" ${r.priority==='عاجلة'?'selected':''}>${trPriority('عاجلة')}</option>
        </select>
        <label>${state.lang==='en' ? 'Attachment (optional, max 2MB)' : 'مرفق (اختياري، بحد أقصى 2 ميغابايت)'}</label>
        <div class="attach-row">
          ${state.newAttachment
            ? `<span class="attach-chip">📎 ${state.newAttachment.name} <button type="button" id="ef-remove-attach" class="link-btn">${state.lang==='en'?'Remove':'إزالة'}</button></span>`
            : (r.attachment_name
              ? `<span class="attach-chip">📎 ${r.attachment_name} <button type="button" id="ef-replace-attach" class="link-btn">${state.lang==='en'?'Replace':'استبدال'}</button></span>`
              : `<label class="file-input-wrap">${state.lang==='en' ? 'Click to choose a file' : 'اضغط لاختيار ملف'}<input id="ef-attachment" type="file" style="display:none;"></label>`)}
        </div>
        ${state.formError ? `<div class="err">${state.formError}</div>` : ''}
        <div class="modal-actions">
          <button class="btn-ghost" id="ef-cancel">${t('cancel')}</button>
          <button class="btn-primary" id="ef-save" style="margin-top:0;">${t('save')}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.onclick = (e) => { if (e.target.id === 'detail-overlay') closeModal(); };
    document.getElementById('ef-cancel').onclick = () => { state.editingRequest = false; state.newAttachment = null; renderModalOnly(); };
    const efAttachInput = document.getElementById('ef-attachment');
    if (efAttachInput) {
      efAttachInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          state.newAttachment = await readFileAsAttachment(file);
          state.formError = '';
          renderModalOnly();
        } catch (err) {
          state.formError = err.message;
          renderModalOnly();
        }
      };
    }
    const efRemoveBtn = document.getElementById('ef-remove-attach');
    if (efRemoveBtn) efRemoveBtn.onclick = () => { state.newAttachment = null; renderModalOnly(); };
    const efReplaceBtn = document.getElementById('ef-replace-attach');
    if (efReplaceBtn) efReplaceBtn.onclick = () => { r.attachment_name = null; renderModalOnly(); };
    document.getElementById('ef-save').onclick = async () => {
      const title = document.getElementById('ef-title').value.trim();
      if (!title) { state.formError = state.lang==='en' ? 'Title is required' : 'عنوان الطلب مطلوب'; renderModalOnly(); return; }
      try {
        const body = {
          type: document.getElementById('ef-type').value,
          title,
          description: document.getElementById('ef-desc').value.trim(),
          priority: document.getElementById('ef-priority').value
        };
        if (state.newAttachment) {
          body.attachment_name = state.newAttachment.name;
          body.attachment_type = state.newAttachment.type;
          body.attachment_data = state.newAttachment.data;
        }
        await apiFetch('/requests/' + r.id, { method: 'PATCH', body: JSON.stringify(body) });
        state.editingRequest = false;
        state.formError = '';
        state.newAttachment = null;
        closeModal();
        await refreshRequests({ status: state.filterStatus, type: state.filterType });
      } catch (err) {
        state.formError = err.message;
        renderModalOnly();
      }
    };
    return;
  }

  const attachmentHtml = r.attachment_name
    ? `<div class="attach-row"><span class="attach-chip">📎 ${r.attachment_data
        ? `<a href="data:${r.attachment_type || 'application/octet-stream'};base64,${r.attachment_data}" download="${r.attachment_name}">${r.attachment_name}</a>`
        : r.attachment_name}</span></div>`
    : '';

  const commentsHtml = `
    <div class="comments-section">
      <h4>${state.lang==='en' ? 'Comments' : 'التعليقات'}</h4>
      ${state.comments.length === 0
        ? `<p class="no-comments">${state.lang==='en' ? 'No comments yet.' : 'لا توجد تعليقات بعد.'}</p>`
        : state.comments.map(c => `
            <div class="comment-item">
              <div class="comment-meta"><b>${c.author_name}</b><span>${fmtDate(c.created_at)}</span></div>
              <p>${c.message}</p>
            </div>`).join('')}
      <div class="comment-form">
        <textarea id="new-comment" rows="2" placeholder="${state.lang==='en' ? 'Write a comment...' : 'اكتب تعليقًا...'}"></textarea>
        <button id="btn-add-comment">${state.lang==='en' ? 'Send' : 'إرسال'}</button>
      </div>
    </div>`;

  overlay.innerHTML = `
    <div class="modal">
      <h3>${r.title}</h3>
      ${isAdmin ? `<div class="detail-row"><span>${t('colEmployee')}</span><span>${r.employee_name}</span></div>
      <div class="detail-row"><span>${t('colDept')}</span><span>${r.employee_department}</span></div>` : ''}
      <div class="detail-row"><span>${t('colType')}</span><span>${trType(r.type)}</span></div>
      <div class="detail-row"><span>${t('colPriority')}</span><span>${trPriority(r.priority)}</span></div>
      <div class="detail-row"><span>${t('colDate')}</span><span>${fmtDate(r.created_at)}</span></div>
      <div class="detail-row"><span>${t('colStatus')}</span><span class="badge ${statusClass(r.status)}">${trStatus(r.status)}</span>${isOverdue(r) ? `<span class="badge overdue-flag">${state.lang==='en'?'Overdue':'متأخر'}</span>` : ''}</div>
      ${r.description ? `<div style="margin-top:14px;"><span style="color:#7a7a70;font-size:13px;">${state.lang==='en'?'Details:':'التفاصيل:'}</span><p style="font-size:13.5px;margin:6px 0 0;">${r.description}</p></div>` : ''}
      ${attachmentHtml}
      ${r.admin_note ? `<div style="margin-top:14px;"><span style="color:#7a7a70;font-size:13px;">${state.lang==='en'?'Admin note:':'ملاحظة الإدارة:'}</span><p style="font-size:13.5px;margin:6px 0 0;">${r.admin_note}</p></div>` : ''}
      ${isAdmin ? `
        <label style="margin-top:16px;">${state.lang==='en'?'Note (optional)':'ملاحظة (اختياري)'}</label>
        <textarea id="dt-note" rows="2">${r.admin_note || ''}</textarea>
        <div class="admin-actions">
          <button style="background:var(--wait);" id="act-progress">${t('inProgress')}</button>
          <button style="background:var(--ok);" id="act-approve">${t('approved')}</button>
          <button style="background:var(--danger);" id="act-reject">${state.lang==='en'?'Reject':'رفض'}</button>
        </div>
        <div class="admin-actions" style="margin-top:8px;">
          <button style="background:var(--teal);" id="act-edit">${state.lang==='en'?'Edit Request':'تعديل بيانات الطلب'}</button>
          <button style="background:#8a8a80;" id="act-delete">${t('delete')}</button>
        </div>` : ''}
      ${commentsHtml}
      <div class="modal-actions"><button class="btn-ghost" id="dt-close">${t('close')}</button></div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.onclick = (e) => { if (e.target.id === 'detail-overlay') closeModal(); };
  document.getElementById('dt-close').onclick = closeModal;

  document.getElementById('btn-add-comment').onclick = async () => {
    const textarea = document.getElementById('new-comment');
    const message = textarea.value.trim();
    if (!message) return;
    try {
      await apiFetch('/requests/' + r.id + '/comments', { method: 'POST', body: JSON.stringify({ message }) });
      await loadComments(r.id);
    } catch (err) {
      alert(err.message);
    }
  };

  if (isAdmin) {
    const setStatus = async (status) => {
      try {
        await apiFetch('/requests/' + r.id, {
          method: 'PATCH',
          body: JSON.stringify({ status, admin_note: document.getElementById('dt-note').value.trim() })
        });
        closeModal();
        await refreshRequests({ status: state.filterStatus, type: state.filterType });
      } catch (err) {
        alert(err.message);
      }
    };
    document.getElementById('act-progress').onclick = () => setStatus('قيد التنفيذ');
    document.getElementById('act-approve').onclick = () => setStatus('تمت الموافقة');
    document.getElementById('act-reject').onclick = () => setStatus('مرفوض');
    document.getElementById('act-edit').onclick = () => { state.editingRequest = true; state.formError=''; state.newAttachment = null; renderModalOnly(); };
    document.getElementById('act-delete').onclick = async () => {
      if (!confirm(state.lang==='en' ? 'Delete this request permanently?' : 'هل أنت متأكد من حذف هذا الطلب نهائيًا؟')) return;
      try {
        await apiFetch('/requests/' + r.id, { method: 'DELETE' });
        closeModal();
        await refreshRequests({ status: state.filterStatus, type: state.filterType });
      } catch (err) {
        alert(err.message);
      }
    };
  }
}

function renderModalOnly() {
  const old = document.getElementById('detail-overlay');
  if (old) old.remove();
  renderRequestModal();
}

function closeModal() {
  state.activeRequest = null;
  state.editingRequest = false;
  state.newAttachment = null;
  state.comments = [];
  const el = document.getElementById('detail-overlay');
  if (el) el.remove();
}

boot();
