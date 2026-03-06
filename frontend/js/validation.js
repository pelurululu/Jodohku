// ══════════ VALIDATION ══════════
function validatePhone(p) {
  p = p.replace(/[\s\-()]/g, '');
  if (p.startsWith('+60')) p = p.slice(3);
  if (p.startsWith('60')) p = p.slice(2);
  if (!p.startsWith('0')) p = '0' + p;
  if (!/^01[0-9]{8,9}$/.test(p)) return { ok: false, msg: 'Nombor WhatsApp tidak sah. Format: 01XXXXXXXX' };
  return { ok: true, phone: p };
}
function validateName(n) {
  if (n.length < 2) return { ok: false, msg: 'Nama terlalu pendek.' };
  if (n.length > 40) return { ok: false, msg: 'Nama terlalu panjang.' };
  if (/[<>{}$]/.test(n)) return { ok: false, msg: 'Nama mengandungi aksara tidak sah.' };
  return { ok: true };
}
function validateDOB(d) {
  if (!d) return { ok: false, msg: 'Sila masukkan tarikh lahir.' };
  const a = calcAge(d);
  if (a < 18) return { ok: false, msg: 'Umur minimum adalah 18 tahun.' };
  if (a > 55) return { ok: false, msg: 'Umur maksimum adalah 55 tahun.' };
  return { ok: true, age: a };
}
function validateEmail(e) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, msg: 'Format emel tidak sah.' };
  return { ok: true };
}
function validateIC4(ic) {
  if (!/^\d{4}$/.test(ic)) return { ok: false, msg: 'Masukkan tepat 4 digit terakhir IC.' };
  return { ok: true };
}

// ══════════ ANTI-SCAM ══════════
const SCAM_PATTERNS = [
  /\b(whatsapp|telegram|signal)\b.*\b(luar|outside|direct)\b/i,
  /\b(wang|money|rm\d+|transfer|bayar|pay)\b/i,
  /\b(pelaburan|investment|profit|untung)\b/i,
  /bit\.ly|tinyurl|t\.me\/|wa\.me\//i,
  /\b(atm|bank|akaun|account number)\b/i
];
function isScamMsg(msg) { return SCAM_PATTERNS.some(p => p.test(msg)); }

// ══════════ CAPTCHA ══════════
function solveCapt() {
  if (S.captSolved) return;
  const ico = document.getElementById('capt-ico'), sp = document.getElementById('capt-spin');
  ico.textContent = '⏳'; sp.style.display = 'inline-block';
  setTimeout(() => {
    ico.textContent = '✅'; sp.style.display = 'none';
    S.captSolved = true;
    document.getElementById('captcha-box').style.borderColor = 'var(--gborder3)';
  }, 900 + Math.random() * 600);
}
