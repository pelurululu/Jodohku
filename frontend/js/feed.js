// ══════════ WINGMAN AI (SANTAI & KELAKAR) ══════════
function wingmanAnalysis(occupation, education, status) {
  const lines = {
    'Doktor/Medikal':   `Dia ni Doktor bro 👨‍⚕️ — poket dalam, jam kerja gila-gila. Kalau kau jenis sabar tunggu dia balik on-call, confirm berbaloi. Belum kawin pun dah ada "insurance" hidu hospital! Standard dia tinggi, tapi kalau dia minat kau, memang dia serius.`,
    'Jurutera':         `Engineer ni! 🔧 Jenis kira-kira semua benda — dari bolt rumah sampai hati orang. Dia tak banyak cakap tapi bila cakap, make sense. Kalau kau suka lelaki/wanita yang problem-solver, ini dia. Silap-silap letak IKEA pun dia buat sendiri.`,
    'Akauntan':         `Akauntan! 📊 Mesti jenis kira sen-sen masa dating, tapi confirm masa depan terjamin. Budget honeymoon dah ada dalam spreadsheet dua tahun sebelum tunang. Kalau kau suka orang yang financial stable, ini jackpot.`,
    'Pensyarah':        `Pensyarah ni 📚 — otak bertahap lain. Suka berdebat pasal idea besar, holiday pun nak ke muzium. Tapi bila dia sayang, dia akan "ajar" kau macam mana nak bahagia. Nota percuma seumur hidup!`,
    'Sales/Marketing':  `Sales Exec! 🎯 Mulut manis, pandai pujuk — kau pun tak sedar dah setuju nak kahwin masa makan malam pertama. Serius tapi, diorang ni pandai bergaul dan confident. Kalau kau kena "close" oleh dia, anggap rezeki.`,
    'Business':         `Usahawan ni boss! 💼 Mindset lain dari orang lain. Hidup dia roller-coaster — bulan ni untung, bulan depan pivot. Kalau kau jenis nak stability 9-to-5, fikir dua kali. Tapi kalau kau suka partner yang ada vision dan berani, ini dia.`,
    'Peguam':           `Peguam! ⚖️ Bila argue, memang tak boleh menang. Dia ingat semua benda yang kau cakap — termasuk janji-janji romantik. Tapi bila dia bela kau, memang 100%. Prenup pun dia buat sendiri.`,
    'Sektor Awam':      `Penjawat Awam! 🏛️ Gaji tetap, cuti banyak, pencen ada. Jenis yang kau bawa jumpa mak ayah, confirm approve dalam 5 minit. Kalau kau nak hidup tenang dan stable, ini pilihan premium.`,
  };
  const edLines = {
    'PhD':        'Otak bergeliga gila',
    'Master':     'Educated & ambitious',
    'Degree':     'Solid foundation',
    'Diploma':    'Practical & hands-on',
    'Profesional':'Kelayakan kelas pertama',
    'SPM':        'Street smart, life experience',
  };
  const stLines = {
    'Bujang': 'Baru nak start chapter baru',
    'Janda':  'Matang, tahu apa dia nak',
    'Duda':   'Berpengalaman, serius mencari',
    'Ibu Tunggal': 'Kuat & independent, hati besar',
    'Bapa Tunggal': 'Responsible, sayangkan keluarga',
  };
  const base = lines[occupation] || `Dia kerja dalam bidang ${occupation}. Nampak serius dan committed dalam kerjaya.`;
  const edNote = edLines[education] ? ` (${edLines[education]})` : '';
  const stNote = stLines[status] ? ` Status: ${stLines[status]}.` : '';
  return base + edNote + stNote;
}

// ══════════ MOCK DATA ══════════
const MOCK_F = [
  { id: 'f1', n: 'Cik Puan Sarah (#JDK-9120)', age: 32, st: 'Janda', tier: 'Gold', sc: 94, vd: 'Kematangan emosi sangat tinggi. Nilai kekeluargaan, solat 5 waktu, dan gaya komunikasi yang lemah lembut menjadikan beliau sangat serasi. Minat bersama dalam memasak dan membaca buku agama menambah keserasian. Seorang yang penyabar, rajin memasak, suka berkebun dan menjaga kebersihan rumah.', traits: ['Penyabar', 'Rajin Memasak', 'Suka Membaca', 'Kemas'], photo: null },
  { id: 'f2', n: 'Cik Puan Nurul (#JDK-4055)', age: 28, st: 'Bujang', tier: 'Silver', sc: 88, vd: 'Visi masa depan yang selaras — kedua-dua mengutamakan pendidikan anak dan kestabilan kewangan. Gaya pemikiran analitikal dan suka merancang. Gemar memasak masakan Melayu, membaca novel dan mengemaskini diri melalui kursus dalam talian.', traits: ['Perancang', 'Analitikal', 'Suka Belajar', 'Kreatif'], photo: null },
  { id: 'f3', n: 'Cik Puan Aisyah (#JDK-7203)', age: 35, st: 'Janda', tier: 'Gold', sc: 85, vd: 'Pengalaman hidup saling melengkapi. Kestabilan kewangan dan emosi yang matang. Gemar mengembara, suka minum teh herba, dan aktif dalam aktiviti komuniti. Seorang yang dermawan dan mudah mesra.', traits: ['Dermawan', 'Mesra', 'Suka Mengembara', 'Aktif Komuniti'], photo: null },
  { id: 'f4', n: 'Cik Puan Hafizah (#JDK-2891)', age: 30, st: 'Bujang', tier: 'Gold', sc: 82, vd: 'Keserasian dalam gaya hidup sihat — kedua-dua mengamalkan pemakanan seimbang. Suka bersenam pagi, minum air kosong, dan gemar memasak sendiri. Personaliti yang ceria dan optimis.', traits: ['Optimis', 'Sihat', 'Ceria', 'Disiplin'], photo: null },
  { id: 'f5', n: 'Cik Puan Rozita (#JDK-5514)', age: 38, st: 'Janda', tier: 'Platinum', sc: 80, vd: 'Kematangan emosi tinggi dan sangat menjaga privasi. Gemar membaca buku motivasi, suka minum kopi, dan menghabiskan masa dengan keluarga pada hujung minggu. Seorang yang setia dan berkira-kira dalam kewangan.', traits: ['Setia', 'Bijak Kewangan', 'Introvert', 'Penyayang'], photo: null }
];
const MOCK_M = [
  { id: 'm1', n: 'Encik Ahmad (#JDK-4421)', age: 34, st: 'Bujang', tier: 'Gold', sc: 93, vd: 'Kestabilan profesional dan spiritual yang tinggi. Solat 5 waktu, gemar membaca al-Quran, dan seorang jurutera yang berkerjaya stabil. Suka memasak pada hujung minggu, gemar memancing, dan sangat bertanggungjawab terhadap keluarga.', traits: ['Bertanggungjawab', 'Spiritual', 'Kerjaya Stabil', 'Suka Memasak'], photo: null },
  { id: 'm2', n: 'Encik Hakim (#JDK-6630)', age: 29, st: 'Bujang', tier: 'Silver', sc: 87, vd: 'Muda tetapi sangat matang dari segi emosi. Gemar membaca buku pembangunan diri, suka bermain sukan, dan sangat menjaga kesihatan. Minum air kosong dan jarang makan di luar. Berkomunikasi dengan baik dan suka merancang.', traits: ['Matang', 'Sportif', 'Perancang', 'Komunikatif'], photo: null },
  { id: 'm3', n: 'Encik Faris (#JDK-1182)', age: 37, st: 'Duda', tier: 'Gold', sc: 84, vd: 'Pengalaman lampau memperkuatkan kefahaman perhubungan. Seorang usahawan yang stabil, gemar mengembara bersama keluarga, dan menikmati masakan kampung. Suka minum teh tarik pagi dan petang.', traits: ['Usahawan', 'Pengembara', 'Penyayang Keluarga', 'Stabil'], photo: null },
  { id: 'm4', n: 'Encik Rizal (#JDK-8845)', age: 32, st: 'Bujang', tier: 'Silver', sc: 81, vd: 'Potensi yang sangat baik untuk membina rumah tangga. Suka memasak, gemar membaca buku sejarah, dan aktif dalam persatuan sukarelawan. Gaya pemikiran yang terbuka dan toleran.', traits: ['Sukarelawan', 'Toleran', 'Suka Sejarah', 'Rajin'], photo: null },
  { id: 'm5', n: 'Encik Haziq (#JDK-3309)', age: 40, st: 'Duda', tier: 'Platinum', sc: 80, vd: 'Matang, stabil, dan mengutamakan kualiti dalam perhubungan. Gemar berkebun, menikmati kopi pagi, suka menonton dokumentari, dan sangat menjaga kebersihan diri. Seorang yang pendiam tetapi sangat penyayang.', traits: ['Pendiam', 'Penyayang', 'Kemas', 'Berkebun'], photo: null }
];

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
  try { const r = await apiCall('GET', `/matchmaking/daily-feed/${S.uid}`); if (r.ok) { const d = await r.json(); feed = (d.feed || []).map(mapCandidate); } } catch {}
  if (!feed.length) feed = S.gender === 'Perempuan' ? [...MOCK_M] : [...MOCK_F];

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

function mapCandidate(c) {
  return { id: c.candidate_id, n: c.display_name, age: c.age, st: c.status, tier: c.tier, sc: c.compatibility_score, vd: c.ai_verdict, traits: c.traits || [], photo: c.photo_url || null };
}

function buildCard(c, i) {
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
        <button onclick="doAction('${c.id}','PASS',${i})" style="flex:1;padding:13px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.07);border-radius:12px;font-size:12px;font-weight:600;color:var(--t2);transition:var(--trans)">Tolak</button>
        <button onclick="doAction('${c.id}','LIKE',${i})" style="flex:1.7;padding:13px;background:linear-gradient(135deg,var(--gold),var(--gdark));border-radius:12px;font-size:12px;font-weight:800;color:#000;box-shadow:0 2px 14px rgba(201,168,76,.2);transition:var(--trans)">Suka Calon ✨</button>
      </div>
    </div>
  </div>`;
}

// ══════════ CHANGED: doAction, showMatch, closeMatchGo ══════════
async function doAction(cid, action, idx) {
  const el = document.getElementById('cc' + idx);
  if (el) { el.style.opacity = '.2'; el.style.transform = 'scale(.97)'; el.style.pointerEvents = 'none'; }
  // Grab candidate data before removing from feed
  const cData = S.feed.find(c => c.id === cid) || null;
  S.feed = S.feed.filter(c => c.id !== cid);
  setTimeout(() => { if (el) el.remove(); if (!document.getElementById('f-cards').children.length) { document.getElementById('f-cards').style.display = 'none'; document.getElementById('f-lock').style.display = 'block'; } }, 280);

  if (action === 'PASS') return;

  // LIKE — try backend first
  let matchedData = cData;
  try {
    const r = await apiCall('POST', `/matchmaking/action?user_id=${S.uid}&candidate_id=${cid}&action=${action}`);
    if (r.ok) { const d = await r.json(); if (d.status === 'MATCHED') { matchedData = d.match_data || cData; } }
  } catch {}

  // Fallback to mock data
  if (!matchedData) {
    const all = [...MOCK_F, ...MOCK_M];
    matchedData = all.find(x => x.id === cid) || { id: cid, n: 'Calon VVIP', sc: 88, vd: 'Keserasian tinggi.', traits: [] };
  }

  const score = matchedData.sc || matchedData.score || 88;
  const mid = 'mid_' + Date.now();

  if (score < 90) {
    // Show popup — let user decide
    showLowMatchPopup(cid, mid, score, matchedData);
  } else {
    // 90%+ — go straight to chat
    showMatch(cid, mid, matchedData);
    openChat(S.activeMatch);
  }
}

function showLowMatchPopup(cid, mid, score, cData) {
  const name = cData ? (cData.n || cData.name || 'Calon ini') : 'Calon ini';
  const existing = document.getElementById('ov-lowmatch');
  if (existing) existing.remove();
  const ov = document.createElement('div');
  ov.className = 'ov show'; ov.id = 'ov-lowmatch';
  ov.innerHTML = `<div class="modal tc" style="max-width:340px;text-align:center">
    <div style="font-size:44px;margin-bottom:8px">🤔</div>
    <h3 class="serif" style="font-size:20px;margin-bottom:4px">Padanan Sederhana</h3>
    <p style="font-size:13px;color:var(--t2);margin-bottom:10px">${esc(name)}</p>
    <div style="background:rgba(0,0,0,.3);border-radius:12px;padding:14px;margin-bottom:14px">
      <span class="serif" style="font-size:32px;font-weight:800;color:var(--orange)">${score}%</span>
      <div style="font-size:10px;color:var(--t3);margin-top:2px">Keserasian di bawah 90%</div>
    </div>
    <p style="font-size:12px;color:var(--t2);line-height:1.65;margin-bottom:16px">AI mengesyorkan padanan 90% ke atas. Anda masih boleh berbual — pilihan ada pada anda.</p>
    <div class="col g8">
      <button class="btn btn-p" onclick="confirmLowMatch('${mid}','${cid}')">Ya, teruskan berbual →</button>
      <button onclick="document.getElementById('ov-lowmatch').remove()" style="padding:10px;font-size:12px;color:var(--t3)">Tidak, cari padanan lebih baik</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  // Store pending match data
  S._pendingLowMatch = { mid, cid, score, cData };
}

function confirmLowMatch(mid, cid) {
  document.getElementById('ov-lowmatch').remove();
  const { cData } = S._pendingLowMatch || {};
  showMatch(cid, mid, cData);
  openChat(S.activeMatch);
}

function showMatch(cid, mid, cObj) {
  const all = [...MOCK_F, ...MOCK_M];
  const c = cObj || all.find(x => x.id === cid) || { n: 'Calon VVIP', sc: 88, vd: 'Keserasian tinggi.', traits: [] };
  const nm = c.name || c.n || 'Calon VVIP';
  const sc = c.score || c.sc || 88;
  const vd = c.verdict || c.vd || 'Keserasian tinggi.';
  S.activeMatch = { id: mid, name: nm, score: sc, photo: c.photo_url || c.photo || null, traits: c.traits || [] };
  if (!S.matches.find(m => m.id === mid)) { S.matches.push({ id: mid, name: nm, score: sc, photo: c.photo_url || c.photo || null, traits: c.traits || [] }); save(); }
  document.getElementById('chat-dot').style.display = 'block';
}

// closeMatchGo still works if ov-match is shown elsewhere
function closeMatchGo() { closeOv('ov-match'); openChat(S.activeMatch); }

function updateNextReset() {
  const el = document.getElementById('next-rf'); if (!el) return;
  const now = new Date(), next = new Date(now);
  next.setHours(DAILY_RESET_HOUR, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const ms = next - now, h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4);
  el.textContent = h + 'J ' + pad(m) + 'M';
}