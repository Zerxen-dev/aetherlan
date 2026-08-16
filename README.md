<div align="center">

# ⚡ AetherLAN
### *Zero-Internet Local Wi-Fi Mesh, WebRTC Calls, AirDrop File Dropper & Universal Clipboard*

[![Node.js Version](https://img.shields.io/badge/node.js-%3E%3D18.0.0-30d158?style=flat-square&logo=node.js)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0%20(Pure%20Native%20Node)-0a84ff?style=flat-square)](https://github.com/Zerxen-dev/aetherlan)
[![License](https://img.shields.io/badge/license-MIT-ff375f?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Windows%20%7C%20macOS%20%7C%20Linux-ffd60a?style=flat-square)](https://github.com/Zerxen-dev/aetherlan)

**AetherLAN** transforms your phone, laptop, or desktop into an offline local Wi-Fi communication and file exchange hub.  
Chat with Telegram-style ergonomics, make peer-to-peer HD voice & video calls, share screens, snap camera photos, batch drop large files (up to 500MB+), and sync clipboards across all connected devices — **100% offline with zero cloud servers**.

</div>

---

## 🌟 Features

- 💬 **Native Mobile-First Chat**: WhatsApp / Telegram-inspired responsive speech bubbles, formatted links, delivery times, and inline audio player.
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

## 💻 Installation & Setup Guide

Since **AetherLAN** uses **pure native Node.js with zero dependencies**, you do not need `npm install` or any external packages. Just clone and run!

---

### 📱 1. Android (Termux)

```bash
# Update packages and install Node.js + Git
pkg update && pkg install nodejs git -y

# Clone and Enter directory
git clone https://github.com/Zerxen-dev/aetherlan.git
cd aetherlan

# Launch Server
node server.js
```

---

### 🪟 2. Windows (PowerShell / Command Prompt / Git Bash)

1. Make sure you have **[Node.js (LTS)](https://nodejs.org)** and **[Git](https://git-scm.com)** installed.
2. Open **PowerShell** or **Command Prompt** and run:

```powershell
# Clone the repository
git clone https://github.com/Zerxen-dev/aetherlan.git

# Enter folder
cd aetherlan

# Launch Server
node server.js
```

---

### 🍎 3. macOS (Terminal)

1. Install Node.js via [Homebrew](https://brew.sh) or the official installer:
```bash
brew install node git
```

2. Clone and start:
```bash
# Clone the repository
git clone https://github.com/Zerxen-dev/aetherlan.git

# Enter folder
cd aetherlan

# Launch Server
node server.js
```

---

### 🐧 4. Linux (Ubuntu, Debian, Fedora, Arch Linux)

```bash
# Ubuntu / Debian / Linux Mint:
sudo apt update && sudo apt install nodejs git -y

# Arch Linux / Manjaro:
sudo pacman -S nodejs git --noconfirm

# Fedora / RHEL:
sudo dnf install nodejs git -y

# Clone and Launch:
git clone https://github.com/Zerxen-dev/aetherlan.git
cd aetherlan
node server.js
```

---

## 🌐 Connecting Devices

1. **On the Host Device**: Open **[http://localhost:4000](http://localhost:4000)**
2. **On Other Phones, Tablets & Laptops on Wi-Fi**:
   - Open browser and navigate to `http://<your-lan-ip>:4000` (e.g. `http://192.168.18.243:4000`)
   - **OR** tap the **QR Code button (`▦`)** on the host device and scan it with any phone camera!

---

## ⚙️ Advanced Configuration

### Custom Port
```bash
PORT=8080 node server.js
```

### Background Execution with PM2 / Nohup
```bash
# Using Nohup
nohup node server.js > aetherlan.log 2>&1 &

# Or using PM2
npm install -g pm2
pm2 start server.js --name aetherlan
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
