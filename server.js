// AetherLAN — Zero-Dependency Local Peer-to-Peer Cyber Mesh & LAN Suite
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

// MIME Types
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
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.txt': 'text/plain; charset=utf-8'
};

// In-Memory Multi-Room Mesh State
const MAX_HISTORY_PER_ROOM = 200;
const rooms = {
  'general': {
    messages: [],
    files: [],
    clipboard: {
      content: "⚡ Welcome to AetherLAN! Type or paste anything here to sync live across phones, laptops, and tablets on this Wi-Fi.",
      updatedBy: "System",
      updatedByColor: "#00f2fe",
      updatedAt: Date.now()
    }
  }
};

const peers = new Map(); // wsSocket -> peerData

function getOrCreateRoom(roomId = 'general') {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      messages: [],
      files: [],
      clipboard: {
        content: `🔒 Room #${roomId} initialized. Synced across all members.`,
        updatedBy: "System",
        updatedByColor: "#00ff87",
        updatedAt: Date.now()
      }
    };
  }
  return rooms[roomId];
}

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

class WebSocketConnection extends EventEmitter {
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

function broadcastToRoom(roomId, data, excludeWs = null) {
  const payload = JSON.stringify(data);
  for (const [clientWs, peer] of peers) {
    if (peer.room === roomId && clientWs !== excludeWs) {
      clientWs.send(payload);
    }
  }
}

function getRoomPeers(roomId) {
  const list = [];
  for (const [, peer] of peers) {
    if (peer.room === roomId) {
      list.push({
        id: peer.id,
        name: peer.name,
        color: peer.color,
        device: peer.device,
        ping: peer.ping || 0,
        joinedAt: peer.joinedAt
      });
    }
  }
  return list;
}

// ============================================================================
// HTTP SERVER & HIGH-SPEED STREAMING ENDPOINTS
// ============================================================================
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // LAN CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: Health & Subnet Info
  if (pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      appName: "AetherLAN",
      version: "2.0.0",
      creator: "Zerxen-dev",
      ips: getLocalIPs(),
      port: PORT,
      activePeers: peers.size
    }));
    return;
  }

  // API: High-Speed File / Media / Voice Upload
  if (pathname === '/api/upload' && req.method === 'POST') {
    const roomId = req.headers['x-room-id'] || 'general';
    const room = getOrCreateRoom(roomId);

    const rawFileName = req.headers['x-file-name'] || 'file_' + Date.now();
    const sanitizedName = decodeURIComponent(rawFileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}_${Math.round(Math.random() * 1e6)}_${sanitizedName}`;
    const targetPath = path.join(UPLOADS_DIR, uniqueFileName);

    const isVoice = req.headers['x-is-voice'] === 'true';
    const isEncrypted = req.headers['x-is-encrypted'] === 'true';
    const senderName = decodeURIComponent(req.headers['x-sender-name'] || 'Anonymous');
    const senderColor = decodeURIComponent(req.headers['x-sender-color'] || '#00f2fe');
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
        isEncrypted,
        senderName,
        senderColor,
        uploadedAt: Date.now(),
        url: `/uploads/${encodeURIComponent(uniqueFileName)}`
      };

      room.files.unshift(fileData);
      if (room.files.length > 80) room.files.pop();

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

      room.messages.push(chatMsg);
      if (room.messages.length > MAX_HISTORY_PER_ROOM) room.messages.shift();

      broadcastToRoom(roomId, { type: 'new_message', message: chatMsg });
      broadcastToRoom(roomId, { type: 'file_list', files: room.files });

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

    // Support streaming video/audio range requests (for smooth media playback)
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
// WEBSOCKET PEER MANAGEMENT
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

  const ws = new WebSocketConnection(socket);
  const peerId = 'peer_' + Math.random().toString(36).substr(2, 8);
  const clientIP = socket.remoteAddress;

  const peerData = {
    id: peerId,
    name: 'Ghost_' + Math.floor(1000 + Math.random() * 9000),
    color: '#00f2fe',
    device: 'Mobile',
    room: 'general',
    ip: clientIP,
    ping: 0,
    joinedAt: Date.now()
  };

  peers.set(ws, peerData);

  // Send Initial Room State
  const currentRoom = getOrCreateRoom('general');
  ws.send(JSON.stringify({
    type: 'init',
    yourId: peerId,
    room: 'general',
    peers: getRoomPeers('general'),
    messages: currentRoom.messages,
    files: currentRoom.files,
    clipboard: currentRoom.clipboard,
    localIPs: getLocalIPs(),
    port: PORT
  }));

  broadcastToRoom('general', {
    type: 'peer_joined',
    peer: peerData,
    peers: getRoomPeers('general')
  }, ws);

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);
      const room = getOrCreateRoom(peerData.room);

      switch (data.type) {
        case 'set_profile': {
          if (data.name) peerData.name = data.name.trim().slice(0, 24);
          if (data.color) peerData.color = data.color;
          if (data.device) peerData.device = data.device;
          peers.set(ws, peerData);

          broadcastToRoom(peerData.room, {
            type: 'peer_updated',
            peer: peerData,
            peers: getRoomPeers(peerData.room)
          });
          break;
        }

        case 'join_room': {
          const oldRoom = peerData.room;
          const newRoomId = (data.roomId || 'general').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) || 'general';

          if (oldRoom !== newRoomId) {
            peerData.room = newRoomId;
            peers.set(ws, peerData);

            // Notify old room
            broadcastToRoom(oldRoom, {
              type: 'peer_left',
              peerId: peerData.id,
              name: peerData.name,
              peers: getRoomPeers(oldRoom)
            });

            // Send new room snapshot
            const newRoom = getOrCreateRoom(newRoomId);
            ws.send(JSON.stringify({
              type: 'room_switched',
              room: newRoomId,
              peers: getRoomPeers(newRoomId),
              messages: newRoom.messages,
              files: newRoom.files,
              clipboard: newRoom.clipboard
            }));

            // Notify new room
            broadcastToRoom(newRoomId, {
              type: 'peer_joined',
              peer: peerData,
              peers: getRoomPeers(newRoomId)
            }, ws);
          }
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
            text: text.slice(0, 4000),
            isEncrypted: !!data.isEncrypted,
            timestamp: Date.now(),
            burnSeconds: burnSeconds > 0 ? burnSeconds : null,
            burnsAt: burnSeconds > 0 ? Date.now() + (burnSeconds * 1000) : null,
            reactions: {}
          };

          room.messages.push(msg);
          if (room.messages.length > MAX_HISTORY_PER_ROOM) room.messages.shift();

          broadcastToRoom(peerData.room, { type: 'new_message', message: msg });

          if (burnSeconds > 0) {
            setTimeout(() => {
              const idx = room.messages.findIndex(m => m.id === msgId);
              if (idx !== -1) {
                room.messages.splice(idx, 1);
                broadcastToRoom(peerData.room, { type: 'message_burned', messageId: msgId });
              }
            }, burnSeconds * 1000);
          }
          break;
        }

        case 'reaction': {
          const { messageId, emoji } = data;
          const msg = room.messages.find(m => m.id === messageId);
          if (msg && emoji) {
            if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
            const idx = msg.reactions[emoji].indexOf(peerData.name);
            if (idx >= 0) {
              msg.reactions[emoji].splice(idx, 1);
              if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
            } else {
              msg.reactions[emoji].push(peerData.name);
            }
            broadcastToRoom(peerData.room, {
              type: 'reaction_updated',
              messageId,
              reactions: msg.reactions
            });
          }
          break;
        }

        case 'typing': {
          broadcastToRoom(peerData.room, {
            type: 'typing',
            peerId: peerData.id,
            name: peerData.name,
            isTyping: !!data.isTyping
          }, ws);
          break;
        }

        case 'clipboard_update': {
          room.clipboard = {
            content: (data.content || '').slice(0, 60000),
            updatedBy: peerData.name,
            updatedByColor: peerData.color,
            updatedAt: Date.now()
          };
          broadcastToRoom(peerData.room, {
            type: 'clipboard_updated',
            clipboard: room.clipboard
          });
          break;
        }

        case 'ping': {
          peerData.ping = data.latency || 0;
          ws.send(JSON.stringify({ type: 'pong', time: data.time }));
          break;
        }
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  });

  ws.on('close', () => {
    peers.delete(ws);
    broadcastToRoom(peerData.room, {
      type: 'peer_left',
      peerId: peerData.id,
      name: peerData.name,
      peers: getRoomPeers(peerData.room)
    });
  });

  ws.on('error', () => {});
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n=============================================================');
  console.log('   ⚡ AETHERLAN 2.0 — ZERO-DEPENDENCY CYBER MESH IS LIVE! ⚡  ');
  console.log('=============================================================');
  console.log(` ▸ Local Host:     http://localhost:${PORT}`);
  if (ips.length > 0) {
    ips.forEach(net => {
      console.log(` ▸ Wi-Fi / LAN (${net.interface}): http://${net.address}:${PORT}`);
    });
  }
  console.log('=============================================================');
  console.log(' Ready for high-speed offline Wi-Fi mesh transfers!\n');
});
