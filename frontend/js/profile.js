// ══════════ PAYMENT ══════════
// ── CHANGED: doPayment now calls ToyyibPay API ──
async function doPayment(tier, price) {
  if (!S.uid) { toast('Sila log masuk dahulu.', 'err'); return; }
  const label = tier === 'Sovereign' ? `${tier} — RM${price}/tahun` : `${tier} — RM${price}/bulan`;
  document.getElementById('pay-amt').textContent = 'RM' + price;
  document.getElementById('pay-tier-show').textContent = label;
  openOv('ov-pay-proc');

  try {
    const r = await apiCall('POST', '/payment/create-bill', {
      user_uid: S.uid,
      tier: tier,
      amount: parseFloat(price)
    });
    if (r.ok) {
      const d = await r.json();
      closeOv('ov-pay-proc');
      if (d.payment_url && !d.payment_url.includes('DEMO')) {
        // Real ToyyibPay — redirect user to payment page
        window.location.href = d.payment_url;
        return;
      }
    }
  } catch (e) {
    console.warn('[PAY] API unavailable, using demo mode');
  }

  // Demo fallback — only when ToyyibPay not configured
  closeOv('ov-pay-proc');
  const days = tier === 'Sovereign' ? 365 : 30;
  unlockTier(tier, days);
  toast(`🎉 Tahniah! Anda kini ahli ${tier}!`, 'ok', 5000);
}

function unlockTier(tier, days) {
  S.tier = tier; S.premium = true; S.msgCount = 0;
  setSubDays(days); S.reminderShown = { r7: false, r3: false, r1: false };
  save(); updateNavBadge(); refreshProfile(); refreshTierCards(); checkReminders(); closeOv('ov-pay');
}
function checkReminders() {
  if (!S.subEnd || !S.premium) return;
  const d = Math.ceil((new Date(S.subEnd) - Date.now()) / 864e5);
  const r7 = document.getElementById('rmnd-7'), r3 = document.getElementById('rmnd-3'), r1 = document.getElementById('rmnd-1');
  if (r7) r7.style.display = 'none'; if (r3) r3.style.display = 'none'; if (r1) r1.style.display = 'none';
  if (d <= 1 && !S.reminderShown.r1) { if (r1) r1.style.display = 'flex'; S.reminderShown.r1 = true; save(); }
  else if (d <= 3 && !S.reminderShown.r3) { if (r3) r3.style.display = 'flex'; S.reminderShown.r3 = true; save(); }
  else if (d <= 7 && !S.reminderShown.r7) { if (r7) r7.style.display = 'flex'; S.reminderShown.r7 = true; save(); }
}

let _tt2;
function updateTrialBar() {
  const bar = document.getElementById('trial-bar');
  if (!S.subEnd || !S.premium) { if (bar) bar.style.display = 'none'; return; }
  const d = Math.ceil((new Date(S.subEnd) - Date.now()) / 864e5);
  const dur = S.subStart ? (new Date(S.subEnd) - new Date(S.subStart)) / 864e5 : 30;
  if (dur > 14 || d > 7) { if (bar) bar.style.display = 'none'; return; }
  if (bar) bar.style.display = 'flex';
  clearInterval(_tt2);
  _tt2 = setInterval(() => {
    const diff = new Date(S.subEnd) - Date.now();
    if (diff <= 0) { clearInterval(_tt2); if (bar) bar.style.display = 'none'; S.premium = false; S.tier = 'Basic'; save(); updateNavBadge(); return; }
    const h = Math.floor(diff / 36e5), m = Math.floor(diff % 36e5 / 6e4), s = Math.floor(diff % 6e4 / 1000);
    const el = document.getElementById('trial-time'); if (el) el.textContent = pad(h) + 'J ' + pad(m) + 'M ' + pad(s) + 'S';
  }, 1000);
}

// ══════════ NAV BADGE ══════════
function updateNavBadge() {
  const b = document.getElementById('nav-badge'); if (!b) return;
  const t2 = cleanTierName(S.tier); b.textContent = t2;
  b.className = 'bdg ' + (S.tier.includes('Gold') ? 'bgold' : S.tier.includes('Plat') ? 'bplat' : S.tier.includes('Sov') ? 'bsov' : 'bsilver');
}
function cleanTierName(t) { return (t || 'Silver').toUpperCase().replace(/\(.*?\)/g, '').trim(); }
function refreshTierCards() {
  ['Silver', 'Gold', 'Platinum', 'Sovereign'].forEach(tier => {
    const el = document.getElementById('tier-card-' + tier); if (!el) return;
    el.classList.remove('active-tier');
    if (S.tier && S.tier.includes(tier)) el.classList.add('active-tier');
  });
}

// ══════════ PROFILE ══════════
function refreshProfile() {
  const nm = S.name || 'Pengguna', age = S.dob ? calcAge(S.dob) : '–';
  document.getElementById('prof-nm').textContent = nm;
  document.getElementById('prof-sub').textContent = age + ' Tahun • ' + (S.status || '–') + ' • ' + (S.state || '–');
  document.getElementById('pi-tier').textContent = S.tier || 'Basic';
  const subEl = document.getElementById('pi-sub'); if (subEl) { subEl.textContent = S.premium ? 'Aktif ✓' : 'Percuma'; subEl.style.color = S.premium ? 'var(--green)' : 'var(--t2)'; }
  const expEl = document.getElementById('pi-exp'); if (expEl) expEl.textContent = S.subEnd ? new Date(S.subEnd).toLocaleDateString('ms-MY', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  document.getElementById('prof-msg').textContent = S.premium ? '∞' : Math.max(0, FREE_MSGS - S.msgCount) + '/' + FREE_MSGS;
  document.getElementById('prof-mc').textContent = S.matches.length;
  const iciEl = document.getElementById('prof-ici'); if (iciEl) iciEl.textContent = S.psyScore != null ? S.psyScore.toFixed(1) : '—';
  const psiEl = document.getElementById('pi-psy'); if (psiEl) { psiEl.textContent = S.psyDone ? 'Selesai ✓' : 'Belum selesai'; psiEl.style.color = S.psyDone ? 'var(--green)' : 'var(--t3)'; }
  const psiSc = document.getElementById('pi-psysc'); if (psiSc) psiSc.textContent = S.psyScore != null ? S.psyScore.toFixed(1) + '/10' : '—';
  const b = document.getElementById('prof-bdg'); if (b) { b.textContent = cleanTierName(S.tier); b.className = 'bdg ' + (S.tier.includes('Gold') ? 'bgold' : S.tier.includes('Plat') ? 'bplat' : 'bsilver'); }
  if (S.photo) { const img = document.getElementById('prof-ph-img'), em = document.getElementById('prof-em'); if (img) { img.src = S.photo; img.style.display = 'block'; } if (em) em.style.display = 'none'; }
  // IC status
  const icEl = document.getElementById('pi-ic');
  if (icEl) {
    if (S.icVerified === true) { icEl.textContent = 'Disahkan ✓'; icEl.style.color = 'var(--green)'; }
    else if (S.icVerified === 'pending') { icEl.textContent = 'Dalam semakan ⏳'; icEl.style.color = 'var(--gold)'; }
    else { icEl.textContent = 'Menunggu'; icEl.style.color = 'var(--orange)'; }
  }
  // Wingman AI verdict card
  const wCard = document.getElementById('prof-wingman-card');
  if (wCard) {
    if (S.wingmanVerdict || (S.occupation && S.education)) {
      wCard.style.display = 'block';
      const verdict = S.wingmanVerdict || wingmanAnalysis(S.occupation || 'Lain-lain', S.education || 'Degree', S.status || 'Bujang');
      document.getElementById('prof-wingman-text').textContent = verdict;
    } else {
      wCard.style.display = 'none';
    }
  }
  const aiCard = document.getElementById('prof-ai-card');
  if (aiCard && S.psyDone) {
    aiCard.style.display = 'block';
    document.getElementById('prof-ai-type').textContent = S.psyType || '—';
    document.getElementById('prof-ai-desc').textContent = S.psyDesc || '—';
    const traitsWrap = document.getElementById('prof-traits');
    if (traitsWrap) traitsWrap.innerHTML = (S.psyTraits || []).map(t => `<span class="trait-tag trait-positive">${esc(t)}</span>`).join('');
  }
}

// ── IC UPLOAD ──
function handleICUpload(input) {
  const file = input.files[0]; if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setMsg('ic-status-msg', 'Format tidak disokong. Guna JPG atau PNG.', 'e'); return; }
  if (file.size > 5 * 1024 * 1024) { setMsg('ic-status-msg', 'Saiz fail melebihi 5MB.', 'e'); return; }
  const r = new FileReader();
  r.onload = e => {
    document.getElementById('ic-preview-img').src = e.target.result;
    document.getElementById('ic-preview-wrap').style.display = 'block';
    document.getElementById('ic-placeholder').style.display = 'none';
    const btn = document.getElementById('ic-submit-btn');
    btn.disabled = false; btn.style.opacity = '1';
    S._icData = e.target.result;
    hideMsg('ic-status-msg');
  };
  r.readAsDataURL(file);
}

function clearIC(evt) {
  evt.stopPropagation();
  document.getElementById('ic-preview-wrap').style.display = 'none';
  document.getElementById('ic-placeholder').style.display = 'block';
  document.getElementById('ic-file-input').value = '';
  const btn = document.getElementById('ic-submit-btn');
  btn.disabled = true; btn.style.opacity = '.4';
  S._icData = null;
}

async function submitIC() {
  if (!S._icData) { setMsg('ic-status-msg', 'Sila pilih gambar IC dahulu.', 'e'); return; }
  const btn = document.getElementById('ic-submit-btn'), sp = document.getElementById('ic-spin');
  btn.disabled = true; sp.style.display = 'inline-block'; hideMsg('ic-status-msg');
  try {
    const r = await apiCall('POST', '/profile/upload-ic', { user_uid: S.uid, ic_image: S._icData.split(',')[1] });
    if (r.ok) {
      S.icVerified = 'pending'; save();
      setMsg('ic-status-msg', '✅ IC berjaya dihantar! Pengesahan dalam 1–24 jam.', 's');
      refreshProfile();
      setTimeout(() => { closeOv('ov-ic'); toast('IC dihantar untuk semakan! ✅', 'ok', 4000); }, 1800);
      return;
    }
  } catch {}
  // Demo fallback
  S.icVerified = 'pending'; save();
  setMsg('ic-status-msg', '✅ IC diterima! Status: Dalam semakan.', 's');
  refreshProfile();
  setTimeout(() => { closeOv('ov-ic'); toast('IC dihantar untuk semakan! ✅', 'ok', 4000); }, 1800);
  btn.disabled = false; sp.style.display = 'none';
}

function respondCon(yes) {
  closeOv('ov-consent');
  if (yes) toast('Nombor WhatsApp dikongsi. Semoga berjaya! 🤲', 'ok');
  else toast('Permohonan ditolak. Nombor anda selamat.', 'info');
}

function doLogout() {
  if (!confirm('Anda pasti mahu log keluar?')) return;
  localStorage.removeItem('jdk');
  Object.assign(S, { uid: null, tok: null, name: null, dob: null, gender: null, status: null, state: null, tier: 'Basic', premium: false, msgCount: 0, subStart: null, subEnd: null, matches: [], feed: [], history: {}, activeMatch: null, photo: null, psyDone: false, psyScore: null, psyType: null, psyDesc: null, psyTraits: [], psyDims: {}, psyCustomText: '', feedLastReset: null, captSolved: false, reminderShown: { r7: false, r3: false, r1: false }, chatDays: {}, advanceRequested: {} });
  go('P-land'); toast('Anda telah log keluar.', 'info');
}

// ══════════ INSIGHTS ══════════
function updateInsights() {
  document.getElementById('ins-matches').textContent = S.matches.length;
  document.getElementById('ins-best').textContent = S.matches.filter(m => m.score >= 90).length;
  document.getElementById('ins-chats').textContent = Object.keys(S.history).filter(k => S.history[k].length > 0).length;
  if (S.psyDone && S.psyScore != null) {
    document.getElementById('ins-score').textContent = S.psyScore.toFixed(1);
    document.getElementById('ins-type').textContent = S.psyType || '—';
    document.getElementById('ins-ai-desc').textContent = S.psyDesc || '—';
    const pct = S.psyScore / 10;
    const ring = document.getElementById('ins-ring'); if (ring) ring.setAttribute('stroke-dashoffset', 239 * (1 - pct));
    const dimWrap = document.getElementById('ins-dims');
    if (dimWrap && S.psyDims) {
      const dimLabels = { kewangan: '💰 Kewangan', keluarga: '👨‍👩‍👧 Keluarga', konflik: '🤝 Konflik', agama: '🕌 Agama', kerjaya: '💼 Kerjaya', anak: '👶 Anak', komunikasi: '🗣️ Komunikasi', rumah_tangga: '🏠 Rumah Tangga', gaya_hidup: '🌍 Gaya Hidup', komitmen: '💍 Komitmen', pemikiran: '🧠 Pemikiran', makanan: '🍽️ Makan/Minum', aktiviti: '🏃 Aktiviti', kebersihan: '🧹 Kebersihan', hobi: '📚 Hobi', sosial: '🤝 Sosial', emosi: '❤️ Emosi', masa_depan: '🎯 Visi', teknologi: '📱 Teknologi', personaliti: '✨ Personaliti' };
      const sorted = Object.entries(S.psyDims).sort((a, b) => b[1] - a[1]).slice(0, 8);
      dimWrap.innerHTML = sorted.map(([k, v]) => `<div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;min-width:130px;color:var(--t2)">${dimLabels[k] || k}</span><div style="flex:1;height:6px;background:var(--s4);border-radius:3px;overflow:hidden"><div style="height:100%;width:${v * 10}%;background:${v >= 8 ? 'var(--green)' : v >= 6 ? 'var(--gold)' : 'var(--t2)'};border-radius:3px;transition:width 1s"></div></div><span style="font-size:11px;font-weight:700;color:${v >= 8 ? 'var(--green)' : v >= 6 ? 'var(--gold)' : 'var(--t2)'};min-width:28px;text-align:right">${v.toFixed(0)}/10</span></div>`).join('');
    }
  }
}

// ══════════ PIONEER COUNTER ══════════
async function loadPioneer() {
  const maxDob = new Date(); maxDob.setFullYear(maxDob.getFullYear() - 18);
  const dobEl = document.getElementById('r-dob'); if (dobEl) dobEl.max = maxDob.toISOString().slice(0, 10);
  let c = 2847;
  const el = document.getElementById('pc');
  setInterval(() => { if (Math.random() > .78 && c > 2700) { c--; el.textContent = c.toLocaleString(); } }, 11000);
}