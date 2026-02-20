/**
 * ============================================
 *  OVERLAY UNIT TESTS
 *  Run:  node tests/run-tests.js
 * ============================================
 */

const fs   = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, name) {
  if (condition) { passed++; results.push(`  ✓ ${name}`); }
  else { failed++; results.push(`  ✗ ${name}`); }
}

function assertEqual(actual, expected, name) {
  if (actual === expected) { passed++; results.push(`  ✓ ${name}`); }
  else { failed++; results.push(`  ✗ ${name}  (expected: "${expected}", got: "${actual}")`); }
}

// ---- Test Suite 1: Config ----
function testConfig() {
  results.push('\n--- Config Validation ---');
  const configSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
  const config = new Function(configSrc + '\nreturn CONFIG;')();

  // Sprite keys
  const requiredKeys = ['idle', 'talk', 'scream', 'wasd', 'mouse'];
  for (const key of requiredKeys) {
    assert(config.sprites[key], `Sprite defined: ${key}`);
  }

  // Animated sprites are arrays
  assert(Array.isArray(config.sprites.idle), 'idle is animated (array)');
  assert(config.sprites.idle.length === 2, 'idle has 2 frames');
  assert(Array.isArray(config.sprites.talk), 'talk is animated (array)');
  assert(config.sprites.talk.length === 2, 'talk has 2 frames');
  assert(Array.isArray(config.sprites.wasd), 'wasd is animated (array)');
  assert(config.sprites.wasd.length === 2, 'wasd has 2 frames');

  // Static sprites are strings
  assert(typeof config.sprites.scream === 'string', 'scream is static (string)');
  assert(typeof config.sprites.mouse === 'string', 'mouse is static (string)');

  // All sprite paths end in .png
  function checkPng(val, label) {
    if (Array.isArray(val)) val.forEach((v, i) => assert(v.endsWith('.png'), `${label}[${i}] is .png`));
    else assert(val.endsWith('.png'), `${label} is .png`);
  }
  for (const [k, v] of Object.entries(config.sprites)) checkPng(v, k);

  // Priority
  const priKeys = ['idle', 'talk', 'wasd', 'mouse', 'scream'];
  for (const key of priKeys) assert(config.priority[key] !== undefined, `Priority defined: ${key}`);
  assert(config.priority.idle < config.priority.talk, 'Priority: idle < talk');
  assert(config.priority.talk < config.priority.wasd, 'Priority: talk < wasd');
  assert(config.priority.wasd < config.priority.mouse, 'Priority: wasd < mouse');
  assert(config.priority.mouse < config.priority.scream, 'Priority: mouse < scream');

  // Mic
  assert(config.mic.talkThreshold > 0, 'Talk threshold > 0');
  assert(config.mic.screamThreshold > config.mic.talkThreshold, 'Scream > talk threshold');
  assert((config.mic.fftSize & (config.mic.fftSize - 1)) === 0, 'FFT size is power of 2');

  // Linger
  assert(config.lingering.voiceMs > 0, 'Voice linger > 0');
  assert(config.lingering.keyMs > 0, 'Key linger > 0');
  assert(config.lingering.mouseMs > 0, 'Mouse linger > 0');

  // Animation timing
  assert(config.animation.idle > 0, 'Idle animation timing > 0');
  assert(config.animation.talk > 0, 'Talk animation timing > 0');
  assert(config.animation.wasd > 0, 'WASD animation timing > 0');

  // Display
  assert(config.display.width, 'Display width set');
  assert(config.display.height, 'Display height set');

  // WS
  assert(config.wsUrl && config.wsUrl.startsWith('ws://'), 'WS URL valid');

  return config;
}

// ---- Test Suite 2: Sprite files ----
function testSpriteFiles(config) {
  results.push('\n--- Sprite Files ---');
  for (const [key, val] of Object.entries(config.sprites)) {
    const paths = Array.isArray(val) ? val : [val];
    for (const p of paths) {
      const fullPath = path.join(__dirname, '..', p);
      assert(fs.existsSync(fullPath), `File exists: ${p}`);
    }
  }
}

// ---- Test Suite 3: HTML ----
function testHtml() {
  results.push('\n--- HTML Structure ---');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(html.includes('id="dog"'), 'Has #dog element');
  assert(html.includes('id="debug"'), 'Has #debug element');
  assert(html.includes('config.js'), 'Loads config.js');
  assert(html.includes('overlay.js'), 'Loads overlay.js');
  assert(html.indexOf('config.js') < html.indexOf('overlay.js'), 'config.js before overlay.js');
  assert(html.trim().startsWith('<!DOCTYPE html>'), 'Has doctype');
}

// ---- Test Suite 4: CSS ----
function testCss() {
  results.push('\n--- CSS ---');
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'overlay.css'), 'utf8');
  assert(css.includes('background: transparent'), 'Transparent body');
  assert(css.includes('#dog'), 'Targets #dog');
  assert(css.includes('position: fixed'), 'Fixed position');
}

// ---- Test Suite 5: Overlay code ----
function testOverlayCode() {
  results.push('\n--- Overlay.js Code ---');
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'overlay.js'), 'utf8');

  // Core functions
  const funcs = ['resolve', 'initMic', 'triggerKey', 'releaseKey', 'triggerMouse',
    'releaseMouse', 'setVoiceState', 'setMouseState', 'initWebSocket', 'updateDebug',
    'startAnimation', 'stopAnimation'];
  for (const fn of funcs) assert(code.includes(`function ${fn}`), `${fn}() exists`);

  // WASD → unified 'wasd' state
  assert(code.includes("wasdKeys"), 'Has wasdKeys set');
  assert(code.includes("'wasd'"), 'Maps to unified wasd state');

  // Mouse → unified 'mouse' state
  assert(code.includes("'mouse'") && code.includes("setMouseState('mouse')"), 'Maps to unified mouse state');

  // Animation support
  assert(code.includes('Array.isArray(sprite)'), 'Checks for animated sprites');
  assert(code.includes('CONFIG.animation[state]'), 'Uses per-state animation timing');

  // Test API
  assert(code.includes('window.__overlay'), 'Test API exposed');

  // Key repeat guard
  assert(code.includes('e.repeat'), 'Ignores key repeats');

  // WS protocol
  assert(code.includes("msg.type === 'key'"), 'WS handles keys');
  assert(code.includes("msg.type === 'mouse'"), 'WS handles mouse');

  // Preloading handles arrays
  assert(code.includes('Array.isArray(src)'), 'Preloader handles animated sprites');

  // Reconnect
  assert(code.includes('scheduleReconnect'), 'WS auto-reconnect');
}

// ---- Test Suite 6: Input server ----
function testInputServer() {
  results.push('\n--- Input Server ---');
  const serverPath = path.join(__dirname, '..', 'input-server.js');
  assert(fs.existsSync(serverPath), 'input-server.js exists');
  if (fs.existsSync(serverPath)) {
    const code = fs.readFileSync(serverPath, 'utf8');
    assert(code.includes("require('ws')"), 'Uses ws module');
    assert(code.includes('9001'), 'Port 9001');
    assert(code.includes('KeyW') && code.includes('KeyD'), 'Maps WASD');
    assert(code.includes("type: 'key'"), 'Sends key type');
    assert(code.includes("type: 'mouse'"), 'Sends mouse type');
  }
}

// ---- Test Suite 7: Launchers ----
function testLaunchers() {
  results.push('\n--- Launchers ---');
  assert(fs.existsSync(path.join(__dirname, '..', 'serve.bat')), 'serve.bat exists');
  assert(fs.existsSync(path.join(__dirname, '..', 'serve.sh')), 'serve.sh exists');
}

// ---- Test Suite 8: Priority resolution ----
function testPriority() {
  results.push('\n--- Priority Resolution ---');
  const configSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
  const config = new Function(configSrc + '\nreturn CONFIG;')();

  function resolve(voice, keys, mouse) {
    const candidates = [voice, keys, mouse];
    let best = 'idle', bestPri = -1;
    for (const state of candidates) {
      const pri = config.priority[state] ?? 0;
      if (pri > bestPri) { bestPri = pri; best = state; }
    }
    return best;
  }

  assertEqual(resolve('idle', 'idle', 'idle'), 'idle', 'All idle → idle');
  assertEqual(resolve('talk', 'idle', 'idle'), 'talk', 'Talk only → talk');
  assertEqual(resolve('idle', 'wasd', 'idle'), 'wasd', 'WASD only → wasd');
  assertEqual(resolve('idle', 'idle', 'mouse'), 'mouse', 'Mouse only → mouse');
  assertEqual(resolve('scream', 'idle', 'idle'), 'scream', 'Scream only → scream');
  assertEqual(resolve('talk', 'wasd', 'idle'), 'wasd', 'Talk + WASD → wasd wins');
  assertEqual(resolve('talk', 'idle', 'mouse'), 'mouse', 'Talk + mouse → mouse wins');
  assertEqual(resolve('talk', 'wasd', 'mouse'), 'mouse', 'Talk + WASD + mouse → mouse wins');
  assertEqual(resolve('scream', 'wasd', 'mouse'), 'scream', 'Scream beats all');
  assertEqual(resolve('idle', 'wasd', 'mouse'), 'mouse', 'WASD + mouse → mouse wins');
}

// ---- Run ----
console.log('\n============================================');
console.log('  DOG OVERLAY TEST SUITE');
console.log('============================================\n');

const config = testConfig();
testSpriteFiles(config);
testHtml();
testCss();
testOverlayCode();
testInputServer();
testLaunchers();
testPriority();

console.log(results.join('\n'));
console.log('\n============================================');
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('============================================\n');

process.exit(failed > 0 ? 1 : 0);
