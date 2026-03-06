// ══════════ PHOTO ══════════
function trigUpload(id) { document.getElementById(id).click(); }
function handlePhotoUpload(input, zId, pId) {
  const file = input.files[0]; if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast('Format tidak disokong.', 'err'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('Saiz melebihi 5MB.', 'err'); return; }
  const r = new FileReader();
  r.onload = e => {
    const ph = document.getElementById('reg-ph-hint'); if (ph) ph.style.display = 'none';
    const prev = document.getElementById(pId);
    if (prev) { prev.style.display = 'block'; const img = prev.querySelector('img') || document.getElementById('reg-ph-img'); if (img) img.src = e.target.result; }
    S.photo = e.target.result; toast('Gambar dimuat naik! ✅', 'ok');
  };
  r.readAsDataURL(file);
}
function changeProfPhoto(input) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    S.photo = e.target.result;
    const img = document.getElementById('prof-ph-img'), em = document.getElementById('prof-em');
    if (img) { img.src = e.target.result; img.style.display = 'block'; }
    if (em) em.style.display = 'none';
    updateNavAvatar(); save(); toast('Gambar profil dikemas kini! ✅', 'ok');
  };
  r.readAsDataURL(file);
}
function updateNavAvatar() {
  const img = document.getElementById('nav-av-img'), ic = document.getElementById('nav-av-ic');
  if (S.photo) { if (img) { img.src = S.photo; img.style.display = 'block'; } if (ic) ic.style.display = 'none'; }
  else { if (img) img.style.display = 'none'; if (ic) ic.style.display = ''; }
}

// ══════════ REGISTRATION ══════════
function stepBar(a) {
  ['rs1', 'rs2', 'rs3'].forEach((id, i) => {
    const e = document.getElementById(id); if (!e) return;
    e.classList.remove('done', 'cur');
    if (i < a) e.classList.add('done'); else if (i === a) e.classList.add('cur');
  });
}
async function regStep1() {
  const ph = document.getElementById('r-ph').value.trim(),
    nm = document.getElementById('r-nm').value.trim(),
    dob = document.getElementById('r-dob').value;
  hideMsg('r-msg1');
  const phV = validatePhone(ph); if (!phV.ok) { setMsg('r-msg1', phV.msg, 'e'); return; }
  const nmV = validateName(nm); if (!nmV.ok) { setMsg('r-msg1', nmV.msg, 'e'); return; }
  const dobV = validateDOB(dob); if (!dobV.ok) { setMsg('r-msg1', dobV.msg, 'e'); return; }
  S._regData = { phone: phV.phone, name: nm, dob, age: dobV.age, gender: document.getElementById('r-gd').value, status: document.getElementById('r-st').value, income: document.getElementById('r-income').value };
  document.getElementById('reg-s1').style.display = 'none';
  document.getElementById('reg-s2').style.display = 'block';
  stepBar(1);
}
async function regStep2() {
  const em = document.getElementById('r-em').value.trim().toLowerCase(),
    negeri = document.getElementById('r-negeri').value,
    ic = document.getElementById('r-ic').value.trim();
  hideMsg('r-msg2');
  const emV = validateEmail(em); if (!emV.ok) { setMsg('r-msg2', emV.msg, 'e'); return; }
  if (!negeri) { setMsg('r-msg2', 'Sila pilih negeri.', 'e'); return; }
  const icV = validateIC4(ic); if (!icV.ok) { setMsg('r-msg2', icV.msg, 'e'); return; }
  if (!S.captSolved) { setMsg('r-msg2', 'Sila selesaikan pengesahan anti-robot dahulu.', 'e'); return; }
  S._regData.email = em; S._regData.state = negeri; S._regData.ic4 = ic;
  document.getElementById('reg-s2').style.display = 'none';
  document.getElementById('reg-s3').style.display = 'block';
  stepBar(2);
}
async function regFinal() {
  if (!document.getElementById('cb-tnc').classList.contains('on')) { setMsg('r-msg3', 'Sila bersetuju dengan Terma & Syarat dahulu.', 'e'); return; }
  setBL('r-ftxt', 'r-fspin', true); hideMsg('r-msg3');
  const d = S._regData || {};
  try {
    const r = await apiCall('POST', '/auth/register', { phone: d.phone, name: d.name, dob: d.dob, age: d.age, gender: d.gender, status: d.status, email: d.email, state: d.state, ic4: d.ic4, tnc_agreed: true, photo: S.photo || null });
    const data = await r.json();
    if (r.ok) { S.uid = data.user_id; S.tok = data.access_token; applyRegData(d); setSubDays(7); save(); setMsg('r-msg3', '✨ Berjaya!', 's'); setTimeout(() => finishLogin(), 1300); return; }
    setMsg('r-msg3', data.detail || 'Ralat.', 'e');
  } catch {
    S.uid = 'jdk_' + Date.now(); S.tok = 'demo_tok';
    applyRegData(d); setSubDays(7); save();
    setMsg('r-msg3', '✨ [Demo] Selamat datang, ' + d.name + '!', 's');
    setTimeout(() => finishLogin(), 1300);
  }
  setBL('r-ftxt', 'r-fspin', false);
}
function applyRegData(d) { S.name = d.name; S.dob = d.dob; S.gender = d.gender; S.status = d.status; S.state = d.state; S.income = d.income || null; S.tier = 'Silver (7-Hari)'; S.premium = true; }
function setSubDays(days) {
  const now = new Date(); S.subStart = now.toISOString();
  const end = new Date(now); end.setDate(end.getDate() + days);
  S.subEnd = end.toISOString(); S.premium = true;
}
function finishLogin() { updateNavBadge(); updateNavAvatar(); openProgressiveModal(); }

// ══════════ PROGRESSIVE PROFILING MODAL ══════════
function openProgressiveModal() {
  // Show the extended profile modal before entering dashboard
  openOv('ov-progressive');
}

function saveExtendedProfile() {
  const edu = document.getElementById('pp-education').value;
  const occ = document.getElementById('pp-occupation').value;
  if (!edu || !occ) { toast('Sila lengkapkan semua maklumat.', 'err'); return; }
  S.education = edu; S.occupation = occ; save();
  closeOv('ov-progressive');
  // Generate wingman verdict based on profile
  const verdict = wingmanAnalysis(occ, edu, S.status || 'Bujang');
  S.wingmanVerdict = verdict; save();
  toast('Profil dikemas kini! AI Wingman sedang menganalisis... 🤖', 'ok', 3500);
  go('P-dash');
}

function skipExtendedProfile() {
  closeOv('ov-progressive');
  go('P-dash');
}

// ══════════ LOGIN ══════════
async function doOTP() {
  const ph = document.getElementById('l-ph').value.trim();
  const phV = validatePhone(ph); if (!phV.ok) { setMsg('l-m1', phV.msg, 'e'); return; }
  setBL('l-b1t', 'l-b1s', true); hideMsg('l-m1');
  try { await apiCall('POST', '/auth/whatsapp/request-otp', { phone_number: phV.phone }); } catch {}
  document.getElementById('l-phshow').textContent = ph;
  document.getElementById('l-s1').style.display = 'none';
  document.getElementById('l-s2').style.display = 'flex';
  document.getElementById('l-s2').style.flexDirection = 'column';
  document.getElementById('l-s2').style.gap = '14px';
  setMsg('l-m2', '[Demo] Gunakan kod: 1 2 3 4 5 6', 'i');
  setBL('l-b1t', 'l-b1s', false);
}
function backOTP() {
  document.getElementById('l-s1').style.display = 'flex';
  document.getElementById('l-s2').style.display = 'none';
  document.getElementById('l-s1').style.flexDirection = 'column';
  document.getElementById('l-s1').style.gap = '14px';
  hideMsg('l-m1'); hideMsg('l-m2');
}
async function doVerify() {
  const ph = document.getElementById('l-ph').value.trim();
  const otp = document.getElementById('l-otp').value.trim();
  setBL('l-b2t', 'l-b2s', true); hideMsg('l-m2');
  try {
    const r = await apiCall('POST', '/auth/whatsapp/verify-otp', { phone_number: ph, otp_code: otp });
    if (r.ok) { const d = await r.json(); S.uid = d.user_id; S.tok = d.access_token; S.tier = d.tier || 'Silver'; S.name = d.name || 'Pengguna'; save(); setBL('l-b2t', 'l-b2s', false); toast('Selamat kembali! 👋', 'ok'); finishLogin(); return; }
  } catch {}
  if (otp === '123456' || otp.replace(/\s/g, '').length === 6) {
    S.uid = S.uid || ('demo_' + ph); S.tok = 'demo'; S.name = S.name || 'Pengguna';
    if (!S.tier || S.tier === 'Basic') S.tier = 'Silver';
    save(); setBL('l-b2t', 'l-b2s', false); toast('Log masuk berjaya [Demo]', 'ok'); finishLogin();
  } else { setMsg('l-m2', 'Kod OTP salah.', 'e'); setBL('l-b2t', 'l-b2s', false); }
}
