'use strict';

// ══════════ CONFIG ══════════
const API = 'https://jodohku-api.onrender.com';
const TIER_ORDER = { Basic: 0, Silver: 1, 'Silver (7-Hari)': 1, Gold: 2, Platinum: 3, Sovereign: 4 };
const FREE_MSGS = 10;
const DAILY_RESET_HOUR = 8;
let CL = 'ms';

// ══════════ STATE ══════════
const S = {
  uid: null, tok: null, name: null, dob: null, gender: null, status: null, state: null,
  income: null, education: null, occupation: null,
  tier: 'Basic', premium: false, msgCount: 0,
  subStart: null, subEnd: null,
  matches: [], feed: [], history: {}, activeMatch: null,
  photo: null, icVerified: false,
  psyDone: false, psyScore: null, psyType: null, psyDesc: null, psyTraits: [], psyDims: {}, psyCustomText: '',
  feedLastReset: null, captSolved: false, lang: 'ms',
  reminderShown: { r7: false, r3: false, r1: false },
  chatDays: {}, advanceRequested: {},
};

function save() { try { localStorage.setItem('jdk', JSON.stringify(S)); } catch {} }
function load() { try { const d = JSON.parse(localStorage.getItem('jdk')); if (d) Object.assign(S, d); } catch {} }
load();

// ══════════ UTILS ══════════
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function pad(n) { return String(n).padStart(2, '0'); }
function calcAge(d) {
  const b = new Date(d), n = new Date(), a = n.getFullYear() - b.getFullYear();
  return n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate()) ? a - 1 : a;
}
function setMsg(id, msg, t) { const e = document.getElementById(id); if (!e) return; e.textContent = msg; e.className = 'mb ' + t + ' show'; }
function hideMsg(id) { const e = document.getElementById(id); if (e) { e.className = 'mb'; e.textContent = ''; } }
function setBL(tId, sId, on) {
  const t = document.getElementById(tId), s = document.getElementById(sId);
  if (t) t.style.display = on ? 'none' : '';
  if (s) s.style.display = on ? 'inline-block' : 'none';
}
function ck(id) { document.getElementById(id).classList.toggle('on'); }
function toast(msg, type = 'ok', dur = 3000) {
  const t = document.getElementById('toastEl');
  t.textContent = msg; t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), dur);
}
function go(pid) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const p = document.getElementById(pid); if (p) p.classList.add('active');
  if (pid === 'P-dash') { loadFeed(); updChatList(); updateInsights(); }
  if (pid === 'P-profile') refreshProfile();
  if (pid === 'P-psych') buildPsychTest();
  // Footer visibility
  const footer = document.getElementById('site-footer');
  if (footer) footer.style.display = (pid === 'P-dash' || pid === 'P-profile') ? 'block' : 'none';
  window.scrollTo(0, 0);
}
function openOv(id) { document.getElementById(id).classList.add('show'); }
function closeOv(id) { document.getElementById(id).classList.remove('show'); }
function getTodayStr() { return new Date().toISOString().slice(0, 10); }

// ══════════ LANGUAGE SYSTEM ══════════
const LANG = {
  ms: {
    // Tabs
    'tl-d': 'Discover', 'tl-c': 'Sembang', 'tl-i': 'Wawasan', 'tl-t': 'Premium', 'tl-p': 'Profil',
    // Discover
    'lbl-discover-title': 'Calon Hari Ini',
    'lbl-discover-sub': 'Kurasi AI eksklusif — Hanya 80%+ padanan',
    'lbl-feed-loading': 'AI sedang menganalisis 30 dimensi keserasian...',
    // Chat
    'lbl-chat-title': 'Sembang',
    'lbl-chat-empty': 'Tiada padanan lagi',
    'lbl-chat-empty-sub': 'Pergi ke Discover untuk mula!',
    // Insights
    'lbl-insights-title': '📊 Statistik & Wawasan',
    // Pricing
    'lbl-pricing-title': 'Pilih Tier Anda',
    'lbl-pricing-sub': 'Tier lebih tinggi = akses lebih eksklusif',
    // Profile
    'lbl-profile-title': 'Profil Saya',
    'lbl-btn-upgrade': '👑 Naik Taraf Tier',
    'lbl-btn-ic': '📎 Muat Naik IC',
    'lbl-btn-logout': 'Log Keluar',
    // Psychometric
    'lbl-psy-title': 'Ujian 30 Dimensi',
    // Advance
    'lbl-advance-title': 'Perkenalan Lanjut',
    // Match overlay
    'lbl-match-chat': 'Mula Berbual Sekarang →',
    'lbl-match-skip': 'Teruskan mencari calon lain',
    // Low match popup
    'lowmatch-title': 'Padanan Sederhana',
    'lowmatch-body': 'AI mengesyorkan padanan 90% ke atas. Anda masih boleh berbual — pilihan ada pada anda.',
    'lowmatch-confirm': 'Ya, teruskan berbual →',
    'lowmatch-skip': 'Tidak, cari padanan lebih baik',
    // Feed card buttons
    'btn-pass': 'Tolak', 'btn-like': 'Suka Calon ✨',
    // IC modal
    'ic-title': 'Sahkan Identiti Anda',
    'ic-sub': 'Muat naik gambar IC anda (depan sahaja). Data dienkripsi & dipadam selepas verifikasi.',
    'ic-pick': 'Pilih Gambar IC',
    'ic-submit': 'Hantar untuk Semakan',
    'ic-cancel': 'Batal',
    // Chat window
    'chat-online': '● Dalam talian',
    'chat-placeholder': 'Tulis mesej... (beradab & sopan)',
    'chat-quota-prefix': 'Mesej percuma:',
    'chat-advance-btn': 'Mohon Perkenalan Lanjut →',
    // Pay overlay
    'pay-proc-title': 'Memproses Pembayaran...',
    'pay-proc-sub': 'Disambungkan ke ToyyibPay. Sila tunggu.',
    // T&C
    'tnc-agree': 'Saya Faham & Bersetuju →',
    // Advance page
    'advance-wa-btn': '📞 Mohon Nombor WhatsApp →',
    'advance-back-btn': 'Kembali ke Perbualan',
  },
  en: {
    'tl-d': 'Discover', 'tl-c': 'Chats', 'tl-i': 'Insights', 'tl-t': 'Premium', 'tl-p': 'Profile',
    'lbl-discover-title': "Today's Matches",
    'lbl-discover-sub': 'AI-curated exclusively — 80%+ compatibility only',
    'lbl-feed-loading': 'AI is analysing your 30 compatibility dimensions...',
    'lbl-chat-title': 'Chats',
    'lbl-chat-empty': 'No matches yet',
    'lbl-chat-empty-sub': 'Go to Discover to get started!',
    'lbl-insights-title': '📊 Stats & Insights',
    'lbl-pricing-title': 'Choose Your Tier',
    'lbl-pricing-sub': 'Higher tier = more exclusive access',
    'lbl-profile-title': 'My Profile',
    'lbl-btn-upgrade': '👑 Upgrade Tier',
    'lbl-btn-ic': '📎 Upload IC',
    'lbl-btn-logout': 'Log Out',
    'lbl-psy-title': '30-Dimension Test',
    'lbl-advance-title': 'Advanced Introduction',
    'lbl-match-chat': 'Start Chatting Now →',
    'lbl-match-skip': 'Keep searching for more matches',
    'lowmatch-title': 'Moderate Match',
    'lowmatch-body': 'AI recommends 90%+ matches. You can still chat — the choice is yours.',
    'lowmatch-confirm': 'Yes, proceed to chat →',
    'lowmatch-skip': 'No, find a better match',
    'btn-pass': 'Pass', 'btn-like': 'Like ✨',
    'ic-title': 'Verify Your Identity',
    'ic-sub': 'Upload your IC photo (front only). Data is encrypted & deleted after verification.',
    'ic-pick': 'Choose IC Image',
    'ic-submit': 'Submit for Review',
    'ic-cancel': 'Cancel',
    'chat-online': '● Online',
    'chat-placeholder': 'Type a message... (be polite & respectful)',
    'chat-quota-prefix': 'Free messages:',
    'chat-advance-btn': 'Request Advanced Introduction →',
    'pay-proc-title': 'Processing Payment...',
    'pay-proc-sub': 'Connecting to ToyyibPay. Please wait.',
    'tnc-agree': 'I Understand & Agree →',
    'advance-wa-btn': '📞 Request WhatsApp Number →',
    'advance-back-btn': 'Back to Conversation',
  }
};

function setLang(l) {
  CL = l; S.lang = l;
  const root = document.getElementById('html-root');
  if (root) root.lang = l;
  const lt = document.getElementById('lang-tog');
  if (lt) lt.textContent = '🌐 ' + (l === 'ms' ? 'EN' : 'BM');
  applyLang(l);
  save();
}

function applyLang(l) {
  const T = LANG[l] || LANG.ms;
  // Update all elements with IDs in the LANG dict
  Object.keys(T).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = T[id];
  });
  // Update placeholder on chat input
  const cin = document.getElementById('cw-in');
  if (cin) cin.placeholder = T['chat-placeholder'];
  // Update IC modal text elements
  const icTitle = document.querySelector('#ov-ic h3');
  const icSub   = document.querySelector('#ov-ic p');
  const icPick  = document.querySelector('#ic-placeholder .ic-pick-lbl');
  const icSub2  = document.getElementById('ic-submit-btn');
  if (icTitle) icTitle.textContent = T['ic-title'];
  if (icSub)   icSub.innerHTML = T['ic-sub'].replace('&', '&amp;');
  if (icPick)  icPick.textContent = T['ic-pick'];
  if (icSub2)  { const sp = icSub2.querySelector('span:first-child'); if (sp) sp.textContent = T['ic-submit']; }
}

// ══════════ API ══════════
async function apiCall(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (S.tok && S.tok !== 'demo') opts.headers['Authorization'] = 'Bearer ' + S.tok;
  if (body) opts.body = JSON.stringify(body);
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 3000);
  return fetch(API + path, { ...opts, signal: ctrl.signal });
}
