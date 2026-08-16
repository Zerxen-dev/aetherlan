// AetherLAN — Zero-Dependency Mobile-First Local Wi-Fi Mesh + WebRTC Call Engine
// MIT License • Authored by Zerxen-dev

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { EventEmitter } = require('events');

const PORT = process.env.PORT || 4000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// MIME Types Map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webm': 'audio/webm',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.apk': 'application/vnd.android.package-archive',
  '.txt': 'text/plain; charset=utf-8'
};

// In-Memory Room State
const MAX_MESSAGES = 150;
const messages = [];
const sharedFiles = [];
let sharedClipboard = {
  content: "⚡ AetherLAN Universal Clipboard. Anything you type or paste here syncs across all devices on your Wi-Fi.",
  updatedBy: "System",
  updatedAt: Date.now()
};

const peers = new Map(); // wsSocket -> peerData

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ interface: name, address: net.address });
      }
    }
  }
  return addresses;
}

// ============================================================================
// RFC 6455 WEBSOCKET PROTOCOL ENGINE
// ============================================================================
const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class SimpleWebSocket extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.buffer = Buffer.alloc(0);

    this.socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.parseFrames();
    });

    this.socket.on('close', () => this.emit('close'));
    this.socket.on('error', (err) => this.emit('error', err));
  }

  parseFrames() {
    while (this.buffer.length >= 2) {
      const byte1 = this.buffer[0];
      const byte2 = this.buffer[1];

      const opcode = byte1 & 0x0f;
      const isMasked = (byte2 & 0x80) === 0x80;
      let payloadLen = byte2 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (this.buffer.length < offset + 2) return;
        payloadLen = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLen === 127) {
        if (this.buffer.length < offset + 8) return;
        const high = this.buffer.readUInt32BE(offset);
        const low = this.buffer.readUInt32BE(offset + 4);
        payloadLen = (high * 0x100000000) + low;
        offset += 8;
      }

      let maskKey = null;
      if (isMasked) {
        if (this.buffer.length < offset + 4) return;
        maskKey = this.buffer.subarray(offset, offset + 4);
        offset += 4;
      }

      if (this.buffer.length < offset + payloadLen) return;

      const rawPayload = this.buffer.subarray(offset, offset + payloadLen);
      const unmasked = Buffer.alloc(payloadLen);

      if (isMasked && maskKey) {
        for (let i = 0; i < payloadLen; i++) {
          unmasked[i] = rawPayload[i] ^ maskKey[i % 4];
        }
      } else {
        rawPayload.copy(unmasked);
      }

      this.buffer = this.buffer.subarray(offset + payloadLen);

      if (opcode === 0x1) {
        this.emit('message', unmasked.toString('utf8'));
      } else if (opcode === 0x8) {
        this.socket.end();
        this.emit('close');
        return;
      } else if (opcode === 0x9) {
        this.sendPong(unmasked);
      }
    }
  }

  send(data) {
    if (this.socket.destroyed || !this.socket.writable) return;
    const payload = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data), 'utf8');
    const length = payload.length;

    let header;
    if (length <= 125) {
      header = Buffer.from([0x81, length]);
    } else if (length <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }

    this.socket.write(Buffer.concat([header, payload]));
  }

  sendPong(payload) {
    if (this.socket.destroyed) return;
    const header = Buffer.from([0x8A, payload.length]);
    this.socket.write(Buffer.concat([header, payload]));
  }
}

function broadcast(data, excludeWs = null) {
  const payload = JSON.stringify(data);
  for (const [clientWs] of peers) {
    if (clientWs !== excludeWs) {
      clientWs.send(payload);
    }
  }
}

function sendToPeerId(targetPeerId, data) {
  const payload = JSON.stringify(data);
  for (const [clientWs, peerData] of peers) {
    if (peerData.id === targetPeerId) {
      clientWs.send(payload);
      return true;
    }
  }
  return false;
}

function getPeerList() {
  return Array.from(peers.values()).map(p => ({
    id: p.id,
    deviceId: p.deviceId,
    name: p.name,
    color: p.color,
    joinedAt: p.joinedAt
  }));
}

// ============================================================================
// HTTP SERVER & STATIC FILE DISPATCHER
// ============================================================================
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: System Info
  if (pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      appName: "AetherLAN",
      version: "2.0.0",
      creator: "Zerxen-dev",
      ips: getLocalIPs(),
      port: PORT,
      online: peers.size
    }));
    return;
  }

  // API: File Upload
  if (pathname === '/api/upload' && req.method === 'POST') {
    const rawFileName = req.headers['x-file-name'] || 'file_' + Date.now();
    const sanitizedName = decodeURIComponent(rawFileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}_${Math.round(Math.random() * 1e6)}_${sanitizedName}`;
    const targetPath = path.join(UPLOADS_DIR, uniqueFileName);

    const isVoice = req.headers['x-is-voice'] === 'true';
    const senderName = decodeURIComponent(req.headers['x-sender-name'] || 'Anonymous');
    const senderColor = decodeURIComponent(req.headers['x-sender-color'] || '#0a84ff');
    const senderId = req.headers['x-sender-id'] || 'anon';

    const writeStream = fs.createWriteStream(targetPath);
    let totalBytes = 0;

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      writeStream.write(chunk);
    });

    req.on('end', () => {
      writeStream.end();

      const ext = path.extname(sanitizedName).toLowerCase();
      const mimeType = req.headers['content-type'] || MIME_TYPES[ext] || 'application/octet-stream';

      const fileData = {
        id: 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        originalName: decodeURIComponent(rawFileName),
        filename: uniqueFileName,
        size: totalBytes,
        mimeType,
        isVoice,
        senderName,
        senderColor,
        uploadedAt: Date.now(),
        url: `/uploads/${encodeURIComponent(uniqueFileName)}`
      };

      sharedFiles.unshift(fileData);
      if (sharedFiles.length > 50) sharedFiles.pop();

      const chatMsg = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        senderId,
        senderName,
        senderColor,
        type: isVoice ? 'voice' : 'file',
        file: fileData,
        timestamp: Date.now()
      };

      messages.push(chatMsg);
      if (messages.length > MAX_MESSAGES) messages.shift();

      broadcast({ type: 'new_message', message: chatMsg });
      broadcast({ type: 'file_list', files: sharedFiles });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, file: fileData, message: chatMsg }));
    });

    req.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });

    return;
  }

  // Static File Server
  let filePath = '';
  if (pathname.startsWith('/uploads/')) {
    filePath = path.join(UPLOADS_DIR, pathname.replace('/uploads/', ''));
  } else {
    filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support streaming video/audio range requests
    const range = req.headers.range;
    if (range && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      file.pipe(res);
      return;
    }

    if (parsedUrl.searchParams.has('download')) {
      const fileName = path.basename(filePath).replace(/^\d+_\d+_/, '');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Accept-Ranges': 'bytes'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

// ============================================================================
// WEBSOCKET UPGRADE & WEBRTC SIGNALING
// ============================================================================
server.on('upgrade', (req, socket) => {
  if (req.headers['upgrade'] !== 'websocket' || !req.headers['sec-websocket-key']) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto.createHash('sha1')
    .update(req.headers['sec-websocket-key'] + WS_MAGIC)
    .digest('base64');

  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '\r\n'
  ].join('\r\n'));

  const ws = new SimpleWebSocket(socket);
  const peerId = 'peer_' + Math.random().toString(36).substr(2, 8);

  const peerData = {
    id: peerId,
    deviceId: null,
    name: 'User',
    color: '#0a84ff',
    joinedAt: Date.now()
  };

  peers.set(ws, peerData);

  ws.send(JSON.stringify({
    type: 'init',
    yourId: peerId,
    peers: getPeerList(),
    messages: messages,
    files: sharedFiles,
    clipboard: sharedClipboard,
    localIPs: getLocalIPs(),
    port: PORT
  }));

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);

      switch (data.type) {
        case 'set_profile': {
          if (data.name) peerData.name = data.name.trim().slice(0, 20);
          if (data.color) peerData.color = data.color;
          if (data.deviceId) peerData.deviceId = data.deviceId;
          peers.set(ws, peerData);

          broadcast({
            type: 'peer_updated',
            peer: peerData,
            peers: getPeerList()
          });
          break;
        }

        case 'chat_message': {
          const text = (data.text || '').trim();
          if (!text) return;

          const msg = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            senderId: peerData.id,
            senderName: peerData.name,
            senderColor: peerData.color,
            type: 'text',
            text: text.slice(0, 3000),
            timestamp: Date.now()
          };

          messages.push(msg);
          if (messages.length > MAX_MESSAGES) messages.shift();

          broadcast({ type: 'new_message', message: msg });
          break;
        }

        case 'typing': {
          broadcast({
            type: 'typing',
            peerId: peerData.id,
            name: peerData.name,
            isTyping: !!data.isTyping
          }, ws);
          break;
        }

        case 'clipboard_update': {
          sharedClipboard = {
            content: (data.content || '').slice(0, 50000),
            updatedBy: peerData.name,
            updatedAt: Date.now()
          };
          broadcast({ type: 'clipboard_updated', clipboard: sharedClipboard });
          break;
        }

        // ====================================================================
        // WEBRTC SIGNALING ROUTING
        // ====================================================================
        case 'call_initiate': {
          // Broadcast incoming call to other peers
          broadcast({
            type: 'incoming_call',
            callerId: peerData.id,
            callerName: peerData.name,
            callerColor: peerData.color,
            callMode: data.callMode || 'audio'
          }, ws);
          break;
        }

        case 'call_accept': {
          // Target accepted, relay to caller
          sendToPeerId(data.callerId, {
            type: 'call_accepted',
            peerId: peerData.id,
            peerName: peerData.name,
            peerColor: peerData.color
          });
          break;
        }

        case 'call_decline': {
          if (data.callerId) {
            sendToPeerId(data.callerId, {
              type: 'call_declined',
              peerId: peerData.id,
              peerName: peerData.name
            });
          }
          break;
        }

        case 'webrtc_offer': {
          sendToPeerId(data.targetId, {
            type: 'webrtc_offer',
            fromId: peerData.id,
            fromName: peerData.name,
            offer: data.offer,
            callMode: data.callMode
          });
          break;
        }

        case 'webrtc_answer': {
          sendToPeerId(data.targetId, {
            type: 'webrtc_answer',
            fromId: peerData.id,
            answer: data.answer
          });
          break;
        }

        case 'webrtc_ice': {
          sendToPeerId(data.targetId, {
            type: 'webrtc_ice',
            fromId: peerData.id,
            candidate: data.candidate
          });
          break;
        }

        case 'call_end': {
          broadcast({
            type: 'call_ended',
            fromId: peerData.id
          }, ws);
          break;
        }
      }
    } catch (err) {}
  });

  ws.on('close', () => {
    peers.delete(ws);
    broadcast({
      type: 'peer_left',
      peerId: peerData.id,
      name: peerData.name,
      peers: getPeerList()
    });
  });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n=============================================================');
  console.log('   📱 AETHERLAN — ZERO-DEPENDENCY MOBILE MESH LIVE! 📱       ');
  console.log('=============================================================');
  console.log(` ▸ Local Host:     http://localhost:${PORT}`);
  if (ips.length > 0) {
    ips.forEach(net => {
      console.log(` ▸ Wi-Fi / LAN (${net.interface}): http://${net.address}:${PORT}`);
    });
  }
  console.log('=============================================================\n');
});
