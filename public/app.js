// AetherLAN — Mobile-First Matrix Client + WebRTC Call Engine
(function() {
  'use strict';

  // Persistent Device ID
  function getOrCreateDeviceId() {
    let devId = localStorage.getItem('aether_device_id');
    if (!devId) {
      devId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 8);
      localStorage.setItem('aether_device_id', devId);
    }
    return devId;
  }

  // State
  const state = {
    deviceId: getOrCreateDeviceId(),
    myId: null,
    name: localStorage.getItem('aether_user_name') || '',
    color: localStorage.getItem('aether_user_color') || '#0a84ff',
    isProfileSet: localStorage.getItem('aether_profile_set') === 'true',
    activeTab: 'chatView',
    unreadCount: 0,
    searchQuery: '',
    peers: [],
    messages: [],
    files: [],
    clipboard: { content: '', updatedAt: 0 },
    localIPs: [],
    port: 4000,
    mediaRecorder: null,
    audioChunks: [],
    recordTimer: null,
    recordStart: 0,
    typingTimer: null,
    isTyping: false,
    perms: { mic: false, cam: false, notif: false },
    // WebRTC Call State
    call: {
      active: false,
      peerId: null,
      peerName: 'Peer',
      peerColor: '#0a84ff',
      mode: 'audio', // 'audio' | 'video' | 'screen'
      localStream: null,
      remoteStream: null,
      pc: null,
      timerInterval: null,
      startTime: 0,
      micMuted: false,
      camOff: false,
      isScreenSharing: false,
      facingMode: 'user' // 'user' or 'environment'
    }
  };

  // DOM Elements
  const el = {
    profileBtn: document.getElementById('profileBtn'),
    userAvatar: document.getElementById('userAvatar'),
    networkInfoBtn: document.getElementById('networkInfoBtn'),
    onlineCountText: document.getElementById('onlineCountText'),
    searchToggleBtn: document.getElementById('searchToggleBtn'),
    searchDrawer: document.getElementById('searchDrawer'),
    searchInput: document.getElementById('searchInput'),
    closeSearchBtn: document.getElementById('closeSearchBtn'),
    permBtn: document.getElementById('permBtn'),
    qrBtn: document.getElementById('qrBtn'),
    permBanner: document.getElementById('permBanner'),
    grantAllPermsBtn: document.getElementById('grantAllPermsBtn'),
    dismissPermBannerBtn: document.getElementById('dismissPermBannerBtn'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    views: document.querySelectorAll('.view'),
    chatBadge: document.getElementById('chatBadge'),
    filesBadge: document.getElementById('filesBadge'),
    // Chat
    chatTimeline: document.getElementById('chatTimeline'),
    typingStatus: document.getElementById('typingStatus'),
    typingName: document.getElementById('typingName'),
    attachBtn: document.getElementById('attachBtn'),
    cameraBtn: document.getElementById('cameraBtn'),
    fileAttachmentInput: document.getElementById('fileAttachmentInput'),
    cameraInput: document.getElementById('cameraInput'),
    msgInput: document.getElementById('msgInput'),
    voiceBtn: document.getElementById('voiceBtn'),
    sendBtn: document.getElementById('sendBtn'),
    voiceOverlay: document.getElementById('voiceOverlay'),
    recTimer: document.getElementById('recTimer'),
    cancelRecBtn: document.getElementById('cancelRecBtn'),
    sendRecBtn: document.getElementById('sendRecBtn'),
    // Files
    uploadBanner: document.getElementById('uploadBanner'),
    selectFilesBtn: document.getElementById('selectFilesBtn'),
    uploadProgressBox: document.getElementById('uploadProgressBox'),
    uploadFileName: document.getElementById('uploadFileName'),
    uploadPercentage: document.getElementById('uploadPercentage'),
    progressBar: document.getElementById('progressBar'),
    filesCount: document.getElementById('filesCount'),
    fileList: document.getElementById('fileList'),
    // Clipboard
    clipText: document.getElementById('clipText'),
    clipUpdated: document.getElementById('clipUpdated'),
    copyClipBtn: document.getElementById('copyClipBtn'),
    clearClipBtn: document.getElementById('clearClipBtn'),
    syncClipBtn: document.getElementById('syncClipBtn'),
    clipCharCount: document.getElementById('clipCharCount'),
    // Welcome Modal
    welcomeModal: document.getElementById('welcomeModal'),
    welcomeForm: document.getElementById('welcomeForm'),
    welcomeNameInput: document.getElementById('welcomeNameInput'),
    welcomeAvatarCircle: document.getElementById('welcomeAvatarCircle'),
    welcomeColorRow: document.getElementById('welcomeColorRow'),
    welcomeRandomBtn: document.getElementById('welcomeRandomBtn'),
    // Calls & Media
    startCallBtn: document.getElementById('startCallBtn'),
    startCallSheet: document.getElementById('startCallSheet'),
    closeStartCallBackdrop: document.getElementById('closeStartCallBackdrop'),
    callOverlay: document.getElementById('callOverlay'),
    remoteVideo: document.getElementById('remoteVideo'),
    remoteAudio: document.getElementById('remoteAudio'),
    localVideo: document.getElementById('localVideo'),
    audioCallDisplay: document.getElementById('audioCallDisplay'),
    callPeerAvatar: document.getElementById('callPeerAvatar'),
    callPeerName: document.getElementById('callPeerName'),
    callTimer: document.getElementById('callTimer'),
    toggleMicBtn: document.getElementById('toggleMicBtn'),
    toggleCamBtn: document.getElementById('toggleCamBtn'),
    toggleScreenBtn: document.getElementById('toggleScreenBtn'),
    flipCamBtn: document.getElementById('flipCamBtn'),
    endCallBtn: document.getElementById('endCallBtn'),
    // Incoming Call Modal
    incomingCallSheet: document.getElementById('incomingCallSheet'),
    incomingAvatar: document.getElementById('incomingAvatar'),
    incomingCallerName: document.getElementById('incomingCallerName'),
    incomingCallType: document.getElementById('incomingCallType'),
    acceptCallBtn: document.getElementById('acceptCallBtn'),
    declineCallBtn: document.getElementById('declineCallBtn'),
    // Devices Sheet
    devicesSheet: document.getElementById('devicesSheet'),
    closeDevicesBackdrop: document.getElementById('closeDevicesBackdrop'),
    devicesList: document.getElementById('devicesList'),
    exportChatBtn: document.getElementById('exportChatBtn'),
    // Permissions Sheet
    permSheet: document.getElementById('permSheet'),
    closePermBackdrop: document.getElementById('closePermBackdrop'),
    reqMicBtn: document.getElementById('reqMicBtn'),
    reqCamBtn: document.getElementById('reqCamBtn'),
    reqNotifBtn: document.getElementById('reqNotifBtn'),
    grantAllSheetBtn: document.getElementById('grantAllSheetBtn'),
    // Lightbox
    lightboxOverlay: document.getElementById('lightboxOverlay'),
    closeLightboxBtn: document.getElementById('closeLightboxBtn'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxDownloadBtn: document.getElementById('lightboxDownloadBtn'),
    // Profile & QR Sheets
    profileSheet: document.getElementById('profileSheet'),
    closeProfileBackdrop: document.getElementById('closeProfileBackdrop'),
    profileForm: document.getElementById('profileForm'),
    nameInput: document.getElementById('nameInput'),
    colorRow: document.getElementById('colorRow'),
    randomizeNameBtn: document.getElementById('randomizeNameBtn'),
    qrSheet: document.getElementById('qrSheet'),
    closeQrBackdrop: document.getElementById('closeQrBackdrop'),
    qrCodeContainer: document.getElementById('qrCodeContainer'),
    shareUrl: document.getElementById('shareUrl'),
    copyShareUrlBtn: document.getElementById('copyShareUrlBtn'),
    toastWrapper: document.getElementById('toastWrapper')
  };

  const RANDOM_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Dev', 'Echo', 'Phoenix', 'Kai', 'Sky', 'Nova'];
  const COLOR_LIST = ['#0a84ff', '#30d158', '#ff375f', '#ffd60a', '#bf5af2', '#64d2ff', '#ff9f0a'];

  function getRandomName() {
    return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)] + '_' + Math.floor(10 + Math.random() * 90);
  }

  function haptic() {
    if (navigator.vibrate) navigator.vibrate(10);
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
    t.className = 'toast';
    t.textContent = msg;
    el.toastWrapper.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  function updateProfileDisplay() {
    const initial = (state.name || '?').charAt(0).toUpperCase();
    el.userAvatar.textContent = initial;
    el.userAvatar.style.backgroundColor = state.color;
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    el.tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    el.views.forEach(v => v.classList.toggle('active', v.id === tabId));

    if (tabId === 'chatView') {
      state.unreadCount = 0;
      el.chatBadge.style.display = 'none';
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      el.chatTimeline.scrollTop = el.chatTimeline.scrollHeight;
    });
  }

  // --- Onboarding Logic ---
  let welcomeSelectedColor = state.color || '#0a84ff';

  function initOnboarding() {
    if (!state.isProfileSet || !state.name) {
      const defaultName = getRandomName();
      el.welcomeNameInput.value = defaultName;
      updateWelcomeAvatar(defaultName, welcomeSelectedColor);
      el.welcomeModal.style.display = 'flex';
    } else {
      updateProfileDisplay();
      connect();
    }
  }

  function updateWelcomeAvatar(name, col) {
    const initial = (name || '?').charAt(0).toUpperCase();
    el.welcomeAvatarCircle.textContent = initial;
    el.welcomeAvatarCircle.style.backgroundColor = col;
  }

  el.welcomeNameInput.addEventListener('input', () => {
    updateWelcomeAvatar(el.welcomeNameInput.value, welcomeSelectedColor);
  });

  el.welcomeColorRow.addEventListener('click', (e) => {
    if (e.target.dataset.color) {
      welcomeSelectedColor = e.target.dataset.color;
      el.welcomeColorRow.querySelectorAll('.color-ball').forEach(b => {
        b.classList.toggle('active', b.dataset.color === welcomeSelectedColor);
      });
      updateWelcomeAvatar(el.welcomeNameInput.value, welcomeSelectedColor);
    }
  });

  el.welcomeRandomBtn.addEventListener('click', () => {
    const name = getRandomName();
    welcomeSelectedColor = COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)];
    el.welcomeNameInput.value = name;
    el.welcomeColorRow.querySelectorAll('.color-ball').forEach(b => {
      b.classList.toggle('active', b.dataset.color === welcomeSelectedColor);
    });
    updateWelcomeAvatar(name, welcomeSelectedColor);
    haptic();
  });

  el.welcomeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const chosenName = el.welcomeNameInput.value.trim();
    if (!chosenName) return;

    state.name = chosenName;
    state.color = welcomeSelectedColor;
    state.isProfileSet = true;

    localStorage.setItem('aether_user_name', state.name);
    localStorage.setItem('aether_user_color', state.color);
    localStorage.setItem('aether_profile_set', 'true');

    el.welcomeModal.style.display = 'none';
    updateProfileDisplay();
    connect();
    showToast(`👋 Welcome, ${state.name}!`);
    haptic();
  });

  // --- Permissions Management ---
  async function checkPermissions() {
    if (window.Notification) {
      state.perms.notif = Notification.permission === 'granted';
      updatePermBtn(el.reqNotifBtn, state.perms.notif);
    }

    if (localStorage.getItem('aether_mic_granted') === 'true') {
      state.perms.mic = true;
      updatePermBtn(el.reqMicBtn, true);
    }
    if (localStorage.getItem('aether_cam_granted') === 'true') {
      state.perms.cam = true;
      updatePermBtn(el.reqCamBtn, true);
    }

    const dismissed = localStorage.getItem('aether_perm_banner_dismissed') === 'true';
    if (!dismissed && state.isProfileSet && (!state.perms.mic || !state.perms.cam || !state.perms.notif)) {
      el.permBanner.style.display = 'flex';
    }
  }

  function updatePermBtn(btn, isGranted) {
    if (!btn) return;
    if (isGranted) {
      btn.textContent = '✓ Granted';
      btn.classList.add('granted');
    } else {
      btn.textContent = 'Enable';
      btn.classList.remove('granted');
    }
  }

  async function requestMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      state.perms.mic = true;
      localStorage.setItem('aether_mic_granted', 'true');
      updatePermBtn(el.reqMicBtn, true);
      showToast('🎙️ Microphone enabled');
      haptic();
      return true;
    } catch (e) {
      showToast('Microphone access denied');
      return false;
    }
  }

  async function requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      state.perms.cam = true;
      localStorage.setItem('aether_cam_granted', 'true');
      updatePermBtn(el.reqCamBtn, true);
      showToast('📸 Camera enabled');
      haptic();
      return true;
    } catch (e) {
      showToast('Camera access denied');
      return false;
    }
  }

  async function requestNotifications() {
    if (!window.Notification) return false;
    try {
      const res = await Notification.requestPermission();
      state.perms.notif = res === 'granted';
      updatePermBtn(el.reqNotifBtn, state.perms.notif);
      if (state.perms.notif) showToast('🔔 Notifications enabled');
      haptic();
      return state.perms.notif;
    } catch (e) {
      return false;
    }
  }

  async function grantAllPermissions() {
    await requestMicrophone();
    await requestCamera();
    await requestNotifications();
    el.permBanner.style.display = 'none';
    localStorage.setItem('aether_perm_banner_dismissed', 'true');
    showToast('✓ Permissions configured');
  }

  el.permBtn.addEventListener('click', () => {
    checkPermissions();
    el.permSheet.style.display = 'flex';
    haptic();
  });
  el.closePermBackdrop.addEventListener('click', () => el.permSheet.style.display = 'none');

  el.reqMicBtn.addEventListener('click', requestMicrophone);
  el.reqCamBtn.addEventListener('click', requestCamera);
  el.reqNotifBtn.addEventListener('click', requestNotifications);
  el.grantAllSheetBtn.addEventListener('click', async () => {
    await grantAllPermissions();
    el.permSheet.style.display = 'none';
  });

  el.grantAllPermsBtn.addEventListener('click', grantAllPermissions);
  el.dismissPermBannerBtn.addEventListener('click', () => {
    el.permBanner.style.display = 'none';
    localStorage.setItem('aether_perm_banner_dismissed', 'true');
  });

  function notifyUser(title, body) {
    if (document.hidden && window.Notification && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {}
    }
  }

  // --- WebSocket Connection ---
  let ws = null;
  function connect() {
    if (!state.name) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'set_profile',
        deviceId: state.deviceId,
        name: state.name,
        color: state.color,
        device: 'Mobile'
      }));
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        handleMessage(data);
      } catch (err) {}
    };

    ws.onclose = () => {
      setTimeout(connect, 2000);
    };
  }

  function handleMessage(data) {
    switch (data.type) {
      case 'init': {
        state.myId = data.yourId;
        state.peers = data.peers || [];
        state.messages = data.messages || [];
        state.files = data.files || [];
        state.localIPs = data.localIPs || [];
        state.port = data.port || 4000;

        updatePeersCount();
        renderAllMessages();
        renderFiles();
        if (data.clipboard) updateClipboardUI(data.clipboard);
        renderQR();
        break;
      }

      case 'peer_joined':
      case 'peer_left':
      case 'peer_updated': {
        state.peers = data.peers;
        updatePeersCount();
        renderDevicesList();
        break;
      }

      case 'new_message': {
        state.messages.push(data.message);
        if (matchesSearch(data.message)) {
          appendMessage(data.message);
        }
        if (state.activeTab !== 'chatView') {
          state.unreadCount++;
          el.chatBadge.textContent = state.unreadCount;
          el.chatBadge.style.display = 'inline-block';
        }

        if (data.message.senderId !== state.myId && data.message.senderName !== state.name) {
          notifyUser(`AetherLAN: ${data.message.senderName}`, data.message.text || 'Shared a file');
        }
        haptic();
        break;
      }

      case 'typing': {
        if (data.isTyping) {
          el.typingName.textContent = data.name;
          el.typingStatus.style.display = 'block';
        } else {
          el.typingStatus.style.display = 'none';
        }
        break;
      }

      case 'file_list': {
        state.files = data.files;
        renderFiles();
        break;
      }

      case 'clipboard_updated': {
        updateClipboardUI(data.clipboard);
        showToast('📋 Clipboard updated');
        break;
      }

      // WebRTC Call Signaling Messages
      case 'incoming_call': {
        if (!state.call.active) {
          showIncomingCallModal(data);
        }
        break;
      }

      case 'call_accepted': {
        handleCallAccepted(data);
        break;
      }

      case 'call_declined': {
        showToast(`${data.peerName || 'Peer'} declined the call`);
        endCall(false);
        break;
      }

      case 'webrtc_offer': {
        handleWebRTCOffer(data);
        break;
      }

      case 'webrtc_answer': {
        handleWebRTCAnswer(data);
        break;
      }

      case 'webrtc_ice': {
        handleWebRTCIce(data);
        break;
      }

      case 'call_ended': {
        showToast('Call ended by peer');
        endCall(false);
        break;
      }
    }
  }

  function updatePeersCount() {
    const count = state.peers.length;
    el.onlineCountText.textContent = count === 1 ? '1 Device Online' : `${count} Devices Online`;
  }

  // --- Search & Filter ---
  function matchesSearch(msg) {
    if (!state.searchQuery) return true;
    const q = state.searchQuery.toLowerCase();
    if (msg.type === 'text' && msg.text && msg.text.toLowerCase().includes(q)) return true;
    if (msg.file && msg.file.originalName && msg.file.originalName.toLowerCase().includes(q)) return true;
    if (msg.senderName && msg.senderName.toLowerCase().includes(q)) return true;
    return false;
  }

  el.searchToggleBtn.addEventListener('click', () => {
    const isVisible = el.searchDrawer.style.display === 'flex';
    el.searchDrawer.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) el.searchInput.focus();
    else {
      state.searchQuery = '';
      el.searchInput.value = '';
      renderAllMessages();
    }
  });

  el.closeSearchBtn.addEventListener('click', () => {
    el.searchDrawer.style.display = 'none';
    state.searchQuery = '';
    el.searchInput.value = '';
    renderAllMessages();
  });

  el.searchInput.addEventListener('input', () => {
    state.searchQuery = el.searchInput.value.trim();
    renderAllMessages();
  });

  // --- Chat Stream ---
  function renderAllMessages() {
    el.chatTimeline.innerHTML = `<div class="date-chip"><span>DIRECT WI-FI • ZERO CLOUD</span></div>`;
    const filtered = state.messages.filter(matchesSearch);
    filtered.forEach(m => appendMessage(m, false));
    scrollToBottom();
  }

  function appendMessage(msg, shouldScroll = true) {
    const isSelf = msg.senderId === state.myId || msg.senderName === state.name;
    const row = document.createElement('div');
    row.className = `msg-row ${isSelf ? 'self' : 'peer'}`;

    let body = '';

    if (msg.type === 'text') {
      body = formatMessageText(escapeHTML(msg.text));
    } else if (msg.type === 'file') {
      const isImg = msg.file.mimeType && msg.file.mimeType.startsWith('image/');
      if (isImg) {
        body = `
          <img src="${msg.file.url}" class="chat-img-preview" alt="${escapeHTML(msg.file.originalName)}" data-full="${msg.file.url}" data-name="${escapeHTML(msg.file.originalName)}">
          <div class="file-size-text" style="margin-top:2px;">${formatBytes(msg.file.size)}</div>
        `;
      } else {
        body = `
          <div class="file-card-chat">
            <div class="file-icon-box">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div class="file-details">
              <div class="file-name-text">${escapeHTML(msg.file.originalName)}</div>
              <div class="file-size-text">${formatBytes(msg.file.size)}</div>
            </div>
            <a href="${msg.file.url}?download=1" download="${escapeHTML(msg.file.originalName)}" class="file-dl-btn" target="_blank">Get</a>
          </div>
        `;
      }
    } else if (msg.type === 'voice') {
      body = `
        <div class="voice-bubble-player">
          <button class="voice-play-circle" data-url="${msg.file.url}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
          <div class="voice-bars">
            <span class="voice-bar" style="height:6px"></span>
            <span class="voice-bar" style="height:14px"></span>
            <span class="voice-bar" style="height:18px"></span>
            <span class="voice-bar" style="height:10px"></span>
            <span class="voice-bar" style="height:16px"></span>
            <span class="voice-bar" style="height:8px"></span>
          </div>
          <span class="voice-dur">Voice</span>
        </div>
      `;
    }

    row.innerHTML = `
      ${!isSelf ? `<span class="msg-sender-tag" style="color:${msg.senderColor || '#0a84ff'}">${escapeHTML(msg.senderName)}</span>` : ''}
      <div class="bubble">
        ${body}
        <div class="bubble-footer">
          <span>${formatTime(msg.timestamp)}</span>
        </div>
      </div>
    `;

    el.chatTimeline.appendChild(row);
    if (shouldScroll) scrollToBottom();
  }

  function formatMessageText(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:inherit; text-decoration:underline;">$1</a>');
  }

  // --- Lightbox & Image Viewer ---
  document.addEventListener('click', (e) => {
    if (e.target.closest('.chat-img-preview')) {
      const img = e.target.closest('.chat-img-preview');
      el.lightboxImg.src = img.dataset.full;
      el.lightboxDownloadBtn.href = img.dataset.full + '?download=1';
      el.lightboxDownloadBtn.setAttribute('download', img.dataset.name);
      el.lightboxOverlay.style.display = 'flex';
      haptic();
      return;
    }
  });

  el.closeLightboxBtn.addEventListener('click', () => el.lightboxOverlay.style.display = 'none');
  el.lightboxOverlay.addEventListener('click', (e) => {
    if (e.target === el.lightboxOverlay) el.lightboxOverlay.style.display = 'none';
  });

  // --- Voice Player ---
  let activeAudio = null;
  document.addEventListener('click', (e) => {
    if (e.target.closest('.voice-play-circle')) {
      const btn = e.target.closest('.voice-play-circle');
      const url = btn.dataset.url;

      if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
        document.querySelectorAll('.voice-play-circle').forEach(b => {
          b.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        });
      }

      const audio = new Audio(url);
      activeAudio = audio;
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
      audio.play();
      audio.onended = () => {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        activeAudio = null;
      };
    }
  });

  // --- Mobile Input & Send ---
  el.msgInput.addEventListener('input', () => {
    el.msgInput.style.height = 'auto';
    el.msgInput.style.height = Math.min(el.msgInput.scrollHeight, 110) + 'px';

    const hasText = el.msgInput.value.trim().length > 0;
    el.sendBtn.style.display = hasText ? 'flex' : 'none';
    el.voiceBtn.style.display = hasText ? 'none' : 'flex';

    if (!state.isTyping && ws && ws.readyState === WebSocket.OPEN) {
      state.isTyping = true;
      ws.send(JSON.stringify({ type: 'typing', isTyping: true }));
    }
    clearTimeout(state.typingTimer);
    state.typingTimer = setTimeout(() => {
      state.isTyping = false;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
      }
    }, 1500);
  });

  el.sendBtn.addEventListener('click', sendMessage);
  el.msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function sendMessage() {
    const text = el.msgInput.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      type: 'chat_message',
      text: text
    }));

    el.msgInput.value = '';
    el.msgInput.style.height = 'auto';
    el.sendBtn.style.display = 'none';
    el.voiceBtn.style.display = 'flex';
    state.isTyping = false;
    ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
    haptic();
  }

  // --- File Upload & Camera ---
  el.attachBtn.addEventListener('click', () => el.fileAttachmentInput.click());
  el.cameraBtn.addEventListener('click', async () => {
    if (!state.perms.cam) await requestCamera();
    el.cameraInput.click();
  });
  el.selectFilesBtn.addEventListener('click', () => el.fileAttachmentInput.click());

  el.fileAttachmentInput.addEventListener('change', () => {
    if (el.fileAttachmentInput.files.length > 0) {
      Array.from(el.fileAttachmentInput.files).forEach(f => upload(f));
      el.fileAttachmentInput.value = '';
    }
  });

  el.cameraInput.addEventListener('change', () => {
    if (el.cameraInput.files.length > 0) {
      upload(el.cameraInput.files[0]);
      el.cameraInput.value = '';
    }
  });

  function upload(file, isVoice = false) {
    el.uploadProgressBox.style.display = 'block';
    el.uploadFileName.textContent = file.name || 'Voice memo';
    el.uploadPercentage.textContent = '0%';
    el.progressBar.style.width = '0%';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name || 'voice.webm'));
    xhr.setRequestHeader('X-Sender-Name', encodeURIComponent(state.name));
    xhr.setRequestHeader('X-Sender-Color', encodeURIComponent(state.color));
    xhr.setRequestHeader('X-Sender-Id', state.myId || 'anon');
    xhr.setRequestHeader('X-Is-Voice', isVoice ? 'true' : 'false');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        el.uploadPercentage.textContent = `${pct}%`;
        el.progressBar.style.width = `${pct}%`;
      }
    };

    xhr.onload = () => {
      setTimeout(() => { el.uploadProgressBox.style.display = 'none'; }, 400);
      if (xhr.status >= 200 && xhr.status < 300) {
        showToast('✓ Shared on Wi-Fi');
        haptic();
      } else {
        showToast('Upload failed');
      }
    };

    xhr.onerror = () => {
      el.uploadProgressBox.style.display = 'none';
      showToast('Network error');
    };

    xhr.send(file);
  }

  function renderFiles() {
    el.filesBadge.textContent = state.files.length;
    el.filesCount.textContent = `${state.files.length} files`;

    if (state.files.length === 0) {
      el.fileList.innerHTML = '<div class="empty-state">No files shared yet. Tap Choose Files to share.</div>';
      return;
    }

    el.fileList.innerHTML = state.files.map(f => `
      <div class="file-item-card">
        <div class="file-item-info">
          <div class="file-item-name">${escapeHTML(f.originalName)}</div>
          <div class="file-item-sub">${formatBytes(f.size)} • ${escapeHTML(f.senderName)}</div>
        </div>
        <a href="${f.url}?download=1" download="${escapeHTML(f.originalName)}" class="pill-btn primary small" target="_blank">
          Download
        </a>
      </div>
    `).join('');
  }

  // --- Voice Recording ---
  el.voiceBtn.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.perms.mic = true;
      localStorage.setItem('aether_mic_granted', 'true');
      state.mediaRecorder = new MediaRecorder(stream);
      state.audioChunks = [];

      state.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) state.audioChunks.push(e.data);
      };

      state.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
      };

      state.mediaRecorder.start();
      state.recordStart = Date.now();
      el.voiceOverlay.style.display = 'flex';

      state.recordTimer = setInterval(() => {
        const sec = Math.floor((Date.now() - state.recordStart) / 1000);
        const m = Math.floor(sec / 60);
        const s = String(sec % 60).padStart(2, '0');
        el.recTimer.textContent = `${m}:${s}`;
      }, 1000);

      haptic();
    } catch (err) {
      showToast('Microphone access required');
      checkPermissions();
      el.permSheet.style.display = 'flex';
    }
  });

  el.cancelRecBtn.addEventListener('click', () => {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.stop();
    }
    clearInterval(state.recordTimer);
    el.voiceOverlay.style.display = 'none';
    state.audioChunks = [];
  });

  el.sendRecBtn.addEventListener('click', () => {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.onstop = () => {
        const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        upload(file, true);
        state.audioChunks = [];
      };
      state.mediaRecorder.stop();
    }
    clearInterval(state.recordTimer);
    el.voiceOverlay.style.display = 'none';
  });

  // --- Clipboard ---
  el.clipText.addEventListener('input', () => {
    el.clipCharCount.textContent = `${el.clipText.value.length} characters`;
  });

  el.syncClipBtn.addEventListener('click', () => {
    const val = el.clipText.value;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'clipboard_update', content: val }));
      showToast('✓ Synced to all devices');
      haptic();
    }
  });

  el.clearClipBtn.addEventListener('click', () => {
    el.clipText.value = '';
    el.clipCharCount.textContent = '0 characters';
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'clipboard_update', content: '' }));
      showToast('✓ Clipboard cleared');
    }
  });

  el.copyClipBtn.addEventListener('click', async () => {
    const text = el.clipText.value;
    if (!text) return;
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else {
        el.clipText.select();
        document.execCommand('copy');
      }
      showToast('✓ Copied to clipboard');
      haptic();
    } catch (e) {}
  });

  function updateClipboardUI(clip) {
    state.clipboard = clip;
    el.clipText.value = clip.content || '';
    el.clipCharCount.textContent = `${(clip.content || '').length} characters`;
    el.clipUpdated.textContent = clip.updatedBy ? `Updated by ${clip.updatedBy} (${formatTime(clip.updatedAt)})` : 'Live sync across all devices';
  }

  // ==========================================================================
  // WEBRTC CALL ENGINE (VOICE, VIDEO, SCREENSHARE)
  // ==========================================================================
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  el.startCallBtn.addEventListener('click', () => {
    el.startCallSheet.style.display = 'flex';
    haptic();
  });
  el.closeStartCallBackdrop.addEventListener('click', () => el.startCallSheet.style.display = 'none');

  document.querySelectorAll('.call-type-card').forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.dataset.calltype;
      el.startCallSheet.style.display = 'none';
      initiateCall(mode);
    });
  });

  async function initiateCall(mode) {
    try {
      state.call.mode = mode;
      await obtainLocalMedia(mode);

      state.call.active = true;
      state.call.peerName = 'Calling Room...';
      state.call.peerColor = '#0a84ff';

      showCallOverlay();

      // Broadcast call initiation over WebSocket
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call_initiate',
          callMode: mode
        }));
      }

      showToast(`📞 Calling on Wi-Fi (${mode})...`);
      haptic();
    } catch (err) {
      showToast('Could not access media: ' + err.message);
      endCall(false);
    }
  }

  async function obtainLocalMedia(mode) {
    let stream;
    if (mode === 'audio') {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } else if (mode === 'video') {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: state.call.facingMode }
      });
    } else if (mode === 'screen') {
      if (navigator.mediaDevices.getDisplayMedia) {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
    }
    state.call.localStream = stream;

    if (mode === 'video' || mode === 'screen') {
      el.localVideo.srcObject = stream;
      el.localVideo.style.display = 'block';
      el.flipCamBtn.style.display = mode === 'video' ? 'flex' : 'none';
    } else {
      el.localVideo.style.display = 'none';
      el.flipCamBtn.style.display = 'none';
    }

    return stream;
  }

  // Incoming Call Handler
  let pendingIncomingCall = null;
  function showIncomingCallModal(data) {
    pendingIncomingCall = data;
    el.incomingCallerName.textContent = data.callerName || 'Peer';
    el.incomingAvatar.textContent = (data.callerName || '?').charAt(0).toUpperCase();
    el.incomingAvatar.style.backgroundColor = data.callerColor || '#0a84ff';
    el.incomingCallType.textContent = `Incoming ${data.callMode.toUpperCase()} Call...`;
    el.incomingCallSheet.style.display = 'flex';
    haptic();
  }

  el.declineCallBtn.addEventListener('click', () => {
    if (pendingIncomingCall && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_decline',
        callerId: pendingIncomingCall.callerId
      }));
    }
    el.incomingCallSheet.style.display = 'none';
    pendingIncomingCall = null;
  });

  el.acceptCallBtn.addEventListener('click', async () => {
    if (!pendingIncomingCall) return;
    const callData = pendingIncomingCall;
    el.incomingCallSheet.style.display = 'none';

    try {
      state.call.mode = callData.callMode || 'audio';
      state.call.peerId = callData.callerId;
      state.call.peerName = callData.callerName;
      state.call.peerColor = callData.callerColor;

      await obtainLocalMedia(state.call.mode);
      state.call.active = true;
      showCallOverlay();

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call_accept',
          callerId: callData.callerId
        }));
      }

      setupPeerConnection(callData.callerId, false);
      pendingIncomingCall = null;
    } catch (err) {
      showToast('Failed to accept call: ' + err.message);
      endCall(false);
    }
  });

  async function handleCallAccepted(data) {
    state.call.peerId = data.peerId;
    state.call.peerName = data.peerName;
    state.call.peerColor = data.peerColor;
    updateCallOverlayUI();
    setupPeerConnection(data.peerId, true);
  }

  function setupPeerConnection(targetPeerId, isCaller) {
    if (state.call.pc) {
      state.call.pc.close();
    }

    const pc = new RTCPeerConnection(rtcConfig);
    state.call.pc = pc;

    // Add local tracks
    if (state.call.localStream) {
      state.call.localStream.getTracks().forEach(track => {
        pc.addTrack(track, state.call.localStream);
      });
    }

    // Handle remote track
    pc.ontrack = (event) => {
      state.call.remoteStream = event.streams[0];
      if (event.track.kind === 'video') {
        el.remoteVideo.srcObject = event.streams[0];
        el.remoteVideo.style.display = 'block';
        el.audioCallDisplay.style.display = 'none';
      } else if (event.track.kind === 'audio') {
        el.remoteAudio.srcObject = event.streams[0];
      }
    };

    // ICE Candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'webrtc_ice',
          targetId: targetPeerId,
          candidate: event.candidate
        }));
      }
    };

    if (isCaller) {
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'webrtc_offer',
              targetId: targetPeerId,
              offer: pc.localDescription,
              callMode: state.call.mode
            }));
          }
        })
        .catch(err => console.error('Offer error:', err));
    }
  }

  async function handleWebRTCOffer(data) {
    if (!state.call.pc) {
      setupPeerConnection(data.fromId, false);
    }
    const pc = state.call.pc;
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'webrtc_answer',
        targetId: data.fromId,
        answer: answer
      }));
    }
  }

  async function handleWebRTCAnswer(data) {
    if (state.call.pc) {
      await state.call.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  }

  async function handleWebRTCIce(data) {
    if (state.call.pc && data.candidate) {
      try {
        await state.call.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {}
    }
  }

  function showCallOverlay() {
    updateCallOverlayUI();
    el.callOverlay.style.display = 'flex';
    startCallTimer();
  }

  function updateCallOverlayUI() {
    el.callPeerName.textContent = state.call.peerName;
    el.callPeerAvatar.textContent = (state.call.peerName || '?').charAt(0).toUpperCase();
    el.callPeerAvatar.style.backgroundColor = state.call.peerColor || '#0a84ff';

    if (state.call.mode === 'audio') {
      el.remoteVideo.style.display = 'none';
      el.audioCallDisplay.style.display = 'flex';
    } else {
      el.remoteVideo.style.display = 'block';
      el.audioCallDisplay.style.display = 'none';
    }
  }

  function startCallTimer() {
    state.call.startTime = Date.now();
    clearInterval(state.call.timerInterval);
    state.call.timerInterval = setInterval(() => {
      const sec = Math.floor((Date.now() - state.call.startTime) / 1000);
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      el.callTimer.textContent = `${m}:${s}`;
    }, 1000);
  }

  // Call Controls: Mute, Cam, Screen, Flip, Hang up
  el.toggleMicBtn.addEventListener('click', () => {
    if (state.call.localStream) {
      const audioTrack = state.call.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        state.call.micMuted = !audioTrack.enabled;
        el.toggleMicBtn.classList.toggle('muted', state.call.micMuted);
        showToast(state.call.micMuted ? 'Mic Muted' : 'Mic Unmuted');
        haptic();
      }
    }
  });

  el.toggleCamBtn.addEventListener('click', async () => {
    if (!state.call.localStream) return;
    const videoTrack = state.call.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      state.call.camOff = !videoTrack.enabled;
      el.toggleCamBtn.classList.toggle('muted', state.call.camOff);
      el.localVideo.style.display = state.call.camOff ? 'none' : 'block';
    } else {
      // Add video track dynamically
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = camStream.getVideoTracks()[0];
        state.call.localStream.addTrack(newTrack);
        if (state.call.pc) {
          state.call.pc.addTrack(newTrack, state.call.localStream);
        }
        el.localVideo.srcObject = state.call.localStream;
        el.localVideo.style.display = 'block';
        el.toggleCamBtn.classList.add('active');
      } catch (e) {}
    }
    haptic();
  });

  el.toggleScreenBtn.addEventListener('click', async () => {
    if (navigator.mediaDevices.getDisplayMedia) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        if (state.call.pc) {
          const sender = state.call.pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
          else state.call.pc.addTrack(screenTrack, screenStream);
        }

        el.localVideo.srcObject = screenStream;
        el.localVideo.style.display = 'block';
        state.call.isScreenSharing = true;
        el.toggleScreenBtn.classList.add('active');
        showToast('🖥️ Screen sharing active');

        screenTrack.onended = () => {
          state.call.isScreenSharing = false;
          el.toggleScreenBtn.classList.remove('active');
        };
        haptic();
      } catch (err) {}
    }
  });

  el.flipCamBtn.addEventListener('click', async () => {
    state.call.facingMode = state.call.facingMode === 'user' ? 'environment' : 'user';
    if (state.call.localStream) {
      const oldTrack = state.call.localStream.getVideoTracks()[0];
      if (oldTrack) oldTrack.stop();

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: state.call.facingMode }
      });
      const newTrack = newStream.getVideoTracks()[0];
      state.call.localStream.removeTrack(oldTrack);
      state.call.localStream.addTrack(newTrack);

      if (state.call.pc) {
        const sender = state.call.pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(newTrack);
      }
      el.localVideo.srcObject = state.call.localStream;
      haptic();
    }
  });

  el.endCallBtn.addEventListener('click', () => {
    endCall(true);
  });

  function endCall(notifyServer = true) {
    if (notifyServer && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'call_end' }));
    }

    if (state.call.localStream) {
      state.call.localStream.getTracks().forEach(t => t.stop());
      state.call.localStream = null;
    }

    if (state.call.pc) {
      state.call.pc.close();
      state.call.pc = null;
    }

    clearInterval(state.call.timerInterval);
    el.callOverlay.style.display = 'none';
    el.localVideo.srcObject = null;
    el.remoteVideo.srcObject = null;
    el.remoteAudio.srcObject = null;
    state.call.active = false;
    haptic();
  }

  // --- Connected Devices Sheet ---
  el.networkInfoBtn.addEventListener('click', () => {
    renderDevicesList();
    el.devicesSheet.style.display = 'flex';
    haptic();
  });

  el.closeDevicesBackdrop.addEventListener('click', () => el.devicesSheet.style.display = 'none');

  function renderDevicesList() {
    if (state.peers.length === 0) {
      el.devicesList.innerHTML = '<div class="empty-state">1 Device Active (You)</div>';
      return;
    }
    el.devicesList.innerHTML = state.peers.map(p => {
      const isMe = p.id === state.myId || p.name === state.name;
      return `
        <div class="device-row">
          <div class="device-info">
            <span class="device-dot" style="background:${p.color || '#0a84ff'}"></span>
            <span class="device-name">${escapeHTML(p.name)}</span>
          </div>
          ${isMe ? '<span class="device-you-tag">YOU</span>' : '<span style="font-size:0.72rem; color:var(--text-muted)">Online</span>'}
        </div>
      `;
    }).join('');
  }

  // Export Chat Backup
  el.exportChatBtn.addEventListener('click', () => {
    let log = `=== AETHERLAN CHAT BACKUP (${new Date().toLocaleString()}) ===\n\n`;
    state.messages.forEach(m => {
      const time = new Date(m.timestamp).toLocaleTimeString();
      if (m.type === 'text') {
        log += `[${time}] ${m.senderName}: ${m.text}\n`;
      } else if (m.type === 'file') {
        log += `[${time}] ${m.senderName} [FILE]: ${m.file.originalName} (${formatBytes(m.file.size)})\n`;
      } else if (m.type === 'voice') {
        log += `[${time}] ${m.senderName} [VOICE MEMO]\n`;
      }
    });

    const blob = new Blob([log], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aetherlan_chat_${Date.now()}.txt`;
    a.click();
    showToast('✓ Chat exported');
    haptic();
  });

  // --- Profile Sheet ---
  el.profileBtn.addEventListener('click', () => {
    el.nameInput.value = state.name;
    highlightColor(state.color);
    el.profileSheet.style.display = 'flex';
  });

  el.closeProfileBackdrop.addEventListener('click', () => el.profileSheet.style.display = 'none');
  el.qrBtn.addEventListener('click', () => {
    renderQR();
    el.qrSheet.style.display = 'flex';
  });
  el.closeQrBackdrop.addEventListener('click', () => el.qrSheet.style.display = 'none');

  function highlightColor(col) {
    el.colorRow.querySelectorAll('.color-ball').forEach(b => {
      b.classList.toggle('active', b.dataset.color === col);
    });
  }

  el.colorRow.addEventListener('click', (e) => {
    if (e.target.dataset.color) highlightColor(e.target.dataset.color);
  });

  el.randomizeNameBtn.addEventListener('click', () => {
    el.nameInput.value = getRandomName();
    highlightColor(COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)]);
  });

  el.profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = el.nameInput.value.trim();
    const activeBall = el.colorRow.querySelector('.color-ball.active');
    const newCol = activeBall ? activeBall.dataset.color : state.color;

    if (newName) {
      state.name = newName;
      state.color = newCol;
      localStorage.setItem('aether_user_name', state.name);
      localStorage.setItem('aether_user_color', state.color);
      updateProfileDisplay();

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'set_profile',
          deviceId: state.deviceId,
          name: state.name,
          color: state.color,
          device: 'Mobile'
        }));
      }
      showToast('Profile updated');
      haptic();
    }
    el.profileSheet.style.display = 'none';
  });

  // Offline QR Code Generation
  function renderQR() {
    let url = `http://localhost:${state.port}`;
    if (state.localIPs && state.localIPs.length > 0) {
      url = `http://${state.localIPs[0].address}:${state.port}`;
    }
    el.shareUrl.value = url;

    if (window.QRCode && el.qrCodeContainer) {
      el.qrCodeContainer.innerHTML = '';
      try {
        new QRCode(el.qrCodeContainer, {
          text: url,
          width: 200,
          height: 200,
          colorDark: "#07090e",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (err) {}
    }
  }

  el.copyShareUrlBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(el.shareUrl.value).then(() => {
      showToast('✓ Link copied');
      haptic();
    });
  });

  // Tab Switching
  el.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      haptic();
    });
  });

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
  }

  // --- Initialize App ---
  initOnboarding();
  checkPermissions();

})();
