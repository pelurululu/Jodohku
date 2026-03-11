// ══════════ WINGMAN AI ══════════
function wingmanAnalysis(occupation, education, status) {
  const lines = {
    'Doktor/Medikal':  `Dia ni Doktor bro 👨‍⚕️ — poket dalam, jam kerja gila-gila. Kalau kau jenis sabar tunggu dia balik on-call, confirm berbaloi. Standard dia tinggi, tapi kalau dia minat kau, memang dia serius.`,
    'Jurutera':        `Engineer ni! 🔧 Jenis kira-kira semua benda — dari bolt rumah sampai hati orang. Dia tak banyak cakap tapi bila cakap, make sense. Silap-silap letak IKEA pun dia buat sendiri.`,
    'Akauntan':        `Akauntan! 📊 Mesti jenis kira sen-sen masa dating, tapi confirm masa depan terjamin. Budget honeymoon dah ada dalam spreadsheet dua tahun sebelum tunang.`,
    'Pensyarah':       `Pensyarah ni 📚 — otak bertahap lain. Suka berdebat pasal idea besar, holiday pun nak ke muzium. Tapi bila dia sayang, dia akan "ajar" kau macam mana nak bahagia.`,
    'Sales/Marketing': `Sales Exec! 🎯 Mulut manis, pandai pujuk — kau pun tak sedar dah setuju nak kahwin masa makan malam pertama. Diorang ni pandai bergaul dan confident.`,
    'Business':        `Usahawan ni boss! 💼 Mindset lain dari orang lain. Kalau kau suka partner yang ada vision dan berani, ini dia.`,
    'Peguam':          `Peguam! ⚖️ Bila argue, memang tak boleh menang. Dia ingat semua benda yang kau cakap. Tapi bila dia bela kau, memang 100%.`,
    'Sektor Awam':     `Penjawat Awam! 🏛️ Gaji tetap, cuti banyak, pencen ada. Jenis yang kau bawa jumpa mak ayah, confirm approve dalam 5 minit.`,
  };
  const edLines = { 'PhD': 'Otak bergeliga gila', 'Master': 'Educated & ambitious', 'Degree': 'Solid foundation', 'Diploma': 'Practical & hands-on', 'Profesional': 'Kelayakan kelas pertama', 'SPM': 'Street smart, life experience' };
  const stLines = { 'Bujang': 'Baru nak start chapter baru', 'Janda': 'Matang, tahu apa dia nak', 'Duda': 'Berpengalaman, serius mencari', 'Ibu Tunggal': 'Kuat & independent, hati besar', 'Bapa Tunggal': 'Responsible, sayangkan keluarga' };
  const base = lines[occupation] || `Dia bekerja dalam bidang ${occupation}. Nampak serius dan committed dalam kerjaya.`;
  const edNote = edLines[education] ? ` (${edLines[education]})` : '';
  const stNote = stLines[status] ? ` Status: ${stLines[status]}.` : '';
  return base + edNote + stNote;
}

// ══════════ FEED ══════════
function shouldResetFeed() {
  const today = getTodayStr();
  if (!S.feedLastReset || S.feedLastReset !== today) {
    const now = new Date();
    if (now.getHours() >= DAILY_RESET_HOUR) { S.feedLastReset = today; S.feed = []; save(); return true; }
  }
  return false;
}

async function loadFeed() {
  shouldResetFeed();
  const fload = document.getElementById('f-load'), fcards = document.getElementById('f-cards'),
    flock = document.getElementById('f-lock'), warn = document.getElementById('low-match-warn');
  fload.style.display = 'flex'; fcards.style.display = 'none'; flock.style.display = 'none'; warn.style.display = 'none';
  updateNavBadge(); updateTrialBar(); checkReminders(); updateNextReset();

  let feed = [];
  try {
    const r = await apiCall('GET', `/matchmaking/daily-feed/${S.uid}`);
    if (r.ok) {
      const d = await r.json();
      feed = (d.feed || []).map(mapCandidate);
    } else if (r.status === 401) {
      doLogout(); return;
    } else {
      setTimeout(() => { fload.style.display = 'none'; showFeedError(); }, 800);
      return;
    }
  } catch {
    setTimeout(() => { fload.style.display = 'none'; showFeedError(); }, 800);
    return;
  }

  feed = feed.filter(c => c.sc >= 80);
  S.feed = [...feed];

  setTimeout(() => {
    fload.style.display = 'none';
    if (!feed.length) {
      if (!S.psyDone) { warn.style.display = 'block'; }
      else { flock.style.display = 'block'; }
      return;
    }
    fcards.style.display = 'flex';
    fcards.innerHTML = feed.map((c, i) => buildCard(c, i)).join('');
    setTimeout(() => feed.forEach((c, i) => { const b = document.getElementById('cbf' + i); if (b) b.style.width = c.sc + '%'; }), 200);
  }, 1200);
}

function showFeedError() {
  const flock = document.getElementById('f-lock');
  if (flock) {
    flock.style.display = 'block';
    flock.innerHTML = `<div style="text-align:center;padding:32px 16px">
      <div style="font-size:32px;margin-bottom:12px">⚠️</div>
      <p style="color:var(--t2);font-size:13px">Tidak dapat memuatkan cadangan.<br>Semak sambungan internet anda.</p>
      <button onclick="loadFeed()" style="margin-top:16px;padding:10px 24px;background:var(--gold);color:#000;border-radius:10px;font-weight:700;font-size:13px">Cuba Semula</button>
    </div>`;
  }
}

function mapCandidate(c) {
  return { id: c.candidate_id, n: c.display_name, age: c.age, st: c.status, tier: c.tier, sc: c.compatibility_score, vd: c.ai_verdict, traits: c.traits || [], photo: c.photo_url || null };
}

function buildCard(c, i) {
  const T = (typeof LANG !== 'undefined' && LANG[CL]) ? LANG[CL] : {};
  const passLbl = T['btn-pass'] || 'Tolak';
  const likeLbl = T['btn-like'] || 'Suka Calon ✨';
  const tcls = c.tier.includes('Gold') ? 'bgold' : c.tier.includes('Plat') ? 'bplat' : 'bsilver';
  const isBest = c.sc >= 90;
  const matchBdg = isBest ? '<span class="bmatch-best">⭐ PADANAN TERBAIK</span>' : '<span class="bmatch-rec">✓ DISYORKAN</span>';
  const barCls = isBest ? 'cbf-best' : 'cbf-rec';
  const photoHtml = c.photo ? `<div class="cand-photo"><img src="${c.photo}"/></div>` : `<div class="cand-photo"><span style="font-size:38px">${c.n.includes('Puan') || c.n.includes('Cik') ? '👩' : '👨'}</span></div>`;
  const traitsHtml = (c.traits || []).map(t => `<span class="trait-tag trait-positive">${esc(t)}</span>`).join('');
  return `<div class="card fu" style="overflow:hidden;animation-delay:${i * .07}s;opacity:0" id="cc${i}">
    ${photoHtml}
    <div style="padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-size:8px;color:var(--t3);font-weight:700;letter-spacing:.07em">CALON ${i + 1}/5</span>
            <span class="bdg ${tcls}">${c.tier.toUpperCase()}</span>
            ${matchBdg}
          </div>
          <h3 class="serif" style="font-size:18px;font-weight:700;line-height:1.1">${esc(c.n)}</h3>
          <p style="font-size:11px;color:var(--t2);margin-top:2px">${c.age} Tahun • ${esc(c.st)}</p>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:8px">
          <div class="serif ${isBest ? 'gold' : ''}" style="font-size:26px;font-weight:800;line-height:1;${isBest ? '' : 'color:var(--green)'}">${c.sc}%</div>
          <div style="font-size:8px;color:var(--t3)">Serasi</div>
        </div>
      </div>
      <div class="cbt" style="margin-bottom:11px"><div class="cbf ${barCls}" id="cbf${i}"></div></div>
      <div class="ai-box" style="margin-bottom:10px">
        <div class="ai-lbl">ANALISIS AI 30 DIMENSI</div>
        <p style="font-size:11px;color:var(--t2);font-style:italic;line-height:1.55">${esc(c.vd)}</p>
      </div>
      ${traitsHtml ? `<div style="margin-bottom:12px;display:flex;flex-wrap:wrap;gap:4px">${traitsHtml}</div>` : ''}
      <div class="row g8">
        <button onclick="doAction('${c.id}','PASS',${i})" style="flex:1;padding:13px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.07);border-radius:12px;font-size:12px;font-weight:600;color:var(--t2);transition:var(--trans)">${passLbl}</button>
        <button onclick="doAction('${c.id}','LIKE',${i})" style="flex:1.7;padding:13px;background:linear-gradient(135deg,var(--gold),var(--gdark));border-radius:12px;font-size:12px;font-weight:800;color:#000;box-shadow:0 2px 14px rgba(201,168,76,.2);transition:var(--trans)">${likeLbl}</button>
      </div>
    </div>
  </div>`;
}

async function doAction(cid, action, idx) {
  const el = document.getElementById('cc' + idx);
  if (el) { el.style.opacity = '.2'; el.style.transform = 'scale(.97)'; el.style.pointerEvents = 'none'; }

  const cData = S.feed.find(c => c.id === cid) || null;
  S.feed = S.feed.filter(c => c.id !== cid);
  setTimeout(() => {
    if (el) el.remove();
    const cards = document.getElementById('f-cards');
    if (cards && !cards.children.length) { cards.style.display = 'none'; document.getElementById('f-lock').style.display = 'block'; }
  }, 280);

  if (action === 'PASS') return;

  // LIKE — call backend
  let matchData = null;
  try {
    const r = await apiCall('POST', `/matchmaking/action?user_id=${S.uid}&candidate_id=${cid}&action=LIKE`);
    if (r.ok) {
      const d = await r.json();
      if (d.status === 'MATCHED') matchData = d;
    }
  } catch {}

  const score   = matchData?.match_data?.score   ?? matchData?.score   ?? cData?.sc  ?? 85;
  const name    = matchData?.match_data?.name     ?? matchData?.name    ?? cData?.n   ?? 'Calon';
  const verdict = matchData?.match_data?.verdict  ?? cData?.vd ?? 'Keserasian berdasarkan analisis AI.';
  const mid     = matchData?.match_data?.match_id ?? matchData?.match_id ?? ('mid_' + Date.now());
  const photo   = matchData?.match_data?.photo    ?? cData?.photo ?? null;
  const traits  = matchData?.match_data?.traits   ?? cData?.traits ?? [];
  const match   = { id: mid, name, score, photo, traits };

  if (score >= 90) {
    // High match — go straight to chat
    _registerMatch(match);
    openChat(match);
  } else {
    // Low match — show decision popup
    showLowMatchPopup(match, verdict);
  }
}

function _registerMatch(match) {
  S.activeMatch = match;
  if (!S.matches.find(m => m.id === match.id)) { S.matches.push(match); save(); }
  const dot = document.getElementById('chat-dot'); if (dot) dot.style.display = 'block';
}

function showLowMatchPopup(match, verdict) {
  const T = (typeof LANG !== 'undefined' && LANG[CL]) ? LANG[CL] : {};
  const existing = document.getElementById('ov-lowmatch');
  if (existing) existing.remove();

  const ov = document.createElement('div');
  ov.className = 'ov show'; ov.id = 'ov-lowmatch';
  ov.innerHTML = `<div class="modal tc" style="max-width:340px">
    <div style="font-size:44px;margin-bottom:8px">🤔</div>
    <h3 class="serif" style="font-size:20px;margin-bottom:6px">${T['lowmatch-title'] || 'Padanan Sederhana'}</h3>
    <p style="font-size:13px;color:var(--t2);margin-bottom:10px;font-weight:500">${esc(match.name)}</p>
    <div style="background:rgba(0,0,0,.3);border-radius:12px;padding:14px;margin-bottom:10px">
      <span class="serif" style="font-size:32px;font-weight:800;color:var(--orange)">${match.score}%</span>
      <div style="font-size:10px;color:var(--t3);margin-top:2px">Keserasian</div>
    </div>
    <div class="ai-box" style="text-align:left;margin-bottom:14px">
      <div class="ai-lbl">AI ANALISIS</div>
      <p style="font-size:11px;color:var(--t2);font-style:italic;line-height:1.55">${esc(verdict)}</p>
    </div>
    <p style="font-size:12px;color:var(--t2);line-height:1.65;margin-bottom:16px">${T['lowmatch-body'] || 'AI mengesyorkan padanan 90% ke atas.'}</p>
    <div class="col g8">
      <button class="btn btn-p" id="lowmatch-yes">${T['lowmatch-confirm'] || 'Ya, teruskan berbual →'}</button>
      <button id="lowmatch-no" style="padding:10px;font-size:12px;color:var(--t3)">${T['lowmatch-skip'] || 'Tidak, cari padanan lebih baik'}</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  document.getElementById('lowmatch-yes').onclick = () => { ov.remove(); _registerMatch(match); openChat(match); };
  document.getElementById('lowmatch-no').onclick  = () => ov.remove();
}

// Legacy showMatch — still used if ov-match overlay is triggered elsewhere
function showMatch(d) {
  const name    = d.match_data?.name    || d.name    || 'Padanan Baru';
  const score   = d.match_data?.score   || d.score   || 0;
  const verdict = d.match_data?.verdict || d.verdict || 'Keserasian tinggi berdasarkan analisis psikometrik anda.';
  const mid     = d.match_data?.match_id || d.match_id;
  const photo   = d.match_data?.photo   || null;
  const traits  = d.match_data?.traits  || [];
  document.getElementById('m-name').textContent = name;
  document.getElementById('m-score').textContent = score + '%';
  document.getElementById('m-verdict').textContent = verdict;
  const mbdg = document.getElementById('m-match-badge');
  if (mbdg) mbdg.innerHTML = score >= 90 ? '<span class="bmatch-best">⭐ PADANAN TERBAIK</span>' : '<span class="bmatch-rec">✓ DISYORKAN</span>';
  const match = { id: mid, name, score, photo, traits };
  _registerMatch(match);
  openOv('ov-match');
}
function closeMatchGo() { closeOv('ov-match'); openChat(S.activeMatch); }

function updateNextReset() {
  const el = document.getElementById('next-rf'); if (!el) return;
  const now = new Date(), next = new Date(now);
  next.setHours(DAILY_RESET_HOUR, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const ms = next - now, h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4);
  el.textContent = h + 'J ' + pad(m) + 'M';
}