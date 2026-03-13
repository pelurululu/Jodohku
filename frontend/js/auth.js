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
    const r = await apiCall('POST', '/auth/register', {
      phone: d.phone, name: d.name, dob: d.dob, age: d.age,
      gender: d.gender, status: d.status, email: d.email,
      state: d.state, ic4: d.ic4, tnc_agreed: true,
      photo: S.photo || null, income: d.income || '',
    });
    const data = await r.json();
    if (r.ok) {
      S.uid = data.user_id; S.tok = data.access_token;
      applyRegData(d); setSubDays(7); save();
      setMsg('r-msg3', '✨ Pendaftaran berjaya!', 's');
      setTimeout(() => finishLogin(), 1300);
      return;
    }
    setMsg('r-msg3', data.detail || 'Pendaftaran gagal. Sila cuba lagi.', 'e');
  } catch {
    setMsg('r-msg3', 'Tidak dapat menghubungi pelayan. Semak sambungan internet anda.', 'e');
  }
  setBL('r-ftxt', 'r-fspin', false);
}
function applyRegData(d) {
  S.name = d.name; S.dob = d.dob; S.gender = d.gender;
  S.status = d.status; S.state = d.state;
  S.income = d.income || null;
  S.tier = 'Silver (7-Hari)'; S.premium = true;
}
function setSubDays(days) {
  const now = new Date(); S.subStart = now.toISOString();
  const end = new Date(now); end.setDate(end.getDate() + days);
  S.subEnd = end.toISOString(); S.premium = true;
}
function finishLogin() { updateNavBadge(); updateNavAvatar(); openProgressiveModal(); }

// ══════════ PROGRESSIVE PROFILING MODAL ══════════
function openProgressiveModal() {
  openOv('ov-progressive');
}
async function saveExtendedProfile() {
  const edu = document.getElementById('pp-education').value;
  const occ = document.getElementById('pp-occupation').value;
  if (!edu || !occ) { toast('Sila lengkapkan semua maklumat.', 'err'); return; }
  S.education = edu; S.occupation = occ; save();
  closeOv('ov-progressive');
  const verdict = wingmanAnalysis(occ, edu, S.status || 'Bujang');
  S.wingmanVerdict = verdict; save();
  try {
    await apiCall('PUT', `/user/${S.uid}/profile`, {
      education: edu, occupation: occ,
      income_class: S.income || '',
      wingman_verdict: verdict,
    });
  } catch {}
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
  try {
    const r = await apiCall('POST', '/auth/whatsapp/request-otp', { phone_number: phV.phone });
    if (!r.ok) {
      const e = await r.json();
      setMsg('l-m1', e.detail || 'Gagal menghantar OTP. Cuba lagi.', 'e');
      setBL('l-b1t', 'l-b1s', false); return;
    }
  } catch {
    setMsg('l-m1', 'Tidak dapat menghubungi pelayan. Semak sambungan internet anda.', 'e');
    setBL('l-b1t', 'l-b1s', false); return;
  }
  document.getElementById('l-phshow').textContent = ph;
  document.getElementById('l-s1').style.display = 'none';
  document.getElementById('l-s2').style.display = 'flex';
  document.getElementById('l-s2').style.flexDirection = 'column';
  document.getElementById('l-s2').style.gap = '14px';
  setMsg('l-m2', 'Kod OTP telah dihantar ke WhatsApp anda.', 'i');
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
  if (!otp) { setMsg('l-m2', 'Sila masukkan kod OTP.', 'e'); return; }
  setBL('l-b2t', 'l-b2s', true); hideMsg('l-m2');
  try {
    const r = await apiCall('POST', '/auth/whatsapp/verify-otp', { phone_number: ph, otp_code: otp });
    if (r.ok) {
      const d = await r.json();
      S.uid = d.user_id; S.tok = d.access_token;
      S.tier = d.tier || 'Silver'; S.name = d.name || 'Pengguna';
      save();
      try {
        const pr = await apiCall('GET', `/user/${S.uid}/profile`);
        if (pr.ok) {
          const pd = await pr.json();
          S.education = pd.education || S.education;
          S.occupation = pd.occupation || S.occupation;
          S.income = pd.income_class || S.income;
          S.wingmanVerdict = pd.wingman_verdict || S.wingmanVerdict;
          S.psyDone = pd.psy_done || S.psyDone;
          S.psyScore = pd.psy_score || S.psyScore;
          S.psyType = pd.psy_type || S.psyType;
          S.psyDesc = pd.psy_desc || S.psyDesc;
          S.psyTraits = pd.psy_traits || S.psyTraits;
          S.psyDims = pd.psy_dims || S.psyDims;
          S.msgCount = pd.msg_count || 0;
          save();
        }
      } catch {}
      setBL('l-b2t', 'l-b2s', false);
      toast('Selamat kembali, ' + S.name + '! 👋', 'ok');
      finishLogin();
      return;
    }
    const err = await r.json();
    setMsg('l-m2', err.detail || 'Kod OTP tidak sah.', 'e');
  } catch {
    setMsg('l-m2', 'Tidak dapat menghubungi pelayan. Semak sambungan internet anda.', 'e');
  }
  setBL('l-b2t', 'l-b2s', false);
}
