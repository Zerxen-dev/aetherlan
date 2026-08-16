// ZerxenLAN — Zero-Dependency Pure Node.js Server
// 100% Offline Capable • Zero npm install required!

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
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webm': 'audio/webm',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8'
};

// State Store
const MAX_HISTORY = 150;
const messages = [];
const sharedFiles = [];
let sharedClipboard = {
  content: "Welcome to ZerxenLAN! Copy anything here to share instantly across all devices on Wi-Fi.",
  updatedBy: "System",
  updatedByColor: "#00f2fe",
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
// RFC 6455 WEBSOCKET PROTOCOL ENGINE (PURE NODE.JS)
// ============================================================================
const WS_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

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

      const fin = (byte1 & 0x80) === 0x80;
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

      if (this.buffer.length < offset + payloadLen) return; // Wait for full frame

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

      if (opcode === 0x1) { // Text frame
        this.emit('message', unmasked.toString('utf8'));
      } else if (opcode === 0x8) { // Close frame
        this.socket.end();
        this.emit('close');
        return;
      } else if (opcode === 0x9) { // Ping
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

function getPeerList() {
  return Array.from(peers.values()).map(p => ({
    id: p.id,
    name: p.name,
    color: p.color,
    device: p.device,
    joinedAt: p.joinedAt
  }));
}

// ============================================================================
// HTTP SERVER & STATIC FILE DISPATCHER
// ============================================================================
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // CORS Headers for LAN
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sender-Name, X-Sender-Color, X-Sender-Id, X-Is-Voice, X-File-Name');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: Network Info
  if (pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      appName: "ZerxenLAN",
      version: "1.0.0",
      ips: getLocalIPs(),
      port: PORT,
      peerCount: peers.size
    }));
    return;
  }

  // API: File / Voice Upload (Streaming Body with Custom Headers)
  if (pathname === '/api/upload' && req.method === 'POST') {
    const rawFileName = req.headers['x-file-name'] || 'file_' + Date.now();
    const sanitizedName = decodeURIComponent(rawFileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}_${Math.round(Math.random() * 1e6)}_${sanitizedName}`;
    const targetPath = path.join(UPLOADS_DIR, uniqueFileName);

    const isVoice = req.headers['x-is-voice'] === 'true';
    const senderName = decodeURIComponent(req.headers['x-sender-name'] || 'Anonymous');
    const senderColor = decodeURIComponent(req.headers['x-sender-color'] || '#00ffcc');
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
        timestamp: Date.now(),
        reactions: {}
      };

      messages.push(chatMsg);
      if (messages.length > MAX_HISTORY) messages.shift();

      broadcast({ type: 'new_message', message: chatMsg });
      broadcast({ type: 'file_list', files: sharedFiles });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, file: fileData, message: chatMsg }));
    });

    req.on('error', (err) => {
      console.error('Upload Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });

    return;
  }

  // Static File Dispatcher
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

    // Support Content-Disposition for downloaded files
    if (parsedUrl.searchParams.has('download')) {
      const fileName = path.basename(filePath).replace(/^\d+_\d+_/, '');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

// ============================================================================
// WEBSOCKET UPGRADE HANDLER
// ============================================================================
server.on('upgrade', (req, socket, head) => {
  if (req.headers['upgrade'] !== 'websocket') {
    socket.destroy();
    return;
  }

  const clientKey = req.headers['sec-websocket-key'];
  if (!clientKey) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto.createHash('sha1')
    .update(clientKey + WS_MAGIC_STRING)
    .digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '\r\n'
  ];

  socket.write(responseHeaders.join('\r\n'));

  const ws = new SimpleWebSocket(socket);
  const peerId = 'peer_' + Math.random().toString(36).substr(2, 8);
  const clientIP = socket.remoteAddress;

  const peerData = {
    id: peerId,
    name: 'Ghost_' + Math.floor(1000 + Math.random() * 9000),
    color: ['#00f2fe', '#4facfe', '#00ff87', '#60efff', '#ff007f', '#ffaa00', '#a18cd1', '#38ef7d'][Math.floor(Math.random() * 8)],
    device: 'Unknown',
    ip: clientIP,
    joinedAt: Date.now()
  };

  peers.set(ws, peerData);

  // Send Initial Snapshot
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

  broadcast({
    type: 'peer_joined',
    peer: { id: peerData.id, name: peerData.name, color: peerData.color, device: peerData.device },
    peers: getPeerList()
  }, ws);

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);

      switch (data.type) {
        case 'set_profile': {
          if (data.name) peerData.name = data.name.trim().slice(0, 24);
          if (data.color) peerData.color = data.color;
          if (data.device) peerData.device = data.device;
          peers.set(ws, peerData);

          broadcast({
            type: 'peer_updated',
            peer: { id: peerData.id, name: peerData.name, color: peerData.color, device: peerData.device },
            peers: getPeerList()
          });
          break;
        }

        case 'chat_message': {
          const text = (data.text || '').trim();
          if (!text) return;

          const burnSeconds = parseInt(data.burnSeconds, 10) || 0;
          const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

          const msg = {
            id: msgId,
            senderId: peerData.id,
            senderName: peerData.name,
            senderColor: peerData.color,
            type: 'text',
            text: text.slice(0, 3000),
            timestamp: Date.now(),
            burnSeconds: burnSeconds > 0 ? burnSeconds : null,
            burnsAt: burnSeconds > 0 ? Date.now() + (burnSeconds * 1000) : null,
            reactions: {}
          };

          messages.push(msg);
          if (messages.length > MAX_HISTORY) messages.shift();

          broadcast({ type: 'new_message', message: msg });

          if (burnSeconds > 0) {
            setTimeout(() => {
              const idx = messages.findIndex(m => m.id === msgId);
              if (idx !== -1) {
                messages.splice(idx, 1);
                broadcast({ type: 'message_burned', messageId: msgId });
              }
            }, burnSeconds * 1000);
          }
          break;
        }

        case 'reaction': {
          const { messageId, emoji } = data;
          const msg = messages.find(m => m.id === messageId);
          if (msg && emoji) {
            if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
            const idx = msg.reactions[emoji].indexOf(peerData.name);
            if (idx >= 0) {
              msg.reactions[emoji].splice(idx, 1);
              if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
            } else {
              msg.reactions[emoji].push(peerData.name);
            }
            broadcast({ type: 'reaction_updated', messageId, reactions: msg.reactions });
          }
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
            updatedByColor: peerData.color,
            updatedAt: Date.now()
          };
          broadcast({ type: 'clipboard_updated', clipboard: sharedClipboard });
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', time: data.time }));
          break;
        }
      }
    } catch (err) {
      console.error('WS Message Parse Error:', err);
    }
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

  ws.on('error', (err) => {
    console.error(`WS Client Error (${peerData.name}):`, err.message);
  });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n=============================================================');
  console.log('   👻 ZERXENLAN — ZERO-DEPENDENCY WI-FI HUB IS LIVE! 👻        ');
  console.log('=============================================================');
  console.log(` ▸ Local Host:     http://localhost:${PORT}`);
  if (ips.length > 0) {
    ips.forEach(net => {
      console.log(` ▸ Wi-Fi / LAN (${net.interface}): http://${net.address}:${PORT}`);
    });
  } else {
    console.log(` ▸ Wi-Fi IP:       Connect to Wi-Fi/Hotspot to get LAN URL`);
  }
  console.log('=============================================================');
  console.log(' Instant 0-lag LAN transfers. No npm install needed!\n');
});
