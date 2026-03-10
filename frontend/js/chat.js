const CHAT_SHORTCUTS = [
  'Assalamualaikum warahmatullahi wabarakatuh 🤲',
  'Salam perkenalan. Saya tertarik dengan profil anda ✨',
  'Assalamualaikum, saya tertarik kepada profil awk. Boleh berkenalan?',
  'Apa khabar hari ini? Semoga hari anda dipermudahkan 😊',
  'Boleh kita berkenalan dengan lebih dekat?',
  'Assalamualaikum, awk dari negeri mana ya?',
  'Saya nampak kita ada banyak persamaan. Apa hobi awk?',
  'InsyaAllah, semoga perkenalan ini membawa kebaikan 🤲',
  'Terima kasih sudi menerima padanan saya. Saya sangat menghargainya 😊',
  'Assalamualaikum! Apa minat membaca atau aktiviti hujung minggu awk?'
];

// ══════════ TABS ══════════
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.getElementById('dash-discover').style.display = 'none';
  document.getElementById('dash-chat').style.display = 'none';
  document.getElementById('dash-insights').style.display = 'none';
  if (tab === 'd') { document.getElementById('tb-d').classList.add('on'); document.getElementById('dash-discover').style.display = 'block'; }
  else if (tab === 'c') { document.getElementById('tb-c').classList.add('on'); document.getElementById('dash-chat').style.display = 'block'; updChatList(); }
  else if (tab === 'i') { document.getElementById('tb-i').classList.add('on'); document.getElementById('dash-insights').style.display = 'block'; updateInsights(); }
}

// ══════════ CHAT LIST ══════════
function updChatList() {
  const list = document.getElementById('chat-items'), empty = document.getElementById('chat-empty');
  if (!S.matches.length) { empty.style.display = 'flex'; empty.style.flexDirection = 'column'; list.innerHTML = ''; return; }
  empty.style.display = 'none';
  list.innerHTML = S.matches.map(m => {
    const ph = m.photo ? `<img src="${m.photo}"/>` : `<span style="font-size:18px">${m.name.includes('Puan') || m.name.includes('Cik') ? '👩' : '👨'}</span>`;
    const lastMsg = S.history[m.id] && S.history[m.id].length ? S.history[m.id][S.history[m.id].length - 1].text.slice(0, 40) + '...' : 'Belum ada perbualan';
    return `<div class="chat-item" onclick="openChat({id:'${m.id}',name:'${esc(m.name)}',score:${m.score},photo:${m.photo ? `'${m.photo}'` : 'null'}})">
      <div class="chat-av2">${ph}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</div>
          ${m.score >= 90 ? `<span style="font-size:8px;color:var(--gold);font-weight:700">⭐ ${m.score}%</span>` : `<span style="font-size:8px;color:var(--green);font-weight:600">${m.score}%</span>`}
        </div>
        <div style="font-size:10px;color:var(--t3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(lastMsg)}</div>
      </div>
      <span style="color:var(--t3);font-size:14px">›</span>
    </div>`;
  }).join('');
}

function useShortcut(btn) {
  const inp = document.getElementById('cw-in');
  inp.value = btn.dataset.msg;
  inp.focus();
  btn.style.display = 'none';
}

function openChat(m) {
  go('P-cwin');
  document.getElementById('cw-name').textContent = m.name;
  S.activeMatch = m;
  const msgs = document.getElementById('cw-msgs'); msgs.innerHTML = '';
  const hist = S.history[m.id] || [];
  hist.forEach(x => appendBub(x.text, x.me, x.admin));
  document.getElementById('shortcut-bar').style.display = hist.length === 0 ? 'flex' : 'none';
  updateQuotaBar();
  checkAdvanceEligibility(m.id);
}

function checkAdvanceEligibility(mid) {
  const bar = document.getElementById('advance-bar'); if (!bar) return;
  bar.style.display = 'none';
  if (S.advanceRequested[mid]) return;
  const days = S.chatDays[mid] || []; if (days.length < 3) return;
  const sorted = [...new Set(days)].sort().reverse();
  if (sorted.length >= 3) {
    const d1 = new Date(sorted[0]), d2 = new Date(sorted[1]), d3 = new Date(sorted[2]);
    if ((d1 - d2) / 864e5 <= 1 && (d2 - d3) / 864e5 <= 1) { bar.style.display = 'flex'; }
  }
}

function requestAdvance() {
  if (!S.activeMatch) return;
  S.advanceRequested[S.activeMatch.id] = true;
  document.getElementById('advance-bar').style.display = 'none';
  document.getElementById('adv-name').textContent = S.activeMatch.name;
  go('P-advance'); save();
  apiCall('POST', `/chat/request-advance?match_id=${S.activeMatch.id}&user_uid=${S.uid}`).catch(() => {});
  toast('Permohonan perkenalan lanjut dihantar! 💕', 'ok', 4000);
}

function requestWhatsApp() {
  if (!S.activeMatch) return;
  document.getElementById('con-name').textContent = S.activeMatch.name;
  document.getElementById('con-info').textContent = 'Keserasian: ' + S.activeMatch.score + '%';
  openOv('ov-consent');
  setTimeout(() => { closeOv('ov-consent'); toast('Permohonan nombor WhatsApp telah dihantar. Menunggu persetujuan pihak satu lagi.', 'info', 5000); }, 2000);
}

function sendMsg() {
  const inp = document.getElementById('cw-in'); const text = inp.value.trim();
  if (!text || !S.activeMatch) return;
  if (!S.premium && S.msgCount >= FREE_MSGS) { triggerBlurPaywall(); return; }
  if (isScamMsg(text)) { toast('⚠️ Mesej mengandungi kandungan berpotensi penipuan.', 'err', 5000); return; }
  inp.value = '';
  const mid = S.activeMatch.id;
  appendBub(text, true);
  if (!S.history[mid]) S.history[mid] = [];
  S.history[mid].push({ text, me: true });
  const today = getTodayStr();
  if (!S.chatDays[mid]) S.chatDays[mid] = [];
  if (!S.chatDays[mid].includes(today)) S.chatDays[mid].push(today);
  if (!S.premium) { S.msgCount++; updateQuotaBar(); }
  save();
  apiCall('POST', '/chat/send-message', { sender_id: S.uid, match_id: mid, message_text: text }).catch(() => {});
  if (!S.premium && S.msgCount >= FREE_MSGS) {
    setTimeout(() => triggerBlurPaywall(), 800);
  }
}

function appendBub(text, isMe, isAdmin = false) {
  const wrap = document.getElementById('cw-msgs');
  const now = new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
  const d = document.createElement('div');
  if (isAdmin) { d.innerHTML = `<div class="bub bub-admin">${esc(text)}</div>`; }
  else {
    d.style.cssText = 'display:flex;flex-direction:column;align-items:' + (isMe ? 'flex-end' : 'flex-start');
    d.innerHTML = `<div class="bub ${isMe ? 'bub-me' : 'bub-them'}">${esc(text)}</div><div style="font-size:8px;color:var(--t3);margin-top:2px;padding:0 3px">${now}</div>`;
  }
  wrap.appendChild(d); wrap.scrollTop = wrap.scrollHeight;
}

function updateQuotaBar() {
  const bar = document.getElementById('quota-bar');
  const left = Math.max(0, FREE_MSGS - S.msgCount);
  if (!S.premium) {
    bar.style.display = 'block';
    const el = document.getElementById('msg-left');
    if (el) { el.textContent = left; el.style.color = left <= 3 ? 'var(--red)' : 'var(--gold)'; }
  } else { bar.style.display = 'none'; }
}

// ══════════ BLUR PAYWALL ══════════
function triggerBlurPaywall() {
  const msgs = document.getElementById('cw-msgs');
  const shortcuts = document.getElementById('shortcut-bar');
  const inputWrap = document.querySelector('.chat-in-wrap');
  if (msgs) { msgs.style.filter = 'blur(7px) grayscale(40%)'; msgs.style.pointerEvents = 'none'; }
  if (shortcuts) { shortcuts.style.filter = 'blur(7px)'; shortcuts.style.pointerEvents = 'none'; }
  if (inputWrap) { inputWrap.style.opacity = '0.3'; inputWrap.style.pointerEvents = 'none'; }
  openOv('ov-pay');
}
function unblurChat() {
  const msgs = document.getElementById('cw-msgs');
  const shortcuts = document.getElementById('shortcut-bar');
  const inputWrap = document.querySelector('.chat-in-wrap');
  if (msgs) { msgs.style.filter = ''; msgs.style.pointerEvents = ''; }
  if (shortcuts) { shortcuts.style.filter = ''; shortcuts.style.pointerEvents = ''; }
  if (inputWrap) { inputWrap.style.opacity = ''; inputWrap.style.pointerEvents = ''; }
}
function showPaywall() { document.getElementById('pay-left').textContent = Math.max(0, FREE_MSGS - S.msgCount); openOv('ov-pay'); }
