/* ============================================================
   JODOHKU FRONTEND JAVASCRIPT
   File: js/app.js
   Versi: 3.0.0 — Backend-matched (routes_auth, chat, matchmaking,
                   payment, profile, psych, stats)
============================================================ */

const API = 'https://jodohku-api.onrender.com';

/* ── TIERS (local — tiada endpoint backend) ── */
const TIERS = [
  {
    id: 'Silver', name: 'Silver', price: 19.99, period: 'bulan', popular: false,
    features: ['Sehingga 50 mesej/bulan','10 padanan harian','Profil disahkan IC','AI Wingman asas'],
  },
  {
    id: 'Gold', name: 'Gold', price: 59.99, period: 'bulan', popular: true,
    features: ['Mesej tanpa had','20 padanan harian','Skor keserasian AI','Lencana Gold','Sokongan keutamaan'],
  },
  {
    id: 'Platinum', name: 'Platinum', price: 299.99, period: 'bulan', popular: false,
    features: ['Semua ciri Gold','Pertukaran WhatsApp','Padanan tanpa had','Analisis AI mendalam','Pengurusan akaun peribadi'],
  },
  {
    id: 'Sovereign', name: 'Black Sovereign', price: 4999.00, period: 'tahun', popular: false, invite_only: true,
    features: ['Akses jemputan sahaja','Jodoh eksklusif VVIP','Curated matchmaking','Konsultan perkahwinan peribadi'],
  },
];

/* ── QUIZ (local — 30 soalan, tiada endpoint backend) ── */
const PSY_BANK = [
  {id:'q1',dim:'kewangan',w:0.05,title:'💰 Kewangan',q:'Anda terima bonus RM10,000. Tindakan pertama?',opts:['Simpan dalam ASB/FD','50% simpan, 30% labur, 20% keluarga','Belanjakan untuk pengalaman','Bayar semua hutang'],scores:[7,9,6,8]},
  {id:'q2',dim:'keluarga',w:0.06,title:'👨‍👩‍👧 Keluarga',q:'Seberapa penting restu ibu bapa dalam perkahwinan?',opts:['Wajib — tiada restu tiada nikah','Sangat penting tapi bukan mutlak','Penting tapi keputusan kami sendiri','Urusan kami berdua sahaja'],scores:[10,8,6,4]},
  {id:'q3',dim:'konflik',w:0.04,title:'🤝 Konflik',q:'Apabila berlaku perbalahan dengan pasangan:',opts:['Berbincang dengan tenang','Beri ruang dahulu','Minta penengah','Tulis mesej/surat'],scores:[9,8,7,6]},
  {id:'q4',dim:'agama',w:0.06,title:'🕌 Agama',q:'Amalan agama harian pasangan adalah:',opts:['Sangat penting — soleh/solehah','Penting — solat 5 waktu','Perlu ada tapi tidak ketat','Urusan peribadi'],scores:[10,8,6,4]},
  {id:'q5',dim:'gaya_hidup',w:0.04,title:'🌙 Gaya Hidup',q:'Waktu tidur ideal anda:',opts:['Sebelum 11 malam','11 malam - 1 pagi','1 - 3 pagi','Selepas 3 pagi'],scores:[8,7,5,3]},
  {id:'q6',dim:'komunikasi',w:0.05,title:'💬 Komunikasi',q:'Cara komunikasi pilihan dengan pasangan:',opts:['Bersemuka setiap hari','Panggilan video harian','Mesej teks sepanjang hari','Kualiti lebih penting dari kuantiti'],scores:[9,8,7,10]},
  {id:'q7',dim:'kewangan',w:0.05,title:'💰 Kewangan',q:'Pendapat tentang perbelanjaan besar tanpa berbincang:',opts:['Tidak boleh sama sekali','Boleh jika bawah had tertentu','Bergantung pada situasi','Bebas selagi tidak membebankan'],scores:[10,7,8,5]},
  {id:'q8',dim:'keluarga',w:0.05,title:'👨‍👩‍👧 Keluarga',q:'Tinggal bersama ibu bapa selepas kahwin:',opts:['Ya — wajib jaga ibu bapa','Setuju jika diperlukan','Lebih suka rumah sendiri tapi dekat','Mesti tinggal berasingan'],scores:[8,9,7,6]},
  {id:'q9',dim:'agama',w:0.05,title:'🕌 Agama',q:'Pendidikan agama anak-anak:',opts:['Sekolah agama wajib','Pengajian agama di rumah','Seimbang antara agama dan akademik','Pilihan anak sendiri'],scores:[10,9,8,5]},
  {id:'q10',dim:'masa_depan',w:0.05,title:'🎯 Masa Depan',q:'Berapa anak yang diinginkan:',opts:['1-2 orang','3-4 orang','5 atau lebih','Redha dengan rezeki Allah'],scores:[6,8,7,10]},
  {id:'q11',dim:'gaya_hidup',w:0.04,title:'🌙 Gaya Hidup',q:'Aktiviti hujung minggu ideal:',opts:['Keluar bersama keluarga','Aktiviti luar seperti hiking','Duduk di rumah berkualiti','Bersosial dengan kawan-kawan'],scores:[9,7,8,6]},
  {id:'q12',dim:'kewangan',w:0.05,title:'💰 Kewangan',q:'Pengurusan kewangan selepas berkahwin:',opts:['Akaun bersama penuh','Akaun bersama + peribadi','Akaun berasingan tapi kongsi bil','Sepenuhnya berasingan'],scores:[7,10,8,5]},
  {id:'q13',dim:'komunikasi',w:0.05,title:'💬 Komunikasi',q:'Apabila pasangan dalam masalah:',opts:['Terus tawarkan penyelesaian','Dengar dahulu baru cadang','Beri ruang dan sokongan moral','Tanya apa yang diperlukan'],scores:[7,8,9,10]},
  {id:'q14',dim:'keluarga',w:0.06,title:'👨‍👩‍👧 Keluarga',q:'Peranan ibu bapa dalam mengasuh anak:',opts:['Ibu lebih utama','Bapa lebih utama','Sama rata','Bergantung pada kekuatan masing-masing'],scores:[6,6,9,10]},
  {id:'q15',dim:'agama',w:0.05,title:'🕌 Agama',q:'Majlis perkahwinan yang diimpikan:',opts:['Sederhana dan khusyuk','Meriah tapi dalam batas syarak','Besar mengikut adat','Yang penting sah nikah sahaja'],scores:[9,8,6,10]},
  {id:'q16',dim:'masa_depan',w:0.05,title:'🎯 Masa Depan',q:'Rancangan kerjaya pasangan selepas kahwin:',opts:['Isteri fokus urus rumah','Dua-dua bekerja','Fleksibel ikut situasi','Sokongan penuh apa sahaja pilihan'],scores:[6,8,9,10]},
  {id:'q17',dim:'konflik',w:0.04,title:'🤝 Konflik',q:'Cara selesaikan masalah kewangan dalam perkahwinan:',opts:['Berbincang dan buat bajet','Konsultasi pakar kewangan','Minta nasihat ibu bapa','Selesaikan sendiri antara berdua'],scores:[9,8,7,10]},
  {id:'q18',dim:'gaya_hidup',w:0.04,title:'🌙 Gaya Hidup',q:'Tabiat pemakanan anda:',opts:['Sangat menitikberatkan pemakanan sihat','Sederhana — halal dan bersih','Tidak kisah selagi halal','Ikut citarasa sahaja'],scores:[8,9,10,6]},
  {id:'q19',dim:'komunikasi',w:0.05,title:'💬 Komunikasi',q:'Pendapat tentang media sosial dalam perkahwinan:',opts:['Privasi — tiada perlu kongsi','Kongsi yang baik sahaja','Terbuka tetapi berbincang dahulu','Bebas selagi tiada yang haram'],scores:[9,8,7,6]},
  {id:'q20',dim:'keluarga',w:0.05,title:'👨‍👩‍👧 Keluarga',q:'Menghantar anak ke asrama:',opts:['Tidak setuju — anak perlu di sisi','Setuju jika sekolah terbaik','Bergantung pada kematangan anak','Sokongan sepenuhnya ikut pilihan anak'],scores:[7,8,9,10]},
  {id:'q21',dim:'kewangan',w:0.04,title:'💰 Kewangan',q:'Tabungan untuk pendidikan anak:',opts:['Mulakan dari lahir (SSPN dll)','Mulakan apabila mampu','Biasiswa dan pinjaman pilihan','Bergantung kepada rezeki'],scores:[10,8,6,7]},
  {id:'q22',dim:'agama',w:0.05,title:'🕌 Agama',q:'Sambutan perayaan bukan Islam dalam keluarga:',opts:['Tidak terlibat langsung','Hormati tapi tidak menyertai','Hadiri sebagai menghormati','Bergantung pada situasi'],scores:[8,10,7,9]},
  {id:'q23',dim:'masa_depan',w:0.05,title:'🎯 Masa Depan',q:'Impian kediaman pertama:',opts:['Beli rumah dalam 3 tahun','Sewa dahulu kumpul modal','Tinggal dengan ibu bapa dulu','Ikut kemampuan masa itu'],scores:[8,9,7,10]},
  {id:'q24',dim:'komunikasi',w:0.04,title:'💬 Komunikasi',q:'Cara meluahkan kasih sayang:',opts:['Kata-kata pujian','Masa berkualiti bersama','Hadiah dan perbuatan','Sentuhan dan kehadiran fizikal'],scores:[8,10,7,9]},
  {id:'q25',dim:'konflik',w:0.04,title:'🤝 Konflik',q:'Apabila pasangan buat kesilapan besar:',opts:['Berbincang dan maafkan','Perlu masa untuk redakan emosi','Minta nasihat orang dipercayai','Selesaikan antara berdua sahaja'],scores:[9,8,7,10]},
  {id:'q26',dim:'gaya_hidup',w:0.04,title:'🌙 Gaya Hidup',q:'Keutamaan dalam perkahwinan:',opts:['Keharmonian keluarga','Kestabilan kewangan','Pertumbuhan agama bersama','Saling memahami dan menyokong'],scores:[8,7,9,10]},
  {id:'q27',dim:'keluarga',w:0.05,title:'👨‍👩‍👧 Keluarga',q:'Tanggungjawab kepada adik-beradik selepas kahwin:',opts:['Tetap bantu seberapa mampu','Keluarga sendiri keutamaan','Seimbang antara kedua-dua','Bergantung kepada keperluan'],scores:[8,9,7,10]},
  {id:'q28',dim:'agama',w:0.05,title:'🕌 Agama',q:'Solat berjemaah di rumah:',opts:['Wajib — setiap solat','Seboleh mungkin','Kadang-kadang','Solat sendiri lebih khusyuk'],scores:[10,9,7,6]},
  {id:'q29',dim:'masa_depan',w:0.05,title:'🎯 Masa Depan',q:'Perancangan persaraan:',opts:['Simpan dari sekarang secara sistematik','Bergantung kepada KWSP','Anak-anak akan jaga','Tawakkal dan berusaha'],scores:[10,7,6,9]},
  {id:'q30',dim:'komunikasi',w:0.05,title:'💬 Komunikasi',q:'Keputusan besar dalam perkahwinan dibuat:',opts:['Suami muktamad selepas berbincang','Bersama secara konsensus','Bergantung pada bidang kepakaran','Berbincang dengan ibu bapa juga'],scores:[8,10,9,7]},
];

/* ── STATE ── */
const S = {
  token:       localStorage.getItem('jk_token') || null,
  uid:         localStorage.getItem('jk_uid')   || null,
  user:        JSON.parse(localStorage.getItem('jk_user') || 'null'),
  currentTab:  'discover',
  currentMatch: null,
  quizAnswers: {},
  quizIndex:   0,
  tempReg:     {},
  captchaDone: false,
  socket:      null,
  trialTimer:  null,
  resetTimer:  null,
  resendTimer: null,
  otpEmail:    '',
};

/* ============================================================
   INIT
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Handle ToyyibPay return
  const params = new URLSearchParams(window.location.search);
  const status   = params.get('status');
  const billcode = params.get('billcode');
  if (status === '1' && billcode) {
    history.replaceState({}, '', '/');
    toast('🎉 Pembayaran berjaya! Akaun anda sedang dikemaskini.', 'success');
  }

  if (S.token && S.uid) {
    initApp();
  } else {
    showPage('page-landing');
    fetchPioneerCount();
  }
});

function initApp() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('main-app').classList.add('active');
  switchTab('discover');
  loadUserProfile();
  connectSocket();
  renderTiers();
  startResetTimer();
}

/* ============================================================
   PAGE / TAB NAVIGATION
============================================================ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('main-app').classList.remove('active');
  const pg = document.getElementById(id);
  if (pg) pg.classList.add('active');
}

function switchTab(tab) {
  S.currentTab = tab;
  const tabs = ['discover','chat','stats','premium','profile'];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.classList.toggle('hidden', t !== tab);
    document.getElementById(`nav-${t}`)?.classList.toggle('active', t === tab);
  });
  if (tab === 'discover') loadDiscover();
  if (tab === 'chat')     loadChats();
  if (tab === 'stats')    loadStats();
}

/* ============================================================
   TOAST
============================================================ */
function toast(msg, type='info') {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ============================================================
   API HELPER
   Backend returns FastAPI shapes:
     Success: normal object
     Error:   { detail: "string" } or { detail: [{msg:"..."}] }
============================================================ */
async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (S.token) headers['Authorization'] = `Bearer ${S.token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res  = await fetch(`${API}${path}`, opts);
    const data = await res.json();
    if (!res.ok) {
      // FastAPI error shape
      const msg = typeof data.detail === 'string'
        ? data.detail
        : (data.detail?.[0]?.msg || 'Ralat tidak diketahui.');
      return { _ok: false, _status: res.status, _err: msg };
    }
    return { _ok: true, ...data };
  } catch(e) {
    return { _ok: false, _err: 'Tiada sambungan ke pelayan. Sila cuba lagi.' };
  }
}

/* ============================================================
   PIONEER COUNT
   GET /stats/pioneer-quota → {remaining, total, claimed}
============================================================ */
async function fetchPioneerCount() {
  const d = await api('GET', '/stats/pioneer-quota');
  if (d._ok) {
    const el = document.getElementById('pioneer-count');
    if (el) el.textContent = (d.remaining || 0).toLocaleString();
  }
}

/* ============================================================
   REGISTER
   UI: 3-step form, data collected locally in S.tempReg
   API: single POST /auth/register
   Body: {phone, name, dob, age, gender, status, email, state,
          ic4, tnc_agreed, photo(base64), income}
   Response: {user_id, access_token}
============================================================ */
function showRegStep(n) {
  [1,2,3].forEach(i => {
    const el = document.getElementById(`reg-step-${i}`);
    if (el) el.classList.toggle('hidden', i !== n);
  });
  // update step dots
  [1,2,3].forEach(i => {
    const dot = document.getElementById(`step-dot-${i}`);
    if (dot) dot.classList.toggle('active', i <= n);
  });
}

function goRegStep1() {
  clearErrors();
  const phone  = document.getElementById('reg-phone').value.trim();
  const name   = document.getElementById('reg-name').value.trim();
  const dob    = document.getElementById('reg-dob').value;
  const gender = document.getElementById('reg-gender').value;
  const status = document.getElementById('reg-status').value;
  const income = document.getElementById('reg-income').value;

  let valid = true;
  if (!phone || phone.replace(/\D/g,'').length < 9) { showError('err-phone','Nombor telefon tidak sah'); valid=false; }
  if (!name  || name.length < 2)                     { showError('err-name','Nama terlalu pendek'); valid=false; }
  if (!dob)                                           { showError('err-dob','Tarikh lahir diperlukan'); valid=false; }
  if (!gender)                                        { showError('err-gender','Sila pilih jantina'); valid=false; }
  if (!income)                                        { showError('err-income','Sila pilih pendapatan'); valid=false; }
  if (!valid) return;

  // Calculate age
  const age = Math.floor((Date.now() - new Date(dob)) / (365.25*24*3600*1000));
  if (age < 18 || age > 55) { showError('err-dob','Umur mestilah 18–55 tahun'); return; }

  S.tempReg = { phone, name, dob, age, gender, status, income };
  showRegStep(2);
}

function goRegStep2() {
  clearErrors();
  const email = document.getElementById('reg-email').value.trim();
  const state = document.getElementById('reg-state').value;
  const ic4   = document.getElementById('reg-ic').value.trim();

  let valid = true;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('err-email','Format email tidak sah'); valid=false; }
  if (!state)                                                 { showError('err-state','Sila pilih negeri'); valid=false; }
  if (!ic4 || !/^\d{4}$/.test(ic4))                          { showError('err-ic','Masukkan 4 digit terakhir IC'); valid=false; }
  if (!S.captchaDone)                                         { showError('err-captcha','Sila sahkan anda bukan robot'); valid=false; }
  if (!valid) return;

  Object.assign(S.tempReg, { email, state, ic4 });
  showRegStep(3);
}

async function submitRegistration() {
  clearErrors();
  const tnc = document.getElementById('reg-tnc').checked;
  if (!tnc) { showError('err-tnc','Anda perlu bersetuju dengan Terma & Syarat'); return; }

  // Photo → base64
  let photoB64 = null;
  const photoFile = document.getElementById('reg-photo-input')?.files?.[0];
  if (photoFile) {
    photoB64 = await fileToBase64(photoFile);
  }

  setBtnLoading('reg-final-btn', 'reg-final-spin', 'reg-final-txt', true, 'Mendaftar...');

  const res = await api('POST', '/auth/register', {
    phone:      S.tempReg.phone,
    name:       S.tempReg.name,
    dob:        S.tempReg.dob,
    age:        S.tempReg.age,
    gender:     S.tempReg.gender,
    status:     S.tempReg.status || 'Bujang',
    email:      S.tempReg.email,
    state:      S.tempReg.state,
    ic4:        S.tempReg.ic4,
    tnc_agreed: true,
    photo:      photoB64,
    income:     S.tempReg.income,
  });

  setBtnLoading('reg-final-btn', 'reg-final-spin', 'reg-final-txt', false, 'Daftar Sekarang');

  if (!res._ok) { toast(res._err, 'error'); return; }

  // Register response: {user_id, access_token}
  S.token = res.access_token;
  S.uid   = res.user_id;
  localStorage.setItem('jk_token', S.token);
  localStorage.setItem('jk_uid',   S.uid);

  toast('Selamat datang ke Jodohku! 🎉', 'success');
  S.tempReg = {};
  initApp();
}

/* ── captcha simulation ── */
function toggleCaptcha() {
  setTimeout(() => {
    S.captchaDone = true;
    const icon = document.getElementById('captcha-icon');
    const spin = document.getElementById('captcha-spinner');
    if (icon) icon.textContent = '✅';
    if (spin) spin.style.display = 'none';
  }, 800);
}

/* ── photo preview in step 3 ── */
function previewRegPhoto(input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    const prev = document.getElementById('photo-preview-img');
    const zone = document.getElementById('photo-upload-zone');
    if (prev) { prev.src = e.target.result; prev.style.display = 'block'; }
    if (zone) zone.style.backgroundImage = `url(${e.target.result})`;
  };
  reader.readAsDataURL(input.files[0]);
}

/* ============================================================
   OTP LOGIN
   POST /auth/email/request-otp-by-email  body: {email}
     → {status, message, demo_otp}
   POST /auth/email/verify-otp-by-email   body: {email, otp_code}
     → {user_id, access_token, tier, name, msg_count}
============================================================ */
async function sendOTP() {
  const email = document.getElementById('login-email').value.trim();
  clearErrors();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('err-login-email','Format email tidak sah');
    return;
  }

  setBtnLoading('otp-btn', 'otp-btn-spin', 'otp-btn-txt', true, 'Menghantar...');
  const res = await api('POST', '/auth/email/request-otp-by-email', { email });
  setBtnLoading('otp-btn', 'otp-btn-spin', 'otp-btn-txt', false, 'Hantar OTP');

  if (!res._ok) { showError('err-login-email', res._err); return; }

  S.otpEmail = email;
  document.getElementById('otp-email-display').textContent =
    email.replace(/(.{2}).*(@.*)/, '$1***$2');
  document.getElementById('login-email-step').classList.add('hidden');
  document.getElementById('login-otp-step').classList.remove('hidden');
  document.querySelectorAll('.otp-digit')[0]?.focus();

  // DEBUG: auto-fill OTP if present
  if (res.demo_otp) {
    toast(`[DEV] OTP: ${res.demo_otp}`, 'info');
    const digits = String(res.demo_otp).split('');
    document.querySelectorAll('.otp-digit').forEach((el, i) => {
      el.value = digits[i] || '';
      if (digits[i]) el.classList.add('filled');
    });
    checkOTPComplete();
  }

  startResendTimer(60);
  toast(res.message || 'OTP dihantar!', 'success');
}

async function verifyOTP() {
  const digits = [...document.querySelectorAll('.otp-digit')].map(d => d.value).join('');
  if (digits.length < 6) { toast('Sila masukkan 6 digit OTP','warning'); return; }

  setBtnLoading('otp-btn', 'btn-verify-otp-spin', 'btn-verify-otp-txt', true, 'Mengesahkan...');
  const res = await api('POST', '/auth/email/verify-otp-by-email', {
    email: S.otpEmail, otp_code: digits,
  });
  setBtnLoading('otp-btn', 'btn-verify-otp-spin', 'btn-verify-otp-txt', false, 'Log Masuk');

  if (!res._ok) {
    toast(res._err, 'error');
    document.querySelectorAll('.otp-digit').forEach(d => {
      d.style.borderColor = 'var(--danger)';
    });
    setTimeout(() => document.querySelectorAll('.otp-digit').forEach(d => {
      d.style.borderColor = ''; d.value = ''; d.classList.remove('filled');
    }), 1000);
    return;
  }

  // Response: {user_id, access_token, tier, name, msg_count}
  S.token = res.access_token;
  S.uid   = res.user_id;
  localStorage.setItem('jk_token', S.token);
  localStorage.setItem('jk_uid',   S.uid);
  // Minimal user from login response — full profile loaded in initApp
  S.user = { uid: res.user_id, full_name: res.name, tier: res.tier, msg_count: res.msg_count };
  localStorage.setItem('jk_user', JSON.stringify(S.user));
  toast(`Selamat datang kembali, ${res.name}! 👋`, 'success');
  initApp();
}

function otpInput(el, idx) {
  el.value = el.value.replace(/\D/g,'').slice(-1);
  if (el.value) {
    el.classList.add('filled');
    document.querySelectorAll('.otp-digit')[idx+1]?.focus();
  }
  checkOTPComplete();
}

function otpKeydown(el, idx, event) {
  const e = event || window.event;
  if (e && e.key === 'Backspace' && !el.value) {
    const prev = document.querySelectorAll('.otp-digit')[idx-1];
    if (prev) { prev.value=''; prev.classList.remove('filled'); prev.focus(); }
  }
}

function checkOTPComplete() {
  const all = [...document.querySelectorAll('.otp-digit')].map(d=>d.value).join('');
  const btn = document.getElementById('otp-btn');
  if (btn && document.getElementById('login-otp-step')?.classList.contains('hidden') === false) {
    btn.disabled = all.length < 6;
  }
}

async function resendOTP() {
  document.getElementById('btn-resend').disabled = true;
  const res = await api('POST', '/auth/email/request-otp-by-email', { email: S.otpEmail });
  if (!res._ok) { toast(res._err, 'error'); return; }
  toast('OTP baru dihantar!', 'success');
  startResendTimer(60);
  document.querySelectorAll('.otp-digit').forEach(d => { d.value=''; d.classList.remove('filled'); });
  if (res.demo_otp) {
    toast(`[DEV] OTP: ${res.demo_otp}`, 'info');
    const digits = String(res.demo_otp).split('');
    document.querySelectorAll('.otp-digit').forEach((el, i) => {
      el.value = digits[i]||''; if(digits[i]) el.classList.add('filled');
    });
    checkOTPComplete();
  }
}

function startResendTimer(seconds) {
  let s = seconds;
  const btn   = document.getElementById('btn-resend');
  const count = document.getElementById('resend-countdown');
  if (btn) btn.disabled = true;
  clearInterval(S.resendTimer);
  S.resendTimer = setInterval(() => {
    s--;
    if (count) count.textContent = `Cuba semula dalam ${s}s`;
    if (s <= 0) {
      clearInterval(S.resendTimer);
      if (count) count.textContent = '';
      if (btn) btn.disabled = false;
    }
  }, 1000);
}

/* ============================================================
   USER PROFILE
   GET /user/{uid}/profile
   Returns: {uid, full_name, dob, age, gender, status, state, email,
             tier, is_premium, msg_count, photo_url, education,
             occupation, psy_done, psy_score, psy_type, psy_desc,
             psy_traits, psy_dims, ic_verified, is_verified,
             is_pioneer, created_at}
============================================================ */
async function loadUserProfile() {
  if (!S.uid) return;
  const res = await api('GET', `/user/${S.uid}/profile`);
  if (!res._ok) {
    if (res._status === 401 || res._status === 404) doLogout();
    return;
  }
  S.user = res;
  localStorage.setItem('jk_user', JSON.stringify(S.user));
  renderUserUI(S.user);
}

function renderUserUI(u) {
  if (!u) return;

  // Nav avatar
  if (u.photo_url) {
    const img = document.getElementById('nav-avatar');
    if (img) { img.src = u.photo_url; img.style.display = 'block'; }
    const icon = document.getElementById('nav-avatar-icon');
    if (icon) icon.style.display = 'none';
  }

  // Nav tier badge
  const badge = document.getElementById('nav-tier-badge');
  if (badge) {
    badge.textContent = (u.tier||'Percuma').toUpperCase();
    badge.className = `tier-badge tier-${(u.tier||'percuma').toLowerCase().split(' ')[0]}`;
  }

  // Renewal bars
  const sub = u.subscription_end ? new Date(u.subscription_end) : null;
  if (sub) {
    const daysLeft = Math.ceil((sub - Date.now()) / 86400000);
    document.getElementById('renewal-7')?.classList.toggle('hidden', daysLeft > 7);
    document.getElementById('renewal-3')?.classList.toggle('hidden', daysLeft > 3);
    document.getElementById('renewal-1')?.classList.toggle('hidden', daysLeft > 1);
  }

  // Profile tab
  setEl('profile-name',    u.full_name || '—');
  const age = u.dob ? Math.floor((Date.now()-new Date(u.dob))/(365.25*24*3600*1000)) : (u.age||'—');
  setEl('profile-meta',    `${age} tahun • ${u.state||'—'} • ${u.gender||'—'}`);
  setEl('profile-tier',    u.tier || 'Percuma');
  setEl('profile-msg-count', `${u.msg_count||0} mesej`);
  setEl('info-ic-status',  u.ic_verified ? '✓ Disahkan' : '⏳ Menunggu');
  setEl('info-quiz-status',u.psy_done    ? '✓ Selesai'  : 'Belum selesai');
  setEl('info-tier',       u.tier || 'Percuma');
  setEl('info-pioneer',    u.is_pioneer  ? '✓ Pioneer'  : '—');

  // Wingman fields
  const wEdu = document.getElementById('wingman-edu');
  const wSec = document.getElementById('wingman-sector');
  if (wEdu && u.education)  wEdu.value  = u.education;
  if (wSec && u.occupation) wSec.value  = u.occupation;

  // Msg quota bar
  if (!u.is_premium) {
    const bar = document.getElementById('msg-quota-bar');
    if (bar) {
      bar.classList.remove('hidden');
      const fill = bar.querySelector('.quota-fill');
      const txt  = bar.querySelector('.quota-text');
      const FREE_LIMIT = 10;
      const pct = Math.min((u.msg_count||0) / FREE_LIMIT * 100, 100);
      if (fill) fill.style.width = pct + '%';
      if (txt)  txt.textContent  = `${u.msg_count||0}/${FREE_LIMIT} mesej percuma`;
    }
  }

  // Profile photo
  if (u.photo_url) {
    const pp = document.getElementById('profile-photo');
    if (pp) pp.src = u.photo_url;
  }
}

/* ============================================================
   DISCOVER
   GET /matchmaking/daily-feed/{uid}
   Returns: {feed:[{candidate_id, display_name, age, status, tier,
             compatibility_score, ai_verdict, traits, photo_url}]}
============================================================ */
async function loadDiscover() {
  if (!S.uid) return;
  const loading = document.getElementById('discover-loading');
  const list    = document.getElementById('candidates-list');
  const empty   = document.getElementById('discover-empty');
  const locked  = document.getElementById('discover-locked');
  const lowmatch= document.getElementById('discover-low-match');

  if (loading) loading.style.display = 'block';
  if (list)    list.innerHTML = '';
  empty?.classList.add('hidden');
  locked?.classList.add('hidden');
  lowmatch?.classList.add('hidden');

  const res = await api('GET', `/matchmaking/daily-feed/${S.uid}`);
  if (loading) loading.style.display = 'none';

  if (!res._ok) { toast(res._err,'error'); return; }

  const feed = res.feed || [];

  if (feed.length === 0) {
    if (!S.user?.psy_done) {
      locked?.classList.remove('hidden');
    } else {
      empty?.classList.remove('hidden');
    }
    return;
  }

  feed.forEach(c => {
    const card = document.createElement('div');
    card.className = 'candidate-card';
    const score = c.compatibility_score || 0;
    card.innerHTML = `
      <div class="candidate-avatar">
        ${c.photo_url
          ? `<img src="${escHtml(c.photo_url)}" onerror="this.style.display='none'">`
          : '<span>👤</span>'}
      </div>
      <div class="candidate-info">
        <div class="candidate-name">${escHtml(c.display_name)}</div>
        <div class="candidate-meta">${c.age} tahun • ${escHtml(c.status||'')} • <span class="tier-badge" style="font-size:9px">${escHtml(c.tier||'')}</span></div>
        <div><span class="match-score-badge ${score>=90?'score-high':'score-mid'}">💕 ${score}% Keserasian</span></div>
        ${c.ai_verdict ? `<div class="candidate-verdict">${escHtml(c.ai_verdict)}</div>` : ''}
        ${(c.traits||[]).length ? `<div class="candidate-traits">${c.traits.map(t=>`<span class="trait-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
      </div>
      <button class="chat-btn" onclick="doMatchAction('${escHtml(c.candidate_id)}','${escHtml(c.display_name)}','${escHtml(c.photo_url||'')}')">💕</button>
    `;
    list?.appendChild(card);
  });
}

/* ── Match action ──
   POST /matchmaking/action?user_id=&candidate_id=&action=
   Response: {status:'MATCHED', match_id, match_data} or {status:'RECORDED'}
*/
async function doMatchAction(candidateId, name, photo, action='LIKE') {
  const res = await api('POST',
    `/matchmaking/action?user_id=${S.uid}&candidate_id=${candidateId}&action=${action}`
  );
  if (!res._ok) { toast(res._err,'error'); return; }

  if (res.status === 'MATCHED') {
    // Save match locally (no /matches endpoint)
    saveMatchLocally({
      id:           res.match_id,
      partner_name: name,
      partner_photo: photo,
      score:        res.match_data?.score,
      verdict:      res.match_data?.verdict,
      traits:       res.match_data?.traits || [],
    });
    showMatchModal(res.match_data || { match_id: res.match_id, name, score: res.score });
  }
}

function saveMatchLocally(match) {
  const matches = JSON.parse(localStorage.getItem('jk_matches') || '[]');
  if (!matches.find(m => m.id === match.id)) {
    matches.unshift(match);
    localStorage.setItem('jk_matches', JSON.stringify(matches));
  }
}

function showMatchModal(data) {
  document.getElementById('match-name')?.   setAttribute && setEl('match-name',    data.name||'—');
  document.getElementById('match-score')?.  setAttribute && setEl('match-score',   `${data.score||0}%`);
  document.getElementById('match-verdict')?.setAttribute && setEl('match-verdict', data.verdict||'');
  showModal('modal-match');
}

/* ============================================================
   CHAT LIST (from localStorage — no /matches backend endpoint)
============================================================ */
function loadChats() {
  const list  = document.getElementById('chat-list');
  const empty = document.getElementById('chat-empty');
  if (!list) return;
  list.innerHTML = '';

  const matches = JSON.parse(localStorage.getItem('jk_matches') || '[]');
  if (matches.length === 0) { empty?.classList.remove('hidden'); return; }
  empty?.classList.add('hidden');

  matches.forEach(m => {
    const item = document.createElement('div');
    item.className = 'chat-item';
    item.onclick = () => openChatRoom(m.id, m.partner_name, m.partner_photo);
    item.innerHTML = `
      <div class="chat-avatar">
        ${m.partner_photo
          ? `<img src="${escHtml(m.partner_photo)}" onerror="this.style.display='none'">`
          : '<span>👤</span>'}
      </div>
      <div class="chat-info">
        <div class="chat-name">${escHtml(m.partner_name||'—')}</div>
        <div class="chat-last">${escHtml(m.last_message||'Mulakan perbualan...')}</div>
      </div>
      <div class="chat-score">${m.score ? `💕 ${m.score}%` : ''}</div>
    `;
    list.appendChild(item);
  });
}

/* ============================================================
   CHAT ROOM
   GET  /chat/{match_id}/messages
     → {messages:[{id, sender_uid, message_text, is_system, created_at}]}
   POST /chat/send-message
     body: {sender_id, match_id, message_text}
     → {status, msg_id, msg_count}
============================================================ */
function openChatRoom(matchId, partnerName, partnerPhoto) {
  S.currentMatch = matchId;
  setEl('room-partner-name', partnerName || '—');

  const photo = document.getElementById('room-partner-photo');
  const badge = document.getElementById('room-partner-badge');
  if (photo) {
    if (partnerPhoto) { photo.src = partnerPhoto; photo.style.display = 'block'; }
    else photo.style.display = 'none';
  }

  document.getElementById('chat-room')?.classList.add('open');
  loadMessages(matchId);
  S.socket?.emit('join_match', matchId);
}

function closeChatRoom() {
  document.getElementById('chat-room')?.classList.remove('open');
  S.currentMatch = null;
}

async function loadMessages(matchId) {
  const res = await api('GET', `/chat/${matchId}/messages`);
  if (!res._ok) { toast(res._err,'error'); return; }

  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.innerHTML = '';

  (res.messages||[]).forEach(msg => {
    appendMessage({
      content:    msg.message_text,
      created_at: msg.created_at,
      sender_uid: msg.sender_uid,
    }, msg.sender_uid === S.uid);
  });
  container.scrollTop = container.scrollHeight;
  updateCreditsUI();
}

function appendMessage(msg, isSent) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const row = document.createElement('div');
  row.className = isSent ? 'msg-sent-row' : 'msg-recv-row';
  const time = msg.created_at ? formatTime(new Date(msg.created_at)) : '';
  row.innerHTML = `
    <div class="msg-bubble ${isSent?'sent':'received'}">
      ${escHtml(msg.content||msg.message_text||'')}
      <div class="msg-time">${time}</div>
    </div>
  `;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input   = document.getElementById('chat-input');
  const content = input?.value.trim();
  if (!content || !S.currentMatch) return;

  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) sendBtn.disabled = true;

  const res = await api('POST', '/chat/send-message', {
    sender_id:    S.uid,
    match_id:     S.currentMatch,
    message_text: content,
  });

  if (sendBtn) sendBtn.disabled = false;

  if (!res._ok) {
    if (res._status === 403) {
      // Had mesej tercapai
      document.getElementById('msg-quota-bar')?.classList.remove('hidden');
      openPaywall();
    } else {
      toast(res._err, 'error');
    }
    return;
  }

  if (input) { input.value = ''; input.style.height = '44px'; }
  appendMessage({ content, created_at: new Date().toISOString() }, true);

  // Update msg_count locally
  if (S.user) {
    S.user.msg_count = res.msg_count || (S.user.msg_count||0)+1;
    localStorage.setItem('jk_user', JSON.stringify(S.user));
    updateCreditsUI();
  }

  // Update last_message in local match list
  const matches = JSON.parse(localStorage.getItem('jk_matches') || '[]');
  const m = matches.find(x => x.id === S.currentMatch);
  if (m) { m.last_message = content; localStorage.setItem('jk_matches', JSON.stringify(matches)); }
}

function updateCreditsUI() {
  const u = S.user;
  if (!u) return;
  const el = document.getElementById('msg-quota-bar');
  if (!el) return;
  if (u.is_premium) { el.classList.add('hidden'); return; }
  const FREE_LIMIT = 10;
  el.classList.remove('hidden');
  const fill = el.querySelector('.quota-fill');
  const txt  = el.querySelector('.quota-text');
  const pct  = Math.min((u.msg_count||0)/FREE_LIMIT*100,100);
  if (fill) fill.style.width = pct+'%';
  if (txt)  txt.textContent  = `${u.msg_count||0}/${FREE_LIMIT} mesej percuma`;
}

function chatKeydown(e) {
  if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function chatInputChange() {
  const input = document.getElementById('chat-input');
  const btn   = document.getElementById('send-btn');
  if (btn) btn.disabled = !(input?.value.trim());
  if (input) {
    input.style.height = '44px';
    input.style.height = Math.min(input.scrollHeight, 120)+'px';
  }
  S.socket?.emit('typing', { matchId: S.currentMatch, isTyping: !!(input?.value.length) });
}

/* ── Advance / WhatsApp requests ── */
async function requestAdvance() {
  if (!S.currentMatch) return;
  const res = await api('POST',
    `/chat/request-advance?match_id=${S.currentMatch}&user_uid=${S.uid}`
  );
  toast(res._ok ? 'Permohonan dihantar! 💕' : res._err, res._ok ? 'success' : 'error');
}

async function requestWhatsApp() {
  if (!S.currentMatch) return;
  const res = await api('POST',
    `/chat/request-whatsapp?match_id=${S.currentMatch}&requester_uid=${S.uid}`
  );
  toast(res._ok ? 'Permohonan WhatsApp dihantar!' : res._err, res._ok ? 'success' : 'error');
}

/* ============================================================
   STATS (derived locally from S.user + localStorage matches)
============================================================ */
function loadStats() {
  const u = S.user;
  if (!u) return;

  const matches = JSON.parse(localStorage.getItem('jk_matches') || '[]');
  setEl('stat-matches', matches.length);
  setEl('stat-high',    matches.filter(m => (m.score||0) >= 90).length);
  setEl('stat-convos',  matches.length); // approximation

  // Psych ring
  const score = parseFloat(u.psy_score || 0);
  const pct   = Math.min(score/10*100, 100);
  const ring  = document.getElementById('ici-ring');
  if (ring) ring.style.background =
    `conic-gradient(var(--gold) ${pct}%, var(--cream) ${pct}%)`;
  setEl('ici-ring-val', u.psy_score ? `${u.psy_score}` : '—');

  // AI stats display
  const aiBox = document.getElementById('ai-stats-display');
  if (aiBox && u.psy_done) {
    aiBox.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px">${escHtml(u.psy_type||'')}</div>
      <div style="font-size:13px;color:var(--ink-muted)">${escHtml(u.psy_desc||'')}</div>
      ${(u.psy_traits||[]).length
        ? `<div style="margin-top:8px">${u.psy_traits.map(t=>`<span class="trait-tag">${escHtml(t)}</span>`).join('')}</div>`
        : ''}
    `;
  }
}

/* ============================================================
   PREMIUM / TIERS (local TIERS constant)
   POST /payment/create-bill
   Body: {user_uid, tier, amount}
   Response: {payment_url, billcode, tier, amount}
============================================================ */
function renderTiers() {
  const container = document.getElementById('tier-cards');
  if (!container) return;
  container.innerHTML = '';

  TIERS.forEach(tier => {
    const card = document.createElement('div');
    card.className = `tier-card ${tier.popular ? 'popular' : ''}`;
    card.innerHTML = `
      ${tier.popular ? '<div class="tier-popular-badge">⭐ POPULAR</div>' : ''}
      <div class="tier-header">
        <div class="tier-name">${tier.name}</div>
        <div class="tier-price"><span class="amount">RM${tier.price}</span><span class="period">/${tier.period}</span></div>
      </div>
      <div class="tier-features">
        ${tier.features.map(f=>`<div class="tier-feature">✓ ${escHtml(f)}</div>`).join('')}
      </div>
      ${!tier.invite_only
        ? `<button class="btn btn-${tier.popular?'primary':'outline'} btn-full"
             onclick="initiatePayment('${tier.id}',${tier.price})">
             Pilih ${tier.name} — RM${tier.price}/${tier.period}
           </button>`
        : `<button class="btn btn-ghost btn-full"
             onclick="toast('Sila hubungi admin untuk Black Sovereign','info')">
             Mohon Jemputan
           </button>`
      }
    `;
    container.appendChild(card);
  });

  // Also populate paywall modal tiers
  const pwContainer = document.getElementById('paywall-tiers');
  if (pwContainer) {
    pwContainer.innerHTML = TIERS
      .filter(t => !t.invite_only)
      .map(t => `
        <div class="paywall-tier-option" onclick="initiatePayment('${t.id}',${t.price})">
          <div class="tier-name">${t.name}</div>
          <div class="tier-price">RM${t.price}/${t.period}</div>
        </div>
      `).join('');
  }
}

async function initiatePayment(tierId, amount) {
  if (!S.uid) { toast('Sila log masuk dahulu','warning'); return; }

  const tierEl = document.getElementById('payment-tier');
  if (tierEl) tierEl.textContent = tierId;

  showModal('modal-payment-processing');

  const res = await api('POST', '/payment/create-bill', {
    user_uid: S.uid,
    tier:     tierId,
    amount:   amount,
  });

  closeModal('modal-payment-processing');

  if (!res._ok) { toast(res._err, 'error'); return; }

  // Redirect to ToyyibPay
  if (res.payment_url) {
    window.location.href = res.payment_url;
  } else {
    toast('Pautan pembayaran tidak tersedia.','error');
  }
}

function openPaywall() {
  const left = document.getElementById('paywall-credits-left');
  if (left && S.user) {
    const FREE_LIMIT = 10;
    left.textContent = Math.max(0, FREE_LIMIT - (S.user.msg_count||0));
  }
  showModal('modal-paywall');
}

/* ============================================================
   QUIZ — 30 DIMENSI
   Questions from local PSY_BANK
   POST /psych/submit-results
   Body: {user_uid, answers, psy_score, psy_type, psy_desc,
          psy_traits, psy_dims, psy_custom_text}
   Response: {status, psy_score, psy_type, psy_traits}
============================================================ */
function openQuiz() {
  S.quizAnswers = {};
  S.quizIndex   = 0;
  document.getElementById('quiz-result-area')?.classList.add('hidden');
  document.getElementById('quiz-footer')?.classList.remove('hidden');
  showPage('page-quiz');
  renderQuestion(0);
}

function renderQuestion(idx) {
  if (idx >= PSY_BANK.length) {
    // Final step — show submit
    document.getElementById('quiz-question-area').innerHTML = '';
    document.getElementById('quiz-footer').innerHTML =
      `<button class="btn btn-primary btn-full" onclick="submitQuiz()">
         Selesai & Lihat Keputusan →
       </button>`;
    setEl('quiz-progress-text', 'Langkah Akhir');
    const bar = document.getElementById('quiz-progress-bar');
    if (bar) bar.style.width = '100%';
    return;
  }

  const q = PSY_BANK[idx];
  setEl('quiz-progress-text', `${idx+1}/30`);
  const bar = document.getElementById('quiz-progress-bar');
  if (bar) bar.style.width = `${((idx+1)/30)*100}%`;

  document.getElementById('quiz-question-area').innerHTML = `
    <div class="question-category">${escHtml(q.title)}</div>
    <div class="question-text">${escHtml(q.q)}</div>
    <div class="quiz-options">
      ${(q.opts||[]).map((opt,oi) => `
        <button class="quiz-option ${S.quizAnswers[q.id]===oi?'selected':''}"
          onclick="selectAnswer('${q.id}',${oi},this,${q.scores?.[oi]||5})">
          ${escHtml(opt)}
        </button>
      `).join('')}
    </div>
  `;
}

function selectAnswer(qId, optIdx, el, score) {
  S.quizAnswers[qId] = { val: optIdx, score };
  document.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  // Auto-advance after short delay
  setTimeout(() => nextQuestion(), 300);
}

function nextQuestion() {
  const q = PSY_BANK[S.quizIndex];
  if (q && S.quizAnswers[q.id] === undefined) {
    toast('Sila pilih satu jawapan','warning'); return;
  }
  S.quizIndex++;
  renderQuestion(S.quizIndex);
  window.scrollTo(0,0);
}

async function submitQuiz() {
  // Calculate scores per dimension
  const dims = {};
  let totalScore = 0, count = 0;

  PSY_BANK.forEach(q => {
    const ans = S.quizAnswers[q.id];
    const score = ans ? (ans.score||5) : 5;
    dims[q.dim] = (dims[q.dim]||0) + score * q.w;
    totalScore += score * q.w;
    count++;
  });

  const psyScore = Math.min(Math.round(totalScore * 10) / 10, 10);

  // Determine type from highest dimension
  const topDim = Object.entries(dims).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'keserasian';
  const typeMap = {
    agama:'Spiritualis Matang', keluarga:'Penjaga Setia', kewangan:'Perancang Bijak',
    komunikasi:'Komunikator Hebat', gaya_hidup:'Penyeimbang Hidup',
    masa_depan:'Pemikir Jauh', konflik:'Pendamai Bijak', keserasian:'Pasangan Ideal',
  };
  const psyType   = typeMap[topDim] || 'Pasangan Seimbang';
  const psyDesc   = `Anda seorang yang mengutamakan ${topDim.replace('_',' ')} dalam kehidupan berpasangan.`;
  const psyTraits = Object.entries(dims).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>typeMap[k]||k);

  const btn = document.querySelector('#quiz-footer button');
  if (btn) { btn.disabled=true; btn.textContent='Menghantar...'; }

  const res = await api('POST', '/psych/submit-results', {
    user_uid:       S.uid,
    answers:        S.quizAnswers,
    psy_score:      psyScore,
    psy_type:       psyType,
    psy_desc:       psyDesc,
    psy_traits:     psyTraits,
    psy_dims:       dims,
    psy_custom_text: '',
  });

  if (btn) { btn.disabled=false; btn.textContent='Selesai & Lihat Keputusan →'; }

  if (!res._ok) { toast(res._err,'error'); return; }

  // Update local user
  if (S.user) {
    Object.assign(S.user, {
      psy_done:   true,
      psy_score:  res.psy_score  || psyScore,
      psy_type:   res.psy_type   || psyType,
      psy_traits: res.psy_traits || psyTraits,
    });
    localStorage.setItem('jk_user', JSON.stringify(S.user));
  }

  // Show result
  document.getElementById('quiz-footer')?.classList.add('hidden');
  document.getElementById('quiz-result-area')?.classList.remove('hidden');
  setEl('quiz-result-type',   res.psy_type  || psyType);
  const traitsEl = document.getElementById('quiz-result-traits');
  if (traitsEl) traitsEl.innerHTML = (res.psy_traits||psyTraits)
    .map(t=>`<span class="trait-tag">${escHtml(t)}</span>`).join('');

  toast('Analisis selesai! 🎉', 'success');
}

function exitQuiz() {
  showPage('page-landing');
  if (S.token) initApp();
}

/* ============================================================
   IC VERIFICATION
   POST /profile/upload-ic
   Body: {user_uid, ic_image}  (raw base64, NO data:image prefix)
   Response: {status, ic_verified, message}
============================================================ */
function previewIC(input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    const prev = document.getElementById('ic-preview');
    const img  = document.getElementById('ic-preview-img');
    const ph   = document.getElementById('ic-placeholder');
    if (img)  img.src = e.target.result;
    if (prev) prev.style.display = 'block';
    if (ph)   ph.style.display   = 'none';
    const submitBtn = document.getElementById('ic-submit-btn');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
  };
  reader.readAsDataURL(input.files[0]);
}

function clearIC(e) {
  e.stopPropagation();
  const input = document.getElementById('ic-input');
  const prev  = document.getElementById('ic-preview');
  const ph    = document.getElementById('ic-placeholder');
  if (input) input.value = '';
  if (prev)  prev.style.display = 'none';
  if (ph)    ph.style.display   = 'block';
  const btn = document.getElementById('ic-submit-btn');
  if (btn)  { btn.disabled = true; btn.style.opacity = '0.4'; }
}

async function submitIC() {
  const input = document.getElementById('ic-input');
  if (!input?.files[0]) { toast('Sila pilih gambar IC dahulu','warning'); return; }

  // Convert to raw base64 (strip "data:image/...;base64," prefix)
  const fullB64  = await fileToBase64(input.files[0]);
  const rawB64   = fullB64.split(',')[1];

  const statusEl = document.getElementById('ic-status');
  const btn      = document.getElementById('ic-submit-btn');
  const spin     = document.getElementById('ic-submit-spin');

  if (btn)  btn.disabled = true;
  if (spin) spin.style.display = 'inline-block';

  const res = await api('POST', '/profile/upload-ic', {
    user_uid: S.uid,
    ic_image: rawB64,
  });

  if (btn)  btn.disabled = false;
  if (spin) spin.style.display = 'none';

  if (!res._ok) {
    if (statusEl) statusEl.textContent = res._err;
    toast(res._err, 'error'); return;
  }

  toast(res.message || 'IC diterima! Pengesahan dalam 1–24 jam.', 'success');
  closeModal('modal-ic');
  if (S.user) { S.user.ic_verified = 'pending'; localStorage.setItem('jk_user', JSON.stringify(S.user)); }
  setEl('info-ic-status', '⏳ Menunggu');
}

/* ============================================================
   PROFILE PHOTO UPLOAD
   POST /user/{uid}/upload-photo
   Body: {photo_base64}  (full base64 WITH data:image prefix)
   Response: {status, photo_url}
============================================================ */
function triggerPhotoUpload() {
  document.getElementById('profile-photo-input')?.click();
}

async function uploadProfilePhoto(input) {
  if (!input?.files[0]) return;

  const b64 = await fileToBase64(input.files[0]);

  // Preview immediately
  const pp = document.getElementById('profile-photo');
  if (pp) pp.src = b64;
  const zone = document.getElementById('photo-upload-zone');
  if (zone) { const img = zone.querySelector('img'); if (img) { img.src = b64; img.style.display='block'; } }

  toast('Memuat naik gambar...', 'info');
  const res = await api('POST', `/user/${S.uid}/upload-photo`, { photo_base64: b64 });

  if (!res._ok) { toast(res._err, 'error'); return; }

  const src = res.photo_url || b64;
  if (S.user) { S.user.photo_url = src; localStorage.setItem('jk_user', JSON.stringify(S.user)); }
  const navAvatar = document.getElementById('nav-avatar');
  if (navAvatar && src) { navAvatar.src = src; navAvatar.style.display = 'block'; }
  toast('Gambar berjaya dikemaskini! ✅', 'success');
}

/* ============================================================
   WINGMAN (AI profile update)
   PUT /user/{uid}/profile
   Body: {education, occupation}
   Response: {status, message}
============================================================ */
async function saveWingman() {
  const edu    = document.getElementById('wingman-edu')?.value;
  const sector = document.getElementById('wingman-sector')?.value;

  if (!edu || !sector) { toast('Sila pilih pendidikan dan sektor','warning'); return; }

  const res = await api('PUT', `/user/${S.uid}/profile`, {
    education:  edu,
    occupation: sector,
  });

  if (!res._ok) { toast(res._err, 'error'); return; }

  if (S.user) {
    S.user.education  = edu;
    S.user.occupation = sector;
    localStorage.setItem('jk_user', JSON.stringify(S.user));
  }
  toast('AI Wingman dikemaskini! ✅', 'success');
  closeModal('modal-wingman');
}

/* ============================================================
   SOCKET.IO
============================================================ */
function connectSocket() {
  if (!S.token) return;
  try {
    S.socket = io(API, { auth: { token: S.token } });

    S.socket.on('new_message', msg => {
      if (S.currentMatch === msg.match_id) {
        appendMessage({ content: msg.message_text, created_at: msg.created_at }, msg.sender_uid === S.uid);
      } else {
        const badge = document.getElementById('chat-badge');
        if (badge) { badge.textContent = parseInt(badge.textContent||'0')+1; badge.classList.add('show'); }
      }
    });

    S.socket.on('new_match', data => {
      saveMatchLocally(data);
      toast(`💕 Padanan baru: ${data.partner_name}!`, 'success');
      loadChats();
    });

    S.socket.on('typing', ({ userId, isTyping }) => {
      if (userId !== S.uid) {
        document.getElementById('typing-indicator')?.classList.toggle('show', isTyping);
      }
    });

    S.socket.on('connect_error', () => console.log('[Socket] Offline mode'));
  } catch(e) {
    console.log('[Socket] unavailable');
  }
}

/* ============================================================
   TIMERS
============================================================ */
function startResetTimer() {
  clearInterval(S.resetTimer);
  const el = document.getElementById('reset-countdown');
  function update() {
    const now = new Date(), reset = new Date();
    reset.setHours(8,0,0,0);
    if (now >= reset) reset.setDate(reset.getDate()+1);
    const diff = reset - now;
    const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000);
    if (el) el.textContent = `${String(h).padStart(2,'0')}j ${String(m).padStart(2,'0')}m`;
  }
  update();
  S.resetTimer = setInterval(update, 60000);
}

/* ============================================================
   MODALS
============================================================ */
function showModal(id)  { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }
function closeModalOnBg(e, id) { if (e.target.id===id) closeModal(id); }

/* ── Consent modal (advance relationship) ── */
function openConsentModal(partnerName) {
  setEl('consent-name', partnerName || 'pasangan anda');
  showModal('modal-consent');
}

function confirmConsent() {
  closeModal('modal-consent');
  requestAdvance();
}

/* ── Progressive disclosure modal ── */
function openProgressiveModal() { showModal('modal-progressive'); }

/* ============================================================
   LOGOUT
============================================================ */
function doLogout() {
  clearInterval(S.resetTimer);
  clearInterval(S.resendTimer);
  S.socket?.disconnect();
  localStorage.removeItem('jk_token');
  localStorage.removeItem('jk_uid');
  localStorage.removeItem('jk_user');
  S.token = null; S.uid = null; S.user = null;
  document.getElementById('main-app')?.classList.remove('active');
  showPage('page-landing');
  fetchPioneerCount();
  toast('Anda telah log keluar','info');
}

/* ============================================================
   UTILS
============================================================ */
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(date) {
  if (!date || isNaN(date)) return '';
  const diff = Date.now() - date;
  if (diff < 60000)    return 'Baru';
  if (diff < 3600000)  return `${Math.floor(diff/60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}j`;
  return date.toLocaleDateString('ms-MY', {day:'numeric',month:'short'});
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}

function clearErrors() {
  document.querySelectorAll('.form-error').forEach(el => { el.classList.remove('show'); el.textContent=''; });
  document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
}

function setBtnLoading(btnId, spinId, txtId, loading, loadingText) {
  const btn  = document.getElementById(btnId);
  const spin = document.getElementById(spinId);
  const txt  = document.getElementById(txtId);
  if (btn)  btn.disabled = loading;
  if (spin) spin.style.display = loading ? 'inline-block' : 'none';
  if (txt && loadingText) txt.textContent = loading ? loadingText : txt.dataset.original || txt.textContent;
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
