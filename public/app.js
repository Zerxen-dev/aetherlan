// AetherLAN 2.0 — Client Matrix Engine
// Pure Vanilla ES6 • Zero Dependencies
(function() {
  'use strict';

  // --- Master State ---
  const state = {
    myId: null,
    name: localStorage.getItem('aether_name') || generateCodename(),
    color: localStorage.getItem('aether_color') || getRandomAura(),
    device: detectDeviceType(),
    room: localStorage.getItem('aether_room') || 'general',
    e2eeKey: null,
    e2eeSecret: localStorage.getItem('aether_secret') || '',
    soundEnabled: localStorage.getItem('aether_sound') !== 'false',
    burnSeconds: 0,
    ws: null,
    activeTab: 'streamTab',
    unreadCount: 0,
    peers: [],
    messages: [],
    files: [],
    clipboard: { content: '', updatedAt: 0 },
    localIPs: [],
    port: 4000,
    mediaRecorder: null,
    audioChunks: [],
    recordInterval: null,
    recordStartTime: 0,
    typingTimeout: null,
    isTyping: false,
    pingStartTime: 0
  };

  // --- Element Bindings ---
  const el = {
    latency: document.getElementById('networkLatency'),
    currentRoomName: document.getElementById('currentRoomName'),
    roomSelectorBtn: document.getElementById('roomSelectorBtn'),
    e2eeBtn: document.getElementById('e2eeBtn'),
    e2eeDot: document.getElementById('e2eeDot'),
    profileBtn: document.getElementById('profileBtn'),
    headerProfileName: document.getElementById('headerProfileName'),
    headerAvatarDot: document.getElementById('headerAvatarDot'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    qrModalBtn: document.getElementById('qrModalBtn'),
    navItems: document.querySelectorAll('.nav-item'),
    viewPanels: document.querySelectorAll('.view-panel'),
    unreadBadge: document.getElementById('unreadBadge'),
    fileCountBadge: document.getElementById('fileCountBadge'),
    peerCountBadge: document.getElementById('peerCountBadge'),
    // Stream
    streamContainer: document.getElementById('streamContainer'),
    composerForm: document.getElementById('composerForm'),
    composerInput: document.getElementById('composerInput'),
    toggleBurnerBtn: document.getElementById('toggleBurnerBtn'),
    burnerDrawer: document.getElementById('burnerDrawer'),
    presetBtns: document.querySelectorAll('.preset-btn'),
    attachBtn: document.getElementById('attachBtn'),
    composerFileInput: document.getElementById('composerFileInput'),
    typingIndicator: document.getElementById('typingIndicator'),
    typingText: document.getElementById('typingText'),
    micBtn: document.getElementById('micBtn'),
    voiceDock: document.getElementById('voiceDock'),
    voiceTimer: document.getElementById('voiceTimer'),
    voiceCanvas: document.getElementById('voiceVisualizerCanvas'),
    cancelVoiceBtn: document.getElementById('cancelVoiceBtn'),
    sendVoiceBtn: document.getElementById('sendVoiceBtn'),
    // HyperDrop
    hyperdropZone: document.getElementById('hyperdropZone'),
    browseDropBtn: document.getElementById('browseDropBtn'),
    transferProgressCard: document.getElementById('transferProgressCard'),
    transferFileName: document.getElementById('transferFileName'),
    transferPercent: document.getElementById('transferPercent'),
    transferBarGlow: document.getElementById('transferBarGlow'),
    catalogGrid: document.getElementById('catalogGrid'),
    catalogStats: document.getElementById('catalogStats'),
    // SyncBoard
    syncboardContent: document.getElementById('syncboardContent'),
    syncMeta: document.getElementById('syncMeta'),
    copySyncBtn: document.getElementById('copySyncBtn'),
    broadcastSyncBtn: document.getElementById('broadcastSyncBtn'),
    syncCharCount: document.getElementById('syncCharCount'),
    // Radar
    radarCanvas: document.getElementById('radarScreenCanvas'),
    nodesList: document.getElementById('nodesList'),
    endpointsList: document.getElementById('endpointsList'),
    // Modals
    roomModal: document.getElementById('roomModal'),
    closeRoomModal: document.getElementById('closeRoomModal'),
    customRoomForm: document.getElementById('customRoomForm'),
    newRoomInput: document.getElementById('newRoomInput'),
    e2eeModal: document.getElementById('e2eeModal'),
    closeE2eeModal: document.getElementById('closeE2eeModal'),
    e2eeForm: document.getElementById('e2eeForm'),
    e2eeSecretInput: document.getElementById('e2eeSecretInput'),
    disableE2eeBtn: document.getElementById('disableE2eeBtn'),
    profileModal: document.getElementById('profileModal'),
    closeProfileModal: document.getElementById('closeProfileModal'),
    profileForm: document.getElementById('profileForm'),
    codenameInput: document.getElementById('codenameInput'),
    auraPalette: document.getElementById('auraPalette'),
    randomizeCodenameBtn: document.getElementById('randomizeCodenameBtn'),
    qrModal: document.getElementById('qrModal'),
    closeQrModal: document.getElementById('closeQrModal'),
    qrCodeCanvas: document.getElementById('qrCodeCanvas'),
    shareUrlInput: document.getElementById('shareUrlInput'),
    copyShareBtn: document.getElementById('copyShareBtn'),
    toastHub: document.getElementById('toastHub')
  };

  // --- Web Audio Synthesizer ---
  let audioContext = null;
  function getAudioCtx() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  }

  function playCyberSound(type) {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'transmit') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'receive') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.15);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'drop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.2);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'burn') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.18);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch (e) {}
  }

  // --- Cryptography (AES-GCM 256) ---
  async function deriveKey(secret) {
    if (!secret) return null;
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('aetherlan_salt_mesh'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptText(text) {
    if (!state.e2eeKey) return text;
    try {
      const enc = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        state.e2eeKey,
        enc.encode(text)
      );
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
      return 'E2EE:' + btoa(String.fromCharCode.apply(null, combined));
    } catch (e) {
      return text;
    }
  }

  async function decryptText(payload) {
    if (!payload || !payload.startsWith('E2EE:') || !state.e2eeKey) return payload;
    try {
      const raw = atob(payload.replace('E2EE:', ''));
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const iv = bytes.slice(0, 12);
      const data = bytes.slice(12);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        state.e2eeKey,
        data
      );
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      return '🔒 [Encrypted Payload - Incorrect Room Key]';
    }
  }

  // --- Utilities ---
  function generateCodename() {
    const prefixes = ['Aether', 'Cyber', 'Neon', 'Vortex', 'Pulse', 'Hyper', 'Shadow', 'Quantum', 'Nova', 'Specter'];
    const nouns = ['Fox', 'Phantom', 'Runner', 'Raven', 'Viper', 'Otter', 'Matrix', 'Drifter', 'Blade', 'Apex'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const n = nouns[Math.floor(Math.random() * nouns.length)];
    return `${p}${n}_${Math.floor(10 + Math.random() * 90)}`;
  }

  function getRandomAura() {
    const auras = ['#00f2fe', '#00ff87', '#ff007f', '#ffaa00', '#9d4edd', '#38ef7d', '#ff4757', '#4facfe'];
    return auras[Math.floor(Math.random() * auras.length)];
  }

  function detectDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry/i.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  function formatBytes(bytes) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast-item';
    t.textContent = msg;
    el.toastHub.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  function updateIdentityUI() {
    el.headerProfileName.textContent = state.name;
    el.headerAvatarDot.style.backgroundColor = state.color;
    el.currentRoomName.textContent = state.room;
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    el.navItems.forEach(item => item.classList.toggle('active', item.dataset.tab === tabId));
    el.viewPanels.forEach(panel => panel.classList.toggle('active', panel.id === tabId));

    if (tabId === 'streamTab') {
      state.unreadCount = 0;
      el.unreadBadge.style.display = 'none';
      scrollStream();
    }
  }

  function scrollStream() {
    requestAnimationFrame(() => {
      el.streamContainer.scrollTop = el.streamContainer.scrollHeight;
    });
  }

  // --- WebSocket Connection ---
  function connectMesh() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    el.latency.textContent = '● Connecting...';
    el.latency.style.color = 'var(--text-muted)';

    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      el.latency.textContent = '● LAN Active';
      el.latency.style.color = 'var(--accent-emerald)';

      state.ws.send(JSON.stringify({
        type: 'set_profile',
        name: state.name,
        color: state.color,
        device: state.device
      }));

      // Start ping heartbeat
      setInterval(measurePing, 5000);
    };

    state.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMeshPacket(msg);
      } catch (e) {
        console.error('Packet Error', e);
      }
    };

    state.ws.onclose = () => {
      el.latency.textContent = '● Offline';
      el.latency.style.color = 'var(--accent-amber)';
      setTimeout(connectMesh, 2000);
    };
  }

  function measurePing() {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.pingStartTime = performance.now();
      state.ws.send(JSON.stringify({ type: 'ping', time: Date.now() }));
    }
  }

  async function handleMeshPacket(data) {
    switch (data.type) {
      case 'init': {
        state.myId = data.yourId;
        state.room = data.room || 'general';
        state.peers = data.peers || [];
        state.messages = data.messages || [];
        state.files = data.files || [];
        state.localIPs = data.localIPs || [];
        state.port = data.port || 4000;

        updateIdentityUI();
        renderPeers();
        await renderAllMessages();
        renderFiles();
        if (data.clipboard) updateSyncUI(data.clipboard);
        renderEndpoints();
        break;
      }

      case 'pong': {
        const latency = Math.round(performance.now() - state.pingStartTime);
        el.latency.textContent = `● LAN ${latency}ms`;
        break;
      }

      case 'peer_joined': {
        state.peers = data.peers;
        renderPeers();
        if (data.peer.id !== state.myId) {
          showToast(`⚡ ${data.peer.name} entered #${state.room}`);
          playCyberSound('receive');
        }
        break;
      }

      case 'peer_updated':
      case 'peer_left': {
        state.peers = data.peers;
        renderPeers();
        break;
      }

      case 'room_switched': {
        state.room = data.room;
        state.peers = data.peers || [];
        state.messages = data.messages || [];
        state.files = data.files || [];
        updateIdentityUI();
        renderPeers();
        await renderAllMessages();
        renderFiles();
        if (data.clipboard) updateSyncUI(data.clipboard);
        showToast(`Switched to #${state.room}`);
        break;
      }

      case 'new_message': {
        await appendMessage(data.message);
        if (state.activeTab !== 'streamTab') {
          state.unreadCount++;
          el.unreadBadge.textContent = state.unreadCount;
          el.unreadBadge.style.display = 'inline-block';
        }
        playCyberSound('receive');
        break;
      }

      case 'message_burned': {
        burnMessage(data.messageId);
        playCyberSound('burn');
        break;
      }

      case 'reaction_updated': {
        updateReactions(data.messageId, data.reactions);
        break;
      }

      case 'typing': {
        handleTyping(data);
        break;
      }

      case 'file_list': {
        state.files = data.files;
        renderFiles();
        playCyberSound('drop');
        break;
      }

      case 'clipboard_updated': {
        updateSyncUI(data.clipboard);
        showToast('📋 SyncBoard updated');
        break;
      }
    }
  }

  // --- Stream Rendering ---
  async function renderAllMessages() {
    el.streamContainer.innerHTML = `
      <div class="stream-banner">
        <div class="banner-badge">CHANNEL #${state.room.toUpperCase()} • P2P MESH</div>
        <p>100% Zero-Internet Local Subnet. No external cloud or third-party servers.</p>
      </div>
    `;
    for (const msg of state.messages) {
      await appendMessage(msg, false);
    }
    scrollStream();
  }

  async function appendMessage(msg, shouldScroll = true) {
    const isSelf = msg.senderId === state.myId || msg.senderName === state.name;
    const row = document.createElement('div');
    row.className = `message-bubble-row ${isSelf ? 'self' : 'peer'}`;
    row.id = `msg_${msg.id}`;

    let bodyHtml = '';

    if (msg.type === 'text') {
      let textContent = msg.text;
      if (msg.isEncrypted) {
        textContent = await decryptText(msg.text);
      }
      bodyHtml = escapeHTML(textContent);
    } else if (msg.type === 'file') {
      bodyHtml = `
        <div class="stream-artifact-card">
          <div class="artifact-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div class="artifact-meta">
            <div class="artifact-filename">${escapeHTML(msg.file.originalName)}</div>
            <div class="artifact-filesize">${formatBytes(msg.file.size)}</div>
          </div>
          <a href="${msg.file.url}?download=1" download="${escapeHTML(msg.file.originalName)}" class="artifact-download-btn" target="_blank">Download</a>
        </div>
      `;
    } else if (msg.type === 'voice') {
      bodyHtml = `
        <div class="voice-memo-player">
          <button class="voice-play-toggle" data-url="${msg.file.url}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
          <div class="waveform-track">
            <span class="wave-segment" style="height: 40%"></span>
            <span class="wave-segment" style="height: 75%"></span>
            <span class="wave-segment" style="height: 100%"></span>
            <span class="wave-segment" style="height: 60%"></span>
            <span class="wave-segment" style="height: 90%"></span>
            <span class="wave-segment" style="height: 50%"></span>
            <span class="wave-segment" style="height: 85%"></span>
          </div>
          <span class="voice-time-label">Voice Memo</span>
        </div>
      `;
    }

    const burnTag = msg.burnSeconds ? `<span class="burn-indicator-chip">🔥 ${msg.burnSeconds}s</span>` : '';

    row.innerHTML = `
      <div class="msg-meta-header">
        <span class="msg-sender-name" style="color: ${msg.senderColor || '#00f2fe'}">${escapeHTML(msg.senderName)}</span>
        <span class="msg-timestamp">${formatTime(msg.timestamp)}</span>
        ${burnTag}
      </div>
      <div class="msg-body-card">
        ${bodyHtml}
        ${msg.burnSeconds ? `<div class="burn-progress-bar" id="burn_bar_${msg.id}"></div>` : ''}
      </div>
      <div class="reactions-tray" id="reactions_${msg.id}">
        <button class="add-reaction-btn" data-msgid="${msg.id}">+😀</button>
      </div>
    `;

    el.streamContainer.appendChild(row);

    if (msg.burnSeconds && msg.burnsAt) {
      animateBurnBar(msg.id, msg.burnSeconds, msg.burnsAt);
    }

    renderReactionChips(msg.id, msg.reactions);
    if (shouldScroll) scrollStream();
  }

  function animateBurnBar(msgId, sec, burnsAt) {
    const bar = document.getElementById(`burn_bar_${msgId}`);
    if (!bar) return;
    const remaining = burnsAt - Date.now();
    bar.style.width = `${Math.max(0, (remaining / (sec * 1000)) * 100)}%`;

    const timer = setInterval(() => {
      const nowRem = burnsAt - Date.now();
      if (nowRem <= 0) {
        clearInterval(timer);
      } else {
        const curPct = Math.max(0, (nowRem / (sec * 1000)) * 100);
        if (bar) bar.style.width = `${curPct}%`;
      }
    }, 500);
  }

  function burnMessage(msgId) {
    const row = document.getElementById(`msg_${msgId}`);
    if (row) {
      row.style.transition = 'opacity 0.3s, transform 0.3s';
      row.style.opacity = '0';
      row.style.transform = 'scale(0.85)';
      setTimeout(() => row.remove(), 300);
    }
  }

  // --- Reactions ---
  const EMOJI_SET = ['🔥', '💀', '🚀', '⚡', '❤️', '😂', '🎯'];

  function renderReactionChips(msgId, reactions = {}) {
    const tray = document.getElementById(`reactions_${msgId}`);
    if (!tray) return;

    let html = '';
    for (const [emoji, users] of Object.entries(reactions)) {
      if (users && users.length > 0) {
        const active = users.includes(state.name);
        html += `<button class="reaction-pill ${active ? 'active' : ''}" data-msgid="${msgId}" data-emoji="${emoji}">${emoji} ${users.length}</button>`;
      }
    }
    html += `<button class="add-reaction-btn" data-msgid="${msgId}">+😀</button>`;
    tray.innerHTML = html;
  }

  function updateReactions(msgId, reactions) {
    renderReactionChips(msgId, reactions);
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('.reaction-pill')) {
      const chip = e.target.closest('.reaction-pill');
      state.ws.send(JSON.stringify({
        type: 'reaction',
        messageId: chip.dataset.msgid,
        emoji: chip.dataset.emoji
      }));
      return;
    }

    if (e.target.closest('.add-reaction-btn')) {
      const btn = e.target.closest('.add-reaction-btn');
      openEmojiPopover(btn.dataset.msgid, btn);
      return;
    }

    if (e.target.closest('.voice-play-toggle')) {
      const btn = e.target.closest('.voice-play-toggle');
      toggleAudioPlay(btn.dataset.url, btn);
      return;
    }
  });

  let activeAudioInstance = null;
  function toggleAudioPlay(url, btn) {
    if (activeAudioInstance) {
      activeAudioInstance.pause();
      activeAudioInstance = null;
      document.querySelectorAll('.voice-play-toggle').forEach(b => {
        b.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      });
    }

    const audio = new Audio(url);
    activeAudioInstance = audio;
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    audio.play();
    audio.onended = () => {
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      activeAudioInstance = null;
    };
  }

  function openEmojiPopover(msgId, target) {
    document.querySelectorAll('.emoji-pop').forEach(p => p.remove());
    const pop = document.createElement('div');
    pop.className = 'emoji-pop';
    pop.style.cssText = `
      position: absolute;
      background: var(--bg-surface);
      border: 1px solid var(--border-active);
      border-radius: var(--radius-full);
      padding: 4px 8px;
      display: flex;
      gap: 6px;
      z-index: 50;
      box-shadow: 0 6px 20px rgba(0,0,0,0.6);
    `;

    EMOJI_SET.forEach(emoji => {
      const b = document.createElement('button');
      b.style.cssText = 'background:none; border:none; font-size:1.1rem; cursor:pointer; padding:2px;';
      b.textContent = emoji;
      b.onclick = () => {
        state.ws.send(JSON.stringify({ type: 'reaction', messageId: msgId, emoji }));
        pop.remove();
      };
      pop.appendChild(b);
    });

    target.parentElement.appendChild(pop);
    setTimeout(() => {
      document.addEventListener('click', function closeEmoji(ev) {
        if (!pop.contains(ev.target)) {
          pop.remove();
          document.removeEventListener('click', closeEmoji);
        }
      });
    }, 10);
  }

  // --- Composer & Typing ---
  el.composerInput.addEventListener('input', () => {
    el.composerInput.style.height = 'auto';
    el.composerInput.style.height = Math.min(el.composerInput.scrollHeight, 130) + 'px';

    if (!state.isTyping && state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.isTyping = true;
      state.ws.send(JSON.stringify({ type: 'typing', isTyping: true }));
    }
    clearTimeout(state.typingTimeout);
    state.typingTimeout = setTimeout(() => {
      state.isTyping = false;
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
      }
    }, 1500);
  });

  el.composerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = el.composerInput.value.trim();
    if (!raw) return;

    let payloadText = raw;
    let isEncrypted = false;

    if (state.e2eeKey) {
      payloadText = await encryptText(raw);
      isEncrypted = true;
    }

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'chat_message',
        text: payloadText,
        isEncrypted,
        burnSeconds: state.burnSeconds
      }));
      el.composerInput.value = '';
      el.composerInput.style.height = 'auto';
      state.isTyping = false;
      state.ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
      playCyberSound('transmit');
    }
  });

  function handleTyping(data) {
    if (data.isTyping) {
      el.typingText.textContent = `${data.name} is typing...`;
      el.typingIndicator.style.display = 'flex';
    } else {
      el.typingIndicator.style.display = 'none';
    }
  }

  el.toggleBurnerBtn.addEventListener('click', () => el.burnerDrawer.classList.toggle('open'));

  el.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      el.presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.burnSeconds = parseInt(btn.dataset.sec, 10);
      showToast(state.burnSeconds > 0 ? `🔥 Vaporize mode: ${state.burnSeconds}s` : 'Vaporize mode Off');
    });
  });

  // --- HyperDrop File Transfers ---
  el.attachBtn.addEventListener('click', () => el.composerFileInput.click());
  el.browseDropBtn.addEventListener('click', () => el.composerFileInput.click());

  el.composerFileInput.addEventListener('change', () => {
    if (el.composerFileInput.files.length > 0) {
      beamFile(el.composerFileInput.files[0]);
      el.composerFileInput.value = '';
    }
  });

  ['dragenter', 'dragover'].forEach(evt => {
    el.hyperdropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      el.hyperdropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    el.hyperdropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      el.hyperdropZone.classList.remove('dragover');
    });
  });

  el.hyperdropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length > 0) {
      beamFile(e.dataTransfer.files[0]);
    }
  });

  function beamFile(file, isVoice = false) {
    el.transferProgressCard.style.display = 'block';
    el.transferFileName.textContent = file.name || 'Voice Memo';
    el.transferPercent.textContent = '0%';
    el.transferBarGlow.style.width = '0%';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name || 'audio_memo.webm'));
    xhr.setRequestHeader('X-Sender-Name', encodeURIComponent(state.name));
    xhr.setRequestHeader('X-Sender-Color', encodeURIComponent(state.color));
    xhr.setRequestHeader('X-Sender-Id', state.myId || 'anon');
    xhr.setRequestHeader('X-Room-Id', state.room);
    xhr.setRequestHeader('X-Is-Voice', isVoice ? 'true' : 'false');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        el.transferPercent.textContent = `${pct}%`;
        el.transferBarGlow.style.width = `${pct}%`;
      }
    };

    xhr.onload = () => {
      setTimeout(() => { el.transferProgressCard.style.display = 'none'; }, 500);
      if (xhr.status >= 200 && xhr.status < 300) {
        showToast('🚀 Beamed to LAN!');
        playCyberSound('transmit');
      } else {
        showToast('❌ Transfer failed.');
      }
    };

    xhr.onerror = () => {
      el.transferProgressCard.style.display = 'none';
      showToast('❌ Network error during transfer.');
    };

    xhr.send(file);
  }

  function renderFiles() {
    el.fileCountBadge.textContent = state.files.length;
    el.catalogStats.textContent = `${state.files.length} items`;

    if (state.files.length === 0) {
      el.catalogGrid.innerHTML = '<div class="empty-placeholder">No artifacts beamed yet. Drop a file to begin sharing.</div>';
      return;
    }

    el.catalogGrid.innerHTML = state.files.map(f => `
      <div class="catalog-card">
        <div class="artifact-meta">
          <div class="artifact-filename" title="${escapeHTML(f.originalName)}">${escapeHTML(f.originalName)}</div>
          <div class="artifact-filesize">${formatBytes(f.size)} • By <span style="color:${f.senderColor}">${escapeHTML(f.senderName)}</span></div>
        </div>
        <a href="${f.url}?download=1" download="${escapeHTML(f.originalName)}" class="glow-action-btn small" target="_blank">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download
        </a>
      </div>
    `).join('');
  }

  // --- Voice Recording & Waveform Visualizer ---
  let voiceAnimFrame = null;
  el.micBtn.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.mediaRecorder = new MediaRecorder(stream);
      state.audioChunks = [];

      // Audio Visualizer Setup
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const canvasCtx = el.voiceCanvas.getContext('2d');

      function drawWave() {
        voiceAnimFrame = requestAnimationFrame(drawWave);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, el.voiceCanvas.width, el.voiceCanvas.height);
        const barWidth = (el.voiceCanvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * el.voiceCanvas.height;
          canvasCtx.fillStyle = '#ff007f';
          canvasCtx.fillRect(x, el.voiceCanvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      }
      drawWave();

      state.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) state.audioChunks.push(e.data);
      };

      state.mediaRecorder.onstop = () => {
        cancelAnimationFrame(voiceAnimFrame);
        stream.getTracks().forEach(t => t.stop());
      };

      state.mediaRecorder.start();
      state.recordStartTime = Date.now();
      el.voiceDock.style.display = 'flex';
      el.composerForm.style.display = 'none';

      state.recordInterval = setInterval(() => {
        const sec = Math.floor((Date.now() - state.recordStartTime) / 1000);
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        el.voiceTimer.textContent = `${m}:${s}`;
      }, 1000);

    } catch (err) {
      showToast('⚠️ Microphone permission required.');
    }
  });

  el.cancelVoiceBtn.addEventListener('click', () => {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.stop();
    }
    clearInterval(state.recordInterval);
    el.voiceDock.style.display = 'none';
    el.composerForm.style.display = 'flex';
    state.audioChunks = [];
  });

  el.sendVoiceBtn.addEventListener('click', () => {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.onstop = () => {
        const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        beamFile(file, true);
        state.audioChunks = [];
      };
      state.mediaRecorder.stop();
    }
    clearInterval(state.recordInterval);
    el.voiceDock.style.display = 'none';
    el.composerForm.style.display = 'flex';
  });

  // --- SyncBoard ---
  el.syncboardContent.addEventListener('input', () => {
    el.syncCharCount.textContent = `${el.syncboardContent.value.length} characters`;
  });

  el.broadcastSyncBtn.addEventListener('click', () => {
    const val = el.syncboardContent.value;
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'clipboard_update', content: val }));
      showToast('⚡ SyncBoard broadcasted');
      playCyberSound('transmit');
    }
  });

  el.copySyncBtn.addEventListener('click', async () => {
    const text = el.syncboardContent.value;
    if (!text) return;
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else {
        el.syncboardContent.select();
        document.execCommand('copy');
      }
      showToast('📋 Copied to clipboard!');
    } catch (e) {
      showToast('Copy failed.');
    }
  });

  function updateSyncUI(clip) {
    state.clipboard = clip;
    el.syncboardContent.value = clip.content || '';
    el.syncCharCount.textContent = `${(clip.content || '').length} characters`;
    el.syncMeta.textContent = clip.updatedBy ? `Updated by ${clip.updatedBy} at ${formatTime(clip.updatedAt)}` : 'Synced across all peers';
  }

  // --- Radar Matrix Visualizer (Canvas Animation) ---
  let radarAngle = 0;
  function initRadar() {
    const canvas = el.radarCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function animateRadar() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxR = cx - 10;

      // Concentric Rings
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.2)';
      ctx.lineWidth = 1;
      for (let r = maxR / 3; r <= maxR; r += maxR / 3) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx, 10);
      ctx.lineTo(cx, canvas.height - 10);
      ctx.moveTo(10, cy);
      ctx.lineTo(canvas.width - 10, cy);
      ctx.stroke();

      // Radar Sweep
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(radarAngle);
      const grad = ctx.createLinearGradient(0, 0, maxR, 0);
      grad.addColorStop(0, 'rgba(0, 242, 254, 0)');
      grad.addColorStop(1, 'rgba(0, 242, 254, 0.45)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxR, 0, Math.PI / 4);
      ctx.fill();
      ctx.restore();

      // Plot Nodes
      state.peers.forEach((p, idx) => {
        const angle = (idx / Math.max(1, state.peers.length)) * Math.PI * 2 + 0.5;
        const dist = (maxR * 0.4) + ((idx % 3) * (maxR * 0.25));
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;

        ctx.fillStyle = p.color || '#00f2fe';
        ctx.shadowColor = p.color || '#00f2fe';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      radarAngle += 0.03;
      requestAnimationFrame(animateRadar);
    }
    animateRadar();
  }

  function renderPeers() {
    el.peerCountBadge.textContent = state.peers.length;
    el.nodesList.innerHTML = state.peers.map(p => {
      const isMe = p.id === state.myId;
      return `
        <div class="node-row">
          <div class="node-info">
            <span class="node-aura" style="background: ${p.color || '#00f2fe'}"></span>
            <span class="node-title">${escapeHTML(p.name)}</span>
            <span class="node-badge">${p.device || 'Node'}</span>
          </div>
          ${isMe ? '<span class="self-badge">YOU</span>' : ''}
        </div>
      `;
    }).join('');
  }

  function renderEndpoints() {
    const port = state.port || 4000;
    let html = `
      <div class="endpoint-item">
        <code>http://localhost:${port}</code>
        <button class="copy-endpoint-btn" data-url="http://localhost:${port}">Copy</button>
      </div>
    `;

    let primary = `http://localhost:${port}`;

    state.localIPs.forEach(net => {
      const url = `http://${net.address}:${port}`;
      primary = url;
      html += `
        <div class="endpoint-item">
          <code>${url} (${net.interface})</code>
          <button class="copy-endpoint-btn" data-url="${url}">Copy</button>
        </div>
      `;
    });

    el.endpointsList.innerHTML = html;
    el.shareUrlInput.value = primary;
    generateQR(primary);
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('.copy-endpoint-btn')) {
      const u = e.target.closest('.copy-endpoint-btn').dataset.url;
      navigator.clipboard.writeText(u).then(() => showToast('🔗 Copied!'));
    }
  });

  el.copyShareBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(el.shareUrlInput.value).then(() => showToast('🔗 Link copied!'));
  });

  function generateQR(url) {
    if (window.QRCode && el.qrCodeCanvas) {
      QRCode.toCanvas(el.qrCodeCanvas, url, {
        width: 220,
        margin: 1,
        color: { dark: '#07090e', light: '#ffffff' }
      }, () => {});
    }
  }

  // --- Modals & Channels ---
  el.roomSelectorBtn.addEventListener('click', () => el.roomModal.style.display = 'flex');
  el.closeRoomModal.addEventListener('click', () => el.roomModal.style.display = 'none');

  document.querySelectorAll('.channel-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchRoom(btn.dataset.room);
      el.roomModal.style.display = 'none';
    });
  });

  el.customRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = el.newRoomInput.value.trim();
    if (r) {
      switchRoom(r);
      el.newRoomInput.value = '';
      el.roomModal.style.display = 'none';
    }
  });

  function switchRoom(roomId) {
    if (roomId === state.room) return;
    state.room = roomId;
    localStorage.setItem('aether_room', roomId);
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'join_room', roomId }));
    }
  }

  // E2EE Modal
  el.e2eeBtn.addEventListener('click', () => {
    el.e2eeSecretInput.value = state.e2eeSecret;
    el.e2eeModal.style.display = 'flex';
  });

  el.closeE2eeModal.addEventListener('click', () => el.e2eeModal.style.display = 'none');

  el.e2eeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sec = el.e2eeSecretInput.value.trim();
    if (sec) {
      state.e2eeSecret = sec;
      localStorage.setItem('aether_secret', sec);
      state.e2eeKey = await deriveKey(sec);
      el.e2eeBtn.classList.add('active');
      showToast('🔒 E2EE Shield Activated');
    }
    el.e2eeModal.style.display = 'none';
  });

  el.disableE2eeBtn.addEventListener('click', () => {
    state.e2eeSecret = '';
    state.e2eeKey = null;
    localStorage.removeItem('aether_secret');
    el.e2eeBtn.classList.remove('active');
    showToast('🔓 E2EE Disabled');
    el.e2eeModal.style.display = 'none';
  });

  // Profile Modal
  el.profileBtn.addEventListener('click', () => {
    el.codenameInput.value = state.name;
    highlightAura(state.color);
    el.profileModal.style.display = 'flex';
  });

  el.closeProfileModal.addEventListener('click', () => el.profileModal.style.display = 'none');
  el.qrModalBtn.addEventListener('click', () => el.qrModal.style.display = 'flex');
  el.closeQrModal.addEventListener('click', () => el.qrModal.style.display = 'none');

  function highlightAura(col) {
    el.auraPalette.querySelectorAll('.aura-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === col);
    });
  }

  el.auraPalette.addEventListener('click', (e) => {
    if (e.target.dataset.color) highlightAura(e.target.dataset.color);
  });

  el.randomizeCodenameBtn.addEventListener('click', () => {
    el.codenameInput.value = generateCodename();
    highlightAura(getRandomAura());
  });

  el.profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = el.codenameInput.value.trim();
    const activeSwatch = el.auraPalette.querySelector('.aura-swatch.active');
    const newCol = activeSwatch ? activeSwatch.dataset.color : state.color;

    if (newName) {
      state.name = newName;
      state.color = newCol;
      localStorage.setItem('aether_name', state.name);
      localStorage.setItem('aether_color', state.color);
      updateIdentityUI();

      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'set_profile',
          name: state.name,
          color: state.color,
          device: state.device
        }));
      }
      showToast('Identity updated');
    }
    el.profileModal.style.display = 'none';
  });

  // Sound Toggle
  el.soundToggleBtn.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    localStorage.setItem('aether_sound', state.soundEnabled);
    el.soundToggleBtn.style.opacity = state.soundEnabled ? '1' : '0.4';
    showToast(state.soundEnabled ? '🔊 Audio FX Active' : '🔇 Audio FX Muted');
  });

  el.navItems.forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
  }

  // --- Boot Matrix ---
  (async function init() {
    updateIdentityUI();
    if (state.e2eeSecret) {
      state.e2eeKey = await deriveKey(state.e2eeSecret);
      el.e2eeBtn.classList.add('active');
    }
    initRadar();
    connectMesh();
  })();

})();
