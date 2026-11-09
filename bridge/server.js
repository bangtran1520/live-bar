#!/usr/bin/env node
/**
 * CẦU NỐI QUÀ TIKTOK LIVE -> SÀN NHẢY
 * ------------------------------------------------------------------
 * Việc nó làm, theo đúng thứ tự:
 *   1. Mở một trang web nhỏ tại http://127.0.0.1:8080  (chính là sàn nhảy)
 *   2. Kết nối vào buổi LIVE của bạn và nghe sự kiện quà
 *   3. Đẩy tên quà + số coin sang trang sàn nhảy qua WebSocket
 *
 * Chạy:   npm install        (lần đầu)
 *         npm start
 *
 * Cấu hình: sửa file config.json cùng thư mục, hoặc đặt biến môi trường
 *   TIKTOK_USERNAME   tên tài khoản đang live (không cần dấu @)
 *   SIGN_API_KEY      khoá Euler Stream (không bắt buộc, chỉ để tăng giới hạn)
 *   PORT              mặc định 8080
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Kiểm tra thư viện trước, để báo lỗi dễ hiểu thay vì một mớ chữ đỏ
let WebSocketServer;
try {
  ({ WebSocketServer } = require('ws'));
} catch (_) {
  console.error('');
  console.error('  [!] Chưa cài thư viện cần thiết.');
  console.error('      Mở terminal tại thư mục bridge và chạy:  npm install');
  console.error('      (Windows: bấm đúp vào file start.bat là nó tự cài giúp bạn)');
  console.error('');
  process.exit(1);
}

/* ---------------- Cấu hình ---------------- */
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch (_) {}

const PORT = Number(process.env.PORT || cfg.port || 8080);
const HOST = String(process.env.HOST || cfg.host || '127.0.0.1');
const USERNAME = String(process.env.TIKTOK_USERNAME || cfg.tiktokUsername || '').replace(/^@/, '').trim();
const SIGN_KEY = String(process.env.SIGN_API_KEY || cfg.signApiKey || '').trim();
const ROOT = path.resolve(__dirname, '..');          // thư mục chứa index.html

const state = { tiktok: 'off', room: '', gifts: 0, lastGift: null };

/* ---------------- Tiện ích ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function firstUrl(x) {
  if (!x) return undefined;
  if (typeof x === 'string') return x;
  if (Array.isArray(x)) return firstUrl(x[0]);
  return x.url || (x.url_list && firstUrl(x.url_list));
}

/* ---------------- Server: trang + WebSocket ---------------- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // Nhận quà từ công cụ khác: POST /gift  {"user":"Minh","coins":50,"gift":"Vương miện"}
  if (url.pathname === '/gift') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (req.method !== 'POST') { res.writeHead(405); return res.end('Dùng POST'); }

    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 20000) { req.destroy(); }
    });
    req.on('end', () => {
      try {
        const d = JSON.parse(body || '{}');
        if (!d.user) throw new Error('thiếu trường "user"');
        const payload = {
          type: 'gift',
          user: String(d.user),
          coins: Number(d.coins) || 1,
          gift: d.gift ? String(d.gift) : undefined,
          avatar: d.avatar ? String(d.avatar) : undefined
        };
        broadcast(payload);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, sent: payload }));
      } catch (err) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === '/status') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ...state, viewers: wss.clients.size }, null, 2));
  }

  // Trang tĩnh
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.readFile(file, (err, buf) => {
    if (err && rel === '/index.html') {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('Không tìm thấy index.html trong thư mục san-nhay. Hãy giữ nguyên cấu trúc: san-nhay/index.html và san-nhay/bridge/.');
    }
    if (err) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Không tìm thấy'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'hello', tiktok: state.tiktok, room: state.room }));
});

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

let exiting = false;
function onFatalError(err) {
  if (exiting) return;
  exiting = true;
  if (err && err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`  [!] Cổng ${PORT} đang bận — có thể cầu nối đã chạy sẵn ở cửa sổ khác.`);
    console.error(`      Thử mở thẳng:  http://127.0.0.1:${PORT}`);
    console.error('      Nếu vẫn lỗi, mở config.json và đổi "port" thành 8081.');
    console.error('');
  } else if (err && err.code === 'EACCES') {
    console.error(`  [!] Không được phép mở cổng ${PORT}. Đổi "port" trong config.json thành 8081.`);
  } else {
    console.error('  [!] Không khởi động được máy chủ:', err && err.message ? err.message : err);
  }
  process.exit(1);
}
server.on('error', onFatalError);
wss.on('error', onFatalError);

function openBrowser(url) {
  if (process.env.NO_OPEN) return;
  const { exec } = require('child_process');
  const cmd = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"`
      : `xdg-open "${url}"`;
  try { exec(cmd, () => {}); } catch (_) {}
}

server.listen(PORT, HOST, () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log('');
  console.log('  SÀN NHẢY — cầu nối quà TikTok LIVE');
  console.log('  ------------------------------------------------');
  console.log(`  Mở trang tại:  ${url}`);
  console.log(`  Tài khoản:     ${USERNAME ? '@' + USERNAME : '(chưa đặt trong config.json)'}`);
  console.log('  Để tắt: bấm Ctrl + C, hoặc đóng cửa sổ này.');
  console.log('');
  openBrowser(url);
  connectTikTok();
});

/* ---------------- Nghe quà từ TikTok LIVE ---------------- */
let connection = null;
let retryTimer = null;

function scheduleRetry(ms = 15000) {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(connectTikTok, ms);
}

async function connectTikTok() {
  if (!USERNAME) {
    console.log('  [!] Chưa có tiktokUsername trong config.json — trang vẫn chạy, nhưng không có quà thật.');
    return;
  }

  let lib;
  try {
    lib = require('tiktok-live-connector');
  } catch (err) {
    console.error('  [x] Chưa cài thư viện. Mở terminal tại thư mục bridge và chạy: npm install');
    return;
  }

  const { TikTokLiveConnection, WebcastEvent } = lib;

  connection = new TikTokLiveConnection(USERNAME, {
    signApiKey: SIGN_KEY || undefined,
    enableExtendedGiftInfo: true,   // để có tên quà + giá trị
    processInitialData: false       // bỏ qua tin nhắn cũ lúc mới vào
  });

  connection.on(WebcastEvent.GIFT, onGift);

  connection.on('connected', (s) => {
    state.tiktok = 'connected';
    state.room = String(s && s.roomId || '');
    console.log(`  [ok] Đã vào phòng LIVE của @${USERNAME}`);
  });

  connection.on('disconnected', () => {
    state.tiktok = 'off';
    console.log('  [!] Mất kết nối TikTok, thử lại sau 15 giây...');
    scheduleRetry(15000);
  });

  connection.on('streamEnd', () => {
    state.tiktok = 'off';
    console.log('  [i] Buổi LIVE đã kết thúc.');
  });

  try {
    console.log(`  [..] Đang kết nối tới @${USERNAME} ...`);
    await connection.connect();
  } catch (err) {
    state.tiktok = 'error';
    console.log(`  [!] Chưa kết nối được: ${err && err.message ? err.message : err}`);
    console.log('      Kiểm tra: tài khoản có đang live không, tên viết đúng chưa.');
    scheduleRetry(20000);
  }
}

let loggedShape = false;

function onGift(data) {
  // Cấu trúc dữ liệu khác nhau giữa các phiên bản -> đọc phòng thủ nhiều đường
  const d = data.giftDetails || {};
  const info = data.extendedGiftInfo || {};

  if (!loggedShape) {
    loggedShape = true;
    console.log('  [i] Mẫu dữ liệu quà nhận được:', JSON.stringify({
      giftDetails: d, repeatCount: data.repeatCount, repeatEnd: data.repeatEnd,
      keys: Object.keys(data).slice(0, 25)
    }, null, 2).slice(0, 1200));
  }

  const giftType = d.giftType ?? data.giftType ?? info.giftType ?? 0;
  const isStreakRunning = giftType === 1 && data.repeatEnd === false;
  if (isStreakRunning) return;   // chờ chuỗi quà kết thúc mới tính một lần

  const count = Number(data.repeatCount || 1) || 1;
  const per = Number(
    d.diamondCount ?? data.diamondCount ?? info.diamondCount ?? info.cost ?? info.diamond_count ?? 1
  ) || 1;
  const name = d.giftName || data.giftName || info.name || info.giftName || `Quà ${data.giftId || ''}`;
  const user = (data.user && (data.user.nickname || data.user.uniqueId)) || data.nickname || data.uniqueId || 'Khách';
  const avatar = firstUrl(data.user && data.user.profilePicture) || firstUrl(data.profilePicture) || firstUrl(info.image);

  const payload = {
    type: 'gift',
    user: String(user),
    coins: per * count,
    gift: String(name).trim(),
    count,
    avatar
  };

  state.gifts++;
  state.lastGift = payload;
  broadcast(payload);
  console.log(`  [+] ${payload.user} tặng ${payload.gift}${count > 1 ? ' ×' + count : ''} (${payload.coins} coin)`);
}

process.on('SIGINT', () => {
  console.log('\n  Đã dừng cầu nối.');
  try { connection && connection.disconnect(); } catch (_) {}
  process.exit(0);
});
