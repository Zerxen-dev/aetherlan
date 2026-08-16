<div align="center">

# ⚡ AetherLAN
### *Zero-Internet Local Wi-Fi Mesh, WebRTC Calls, AirDrop File Dropper & Universal Clipboard*

[![Node.js Version](https://img.shields.io/badge/node.js-%3E%3D18.0.0-30d158?style=flat-square&logo=node.js)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0%20(Pure%20Native%20Node)-0a84ff?style=flat-square)](https://github.com/Zerxen-dev/aetherlan)
[![License](https://img.shields.io/badge/license-MIT-ff375f?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Linux%20%7C%20macOS%20%7C%20Windows-ffd60a?style=flat-square)](https://github.com/Zerxen-dev/aetherlan)

**AetherLAN** turns your Android phone (Termux), laptop, or PC into an offline local Wi-Fi mesh hub.  
Chat with Telegram-style ergonomics, make peer-to-peer HD voice & video calls, share screens, snap camera photos, batch drop large files (up to 500MB+), and sync clipboards across all connected devices — **100% offline with zero cloud servers**.

</div>

---

## 🌟 Core Features

- 💬 **Native Mobile-First Chat**: WhatsApp / Telegram-inspired responsive speech bubbles, formatted links, delivery times, and in-chat audio player.
- 📞 **Zero-Lag WebRTC P2P Calls**:
  - 🎙️ **HD Voice Calls**: Direct peer-to-peer audio with visualizer waveforms and duration timer.
  - 📹 **HD Video Calls**: Camera streaming with picture-in-picture (PiP) and front/back camera flipping.
  - 🖥️ **Screen Sharing**: Broadcast your screen to phones or laptops on your Wi-Fi.
  - 🔔 **Incoming Call Ring Screen**: Instant pop-up with caller avatar, Accept, and Decline actions.
- 📸 **In-App Camera & Photo Snap**: Snap photos directly from your camera and beam them to everyone on Wi-Fi immediately.
- 🖼️ **In-Chat Photo Thumbnails & Fullscreen Lightbox**: Clickable photo previews with high-res zoom & download modal.
- 📁 **AirDrop-Style File Dropper**: Batch transfer photos, videos, APKs, and documents with progress percentage bars.
- 📋 **Universal Real-Time Clipboard**: Live synchronized multi-device notepad with 1-tap copy and clear.
- 🔍 **Live Search & Filter**: Search chat history and files in real-time.
- 👥 **Connected Devices & Network Inspector**: Live list of active devices, IP addresses, ping status, and chat export to `.txt`.
- 🛡️ **Device Permissions Manager**: Built-in permission status sheet with 1-tap toggles for Mic, Camera, and Background Notifications.
- 📱 **100% Offline QR Code Generator**: Local, self-contained QR engine with zero external CDN dependency.
- ⚡ **100% Zero Dependencies**: Built purely with native Node.js built-ins (`http`, `crypto`, `fs`, `os`, `events`) and custom RFC 6455 WebSocket engine. Boots in <10ms.

---

## 🚀 Quick Start

### 1. Clone & Enter
```bash
git clone https://github.com/Zerxen-dev/aetherlan.git
cd aetherlan
```

### 2. Launch (Zero npm install required!)
```bash
node server.js
```

### 3. Open in Browser
- **On Host Device**: [http://localhost:4000](http://localhost:4000)
- **On Other Phones & Laptops on Wi-Fi**: `http://<your-lan-ip>:4000` *(or scan the built-in QR Code)*

---

## 📱 Running on Android (Termux)

```bash
# 1. Update packages and install Node.js + Git
pkg update && pkg install nodejs git -y

# 2. Clone repository
git clone https://github.com/Zerxen-dev/aetherlan.git
cd aetherlan

# 3. Start server
node server.js
```

---

## 🛠️ Technology Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v18+) | Pure standard library (`http`, `crypto`, `fs`, `os`, `events`). Zero `node_modules` needed. |
| **WebSocket Engine** | Custom RFC 6455 | Hand-rolled frame parsing, masking, and broadcast engine. Sub-millisecond latency. |
| **Real-Time Calling** | WebRTC (P2P) | Direct peer-to-peer audio, video, and screen sharing across local subnet. |
| **Frontend** | Vanilla JS + Modern CSS | Native mobile feel, safe-area insets, haptic vibration feedback, zero framework overhead. |
| **QR Code Engine** | Offline `qrcode.min.js` | Generates QR codes on device canvas without internet or CDN access. |

---

## 📜 License

MIT License © 2026 [Zerxen-dev](https://github.com/Zerxen-dev)
