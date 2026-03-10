'use strict';

// ══════════ CONFIG ══════════
const API = 'http://localhost:8000';
const TIER_ORDER = { Basic: 0, Silver: 1, 'Silver (7-Hari)': 1, Gold: 2, Platinum: 3, Sovereign: 4 };
const FREE_MSGS = 10; // Silver tier: 10 messages
const DAILY_RESET_HOUR = 8;
let CL = 'ms';

// ══════════ STATE ══════════
const S = {
  uid: null, tok: null, name: null, dob: null, gender: null, status: null, state: null,
  income: null, education: null, occupation: null, // Progressive profile fields
  tier: 'Basic', premium: false, msgCount: 0,
  subStart: null, subEnd: null,
  matches: [], feed: [], history: {}, activeMatch: null,
  photo: null,
  psyDone: false, psyScore: null, psyType: null, psyDesc: null, psyTraits: [], psyDims: {}, psyCustomText: '',
  feedLastReset: null, captSolved: false, lang: 'ms',
  reminderShown: { r7: false, r3: false, r1: false },
  chatDays: {},         // matchId -> [dateStrings]
  advanceRequested: {}, // matchId -> bool
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
  window.scrollTo(0, 0);
}
function openOv(id) { document.getElementById(id).classList.add('show'); }
function closeOv(id) { document.getElementById(id).classList.remove('show'); }
function setLang(l) {
  CL = l;
  document.getElementById('html-root').lang = l;
  const lt = document.getElementById('lang-tog');
  if (lt) lt.textContent = '🌐 ' + (l === 'ms' ? 'EN' : 'BM');
  save();
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