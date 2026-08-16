<div align="center">

# ⚡ AetherLAN
### *Zero-Internet Local Wi-Fi Mesh, AirDrop File Dropper & Live Universal Clipboard*

[![Node.js Version](https://img.shields.io/badge/node.js-%3E%3D18.0.0-30d158?style=flat-square&logo=node.js)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0%20(Pure%20Node)-0a84ff?style=flat-square)](https://github.com/Zerxen-dev/aetherlan)
[![License](https://img.shields.io/badge/license-MIT-ff375f?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Linux%20%7C%20macOS%20%7C%20Windows-ffd60a?style=flat-square)](https://github.com/Zerxen-dev/aetherlan)

**AetherLAN** turns your Android device (Termux), laptop, or PC into an offline local Wi-Fi communication and file exchange hub.  
Directly message, record voice notes, snap photos, drop files up to 500MB, and sync clipboards across all connected devices — **100% offline with zero cloud servers**.

</div>

---

## 🌟 Features

- 💬 **Mobile-First Real-Time Chat**: Telegram/WhatsApp-inspired responsive speech bubbles, formatted links, delivery times, and in-chat audio player.
- 📸 **Direct Camera & Photo Snap**: Snap photos right from your phone camera and beam them to connected devices instantly.
- 🖼️ **In-Chat Thumbnails & Lightbox**: Image previews inside chat with a full-screen zoomable lightbox viewer.
- 🎙️ **Voice Notes**: Tap/Hold to record voice memos with real-time waveform timers and streaming playback.
- 📁 **AirDrop-Style File Dropper**: Batch transfer files up to 500MB with progress tracking and direct download links.
- 📋 **Universal Clipboard**: Live synchronized multi-device scratchpad with 1-tap copy and clear.
- 🔍 **Live Search & Filter**: Search messages, senders, and files in real-time.
- 👥 **Connected Devices Inspector**: View all active devices on your Wi-Fi and export chat logs.
- 📱 **Offline QR Code Scanner**: Instant scan-to-join QR code generated 100% offline without CDNs.
- 🛡️ **Zero Dependencies**: Pure native Node.js (`http`, `crypto`, `fs`, `os`) with custom RFC 6455 WebSocket engine.

---

## 🚀 Quick Start

### 1. Clone & Enter
```bash
git clone https://github.com/Zerxen-dev/aetherlan.git
cd aetherlan
```

### 2. Launch (Zero npm install needed!)
```bash
node server.js
```

### 3. Open in Browser
- **On Host Device**: `http://localhost:4000`
- **On Other Phones/Laptops on Wi-Fi**: `http://<your-lan-ip>:4000` *(or scan the built-in QR Code)*

---

## 📱 Running on Android (Termux)

```bash
# Install Node.js and Git
pkg update && pkg install nodejs git -y

# Clone and Launch
git clone https://github.com/Zerxen-dev/aetherlan.git
cd aetherlan
node server.js
```

---

## 📜 License

MIT License © 2026 [Zerxen-dev](https://github.com/Zerxen-dev)
