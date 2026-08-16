# ⚡ ZerxenLAN

> **Zero-Internet Local Wi-Fi Anonymous Chatroom, High-Speed File Dropper & Live Synced Clipboard Suite**  
> Built with **100% pure native Node.js (Zero external dependencies)**. Runs on Android Termux, Linux, macOS, and Windows.

---

## 🌟 Key Features

- 💬 **Zero-Lag Anonymous Chat**: Real-time messaging powered by a custom native RFC 6455 WebSocket engine.
- 🔥 **Self-Destructing Burner Messages**: Send timed messages (5s, 15s, 60s) that vaporize from all connected screens simultaneously.
- 🎙️ **Voice Notes & Audio Clips**: Tap to record high-quality voice memos and stream them instantly over LAN.
- 📂 **High-Speed LAN File Drop**: Transfer up to 500MB photos, videos, and zip files directly between phones and PCs with zero cloud limits.
- 📋 **Live Synced LAN Clipboard**: Copy code or text on your phone and immediately paste it on your laptop.
- 👥 **Wi-Fi Radar & Instant QR Join**: Real-time connected device discovery + scan-to-join QR codes.
- 🚀 **Zero Dependencies**: Requires **NO `npm install`**. Starts instantly with pure Node.js built-ins.

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/Zerxen-dev/zerxenlan.git
cd zerxenlan
```

### 2. Start the Server
```bash
node server.js
```

### 3. Open in Browser
- **On your device**: `http://localhost:4000`
- **On other devices on your Wi-Fi / Hotspot**: `http://<your-lan-ip>:4000` (printed in terminal and displayed via QR code).

---

## 📱 Running on Android (Termux)
```bash
pkg install nodejs git
git clone https://github.com/Zerxen-dev/zerxenlan.git
cd zerxenlan
node server.js
```

---

## 🛠️ Architecture
- **Backend**: Native Node.js `http`, `crypto`, `fs`, `path`, `os`, `events` with custom RFC 6455 WebSocket frame parser.
- **Frontend**: Mobile-first responsive UI, Web Audio API sound synthesizer, MediaRecorder API for voice notes, and Canvas QR code generator.

---

## 📜 License
MIT License © 2026 Zerxen
