'use strict';

// ══════════ CONFIG ══════════
const API = 'https://your-api.onrender.com';
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
  photo: null,
  icVerified: false,
  psyDone: false, psyScore: null, psyType: null, psyDesc: null, psyTraits: [], psyDims: {}, psyCustomText: '',
  feedLastReset: null, captSolved: false, lang: 'ms',
  reminderShown: { r7: false, r3: false, r1: false },
  chatDays: {},
  advanceRequested: {},
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
  // Show footer on dash and profile only
  const footer = document.getElementById('site-footer');
  if (footer) footer.style.display = (pid === 'P-dash' || pid === 'P-profile') ? 'block' : 'none';
  window.scrollTo(0, 0);
}
function openOv(id) { document.getElementById(id).classList.add('show'); }
function closeOv(id) { document.getElementById(id).classList.remove('show'); }

// ══════════ CHANGED: setLang with full BM/EN translations ══════════
const LANG = {
  ms: {
    discover: 'Calon Hari Ini', discoverSub: 'Kurasi AI eksklusif — Hanya 80%+ padanan',
    chatTitle: 'Sembang', noMatch: 'Tiada padanan lagi', noMatchSub: 'Pergi ke Discover untuk mula!',
    pricingTitle: 'Pilih Tier Anda', pricingSub: 'Tier lebih tinggi = akses lebih eksklusif',
    profileTitle: 'Profil Saya', subStatus: 'Status Langganan', activeTier: 'Tier Aktif',
    subExpiry: 'Tamat Langganan', icStatus: 'IC Disahkan', psyStatus: 'Ujian 30 Dimensi', iciScore: 'Skor ICI',
    upgradeBtn: '👑 Naik Taraf Tier', psyBtn: '🧪 Ujian Keserasian 30 Dimensi',
    logoutBtn: 'Log Keluar', uploadIC: '📎 Muat Naik IC',
    icModalTitle: 'Sahkan Identiti Anda',
    icModalDesc: 'Muat naik gambar IC anda (depan sahaja). Data dienkripsi & dipadam selepas verifikasi.',
    icUploadBtn: 'Pilih Gambar IC', icSubmitBtn: 'Hantar untuk Semakan',
  },
  en: {
    discover: "Today's Matches", discoverSub: 'AI-curated exclusively — 80%+ compatibility only',
    chatTitle: 'Chats', noMatch: 'No matches yet', noMatchSub: 'Go to Discover to start!',
    pricingTitle: 'Choose Your Tier', pricingSub: 'Higher tier = more exclusive access',
    profileTitle: 'My Profile', subStatus: 'Subscription Status', activeTier: 'Active Tier',
    subExpiry: 'Subscription Ends', icStatus: 'IC Verified', psyStatus: '30-Dimension Test', iciScore: 'ICI Score',
    upgradeBtn: '👑 Upgrade Tier', psyBtn: '🧪 30-Dimension Compatibility Test',
    logoutBtn: 'Log Out', uploadIC: '📎 Upload IC',
    icModalTitle: 'Verify Your Identity',
    icModalDesc: 'Upload a photo of your IC (front only). Data is encrypted & deleted after verification.',
    icUploadBtn: 'Choose IC Image', icSubmitBtn: 'Submit for Review',
  }
};

function setLang(l) {
  CL = l;
  document.getElementById('html-root').lang = l;
  const lt = document.getElementById('lang-tog');
  if (lt) lt.textContent = '🌐 ' + (l === 'ms' ? 'EN' : 'BM');
  applyLang(l);
  save();
}

function applyLang(l) {
  const T = LANG[l] || LANG.ms;
  const set = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
  set('lang-discover-title', T.discover);
  set('lang-discover-sub', T.discoverSub);
  set('lang-chat-title', T.chatTitle);
  set('lang-no-match', T.noMatch);
  set('lang-no-match-sub', T.noMatchSub);
  set('lang-pricing-title', T.pricingTitle);
  set('lang-pricing-sub', T.pricingSub);
  set('lang-profile-title', T.profileTitle);
  set('lang-sub-status', T.subStatus);
  set('lang-active-tier', T.activeTier);
  set('lang-sub-expiry', T.subExpiry);
  set('lang-ic-status', T.icStatus);
  set('lang-psy-status', T.psyStatus);
  set('lang-ici-score', T.iciScore);
  set('ov-ic-title', T.icModalTitle);
  set('ov-ic-desc', T.icModalDesc);
  set('ov-ic-upload-btn', T.icUploadBtn);
  set('ov-ic-submit-btn', T.icSubmitBtn);
  document.querySelectorAll('.lang-upgrade-btn').forEach(e => e.textContent = T.upgradeBtn);
  document.querySelectorAll('.lang-psy-btn').forEach(e => e.textContent = T.psyBtn);
  document.querySelectorAll('.lang-logout-btn').forEach(e => e.textContent = T.logoutBtn);
  document.querySelectorAll('.lang-upload-ic').forEach(e => e.textContent = T.uploadIC);
}

function getTodayStr() { return new Date().toISOString().slice(0, 10); }

// ══════════ API ══════════
async function apiCall(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (S.tok && S.tok !== 'demo') opts.headers['Authorization'] = 'Bearer ' + S.tok;
  if (body) opts.body = JSON.stringify(body);
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 10000);
  return fetch(API + path, { ...opts, signal: ctrl.signal });
}