// AetherLAN — Zero-Lag Mobile Matrix Client + WebRTC Engine & Permissions
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

  const RANDOM_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Dev', 'Echo', 'Phoenix', 'Kai', 'Sky', 'Nova'];
  const COLOR_LIST = ['#0a84ff', '#30d158', '#ff375f', '#ffd60a', '#bf5af2', '#64d2ff', '#ff9f0a'];

  function getRandomName() {
    return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)] + '_' + Math.floor(10 + Math.random() * 90);
  }

  // State
  const state = {
    deviceId: getOrCreateDeviceId(),
    myId: null,
    name: localStorage.getItem('aether_user_name') || getRandomName(),
    color: localStorage.getItem('aether_user_color') || COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)],
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
      mode: 'audio',
      localStream: null,
      remoteStream: null,
      pc: null,
      timerInterval: null,
      startTime: 0,
      micMuted: false,
      camOff: false,
      isScreenSharing: false,
      facingMode: 'user'
    }
  };

  // DOM Elements
  const el = {
    profileBtn: document.getElementById('profileBtn'),
    userAvatar: document.getElementById('userAvatar'),
    networkInfoBtn: document.getElementById('networkInfoBtn'),
    onlineCountText: document.getElementById('onlineCountText'),
    startCallBtn: document.getElementById('startCallBtn'),
    permBtn: document.getElementById('permBtn'),
    searchToggleBtn: document.getElementById('searchToggleBtn'),
    searchDrawer: document.getElementById('searchDrawer'),
    searchInput: document.getElementById('searchInput'),
    closeSearchBtn: document.getElementById('closeSearchBtn'),
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
    // Permissions Sheet
    permSheet: document.getElementById('permSheet'),
    closePermBackdrop: document.getElementById('closePermBackdrop'),
    reqMicBtn: document.getElementById('reqMicBtn'),
    reqCamBtn: document.getElementById('reqCamBtn'),
    reqNotifBtn: document.getElementById('reqNotifBtn'),
    grantAllSheetBtn: document.getElementById('grantAllSheetBtn'),
    // Calls & Media
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

  function haptic() {
    try {
      if (navigator.vibrate) navigator.vibrate(10);
    } catch(e){}
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
    if (!el.toastWrapper) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    el.toastWrapper.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.remove(); }, 2200);
  }

  function updateProfileDisplay() {
    if (!el.userAvatar) return;
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
      if (el.chatBadge) el.chatBadge.style.display = 'none';
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (el.chatTimeline) {
        el.chatTimeline.scrollTop = el.chatTimeline.scrollHeight;
      }
    });
  }

  // --- Permissions Logic ---
  function updatePermButtons() {
    if (window.Notification) {
      state.perms.notif = Notification.permission === 'granted';
      updateButtonState(el.reqNotifBtn, state.perms.notif);
    }
    if (localStorage.getItem('aether_mic_granted') === 'true') {
      state.perms.mic = true;
      updateButtonState(el.reqMicBtn, true);
    }
    if (localStorage.getItem('aether_cam_granted') === 'true') {
      state.perms.cam = true;
      updateButtonState(el.reqCamBtn, true);
    }
  }

  function updateButtonState(btn, granted) {
    if (!btn) return;
    if (granted) {
      btn.textContent = '✓ Granted';
      btn.classList.add('granted');
    } else {
      btn.textContent = 'Enable';
      btn.classList.remove('granted');
    }
  }

  async function requestMicrophone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Mic requires localhost or HTTPS');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      state.perms.mic = true;
      localStorage.setItem('aether_mic_granted', 'true');
      updateButtonState(el.reqMicBtn, true);
      showToast('🎙️ Microphone enabled');
      haptic();
      return true;
    } catch(e) {
      showToast('Microphone access denied');
      return false;
    }
  }

  async function requestCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Camera requires localhost or HTTPS');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      state.perms.cam = true;
      localStorage.setItem('aether_cam_granted', 'true');
      updateButtonState(el.reqCamBtn, true);
      showToast('📸 Camera enabled');
      haptic();
      return true;
    } catch(e) {
      showToast('Camera access denied');
      return false;
    }
  }

  async function requestNotifications() {
    if (!window.Notification) return false;
    try {
      const res = await Notification.requestPermission();
      state.perms.notif = res === 'granted';
      updateButtonState(el.reqNotifBtn, state.perms.notif);
      if (state.perms.notif) showToast('🔔 Notifications enabled');
      haptic();
      return state.perms.notif;
    } catch(e) {
      return false;
    }
  }

  async function grantAllPermissions() {
    await requestMicrophone();
    await requestCamera();
    await requestNotifications();
    if (el.permBanner) el.permBanner.style.display = 'none';
    if (el.permSheet) el.permSheet.style.display = 'none';
    localStorage.setItem('aether_perm_banner_dismissed', 'true');
    showToast('✓ Permissions configured');
  }

  if (el.permBtn && el.permSheet) {
    el.permBtn.addEventListener('click', () => {
      updatePermButtons();
      el.permSheet.style.display = 'flex';
      haptic();
    });
  }
  if (el.closePermBackdrop && el.permSheet) {
    el.closePermBackdrop.addEventListener('click', () => el.permSheet.style.display = 'none');
  }

  if (el.reqMicBtn) el.reqMicBtn.addEventListener('click', requestMicrophone);
  if (el.reqCamBtn) el.reqCamBtn.addEventListener('click', requestCamera);
  if (el.reqNotifBtn) el.reqNotifBtn.addEventListener('click', requestNotifications);
  if (el.grantAllSheetBtn) el.grantAllSheetBtn.addEventListener('click', grantAllPermissions);
  if (el.grantAllPermsBtn) el.grantAllPermsBtn.addEventListener('click', grantAllPermissions);
  if (el.dismissPermBannerBtn && el.permBanner) {
    el.dismissPermBannerBtn.addEventListener('click', () => {
      el.permBanner.style.display = 'none';
      localStorage.setItem('aether_perm_banner_dismissed', 'true');
    });
  }

  // --- WebSocket Connection ---
  let ws = null;
  function connect() {
    try {
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
    } catch(err) {
      setTimeout(connect, 3000);
    }
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
        state.peers = data.peers || [];
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
          if (el.chatBadge) {
            el.chatBadge.textContent = state.unreadCount;
            el.chatBadge.style.display = 'inline-block';
          }
        }
        haptic();
        break;
      }

      case 'typing': {
        if (el.typingStatus && el.typingName) {
          if (data.isTyping) {
            el.typingName.textContent = data.name;
            el.typingStatus.style.display = 'block';
          } else {
            el.typingStatus.style.display = 'none';
          }
        }
        break;
      }

      case 'file_list': {
        state.files = data.files || [];
        renderFiles();
        break;
      }

      case 'clipboard_updated': {
        updateClipboardUI(data.clipboard);
        showToast('📋 Clipboard updated');
        break;
      }

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
        showToast(`${data.peerName || 'Peer'} declined call`);
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
        showToast('Call ended');
        endCall(false);
        break;
      }
    }
  }

  function updatePeersCount() {
    if (!el.onlineCountText) return;
    const count = state.peers.length;
    el.onlineCountText.textContent = count <= 1 ? '1 Device Online' : `${count} Devices Online`;
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

  if (el.searchToggleBtn) {
    el.searchToggleBtn.addEventListener('click', () => {
      const isVisible = el.searchDrawer.style.display === 'flex';
      el.searchDrawer.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) el.searchInput.focus();
      else {
        state.searchQuery = '';
        el.searchInput.value = '';
        renderAllMessages();
      }
      haptic();
    });
  }

  if (el.closeSearchBtn) {
    el.closeSearchBtn.addEventListener('click', () => {
      el.searchDrawer.style.display = 'none';
      state.searchQuery = '';
      el.searchInput.value = '';
      renderAllMessages();
    });
  }

  if (el.searchInput) {
    el.searchInput.addEventListener('input', () => {
      state.searchQuery = el.searchInput.value.trim();
      renderAllMessages();
    });
  }

  // --- Chat Stream ---
  function renderAllMessages() {
    if (!el.chatTimeline) return;
    el.chatTimeline.innerHTML = `<div class="date-chip"><span>DIRECT WI-FI • ZERO CLOUD</span></div>`;
    const filtered = state.messages.filter(matchesSearch);
    filtered.forEach(m => appendMessage(m, false));
    scrollToBottom();
  }

  function appendMessage(msg, shouldScroll = true) {
    if (!el.chatTimeline) return;
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

  // --- Lightbox ---
  document.addEventListener('click', (e) => {
    if (e.target.closest('.chat-img-preview')) {
      const img = e.target.closest('.chat-img-preview');
      if (el.lightboxImg && el.lightboxOverlay) {
        el.lightboxImg.src = img.dataset.full;
        if (el.lightboxDownloadBtn) {
          el.lightboxDownloadBtn.href = img.dataset.full + '?download=1';
          el.lightboxDownloadBtn.setAttribute('download', img.dataset.name);
        }
        el.lightboxOverlay.style.display = 'flex';
        haptic();
      }
      return;
    }
  });

  if (el.closeLightboxBtn) {
    el.closeLightboxBtn.addEventListener('click', () => {
      if (el.lightboxOverlay) el.lightboxOverlay.style.display = 'none';
    });
  }
  if (el.lightboxOverlay) {
    el.lightboxOverlay.addEventListener('click', (e) => {
      if (e.target === el.lightboxOverlay) el.lightboxOverlay.style.display = 'none';
    });
  }

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
  if (el.msgInput) {
    el.msgInput.addEventListener('input', () => {
      el.msgInput.style.height = 'auto';
      el.msgInput.style.height = Math.min(el.msgInput.scrollHeight, 110) + 'px';

      const hasText = el.msgInput.value.trim().length > 0;
      if (el.sendBtn) el.sendBtn.style.display = hasText ? 'flex' : 'none';
      if (el.voiceBtn) el.voiceBtn.style.display = hasText ? 'none' : 'flex';

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

    el.msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  if (el.sendBtn) el.sendBtn.addEventListener('click', sendMessage);

  function sendMessage() {
    if (!el.msgInput) return;
    const text = el.msgInput.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      type: 'chat_message',
      text: text
    }));

    el.msgInput.value = '';
    el.msgInput.style.height = 'auto';
    if (el.sendBtn) el.sendBtn.style.display = 'none';
    if (el.voiceBtn) el.voiceBtn.style.display = 'flex';
    state.isTyping = false;
    ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
    haptic();
  }

  // --- File Upload & Camera ---
  if (el.attachBtn && el.fileAttachmentInput) {
    el.attachBtn.addEventListener('click', () => el.fileAttachmentInput.click());
  }
  if (el.cameraBtn && el.cameraInput) {
    el.cameraBtn.addEventListener('click', () => el.cameraInput.click());
  }
  if (el.selectFilesBtn && el.fileAttachmentInput) {
    el.selectFilesBtn.addEventListener('click', () => el.fileAttachmentInput.click());
  }

  if (el.fileAttachmentInput) {
    el.fileAttachmentInput.addEventListener('change', () => {
      if (el.fileAttachmentInput.files.length > 0) {
        Array.from(el.fileAttachmentInput.files).forEach(f => upload(f));
        el.fileAttachmentInput.value = '';
      }
    });
  }

  if (el.cameraInput) {
    el.cameraInput.addEventListener('change', () => {
      if (el.cameraInput.files.length > 0) {
        upload(el.cameraInput.files[0]);
        el.cameraInput.value = '';
      }
    });
  }

  function upload(file, isVoice = false) {
    if (el.uploadProgressBox) {
      el.uploadProgressBox.style.display = 'block';
      if (el.uploadFileName) el.uploadFileName.textContent = file.name || 'Voice memo';
      if (el.uploadPercentage) el.uploadPercentage.textContent = '0%';
      if (el.progressBar) el.progressBar.style.width = '0%';
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name || 'voice.webm'));
    xhr.setRequestHeader('X-Sender-Name', encodeURIComponent(state.name));
    xhr.setRequestHeader('X-Sender-Color', encodeURIComponent(state.color));
    xhr.setRequestHeader('X-Sender-Id', state.myId || 'anon');
    xhr.setRequestHeader('X-Is-Voice', isVoice ? 'true' : 'false');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && el.uploadPercentage && el.progressBar) {
        const pct = Math.round((e.loaded / e.total) * 100);
        el.uploadPercentage.textContent = `${pct}%`;
        el.progressBar.style.width = `${pct}%`;
      }
    };

    xhr.onload = () => {
      setTimeout(() => { if (el.uploadProgressBox) el.uploadProgressBox.style.display = 'none'; }, 400);
      if (xhr.status >= 200 && xhr.status < 300) {
        showToast('✓ Shared on Wi-Fi');
        haptic();
      } else {
        showToast('Upload failed');
      }
    };

    xhr.onerror = () => {
      if (el.uploadProgressBox) el.uploadProgressBox.style.display = 'none';
      showToast('Network error');
    };

    xhr.send(file);
  }

  function renderFiles() {
    if (!el.fileList) return;
    if (el.filesBadge) el.filesBadge.textContent = state.files.length;
    if (el.filesCount) el.filesCount.textContent = `${state.files.length} files`;

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
  if (el.voiceBtn) {
    el.voiceBtn.addEventListener('click', async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Microphone not supported on this connection');
        return;
      }
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
        state.recordStart = Date.now();
        if (el.voiceOverlay) el.voiceOverlay.style.display = 'flex';

        state.recordTimer = setInterval(() => {
          const sec = Math.floor((Date.now() - state.recordStart) / 1000);
          const m = Math.floor(sec / 60);
          const s = String(sec % 60).padStart(2, '0');
          if (el.recTimer) el.recTimer.textContent = `${m}:${s}`;
        }, 1000);

        haptic();
      } catch (err) {
        showToast('Microphone access denied');
      }
    });
  }

  if (el.cancelRecBtn) {
    el.cancelRecBtn.addEventListener('click', () => {
      if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
      }
      clearInterval(state.recordTimer);
      if (el.voiceOverlay) el.voiceOverlay.style.display = 'none';
      state.audioChunks = [];
    });
  }

  if (el.sendRecBtn) {
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
      if (el.voiceOverlay) el.voiceOverlay.style.display = 'none';
    });
  }

  // --- Clipboard ---
  if (el.clipText) {
    el.clipText.addEventListener('input', () => {
      if (el.clipCharCount) el.clipCharCount.textContent = `${el.clipText.value.length} characters`;
    });
  }

  if (el.syncClipBtn) {
    el.syncClipBtn.addEventListener('click', () => {
      const val = el.clipText ? el.clipText.value : '';
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'clipboard_update', content: val }));
        showToast('✓ Synced to all devices');
        haptic();
      }
    });
  }

  if (el.clearClipBtn) {
    el.clearClipBtn.addEventListener('click', () => {
      if (el.clipText) el.clipText.value = '';
      if (el.clipCharCount) el.clipCharCount.textContent = '0 characters';
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'clipboard_update', content: '' }));
        showToast('✓ Clipboard cleared');
      }
    });
  }

  if (el.copyClipBtn) {
    el.copyClipBtn.addEventListener('click', async () => {
      const text = el.clipText ? el.clipText.value : '';
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
  }

  function updateClipboardUI(clip) {
    state.clipboard = clip;
    if (el.clipText) el.clipText.value = clip.content || '';
    if (el.clipCharCount) el.clipCharCount.textContent = `${(clip.content || '').length} characters`;
    if (el.clipUpdated) {
      el.clipUpdated.textContent = clip.updatedBy ? `Updated by ${clip.updatedBy} (${formatTime(clip.updatedAt)})` : 'Live sync across all devices';
    }
  }

  // ==========================================================================
  // WEBRTC CALL ENGINE (VOICE, VIDEO, SCREENSHARE)
  // ==========================================================================
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  };

  if (el.startCallBtn && el.startCallSheet) {
    el.startCallBtn.addEventListener('click', () => {
      el.startCallSheet.style.display = 'flex';
      haptic();
    });
  }
  if (el.closeStartCallBackdrop && el.startCallSheet) {
    el.closeStartCallBackdrop.addEventListener('click', () => el.startCallSheet.style.display = 'none');
  }

  document.querySelectorAll('.call-type-card').forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.dataset.calltype;
      if (el.startCallSheet) el.startCallSheet.style.display = 'none';
      initiateCall(mode);
    });
  });

  async function initiateCall(mode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Camera/Mic requires localhost or HTTPS');
      return;
    }
    try {
      state.call.mode = mode;
      await obtainLocalMedia(mode);

      state.call.active = true;
      state.call.peerName = 'Calling Room...';
      state.call.peerColor = '#0a84ff';

      showCallOverlay();

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call_initiate',
          callMode: mode
        }));
      }

      showToast(`📞 Calling on Wi-Fi...`);
      haptic();
    } catch (err) {
      showToast('Could not start call: ' + err.message);
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
      if (el.localVideo) {
        el.localVideo.srcObject = stream;
        el.localVideo.style.display = 'block';
      }
    } else {
      if (el.localVideo) el.localVideo.style.display = 'none';
    }

    return stream;
  }

  let pendingIncomingCall = null;
  function showIncomingCallModal(data) {
    pendingIncomingCall = data;
    if (el.incomingCallerName) el.incomingCallerName.textContent = data.callerName || 'Peer';
    if (el.incomingAvatar) {
      el.incomingAvatar.textContent = (data.callerName || '?').charAt(0).toUpperCase();
      el.incomingAvatar.style.backgroundColor = data.callerColor || '#0a84ff';
    }
    if (el.incomingCallType) el.incomingCallType.textContent = `Incoming ${data.callMode.toUpperCase()} Call...`;
    if (el.incomingCallSheet) el.incomingCallSheet.style.display = 'flex';
    haptic();
  }

  if (el.declineCallBtn) {
    el.declineCallBtn.addEventListener('click', () => {
      if (pendingIncomingCall && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call_decline',
          callerId: pendingIncomingCall.callerId
        }));
      }
      if (el.incomingCallSheet) el.incomingCallSheet.style.display = 'none';
      pendingIncomingCall = null;
    });
  }

  if (el.acceptCallBtn) {
    el.acceptCallBtn.addEventListener('click', async () => {
      if (!pendingIncomingCall) return;
      const callData = pendingIncomingCall;
      if (el.incomingCallSheet) el.incomingCallSheet.style.display = 'none';

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
  }

  async function handleCallAccepted(data) {
    state.call.peerId = data.peerId;
    state.call.peerName = data.peerName;
    state.call.peerColor = data.peerColor;
    updateCallOverlayUI();
    setupPeerConnection(data.peerId, true);
  }

  function setupPeerConnection(targetPeerId, isCaller) {
    if (state.call.pc) state.call.pc.close();

    const pc = new RTCPeerConnection(rtcConfig);
    state.call.pc = pc;

    if (state.call.localStream) {
      state.call.localStream.getTracks().forEach(track => {
        pc.addTrack(track, state.call.localStream);
      });
    }

    pc.ontrack = (event) => {
      state.call.remoteStream = event.streams[0];
      if (event.track.kind === 'video') {
        if (el.remoteVideo) {
          el.remoteVideo.srcObject = event.streams[0];
          el.remoteVideo.style.display = 'block';
        }
        if (el.audioCallDisplay) el.audioCallDisplay.style.display = 'none';
      } else if (event.track.kind === 'audio') {
        if (el.remoteAudio) el.remoteAudio.srcObject = event.streams[0];
      }
    };

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
        .catch(err => {});
    }
  }

  async function handleWebRTCOffer(data) {
    if (!state.call.pc) setupPeerConnection(data.fromId, false);
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
    if (el.callOverlay) el.callOverlay.style.display = 'flex';
    startCallTimer();
  }

  function updateCallOverlayUI() {
    if (el.callPeerName) el.callPeerName.textContent = state.call.peerName;
    if (el.callPeerAvatar) {
      el.callPeerAvatar.textContent = (state.call.peerName || '?').charAt(0).toUpperCase();
      el.callPeerAvatar.style.backgroundColor = state.call.peerColor || '#0a84ff';
    }

    if (state.call.mode === 'audio') {
      if (el.remoteVideo) el.remoteVideo.style.display = 'none';
      if (el.audioCallDisplay) el.audioCallDisplay.style.display = 'flex';
    } else {
      if (el.remoteVideo) el.remoteVideo.style.display = 'block';
      if (el.audioCallDisplay) el.audioCallDisplay.style.display = 'none';
    }
  }

  function startCallTimer() {
    state.call.startTime = Date.now();
    clearInterval(state.call.timerInterval);
    state.call.timerInterval = setInterval(() => {
      const sec = Math.floor((Date.now() - state.call.startTime) / 1000);
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      if (el.callTimer) el.callTimer.textContent = `${m}:${s}`;
    }, 1000);
  }

  if (el.toggleMicBtn) {
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
  }

  if (el.toggleCamBtn) {
    el.toggleCamBtn.addEventListener('click', async () => {
      if (!state.call.localStream) return;
      const videoTrack = state.call.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        state.call.camOff = !videoTrack.enabled;
        el.toggleCamBtn.classList.toggle('muted', state.call.camOff);
        if (el.localVideo) el.localVideo.style.display = state.call.camOff ? 'none' : 'block';
      }
      haptic();
    });
  }

  if (el.endCallBtn) {
    el.endCallBtn.addEventListener('click', () => endCall(true));
  }

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
    if (el.callOverlay) el.callOverlay.style.display = 'none';
    if (el.localVideo) el.localVideo.srcObject = null;
    if (el.remoteVideo) el.remoteVideo.srcObject = null;
    if (el.remoteAudio) el.remoteAudio.srcObject = null;
    state.call.active = false;
    haptic();
  }

  // --- Connected Devices Sheet ---
  if (el.networkInfoBtn && el.devicesSheet) {
    el.networkInfoBtn.addEventListener('click', () => {
      renderDevicesList();
      el.devicesSheet.style.display = 'flex';
      haptic();
    });
  }

  if (el.closeDevicesBackdrop && el.devicesSheet) {
    el.closeDevicesBackdrop.addEventListener('click', () => el.devicesSheet.style.display = 'none');
  }

  function renderDevicesList() {
    if (!el.devicesList) return;
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

  // Export Chat
  if (el.exportChatBtn) {
    el.exportChatBtn.addEventListener('click', () => {
      let log = `=== AETHERLAN CHAT BACKUP (${new Date().toLocaleString()}) ===\n\n`;
      state.messages.forEach(m => {
        const time = new Date(m.timestamp).toLocaleTimeString();
        if (m.type === 'text') log += `[${time}] ${m.senderName}: ${m.text}\n`;
        else if (m.type === 'file') log += `[${time}] ${m.senderName} [FILE]: ${m.file.originalName} (${formatBytes(m.file.size)})\n`;
        else if (m.type === 'voice') log += `[${time}] ${m.senderName} [VOICE MEMO]\n`;
      });

      const blob = new Blob([log], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aetherlan_chat_${Date.now()}.txt`;
      a.click();
      showToast('✓ Chat exported');
      haptic();
    });
  }

  // --- Profile Sheet ---
  if (el.profileBtn && el.profileSheet) {
    el.profileBtn.addEventListener('click', () => {
      if (el.nameInput) el.nameInput.value = state.name;
      highlightColor(state.color);
      el.profileSheet.style.display = 'flex';
      haptic();
    });
  }

  if (el.closeProfileBackdrop && el.profileSheet) {
    el.closeProfileBackdrop.addEventListener('click', () => el.profileSheet.style.display = 'none');
  }

  if (el.qrBtn && el.qrSheet) {
    el.qrBtn.addEventListener('click', () => {
      renderQR();
      el.qrSheet.style.display = 'flex';
      haptic();
    });
  }
  if (el.closeQrBackdrop && el.qrSheet) {
    el.closeQrBackdrop.addEventListener('click', () => el.qrSheet.style.display = 'none');
  }

  function highlightColor(col) {
    if (!el.colorRow) return;
    el.colorRow.querySelectorAll('.color-ball').forEach(b => {
      b.classList.toggle('active', b.dataset.color === col);
    });
  }

  if (el.colorRow) {
    el.colorRow.addEventListener('click', (e) => {
      if (e.target.dataset.color) highlightColor(e.target.dataset.color);
    });
  }

  if (el.randomizeNameBtn && el.nameInput) {
    el.randomizeNameBtn.addEventListener('click', () => {
      el.nameInput.value = getRandomName();
      highlightColor(COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)]);
    });
  }

  if (el.profileForm) {
    el.profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newName = el.nameInput ? el.nameInput.value.trim() : '';
      const activeBall = el.colorRow ? el.colorRow.querySelector('.color-ball.active') : null;
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
      if (el.profileSheet) el.profileSheet.style.display = 'none';
    });
  }

  // Offline QR Code Generation
  function renderQR() {
    let url = `http://localhost:${state.port}`;
    if (state.localIPs && state.localIPs.length > 0) {
      url = `http://${state.localIPs[0].address}:${state.port}`;
    }
    if (el.shareUrl) el.shareUrl.value = url;

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

  if (el.copyShareUrlBtn && el.shareUrl) {
    el.copyShareUrlBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(el.shareUrl.value).then(() => {
        showToast('✓ Link copied');
        haptic();
      });
    });
  }

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

  // --- Auto-start ---
  updateProfileDisplay();
  updatePermButtons();
  connect();

})();
