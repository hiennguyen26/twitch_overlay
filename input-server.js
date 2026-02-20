/**
 * ============================================
 *  INPUT SERVER — Global Key/Mouse → WebSocket
 * ============================================
 *
 *  This captures global keyboard and mouse events on your PC
 *  and sends them to the browser overlay via WebSocket.
 *
 *  Required because OBS Browser Source can't capture
 *  keyboard/mouse input on its own.
 *
 *  Install:
 *    npm install ws iohook2
 *
 *  Run:
 *    node input-server.js
 *
 *  The overlay auto-connects to ws://localhost:9001
 */

const WebSocket = require('ws');

// --- Config ---
const PORT = 9001;

// Keys we care about (scan codes → key codes for the overlay)
// iohook uses raw scan codes; these map common layouts
const SCAN_TO_CODE = {
  17: 'KeyW',  // W
  30: 'KeyA',  // A
  31: 'KeyS',  // S
  32: 'KeyD',  // D
};

// Mouse buttons we care about
// iohook: 1=left, 2=right, 3=middle, 4=x1(back), 5=x2(forward)
const MOUSE_TO_BUTTON = {
  1: 0,   // left click   → button 0
  5: 4,   // forward/side → button 4
};

// ---- WebSocket Server ----
const wss = new WebSocket.Server({ port: PORT });

let clients = [];

wss.on('connection', (ws) => {
  clients.push(ws);
  console.log(`[input-server] Client connected (${clients.length} total)`);

  ws.on('close', () => {
    clients = clients.filter((c) => c !== ws);
    console.log(`[input-server] Client disconnected (${clients.length} total)`);
  });
});

function broadcast(data) {
  const json = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(json);
    }
  }
}

// ---- Global Input Hooks ----
let ioHook;
try {
  ioHook = require('iohook2');
} catch (err) {
  console.error('');
  console.error('  iohook2 not installed. Run:');
  console.error('    npm install iohook2');
  console.error('');
  console.error('  If that fails on Windows, try:');
  console.error('    npm install --global --production windows-build-tools');
  console.error('    npm install iohook2');
  console.error('');
  process.exit(1);
}

// Keyboard
ioHook.on('keydown', (event) => {
  const code = SCAN_TO_CODE[event.rawcode] || SCAN_TO_CODE[event.keycode];
  if (code) {
    broadcast({ type: 'key', action: 'down', code });
  }
});

ioHook.on('keyup', (event) => {
  const code = SCAN_TO_CODE[event.rawcode] || SCAN_TO_CODE[event.keycode];
  if (code) {
    broadcast({ type: 'key', action: 'up', code });
  }
});

// Mouse
ioHook.on('mousedown', (event) => {
  const button = MOUSE_TO_BUTTON[event.button];
  if (button !== undefined) {
    broadcast({ type: 'mouse', action: 'down', button });
  }
});

ioHook.on('mouseup', (event) => {
  const button = MOUSE_TO_BUTTON[event.button];
  if (button !== undefined) {
    broadcast({ type: 'mouse', action: 'up', button });
  }
});

// Start
ioHook.start();

console.log('');
console.log('============================================');
console.log('  INPUT SERVER running on ws://localhost:' + PORT);
console.log('============================================');
console.log('');
console.log('  Listening for: W A S D, Mouse1, Mouse5');
console.log('  Overlay will auto-connect.');
console.log('  Press Ctrl+C to stop.');
console.log('');
