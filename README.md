<div align="center">

# ⚡ AetherLAN 2.0
### *Zero-Internet Peer-to-Peer Cyber Mesh & Local File Dropper*

[![Node.js Version](https://img.shields.io/badge/node.js-%3E%3D18.0.0-00ff87?style=flat-square&logo=node.js)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0%20(Pure%20Node)-00f2fe?style=flat-square)](https://github.com/Zerxen-dev/zerxenlan)
[![License](https://img.shields.io/badge/license-MIT-ff007f?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Linux%20%7C%20macOS%20%7C%20Windows-ff9f1c?style=flat-square)](https://github.com/Zerxen-dev/zerxenlan)

**AetherLAN** turns your Android phone, laptop, or Raspberry Pi into a local peer-to-peer cyber mesh hub.  
Share high-speed files, anonymous encrypted messages, live voice notes, and synced clipboards across all devices on your Wi-Fi or mobile hotspot — **100% offline with zero cloud servers**.

</div>

---

## 🚀 Key Highlights

| Feature | Description |
| :--- | :--- |
| **💬 Cyber Stream** | Real-time messaging with custom RFC 6455 WebSockets, emoji reactions, and live typing indicators. |
| **🔒 Client-Side E2EE** | On-device 256-bit AES-GCM encryption with PBKDF2 key derivation for private channels. |
| **🔥 Vaporize Mode** | Self-destructing burner messages (5s, 15s, 60s) with live animated countdown meters. |
| **🎙️ Voice Memos** | Hold-to-record voice notes with a live real-time frequency waveform audio visualizer. |
| **⚡ HyperDrop** | Blazing-fast LAN file transfers up to 500MB with drag & drop and streaming media support. |
| **📋 SyncBoard** | Live multi-device synchronized clipboard and scratchpad with one-tap copy. |
| **🛰️ Radar Matrix** | Interactive 2D canvas radar sweep displaying connected devices, ping latencies, and QR invites. |
| **🪶 Zero Dependencies** | **0 `npm install` packages required**. Boots in 5ms directly with pure native Node.js. |

---

## ⚡ Quick Start

### 1. Clone & Enter
```bash
git clone https://github.com/Zerxen-dev/zerxenlan.git
cd zerxenlan
```

### 2. Launch
```bash
node server.js
```

### 3. Open in Browser
- **On Host Device**: `http://localhost:4000`
- **On Any Phone, Tablet or Laptop on your Wi-Fi**: `http://<your-lan-ip>:4000` *(or scan the built-in QR Code)*

---

## 📱 Running on Android (Termux)

```bash
# Install Node.js and Git
pkg update && pkg install nodejs git -y

# Clone and Launch
git clone https://github.com/Zerxen-dev/zerxenlan.git
cd zerxenlan
node server.js
```

---

## 🧠 Architecture & Tech Stack

```
[ Web Browser Client ]  <==== RFC 6455 WebSockets ====>  [ AetherLAN Core ]
  ├─ Web Audio SFX                                         ├─ In-Memory Mesh Rooms
  ├─ AES-GCM E2EE Crypto                                   ├─ Multi-Channel Router
  ├─ Canvas Radar Sweep                                    ├─ Zero-Dep HTTP Server
  └─ AnalyserNode Waveform                                 └─ High-Speed File Streamer
```

---

## 📜 License

Distributed under the **MIT License**. Created by [Zerxen-dev](https://github.com/Zerxen-dev).
