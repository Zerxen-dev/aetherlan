// GhostLAN Client Application
(function() {
  'use strict';

  // --- State Management ---
  const state = {
    myId: null,
    name: localStorage.getItem('ghost_name') || generateRandomCodename(),
    color: localStorage.getItem('ghost_color') || getRandomColor(),
    device: detectDeviceType(),
    soundEnabled: localStorage.getItem('ghost_sound') !== 'false',
    burnSeconds: 0,
    ws: null,
    activeTab: 'chatTab',
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
    isTyping: false
  };

  // --- DOM Elements ---
  const el = {
    status: document.getElementById('connectionStatus'),
    profileBtn: document.getElementById('profileBtn'),
    headerProfileName: document.getElementById('headerProfileName'),
    headerAvatarDot: document.getElementById('headerAvatarDot'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    soundIconOn: document.getElementById('soundIconOn'),
    qrModalBtn: document.getElementById('qrModalBtn'),
    navTabs: document.querySelectorAll('.nav-tab'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    unreadBadge: document.getElementById('unreadBadge'),
    fileCountBadge: document.getElementById('fileCountBadge'),
    peerCountBadge: document.getElementById('peerCountBadge'),
    // Chat
    chatStream: document.getElementById('chatStream'),
    chatForm: document.getElementById('chatForm'),
    messageInput: document.getElementById('messageInput'),
    burnToggleBtn: document.getElementById('burnToggleBtn'),
    burnerBar: document.getElementById('burnerBar'),
    burnOpts: document.querySelectorAll('.burn-opt'),
    attachFileBtn: document.getElementById('attachFileBtn'),
    filePickerInput: document.getElementById('filePickerInput'),
    typingIndicator: document.getElementById('typingIndicator'),
    typingText: document.getElementById('typingText'),
    voiceRecordBtn: document.getElementById('voiceRecordBtn'),
    voiceRecordingUI: document.getElementById('voiceRecordingUI'),
    recordTimer: document.getElementById('recordTimer'),
    cancelVoiceBtn: document.getElementById('cancelVoiceBtn'),
    sendVoiceBtn: document.getElementById('sendVoiceBtn'),
    // Dropzone
    largeDropZone: document.getElementById('largeDropZone'),
    browseFilesBtn: document.getElementById('browseFilesBtn'),
    uploadProgressBar: document.getElementById('uploadProgressBar'),
    uploadFileName: document.getElementById('uploadFileName'),
    uploadPercent: document.getElementById('uploadPercent'),
    progressFill: document.getElementById('progressFill'),
    fileGrid: document.getElementById('fileGrid'),
    filesSummaryText: document.getElementById('filesSummaryText'),
    // Clipboard
    clipboardText: document.getElementById('clipboardText'),
    clipboardMeta: document.getElementById('clipboardMeta'),
    copyClipBtn: document.getElementById('copyClipBtn'),
    broadcastClipBtn: document.getElementById('broadcastClipBtn'),
    clipCharCount: document.getElementById('clipCharCount'),
    // Radar
    peerList: document.getElementById('peerList'),
    lanUrlsList: document.getElementById('lanUrlsList'),
    // Modals
    profileModal: document.getElementById('profileModal'),
    closeProfileModal: document.getElementById('closeProfileModal'),
    profileForm: document.getElementById('profileForm'),
    customNameInput: document.getElementById('customNameInput'),
    colorPickerGrid: document.getElementById('colorPickerGrid'),
    randomizeProfileBtn: document.getElementById('randomizeProfileBtn'),
    qrModal: document.getElementById('qrModal'),
    closeQrModal: document.getElementById('closeQrModal'),
    qrCanvas: document.getElementById('qrCanvas'),
    primaryShareUrl: document.getElementById('primaryShareUrl'),
    copyShareUrlBtn: document.getElementById('copyShareUrlBtn'),
    toastContainer: document.getElementById('toastContainer')
  };

  // --- Sound FX Synthesizer (Web Audio API) ---
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playSound(type) {
    if (!state.soundEnabled) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      if (type === 'message') {
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'drop') {
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'pop') {
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {
      // Audio muted
    }
  }

  // --- Random Utilities ---
  function generateRandomCodename() {
    const prefixes = ['Cyber', 'Neon', 'Shadow', 'Ghost', 'Zero', 'Quantum', 'Pulse', 'Hyper', 'Dark', 'Nova'];
    const nouns = ['Fox', 'Raven', 'Phantom', 'Runner', 'Specter', 'Viper', 'Otter', 'Nexus', 'Drifter', 'Blade'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const n = nouns[Math.floor(Math.random() * nouns.length)];
    return `${p}${n}_${Math.floor(10 + Math.random() * 90)}`;
  }

  function getRandomColor() {
    const colors = ['#00f2fe', '#00ff87', '#ff007f', '#ffaa00', '#9d4edd', '#38ef7d', '#ff5252', '#4facfe'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function detectDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    el.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }

  function updateHeaderProfile() {
    el.headerProfileName.textContent = state.name;
    el.headerAvatarDot.style.backgroundColor = state.color;
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    el.navTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    el.tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === tabId));

    if (tabId === 'chatTab') {
      state.unreadCount = 0;
      el.unreadBadge.style.display = 'none';
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      el.chatStream.scrollTop = el.chatStream.scrollHeight;
    });
  }

  // --- WebSocket Connection ---
  function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    el.status.textContent = 'Connecting...';
    el.status.style.color = 'var(--text-muted)';

    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      el.status.textContent = 'LAN Active';
      el.status.style.color = 'var(--accent-emerald)';

      state.ws.send(JSON.stringify({
        type: 'set_profile',
        name: state.name,
        color: state.color,
        device: state.device
      }));
    };

    state.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWsMessage(msg);
      } catch (err) {
        console.error('WS Parse Error', err);
      }
    };

    state.ws.onclose = () => {
      el.status.textContent = 'Reconnecting...';
      el.status.style.color = 'var(--accent-orange)';
      setTimeout(initWebSocket, 2000);
    };

    state.ws.onerror = (err) => {
      console.error('WS Error', err);
    };
  }

  function handleWsMessage(data) {
    switch (data.type) {
      case 'init': {
        state.myId = data.yourId;
        state.peers = data.peers || [];
        state.messages = data.messages || [];
        state.files = data.files || [];
        state.localIPs = data.localIPs || [];
        state.port = data.port || 4000;

        renderPeers();
        renderAllMessages();
        renderFiles();
        if (data.clipboard) updateClipboardUI(data.clipboard);
        renderLanUrls();
        break;
      }

      case 'peer_joined': {
        state.peers = data.peers;
        renderPeers();
        if (data.peer.id !== state.myId) {
          showToast(`⚡ ${data.peer.name} joined LAN`);
          playSound('pop');
        }
        break;
      }

      case 'peer_updated':
      case 'peer_left': {
        state.peers = data.peers;
        renderPeers();
        break;
      }

      case 'new_message': {
        appendMessage(data.message);
        if (state.activeTab !== 'chatTab') {
          state.unreadCount++;
          el.unreadBadge.textContent = state.unreadCount;
          el.unreadBadge.style.display = 'inline-block';
        }
        playSound('message');
        break;
      }

      case 'message_burned': {
        removeBurnedMessage(data.messageId);
        break;
      }

      case 'reaction_updated': {
        updateMessageReactions(data.messageId, data.reactions);
        break;
      }

      case 'typing': {
        handleTypingBroadcast(data);
        break;
      }

      case 'file_list': {
        state.files = data.files;
        renderFiles();
        playSound('drop');
        break;
      }

      case 'clipboard_updated': {
        updateClipboardUI(data.clipboard);
        showToast('📋 Clipboard updated');
        break;
      }
    }
  }

  // --- Chat Stream Rendering ---
  function renderAllMessages() {
    el.chatStream.innerHTML = `
      <div class="system-message banner-welcome">
        <span class="system-tag">LAN ACTIVE</span>
        <p>Zero internet required. All messages, files & audio stay on this local Wi-Fi.</p>
      </div>
    `;
    state.messages.forEach(msg => appendMessage(msg, false));
    scrollToBottom();
  }

  function appendMessage(msg, shouldScroll = true) {
    const isSelf = msg.senderId === state.myId || msg.senderName === state.name;
    const row = document.createElement('div');
    row.className = `message-row ${isSelf ? 'self' : 'peer'}`;
    row.id = `msg_${msg.id}`;

    let contentHtml = '';

    if (msg.type === 'text') {
      contentHtml = escapeHTML(msg.text);
    } else if (msg.type === 'file') {
      contentHtml = `
        <div class="chat-file-card">
          <div class="chat-file-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div class="chat-file-info">
            <div class="chat-file-name">${escapeHTML(msg.file.originalName)}</div>
            <div class="chat-file-size">${formatBytes(msg.file.size)}</div>
          </div>
          <a href="${msg.file.url}?download=1" download="${escapeHTML(msg.file.originalName)}" class="chat-file-download" target="_blank">Download</a>
        </div>
      `;
    } else if (msg.type === 'voice') {
      contentHtml = `
        <div class="voice-msg-player">
          <button class="play-voice-btn" data-url="${msg.file.url}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
          <div class="voice-waveform">
            <span class="wave-bar" style="height: 40%"></span>
            <span class="wave-bar" style="height: 70%"></span>
            <span class="wave-bar" style="height: 100%"></span>
            <span class="wave-bar" style="height: 50%"></span>
            <span class="wave-bar" style="height: 85%"></span>
            <span class="wave-bar" style="height: 60%"></span>
            <span class="wave-bar" style="height: 90%"></span>
            <span class="wave-bar" style="height: 45%"></span>
          </div>
          <span class="voice-duration">Audio Note</span>
        </div>
      `;
    }

    const burnTag = msg.burnSeconds ? `<span class="burn-badge">🔥 ${msg.burnSeconds}s</span>` : '';

    row.innerHTML = `
      <div class="message-header">
        <span class="msg-sender" style="color: ${msg.senderColor || '#00f2fe'}">${escapeHTML(msg.senderName)}</span>
        <span class="msg-time">${formatTime(msg.timestamp)}</span>
        ${burnTag}
      </div>
      <div class="message-bubble">
        ${contentHtml}
        ${msg.burnSeconds ? `<div class="burn-timer-bar" id="burn_bar_${msg.id}"></div>` : ''}
      </div>
      <div class="msg-reactions" id="reactions_${msg.id}">
        <button class="react-trigger-btn" data-msgid="${msg.id}">+😀</button>
      </div>
    `;

    el.chatStream.appendChild(row);

    if (msg.burnSeconds && msg.burnsAt) {
      startBurnCountdown(msg.id, msg.burnSeconds, msg.burnsAt);
    }

    renderReactionsList(msg.id, msg.reactions);
    if (shouldScroll) scrollToBottom();
  }

  function startBurnCountdown(msgId, sec, burnsAt) {
    const bar = document.getElementById(`burn_bar_${msgId}`);
    if (!bar) return;
    const remaining = burnsAt - Date.now();
    const pct = Math.max(0, (remaining / (sec * 1000)) * 100);
    bar.style.width = `${pct}%`;

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

  function removeBurnedMessage(msgId) {
    const row = document.getElementById(`msg_${msgId}`);
    if (row) {
      row.style.transition = 'opacity 0.3s, transform 0.3s';
      row.style.opacity = '0';
      row.style.transform = 'scale(0.9)';
      setTimeout(() => row.remove(), 300);
    }
  }

  // --- Reactions ---
  const EMOJIS = ['🔥', '💀', '🚀', '⚡', '❤️', '😂'];

  function renderReactionsList(msgId, reactions = {}) {
    const container = document.getElementById(`reactions_${msgId}`);
    if (!container) return;

    let html = '';
    for (const [emoji, users] of Object.entries(reactions)) {
      if (users && users.length > 0) {
        const hasReacted = users.includes(state.name);
        html += `<button class="reaction-chip ${hasReacted ? 'reacted' : ''}" data-msgid="${msgId}" data-emoji="${emoji}">${emoji} ${users.length}</button>`;
      }
    }
    html += `<button class="react-trigger-btn" data-msgid="${msgId}">+😀</button>`;
    container.innerHTML = html;
  }

  function updateMessageReactions(msgId, reactions) {
    renderReactionsList(msgId, reactions);
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('.reaction-chip')) {
      const chip = e.target.closest('.reaction-chip');
      sendReaction(chip.dataset.msgid, chip.dataset.emoji);
      return;
    }

    if (e.target.closest('.react-trigger-btn')) {
      const trigger = e.target.closest('.react-trigger-btn');
      promptReaction(trigger.dataset.msgid, trigger);
      return;
    }

    if (e.target.closest('.play-voice-btn')) {
      const playBtn = e.target.closest('.play-voice-btn');
      playAudioClip(playBtn.dataset.url, playBtn);
      return;
    }
  });

  let activeAudio = null;
  function playAudioClip(url, btn) {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }
    const audio = new Audio(url);
    activeAudio = audio;
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    audio.play();
    audio.onended = () => {
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      activeAudio = null;
    };
  }

  function promptReaction(msgId, targetEl) {
    const existing = document.querySelector('.emoji-popover');
    if (existing) existing.remove();

    const pop = document.createElement('div');
    pop.className = 'emoji-popover';
    pop.style.cssText = `
      position: absolute;
      background: var(--bg-card);
      border: 1px solid var(--border-accent);
      border-radius: var(--radius-full);
      padding: 4px 8px;
      display: flex;
      gap: 6px;
      z-index: 50;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;

    EMOJIS.forEach(emoji => {
      const b = document.createElement('button');
      b.style.cssText = 'background:none; border:none; font-size:1.1rem; cursor:pointer; padding:2px;';
      b.textContent = emoji;
      b.onclick = () => {
        sendReaction(msgId, emoji);
        pop.remove();
      };
      pop.appendChild(b);
    });

    targetEl.parentElement.appendChild(pop);
    setTimeout(() => {
      document.addEventListener('click', function closeEmoji(ev) {
        if (!pop.contains(ev.target)) {
          pop.remove();
          document.removeEventListener('click', closeEmoji);
        }
      });
    }, 10);
  }

  function sendReaction(msgId, emoji) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'reaction', messageId: msgId, emoji }));
    }
  }

  // --- Input & Submit ---
  el.messageInput.addEventListener('input', () => {
    el.messageInput.style.height = 'auto';
    el.messageInput.style.height = Math.min(el.messageInput.scrollHeight, 120) + 'px';

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

  el.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = el.messageInput.value.trim();
    if (!text) return;

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'chat_message',
        text: text,
        burnSeconds: state.burnSeconds
      }));
      el.messageInput.value = '';
      el.messageInput.style.height = 'auto';
      state.isTyping = false;
      state.ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
    }
  });

  function handleTypingBroadcast(data) {
    if (data.isTyping) {
      el.typingText.textContent = `${data.name} is typing...`;
      el.typingIndicator.style.display = 'flex';
    } else {
      el.typingIndicator.style.display = 'none';
    }
  }

  el.burnToggleBtn.addEventListener('click', () => el.burnerBar.classList.toggle('open'));

  el.burnOpts.forEach(btn => {
    btn.addEventListener('click', () => {
      el.burnOpts.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.burnSeconds = parseInt(btn.dataset.sec, 10);
      showToast(state.burnSeconds > 0 ? `🔥 Burn mode: ${state.burnSeconds}s` : 'Burn mode Off');
    });
  });

  // --- Uploads (Zero-Dep Streaming API) ---
  el.attachFileBtn.addEventListener('click', () => el.filePickerInput.click());
  el.browseFilesBtn.addEventListener('click', () => el.filePickerInput.click());

  el.filePickerInput.addEventListener('change', () => {
    if (el.filePickerInput.files.length > 0) {
      uploadFile(el.filePickerInput.files[0]);
      el.filePickerInput.value = '';
    }
  });

  ['dragenter', 'dragover'].forEach(name => {
    el.largeDropZone.addEventListener(name, (e) => {
      e.preventDefault();
      el.largeDropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    el.largeDropZone.addEventListener(name, (e) => {
      e.preventDefault();
      el.largeDropZone.classList.remove('dragover');
    });
  });

  el.largeDropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  });

  function uploadFile(file, isVoice = false) {
    el.uploadProgressBar.style.display = 'block';
    el.uploadFileName.textContent = file.name || 'Uploading audio note...';
    el.uploadPercent.textContent = '0%';
    el.progressFill.style.width = '0%';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name || 'voice_note.webm'));
    xhr.setRequestHeader('X-Sender-Name', encodeURIComponent(state.name));
    xhr.setRequestHeader('X-Sender-Color', encodeURIComponent(state.color));
    xhr.setRequestHeader('X-Sender-Id', state.myId || 'anon');
    xhr.setRequestHeader('X-Is-Voice', isVoice ? 'true' : 'false');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        el.uploadPercent.textContent = `${pct}%`;
        el.progressFill.style.width = `${pct}%`;
      }
    };

    xhr.onload = () => {
      setTimeout(() => { el.uploadProgressBar.style.display = 'none'; }, 600);
      if (xhr.status >= 200 && xhr.status < 300) {
        showToast('🚀 Dropped to LAN!');
      } else {
        showToast('❌ Upload failed.');
      }
    };

    xhr.onerror = () => {
      el.uploadProgressBar.style.display = 'none';
      showToast('❌ Network error during upload.');
    };

    xhr.send(file);
  }

  function renderFiles() {
    el.fileCountBadge.textContent = state.files.length;
    el.filesSummaryText.textContent = `${state.files.length} files available`;

    if (state.files.length === 0) {
      el.fileGrid.innerHTML = '<div class="empty-state">No files uploaded yet. Drop a file to share with anyone on your Wi-Fi.</div>';
      return;
    }

    el.fileGrid.innerHTML = state.files.map(f => `
      <div class="file-card">
        <div class="chat-file-info">
          <div class="chat-file-name" title="${escapeHTML(f.originalName)}">${escapeHTML(f.originalName)}</div>
          <div class="chat-file-size">${formatBytes(f.size)} • By <span style="color:${f.senderColor}">${escapeHTML(f.senderName)}</span></div>
        </div>
        <a href="${f.url}?download=1" download="${escapeHTML(f.originalName)}" class="primary-btn small" target="_blank">
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

  // --- Voice Note Recording ---
  el.voiceRecordBtn.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.mediaRecorder = new MediaRecorder(stream);
      state.audioChunks = [];

      state.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) state.audioChunks.push(e.data);
      };

      state.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
      };

      state.mediaRecorder.start();
      state.recordStartTime = Date.now();
      el.voiceRecordingUI.style.display = 'flex';
      el.chatForm.style.display = 'none';

      state.recordInterval = setInterval(() => {
        const sec = Math.floor((Date.now() - state.recordStartTime) / 1000);
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        el.recordTimer.textContent = `${m}:${s}`;
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
    el.voiceRecordingUI.style.display = 'none';
    el.chatForm.style.display = 'flex';
    state.audioChunks = [];
  });

  el.sendVoiceBtn.addEventListener('click', () => {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.onstop = () => {
        const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        uploadFile(file, true);
        state.audioChunks = [];
      };
      state.mediaRecorder.stop();
    }
    clearInterval(state.recordInterval);
    el.voiceRecordingUI.style.display = 'none';
    el.chatForm.style.display = 'flex';
  });

  // --- Shared Clipboard ---
  el.clipboardText.addEventListener('input', () => {
    el.clipCharCount.textContent = `${el.clipboardText.value.length} characters`;
  });

  el.broadcastClipBtn.addEventListener('click', () => {
    const val = el.clipboardText.value;
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'clipboard_update', content: val }));
    }
  });

  el.copyClipBtn.addEventListener('click', async () => {
    const text = el.clipboardText.value;
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        el.clipboardText.select();
        document.execCommand('copy');
      }
      showToast('📋 Copied to clipboard!');
    } catch (e) {
      showToast('Copy failed.');
    }
  });

  function updateClipboardUI(clip) {
    state.clipboard = clip;
    el.clipboardText.value = clip.content || '';
    el.clipCharCount.textContent = `${(clip.content || '').length} characters`;
    el.clipboardMeta.textContent = clip.updatedBy ? `Updated by ${clip.updatedBy} at ${formatTime(clip.updatedAt)}` : 'Synced across all devices';
  }

  // --- Radar & Peers ---
  function renderPeers() {
    el.peerCountBadge.textContent = state.peers.length;
    el.peerList.innerHTML = state.peers.map(p => {
      const isMe = p.id === state.myId;
      return `
        <div class="peer-item">
          <div class="peer-meta">
            <span class="peer-dot" style="background: ${p.color || '#00f2fe'}"></span>
            <span class="peer-name">${escapeHTML(p.name)}</span>
            <span class="peer-device-badge">${p.device || 'Device'}</span>
          </div>
          ${isMe ? '<span class="peer-self-tag">YOU</span>' : ''}
        </div>
      `;
    }).join('');
  }

  function renderLanUrls() {
    const port = state.port || 4000;
    let html = `
      <div class="url-item">
        <code>http://localhost:${port}</code>
        <button class="copy-url-btn" data-url="http://localhost:${port}">Copy</button>
      </div>
    `;

    let primaryUrl = `http://localhost:${port}`;

    state.localIPs.forEach(net => {
      const url = `http://${net.address}:${port}`;
      primaryUrl = url;
      html += `
        <div class="url-item">
          <code>${url} (${net.interface})</code>
          <button class="copy-url-btn" data-url="${url}">Copy</button>
        </div>
      `;
    });

    el.lanUrlsList.innerHTML = html;
    el.primaryShareUrl.value = primaryUrl;
    generateQRCode(primaryUrl);
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('.copy-url-btn')) {
      const btn = e.target.closest('.copy-url-btn');
      const url = btn.dataset.url;
      navigator.clipboard.writeText(url).then(() => showToast('🔗 LAN URL copied!'));
    }
  });

  el.copyShareUrlBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(el.primaryShareUrl.value).then(() => showToast('🔗 Link copied!'));
  });

  function generateQRCode(url) {
    if (window.QRCode && el.qrCanvas) {
      QRCode.toCanvas(el.qrCanvas, url, {
        width: 220,
        margin: 1,
        color: { dark: '#090b10', light: '#ffffff' }
      }, (err) => {
        if (err) console.error('QR Error:', err);
      });
    }
  }

  // --- Modals & Profile ---
  el.profileBtn.addEventListener('click', () => {
    el.customNameInput.value = state.name;
    highlightActiveColor(state.color);
    el.profileModal.style.display = 'flex';
  });

  el.closeProfileModal.addEventListener('click', () => el.profileModal.style.display = 'none');
  el.qrModalBtn.addEventListener('click', () => el.qrModal.style.display = 'flex');
  el.closeQrModal.addEventListener('click', () => el.qrModal.style.display = 'none');

  function highlightActiveColor(color) {
    el.colorPickerGrid.querySelectorAll('.color-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === color);
    });
  }

  el.colorPickerGrid.addEventListener('click', (e) => {
    if (e.target.dataset.color) {
      highlightActiveColor(e.target.dataset.color);
    }
  });

  el.randomizeProfileBtn.addEventListener('click', () => {
    el.customNameInput.value = generateRandomCodename();
    highlightActiveColor(getRandomColor());
  });

  el.profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = el.customNameInput.value.trim();
    const activeSwatch = el.colorPickerGrid.querySelector('.color-swatch.active');
    const newColor = activeSwatch ? activeSwatch.dataset.color : state.color;

    if (newName) {
      state.name = newName;
      state.color = newColor;
      localStorage.setItem('ghost_name', state.name);
      localStorage.setItem('ghost_color', state.color);
      updateHeaderProfile();

      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'set_profile',
          name: state.name,
          color: state.color,
          device: state.device
        }));
      }
      showToast('Profile updated!');
    }
    el.profileModal.style.display = 'none';
  });

  el.soundToggleBtn.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    localStorage.setItem('ghost_sound', state.soundEnabled);
    el.soundToggleBtn.style.opacity = state.soundEnabled ? '1' : '0.4';
    showToast(state.soundEnabled ? '🔊 Sound FX On' : '🔇 Sound FX Muted');
  });

  el.navTabs.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // --- Start App ---
  updateHeaderProfile();
  initWebSocket();

})();
