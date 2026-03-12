/* ============================================================
   JODOHKU FRONTEND JAVASCRIPT
   File: js/app.js
   Versi: 2.0.0 (Fixed & Production-Ready)
============================================================ */

// TODO: Tukar kepada URL sebenar dalam production (e.g. 'https://jodohku-api.onrender.com/api')
const API = 'https://jodohku-api.onrender.com/api';

/* ── STATE ── */
let appState = {
  token: localStorage.getItem('jk_token') || null,
  user:  JSON.parse(localStorage.getItem('jk_user') || 'null'),
  currentTab: 'discover',
  currentMatch: null,
  quizQuestions: [],
  quizAnswers: {},
  quizIndex: 0,
  tempToken: null,
  socket: null,
  trialTimer: null,
  resetTimer: null,
  resendTimer: null,
  otpEmail: '',
};

/* ============================================================
   INIT
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (appState.token && appState.user) {
    initApp();
  } else {
    showPage('page-landing');
    fetchPioneerCount();
  }
});

function initApp() {
  document.getElementById('page-landing').classList.remove('active');
  document.getElementById('page-register').classList.remove('active');
  document.getElementById('page-login').classList.remove('active');
  document.getElementById('page-quiz').classList.remove('active');
  document.getElementById('main-app').classList.add('active');
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
  appState.currentTab = tab;
  const tabs = ['discover','chat','stats','premium','profile'];
  tabs.forEach(t => {
    document.getElementById(`tab-${t}`).style.display = t === tab ? 'block' : 'none';
    document.getElementById(`nav-${t}`)?.classList.toggle('active', t === tab);
  });
  if (tab === 'discover') loadDiscover();
  if (tab === 'chat') loadChats();
  if (tab === 'stats') loadStats();
}

/* ============================================================
   TOAST NOTIFICATIONS
============================================================ */
function toast(msg, type='info') {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  const container = document.getElementById('toast-container');
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ============================================================
   API HELPER
============================================================ */
async function api(method, endpoint, body, isFormData=false) {
  const headers = {};
  if (appState.token) headers['Authorization'] = `Bearer ${appState.token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (body) opts.body = isFormData ? body : JSON.stringify(body);

  try {
    const res = await fetch(`${API}${endpoint}`, opts);
    const data = await res.json();
    if (!res.ok && data.error) return { success:false, error:data.error, status:res.status };
    return data;
  } catch(e) {
    return { success:false, error:'Tiada sambungan ke pelayan. Sila cuba lagi.' };
  }
}

/* ============================================================
   PIONEER COUNT
============================================================ */
async function fetchPioneerCount() {
  const data = await api('GET', '/pioneer');
  if (data.success) {
    document.getElementById('pioneer-count').textContent = data.remaining.toLocaleString();
  }
}

/* ============================================================
   REGISTER — STEP 1
============================================================ */
async function submitStep1() {
  const phone    = document.getElementById('reg-phone').value.trim();
  const nickname = document.getElementById('reg-nickname').value.trim();
  const dob      = document.getElementById('reg-dob').value;
  const gender   = document.getElementById('reg-gender').value;
  const status   = document.getElementById('reg-status').value;
  const income   = document.getElementById('reg-income').value;

  clearErrors();
  let valid = true;

  if (!phone || phone.length < 9)         { showError('err-phone', 'Nombor telefon tidak sah'); valid=false; }
  if (!nickname || nickname.length < 2)   { showError('err-nickname', 'Nama panggilan terlalu pendek'); valid=false; }
  if (!dob)                               { showError('err-dob', 'Tarikh lahir diperlukan'); valid=false; }
  if (!gender)                            { showError('err-gender', 'Sila pilih jantina'); valid=false; }
  if (!income)                            { showError('err-income', 'Sila pilih pendapatan'); valid=false; }
  if (!valid) return;

  setLoading('btn-step1', true);
  const res = await api('POST', '/auth/register/step1', { phone, nickname, dob, gender, status, income });
  setLoading('btn-step1', false);

  if (!res.success) {
    if (res.error?.includes('telefon')) showError('err-phone', res.error);
    else toast(res.error, 'error');
    return;
  }

  appState.tempToken = res.tempToken;
  showRegStep(2);
}

/* ── REGISTER STEP 2 ── */
async function submitStep2() {
  const email   = document.getElementById('reg-email').value.trim();
  const state   = document.getElementById('reg-state').value;
  const ic_last4= document.getElementById('reg-ic').value.trim();
  const captcha = document.getElementById('captcha-check').checked;

  clearErrors();
  let valid = true;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('err-email','Format email tidak sah'); valid=false; }
  if (!state)                             { showError('err-state','Sila pilih negeri'); valid=false; }
  if (!ic_last4 || !/^\d{4}$/.test(ic_last4)) { showError('err-ic','Masukkan 4 digit terakhir IC yang sah'); valid=false; }
  if (!captcha)                           { showError('err-captcha','Sila sahkan anda bukan robot'); valid=false; }
  if (!valid) return;

  setLoading('btn-step2', true);
  const res = await api('POST', '/auth/register/step2', {
    tempToken: appState.tempToken, email, state, ic_last4, captchaPass:true
  });
  setLoading('btn-step2', false);

  if (!res.success) {
    if (res.error?.includes('email')) showError('err-email', res.error);
    else toast(res.error, 'error');
    return;
  }

  appState.tempToken = res.tempToken;
  showRegStep(3);
}

/* ── REGISTER STEP 3 ── */
async function submitStep3() {
  const terms = document.getElementById('reg-terms').checked;
  if (!terms) { showError('err-terms','Anda perlu bersetuju dengan Terma & Syarat'); return; }

  const photoInput = document.getElementById('photo-input');
  const formData = new FormData();
  formData.append('tempToken', appState.tempToken);
  formData.append('agreeTerms', 'true');
  if (photoInput.files[0]) formData.append('photo', photoInput.files[0]);

  setLoading('btn-step3', true);
  const res = await api('POST', '/auth/register/step3', formData, true);
  setLoading('btn-step3', false);

  if (!res.success) { toast(res.error, 'error'); return; }

  appState.token = res.token;
  localStorage.setItem('jk_token', res.token);
  toast(res.message, 'success');

  // Load user
  const profile = await api('GET', '/profile');
  if (profile.success) {
    appState.user = profile.user;
    localStorage.setItem('jk_user', JSON.stringify(profile.user));
  }

  initApp();
}

function showRegStep(n) {
  [1,2,3].forEach(i => {
    const el = document.getElementById(`reg-step-${i}`);
    if (el) el.classList.toggle('hidden', i !== n);
  });
}

/* ── CAPTCHA Simulasi ── */
function toggleCaptcha() {
  const cb = document.getElementById('captcha-check');
  if (!cb.checked) {
    setTimeout(() => {
      cb.checked = true;
      document.getElementById('captcha-text').textContent = '✅ Bukan robot';
    }, 800);
  }
}

/* ============================================================
   OTP LOGIN
============================================================ */
async function sendOTP() {
  const email = document.getElementById('login-email').value.trim();
  clearErrors();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('err-login-email','Format email tidak sah');
    return;
  }

  setLoading('btn-send-otp', true);
  const res = await api('POST', '/auth/otp/send', { email });
  setLoading('btn-send-otp', false);

  if (!res.success) {
    showError('err-login-email', res.error);
    return;
  }

  appState.otpEmail = email;
  document.getElementById('otp-email-display').textContent = email.replace(/(.{2}).*(@.*)/, '$1***$2');
  document.getElementById('login-email-step').classList.add('hidden');
  document.getElementById('login-otp-step').classList.remove('hidden');
  document.querySelectorAll('.otp-digit')[0].focus();

  // Dev mode: auto-fill OTP jika ada dalam response
  if (res.dev_otp) {
    toast(`[DEV] OTP: ${res.dev_otp}`, 'info');
    const digits = res.dev_otp.split('');
    document.querySelectorAll('.otp-digit').forEach((el,i) => {
      el.value = digits[i] || '';
      if (digits[i]) el.classList.add('filled');
    });
    checkOTPComplete();
  }

  startResendTimer(60);
  toast(res.message, 'success');
}

async function verifyOTP() {
  const digits = [...document.querySelectorAll('.otp-digit')].map(d=>d.value).join('');
  if (digits.length < 6) { toast('Sila masukkan 6 digit OTP', 'warning'); return; }

  setLoading('btn-verify-otp', true);
  const res = await api('POST', '/auth/otp/verify', { email: appState.otpEmail, otp: digits });
  setLoading('btn-verify-otp', false);

  if (!res.success) {
    toast(res.error, 'error');
    // Highlight error
    document.querySelectorAll('.otp-digit').forEach(d => d.style.borderColor='var(--danger)');
    setTimeout(() => document.querySelectorAll('.otp-digit').forEach(d => {
      d.style.borderColor=''; d.value=''; d.classList.remove('filled');
    }), 1000);
    return;
  }

  appState.token = res.token;
  appState.user  = res.user;
  localStorage.setItem('jk_token', res.token);
  localStorage.setItem('jk_user', JSON.stringify(res.user));
  toast('Selamat datang kembali! 👋', 'success');
  initApp();
}

function otpInput(el, idx) {
  el.value = el.value.replace(/\D/g,'').slice(-1);
  if (el.value) {
    el.classList.add('filled');
    const next = document.querySelectorAll('.otp-digit')[idx+1];
    if (next) next.focus();
  }
  checkOTPComplete();
}

function otpKeydown(el, idx) {
  if (event.key === 'Backspace' && !el.value) {
    const prev = document.querySelectorAll('.otp-digit')[idx-1];
    if (prev) { prev.value=''; prev.classList.remove('filled'); prev.focus(); }
  }
}

function checkOTPComplete() {
  const all = [...document.querySelectorAll('.otp-digit')].map(d=>d.value).join('');
  document.getElementById('btn-verify-otp').disabled = all.length < 6;
}

async function resendOTP() {
  document.getElementById('btn-resend').disabled = true;
  const res = await api('POST', '/auth/otp/send', { email: appState.otpEmail });
  if (res.success) {
    toast('OTP baru dihantar!', 'success');
    startResendTimer(60);
    document.querySelectorAll('.otp-digit').forEach(d => { d.value=''; d.classList.remove('filled'); });
    document.getElementById('btn-verify-otp').disabled = true;

    if (res.dev_otp) {
      toast(`[DEV] OTP: ${res.dev_otp}`, 'info');
      const digits = res.dev_otp.split('');
      document.querySelectorAll('.otp-digit').forEach((el,i) => {
        el.value = digits[i]||''; if(digits[i]) el.classList.add('filled');
      });
      checkOTPComplete();
    }
  } else {
    toast(res.error, 'error');
  }
}

function startResendTimer(seconds) {
  let s = seconds;
  const btn = document.getElementById('btn-resend');
  const count = document.getElementById('resend-countdown');
  btn.disabled = true;
  clearInterval(appState.resendTimer);
  appState.resendTimer = setInterval(() => {
    s--;
    count.textContent = `Cuba semula dalam ${s}s`;
    if (s <= 0) {
      clearInterval(appState.resendTimer);
      count.textContent = '';
      btn.disabled = false;
    }
  }, 1000);
}

/* ============================================================
   USER PROFILE LOAD
============================================================ */
async function loadUserProfile() {
  const res = await api('GET', '/profile');
  if (!res.success) { if(res.status===401) logout(); return; }

  appState.user = res.user;
  localStorage.setItem('jk_user', JSON.stringify(res.user));
  renderUserUI(res.user);
  loadDiscover();
  loadChats();
}

function renderUserUI(user) {
  if (!user) return;

  // Avatar
  const avatarImg = document.getElementById('nav-avatar-img');
  if (user.profile_photo) {
    avatarImg.src = `http://localhost:3001${user.profile_photo}`;
    document.getElementById('profile-photo').src = avatarImg.src;
    document.getElementById('profile-avatar-emoji').style.display='none';
  }

  // Tier badge
  const badge = document.getElementById('nav-tier-badge');
  badge.textContent = (user.tier||'percuma').toUpperCase();
  badge.className = `tier-badge tier-${user.tier||'percuma'}`;

  // Trial bar
  if (user.trial_end) {
    document.getElementById('trial-bar').classList.remove('hidden');
    startTrialCountdown(new Date(user.trial_end));
  }

  // Profile page
  document.getElementById('profile-name').textContent = user.nickname || '—';
  const age = user.dob ? Math.floor((Date.now()-new Date(user.dob))/(365.25*24*60*60*1000)) : '—';
  document.getElementById('profile-meta').textContent = `${age} tahun • ${user.state||'—'} • ${user.gender==='lelaki'?'Lelaki':'Perempuan'}`;
  document.getElementById('profile-ici').textContent = user.ici_score ? `${user.ici_score}/10` : '—';
  document.getElementById('profile-credits').textContent = user.message_credits || 0;
  document.getElementById('info-sub-status').textContent = user.subscription_end ? 'Aktif' : (user.trial_end ? 'Trial' : 'Percuma');
  document.getElementById('info-tier').textContent = (user.tier||'percuma').charAt(0).toUpperCase()+(user.tier||'percuma').slice(1);
  document.getElementById('info-sub-end').textContent = user.subscription_end ? new Date(user.subscription_end).toLocaleDateString('ms-MY') : '—';
  document.getElementById('info-ic-status').innerHTML = user.ic_verified
    ? '<span class="verified-tag">✓ Disahkan</span>'
    : '<span class="pending-tag">⏳ Menunggu</span>';
  document.getElementById('info-quiz-status').innerHTML = user.dimension_data
    ? '<span class="verified-tag">✓ Selesai</span>'
    : '<span class="pending-tag">Belum selesai</span>';
}

/* ============================================================
   DISCOVER
============================================================ */
async function loadDiscover() {
  document.getElementById('discover-loading').style.display='block';
  document.getElementById('candidates-list').innerHTML='';
  document.getElementById('discover-empty').classList.add('hidden');

  const res = await api('GET', '/discover');
  document.getElementById('discover-loading').style.display='none';

  if (!res.success) { toast(res.error,'error'); return; }

  if (!res.candidates || res.candidates.length === 0) {
    document.getElementById('discover-empty').classList.remove('hidden');
    document.getElementById('discover-empty-msg').textContent =
      res.reason === 'quiz_incomplete'
        ? 'Sila lengkapkan Ujian 30 Dimensi untuk mendapat padanan AI yang tepat.'
        : 'Tiada calon baru hari ini. Calon baru hadir esok jam 8:00 PG.';
    return;
  }

  const list = document.getElementById('candidates-list');
  res.candidates.forEach(c => {
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.innerHTML = `
      <div class="candidate-avatar">
        ${c.photo
          ? `<img src="http://localhost:3001${c.photo}" onerror="this.style.display='none'">`
          : '👤'}
      </div>
      <div class="candidate-info">
        <div class="candidate-name">${escHtml(c.nickname)}</div>
        <div class="candidate-meta">${c.age} tahun • ${escHtml(c.state)} • <span class="tier-badge tier-${c.tier}" style="font-size:9px">${(c.tier||'').toUpperCase()}</span></div>
        <div>
          <span class="match-score-badge ${c.match_score>=90?'score-high':'score-mid'}">
            💕 ${c.match_score}% Keserasian
          </span>
        </div>
        ${c.ai_summary ? `<div class="candidate-summary">${escHtml(c.ai_summary)}</div>` : ''}
      </div>
      <div class="chat-btn" onclick="startChat('${c.id}','${escHtml(c.nickname)}','${c.photo||''}');event.stopPropagation()">→</div>
    `;
    list.appendChild(card);
  });
}

/* ============================================================
   CHAT LIST
============================================================ */
async function loadChats() {
  document.getElementById('chat-loading').style.display='block';
  document.getElementById('chat-list').innerHTML='';
  document.getElementById('chat-empty').classList.add('hidden');

  const res = await api('GET', '/matches');
  document.getElementById('chat-loading').style.display='none';

  if (!res.success) return;

  const list = document.getElementById('chat-list');
  if (!res.matches || res.matches.length===0) {
    document.getElementById('chat-empty').classList.remove('hidden');
    return;
  }

  // Update unread badge
  const totalUnread = res.matches.reduce((s,m)=>s+(m.unread||0),0);
  const badge = document.getElementById('chat-badge');
  if (totalUnread > 0) { badge.textContent = totalUnread; badge.classList.add('show'); }
  else badge.classList.remove('show');

  res.matches.forEach(m => {
    const timeStr = m.last_chat ? formatTime(new Date(m.last_chat)) : '';
    const item = document.createElement('div');
    item.className = 'chat-item';
    item.onclick = () => openChatRoom(m.id, m.partner_name, m.partner_photo, m.partner_tier);
    item.innerHTML = `
      <div class="chat-avatar-wrap">
        <div class="chat-avatar">
          ${m.partner_photo
            ? `<img src="http://localhost:3001${m.partner_photo}" onerror="this.style.display='none'">`
            : '👤'}
        </div>
      </div>
      <div class="chat-info">
        <div class="chat-name">${escHtml(m.partner_name||'—')}</div>
        <div class="chat-last">${escHtml(m.last_message||'Mulakan perbualan...')}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
        <div class="chat-time">${timeStr}</div>
        ${m.unread>0 ? `<div class="unread-badge">${m.unread}</div>` : ''}
      </div>
    `;
    list.appendChild(item);
  });
}

/* ============================================================
   START CHAT (from Discover)
============================================================ */
async function startChat(targetId, name, photo) {
  const res = await api('POST', '/matches/create', { targetUserId: targetId });
  if (!res.success) { toast(res.error,'error'); return; }
  openChatRoom(res.match_id, name, photo);
}

/* ============================================================
   CHAT ROOM
============================================================ */
function openChatRoom(matchId, partnerName, partnerPhoto, partnerTier) {
  appState.currentMatch = matchId;

  document.getElementById('room-partner-name').textContent = partnerName || '—';
  document.getElementById('room-partner-status').textContent = '● Dalam talian';

  const partnerPhoto_el = document.getElementById('room-partner-photo');
  if (partnerPhoto) {
    partnerPhoto_el.src = `http://localhost:3001${partnerPhoto}`;
    document.getElementById('room-partner-emoji').style.display='none';
  } else {
    partnerPhoto_el.style.display='none';
    document.getElementById('room-partner-emoji').style.display='';
  }

  document.getElementById('chat-room').classList.add('open');
  loadMessages(matchId);

  // Join Socket.IO room
  if (appState.socket) appState.socket.emit('join_match', matchId);
}

function closeChatRoom() {
  document.getElementById('chat-room').classList.remove('open');
  appState.currentMatch = null;
}

async function loadMessages(matchId) {
  const res = await api('GET', `/messages/${matchId}`);
  if (!res.success) { toast(res.error,'error'); return; }

  const container = document.getElementById('chat-messages');
  container.innerHTML='';

  res.messages.forEach(msg => appendMessage(msg, msg.sender_id === appState.user?.id));

  container.scrollTop = container.scrollHeight;

  // Kredit indicator
  updateCreditsUI(res.user_credits, res.user_tier);

  // Upgrade prompt
  if (res.user_credits === 0 && (res.user_tier==='silver'||res.user_tier==='percuma')) {
    document.getElementById('upgrade-prompt').classList.add('show');
    document.getElementById('send-btn').disabled = true;
    document.getElementById('chat-input').disabled = true;
  }
}

function appendMessage(msg, isSent) {
  const container = document.getElementById('chat-messages');
  const row = document.createElement('div');
  row.className = isSent ? 'msg-sent-row' : 'msg-recv-row';
  const time = msg.created_at ? formatTime(new Date(msg.created_at)) : '';
  row.innerHTML = `
    <div class="msg-bubble ${isSent?'sent':'received'}">
      ${escHtml(msg.content)}
      <div class="msg-time">${time}</div>
    </div>
  `;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function updateCreditsUI(credits, tier) {
  const el = document.getElementById('room-credits');
  if (tier==='gold'||tier==='platinum'||tier==='sovereign') {
    el.textContent = '∞ Tanpa had';
    el.className = 'credits-indicator';
  } else {
    el.textContent = `${credits}/10 kredit`;
    el.className = `credits-indicator ${credits<=3 ? (credits===0?'empty':'low') : ''}`;
  }
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const content = input.value.trim();
  if (!content || !appState.currentMatch) return;

  document.getElementById('send-btn').disabled = true;
  const res = await api('POST', `/messages/${appState.currentMatch}`, { content });
  document.getElementById('send-btn').disabled = false;

  if (!res.success) {
    if (res.upgrade_required) {
      document.getElementById('upgrade-prompt').classList.add('show');
      document.getElementById('chat-input').disabled = true;
      document.getElementById('send-btn').disabled = true;
    } else {
      toast(res.error, 'error');
    }
    return;
  }

  input.value = '';
  input.style.height='44px';
  appendMessage(res.message, true);
  updateCreditsUI(res.remaining_credits, appState.user?.tier);
}

function chatKeydown(e) {
  if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function chatInputChange() {
  const input = document.getElementById('chat-input');
  const btn = document.getElementById('send-btn');
  btn.disabled = !input.value.trim();
  // Auto resize
  input.style.height='44px';
  input.style.height = Math.min(input.scrollHeight, 120)+'px';

  // Typing indicator via socket
  if (appState.socket && appState.currentMatch) {
    appState.socket.emit('typing', { matchId: appState.currentMatch, isTyping: input.value.length>0 });
  }
}

function useQuickReply(btn) {
  const input = document.getElementById('chat-input');
  input.value = btn.textContent;
  input.dispatchEvent(new Event('input'));
  document.getElementById('send-btn').disabled = false;
  input.focus();
}

/* ============================================================
   STATS
============================================================ */
async function loadStats() {
  const res = await api('GET', '/stats');
  if (!res.success) return;

  const { stats } = res;
  document.getElementById('stat-matches').textContent = stats.total_matches||0;
  document.getElementById('stat-high').textContent = stats.high_matches||0;
  document.getElementById('stat-convos').textContent = stats.total_convos||0;
  document.getElementById('ici-ring-val').textContent = stats.ici_score ? `${stats.ici_score}` : '—';

  // Animate ICI ring
  const score = parseFloat(stats.ici_score||0);
  const pct = (score/10)*100;
  document.getElementById('ici-ring').style.background =
    `conic-gradient(var(--gold) ${pct}%, var(--cream) ${pct}%)`;

  if (stats.ai_profile) {
    document.getElementById('ai-profile-display').innerHTML = `
      <p style="font-weight:500;color:var(--ink);margin-bottom:8px">${escHtml(stats.ai_profile.summary||'')}</p>
      <p style="font-size:13px"><strong>Ideal:</strong> ${escHtml(stats.ai_profile.ideal_partner||'')}</p>
    `;
  }
}

/* ============================================================
   PREMIUM / TIERS
============================================================ */
async function renderTiers() {
  const res = await api('GET', '/premium/tiers');
  if (!res.success) return;

  const container = document.getElementById('tier-cards');
  container.innerHTML='';

  res.tiers.forEach(tier => {
    const card = document.createElement('div');
    card.className = `tier-card ${tier.popular ? 'popular' : ''}`;
    card.innerHTML = `
      ${tier.popular ? '<div class="tier-popular-badge">⭐ POPULAR</div>' : ''}
      <div class="tier-header">
        <div class="tier-name">${tier.name}</div>
        <div class="tier-price">
          <div class="amount">RM${tier.price}</div>
          <div class="period">/${tier.period}</div>
        </div>
      </div>
      <div class="tier-features">
        ${tier.features.map(f=>`<div class="tier-feature">${escHtml(f)}</div>`).join('')}
      </div>
      ${!tier.invite_only
        ? `<button class="btn btn-${tier.popular?'primary':'outline'} btn-full" onclick="initiatePayment('${tier.id}',${tier.price},'${tier.name}')">
            Pilih ${tier.name} — RM${tier.price}/${tier.period}
           </button>`
        : `<button class="btn btn-ghost btn-full" onclick="toast('Sila hubungi admin untuk Black Sovereign','info')">
            Mohon Jemputan
           </button>`
      }
    `;
    container.appendChild(card);
  });
}

async function initiatePayment(tierId, amount, tierName) {
  showModal('modal-payment');
  document.getElementById('payment-modal-title').textContent = `Memproses Pembayaran...`;
  document.getElementById('payment-amount').textContent = `RM${amount}`;

  // Animate progress bar
  const bar = document.getElementById('payment-progress');
  bar.style.width='0%';
  setTimeout(()=>bar.style.width='70%', 100);

  const res = await api('POST', '/payment/create', { tier: tierId });

  if (!res.success) {
    closeModal('modal-payment');
    toast(res.error, 'error');
    return;
  }

  bar.style.width='100%';
  setTimeout(() => {
    closeModal('modal-payment');
    // Dalam production: redirect ke ToyyibPay
    if (res.payment_url) window.location.href = res.payment_url;
  }, 800);
}

/* ============================================================
   QUIZ — 30 DIMENSI
============================================================ */
async function openQuiz() {
  const res = await api('GET', '/quiz/questions');
  if (!res.success) { toast(res.error,'error'); return; }

  appState.quizQuestions = res.questions;
  appState.quizAnswers   = {};
  appState.quizIndex     = 0;

  document.getElementById('quiz-result-area').classList.add('hidden');
  document.getElementById('quiz-bio-area').classList.add('hidden');
  document.getElementById('quiz-footer').classList.remove('hidden');
  showPage('page-quiz');
  renderQuestion(0);
}

function renderQuestion(idx) {
  const questions = appState.quizQuestions;
  const bioIdx    = questions.length; // extra step

  if (idx >= questions.length) {
    // Show bio step
    document.getElementById('quiz-question-area').innerHTML='';
    document.getElementById('quiz-bio-area').classList.remove('hidden');
    document.getElementById('quiz-footer').innerHTML =
      '<button class="btn btn-primary btn-full" onclick="submitQuiz()">Selesai & Lihat Keputusan →</button>';
    document.getElementById('quiz-progress-text').textContent = `Langkah Akhir`;
    document.getElementById('quiz-progress-bar').style.width='100%';
    return;
  }

  const q = questions[idx];
  const opts = q.options || [];
  const cats = { personaliti:'Personaliti',agama:'Agama',kewangan:'Kewangan',keluarga:'Keluarga',gaya_hidup:'Gaya Hidup',komunikasi:'Komunikasi',masa_depan:'Masa Depan',keserasian:'Keserasian' };

  document.getElementById('quiz-progress-text').textContent = `${idx+1}/30`;
  document.getElementById('quiz-progress-bar').style.width = `${((idx+1)/30)*100}%`;

  document.getElementById('quiz-question-area').innerHTML = `
    <div class="question-category">${cats[q.category]||q.category}</div>
    <div class="question-text">${escHtml(q.question_bm)}</div>
    <div class="quiz-options">
      ${opts.map((opt,oi)=>`
        <button class="quiz-option ${appState.quizAnswers[q.id]===oi?'selected':''}"
          onclick="selectAnswer(${q.id},${oi},this)">
          ${escHtml(opt)}
        </button>
      `).join('')}
    </div>
  `;
}

function selectAnswer(qId, optIdx, el) {
  appState.quizAnswers[qId] = optIdx;
  document.querySelectorAll('.quiz-option').forEach(b=>b.classList.remove('selected'));
  el.classList.add('selected');
}

function nextQuestion() {
  const q = appState.quizQuestions[appState.quizIndex];
  if (q && appState.quizAnswers[q.id] === undefined) {
    toast('Sila pilih satu jawapan', 'warning');
    return;
  }
  appState.quizIndex++;
  renderQuestion(appState.quizIndex);
  window.scrollTo(0,0);
}

async function submitQuiz() {
  const bio = document.getElementById('quiz-bio').value;

  const btn = document.querySelector('#quiz-footer button');
  if (btn) { btn.classList.add('btn-loading'); btn.disabled=true; }

  const res = await api('POST', '/quiz/submit', {
    answers: appState.quizAnswers,
    personalityBio: bio
  });

  if (btn) { btn.classList.remove('btn-loading'); btn.disabled=false; }

  if (!res.success) { toast(res.error,'error'); return; }

  // Show result
  document.getElementById('quiz-bio-area').classList.add('hidden');
  document.getElementById('quiz-footer').classList.add('hidden');
  document.getElementById('quiz-result-area').classList.remove('hidden');
  document.getElementById('result-ici-score').textContent = res.ici_score;
  document.getElementById('quiz-progress-bar').style.width='100%';

  if (res.ai_profile) {
    document.getElementById('result-profile-text').innerHTML = `
      <h4>Profil Keperibadian Anda</h4>
      <p>${escHtml(res.ai_profile.summary||'')}</p>
      ${res.ai_profile.ideal_partner ? `<p style="margin-top:8px"><strong>Pasangan Ideal:</strong> ${escHtml(res.ai_profile.ideal_partner)}</p>` : ''}
    `;
  }

  // Refresh user profile
  const profile = await api('GET', '/profile');
  if (profile.success) {
    appState.user = profile.user;
    localStorage.setItem('jk_user', JSON.stringify(profile.user));
  }

  toast('Analisis selesai! 🎉', 'success');
}

function exitQuiz() {
  showPage('page-landing');
  initApp();
}

function updateCharCount(el) {
  document.getElementById('bio-char-count').textContent = el.value.length;
}

/* ============================================================
   IC VERIFICATION
============================================================ */
function previewIC(input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('ic-placeholder').style.display='none';
    document.getElementById('ic-preview').style.display='block';
    document.getElementById('ic-preview-img').src = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

async function submitIC() {
  const input = document.getElementById('ic-input');
  if (!input.files[0]) { toast('Sila pilih gambar IC dahulu','warning'); return; }

  const formData = new FormData();
  formData.append('ic_photo', input.files[0]);

  setLoading('btn-submit-ic', true);
  const res = await api('POST', '/profile/ic-verify', formData, true);
  setLoading('btn-submit-ic', false);

  if (!res.success) { toast(res.error,'error'); return; }

  toast(res.message, 'success');
  closeModal('modal-ic');

  // Reset
  document.getElementById('ic-placeholder').style.display='block';
  document.getElementById('ic-preview').style.display='none';
  input.value='';
}

/* ============================================================
   PROFILE PHOTO UPLOAD
============================================================ */
function previewPhoto(input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('photo-preview').src = e.target.result;
    document.getElementById('photo-preview').style.display='block';
    document.getElementById('photo-placeholder').style.display='none';
  };
  reader.readAsDataURL(input.files[0]);
}

async function uploadProfilePhoto(input) {
  if (!input.files[0]) return;
  const formData = new FormData();
  formData.append('photo', input.files[0]);

  toast('Memuat naik gambar...', 'info');
  const res = await api('POST', '/profile/photo', formData, true);

  if (!res.success) { toast(res.error,'error'); return; }

  const src = `http://localhost:3001${res.photo}`;
  document.getElementById('profile-photo').src = src;
  document.getElementById('nav-avatar-img').src = src;
  document.getElementById('profile-avatar-emoji').style.display='none';
  toast('Gambar berjaya dikemaskini!', 'success');
}

/* ============================================================
   WINGMAN
============================================================ */
async function saveWingman() {
  const edu    = document.getElementById('wingman-edu').value;
  const sector = document.getElementById('wingman-sector').value;

  if (!edu || !sector) { toast('Sila pilih pendidikan dan sektor', 'warning'); return; }

  const res = await api('POST', '/wingman', { education:edu, sector });
  if (!res.success) { toast(res.error,'error'); return; }

  toast('AI Wingman dikemaskini! ✅', 'success');
  closeModal('modal-wingman');
}

/* ============================================================
   SOCKET.IO
============================================================ */
function connectSocket() {
  if (!appState.token) return;

  try {
    appState.socket = io('http://localhost:3001', { auth:{ token:appState.token } });

    appState.socket.on('new_message', (msg) => {
      if (appState.currentMatch === msg.match_id) {
        const isSent = msg.sender_id === appState.user?.id;
        appendMessage(msg, isSent);
        appState.socket.emit('message_seen', { matchId: msg.match_id });
      } else {
        // Update unread badge
        const badge = document.getElementById('chat-badge');
        const current = parseInt(badge.textContent||'0');
        badge.textContent = current+1;
        badge.classList.add('show');
      }
    });

    appState.socket.on('typing', ({ userId, isTyping }) => {
      if (userId !== appState.user?.id) {
        document.getElementById('typing-indicator').classList.toggle('show', isTyping);
      }
    });

    appState.socket.on('connect_error', () => {
      console.log('[Socket] Sambungan gagal — mode offline');
    });
  } catch(e) {
    console.log('[Socket] Socket.IO tidak tersedia');
  }
}

/* ============================================================
   TIMERS
============================================================ */
function startTrialCountdown(endDate) {
  clearInterval(appState.trialTimer);
  const el = document.getElementById('trial-countdown');

  function update() {
    const diff = endDate - Date.now();
    if (diff <= 0) {
      el.textContent = 'TAMAT';
      clearInterval(appState.trialTimer);
      document.getElementById('trial-bar').style.background='var(--danger)';
      return;
    }
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  update();
  appState.trialTimer = setInterval(update, 1000);
}

function startResetTimer() {
  clearInterval(appState.resetTimer);
  const el = document.getElementById('reset-countdown');

  function update() {
    const now = new Date();
    const reset = new Date();
    reset.setHours(8,0,0,0);
    if (now >= reset) reset.setDate(reset.getDate()+1);
    const diff = reset - now;
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    el.textContent = `${String(h).padStart(2,'0')}j ${String(m).padStart(2,'0')}m`;
  }

  update();
  appState.resetTimer = setInterval(update, 60000);
}

/* ============================================================
   MODALS
============================================================ */
function showModal(id) {
  document.getElementById(id).classList.add('show');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}
function closeModalOnBg(e, id) {
  if (e.target.id === id) closeModal(id);
}

/* ============================================================
   LOGOUT
============================================================ */
function logout() {
  clearInterval(appState.trialTimer);
  clearInterval(appState.resetTimer);
  if (appState.socket) appState.socket.disconnect();
  localStorage.removeItem('jk_token');
  localStorage.removeItem('jk_user');
  appState.token = null;
  appState.user  = null;
  document.getElementById('main-app').classList.remove('active');
  showPage('page-landing');
  fetchPioneerCount();
  toast('Anda telah log keluar', 'info');
}

/* ============================================================
   UTILS
============================================================ */
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Baru';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}j`;
  if (diff < 604800000) return `${Math.floor(diff/86400000)}h`;
  return date.toLocaleDateString('ms-MY', {day:'numeric',month:'short'});
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) btn.classList.add('btn-loading');
  else btn.classList.remove('btn-loading');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  const input = el.previousElementSibling;
  if (input && input.classList.contains('form-input')) input.classList.add('error');
}

function clearErrors() {
  document.querySelectorAll('.form-error').forEach(el => { el.classList.remove('show'); el.textContent=''; });
  document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
}

/* ── Handle payment callback dari URL ── */
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('payment_success') === 'true') {
  const tier = urlParams.get('tier');
  const ref  = urlParams.get('ref');
  if (tier && ref && appState.token) {
    api('POST', '/payment/verify', { payment_id:ref, tier }).then(res => {
      if (res.success) {
        toast(`🎉 Langganan ${tier.charAt(0).toUpperCase()+tier.slice(1)} berjaya diaktifkan!`, 'success');
        appState.user = res.user;
 
        loadUserProfile();
      }
    });
  }
}
