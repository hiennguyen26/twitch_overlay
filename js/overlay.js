/**
 * ============================================
 *  DOG OVERLAY ENGINE
 *  Handles: Mic (talk/scream), WASD, Mouse clicks
 *
 *  Input sources:
 *    1. Direct browser events (for testing in browser)
 *    2. WebSocket from input-server.js (for OBS, since
 *       embedded browser can't capture global keys/mouse)
 *    3. Mic via Web Audio API (works natively in OBS)
 * ============================================
 */

(function () {
  'use strict';

  // ---- DOM refs ----
  const dog   = document.getElementById('dog');
  const debug = document.getElementById('debug');

  if (!dog || !debug) {
    console.error('[overlay] Missing #dog or #debug element');
    return;
  }

  // Apply display config
  dog.style.width  = CONFIG.display.width;
  dog.style.height = CONFIG.display.height;
  dog.style.bottom = CONFIG.display.bottom;
  dog.style.left   = CONFIG.display.left;

  // ---- Active input state tracking ----
  // Each source sets its desired state; the highest-priority one wins
  const activeStates = {
    voice: 'idle',   // from mic
    keys:  'idle',   // from WASD
    mouse: 'idle',   // from mouse buttons
  };

  let currentSprite = 'idle';

  // ---- Linger timers ----
  let voiceTimer = null;
  let keyTimers  = {};   // per-key linger
  let mouseTimer = null;

  // ---- Animation state (for multi-frame sprites like WASD) ----
  let animInterval = null;
  let animFrameIdx = 0;

  function startAnimation(state) {
    stopAnimation();
    const frames = CONFIG.sprites[state];
    if (!Array.isArray(frames) || frames.length < 2) return;

    const frameMs = CONFIG.animation[state] || 250;  // per-state timing, default 250ms

    animFrameIdx = 0;
    dog.src = frames[0];

    animInterval = setInterval(() => {
      animFrameIdx = (animFrameIdx + 1) % frames.length;
      dog.src = frames[animFrameIdx];
    }, frameMs);
  }

  function stopAnimation() {
    if (animInterval) {
      clearInterval(animInterval);
      animInterval = null;
      animFrameIdx = 0;
    }
  }

  // ---- Expose for testing ----
  window.__overlay = {
    getState:        () => currentSprite,
    getActiveStates: () => ({ ...activeStates }),
    triggerKey,
    releaseKey,
    triggerMouse,
    releaseMouse,
    setVoiceState,
  };

  // ---- Resolve which sprite to show ----
  function resolve() {
    const candidates = [
      activeStates.voice,
      activeStates.keys,
      activeStates.mouse,
    ];

    let best = 'idle';
    let bestPri = -1;

    for (const state of candidates) {
      const pri = CONFIG.priority[state] ?? 0;
      if (pri > bestPri) {
        bestPri = pri;
        best = state;
      }
    }

    if (best !== currentSprite) {
      currentSprite = best;

      const sprite = CONFIG.sprites[best];
      if (Array.isArray(sprite)) {
        // Multi-frame animated sprite (e.g., WASD alternating)
        startAnimation(best);
      } else {
        // Single-frame static sprite
        stopAnimation();
        dog.src = sprite;
      }
    }

    updateDebug();
  }

  // ============================================
  //  MIC INPUT  (talk / scream)
  // ============================================
  async function initMic() {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();

      analyser.fftSize = CONFIG.mic.fftSize;
      analyser.smoothingTimeConstant = CONFIG.mic.smoothing;
      source.connect(analyser);

      const freqData = new Uint8Array(analyser.frequencyBinCount);

      function tick() {
        analyser.getByteFrequencyData(freqData);

        // Weighted average — emphasize lower frequencies (voice range)
        let sum = 0;
        let weight = 0;
        for (let i = 0; i < freqData.length; i++) {
          const w = 1 / (i + 1);     // lower bins get more weight
          sum += freqData[i] * w;
          weight += w;
        }
        const avg = sum / weight;

        micLevel = avg; // for debug display

        if (avg > CONFIG.mic.screamThreshold) {
          setVoiceState('scream');
        } else if (avg > CONFIG.mic.talkThreshold) {
          setVoiceState('talk');
        }
        // If below threshold, the linger timer handles fallback to idle

        requestAnimationFrame(tick);
      }

      tick();
      console.log('[overlay] Mic initialized');
    } catch (err) {
      console.warn('[overlay] Mic access denied or unavailable:', err.message);
    }
  }

  function setVoiceState(state) {
    activeStates.voice = state;
    resolve();

    clearTimeout(voiceTimer);
    voiceTimer = setTimeout(() => {
      activeStates.voice = 'idle';
      resolve();
    }, CONFIG.lingering.voiceMs);
  }

  // ============================================
  //  KEYBOARD INPUT  (WASD)
  //  All four keys map to the same "wasd" state
  // ============================================
  const wasdKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);

  // Track which keys are currently held
  const heldKeys = new Set();

  function triggerKey(code) {
    if (!wasdKeys.has(code)) return;
    heldKeys.add(code);
    clearTimeout(keyTimers[code]);
    activeStates.keys = 'wasd';
    resolve();
  }

  function releaseKey(code) {
    if (!wasdKeys.has(code)) return;
    heldKeys.delete(code);

    keyTimers[code] = setTimeout(() => {
      if (heldKeys.size > 0) {
        activeStates.keys = 'wasd';  // still holding another key
      } else {
        activeStates.keys = 'idle';
      }
      resolve();
    }, CONFIG.lingering.keyMs);
  }

  // Direct browser listeners (for testing in a normal browser tab)
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return; // ignore held-key repeats
    triggerKey(e.code);
  });

  window.addEventListener('keyup', (e) => {
    releaseKey(e.code);
  });

  // ============================================
  //  MOUSE INPUT  (any click → "mouse" state)
  // ============================================

  function triggerMouse(button) {
    if (button === 0 || button === 4) {
      setMouseState('mouse');
    }
  }

  function releaseMouse(button) {
    if (button === 0 || button === 4) {
      clearTimeout(mouseTimer);
      mouseTimer = setTimeout(() => {
        activeStates.mouse = 'idle';
        resolve();
      }, CONFIG.lingering.mouseMs);
    }
  }

  function setMouseState(state) {
    activeStates.mouse = state;
    resolve();

    clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => {
      activeStates.mouse = 'idle';
      resolve();
    }, CONFIG.lingering.mouseMs);
  }

  // Direct browser listeners (for testing)
  window.addEventListener('mousedown', (e) => triggerMouse(e.button));
  window.addEventListener('mouseup', (e) => releaseMouse(e.button));

  window.addEventListener('auxclick', (e) => {
    if (e.button === 4) triggerMouse(4);
  });

  // Prevent context menu from blocking
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  // ============================================
  //  WEBSOCKET INPUT (for OBS - global hotkeys)
  //  Receives events from input-server.js
  // ============================================
  function initWebSocket() {
    const wsUrl = CONFIG.wsUrl || 'ws://localhost:9001';
    let ws = null;
    let reconnectTimer = null;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        console.log('[overlay] WebSocket connected to input server');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleWsMessage(msg);
        } catch (err) {
          console.warn('[overlay] Bad WS message:', event.data);
        }
      };

      ws.onclose = () => {
        console.log('[overlay] WebSocket disconnected, retrying...');
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose will fire after this
      };
    }

    function scheduleReconnect() {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 3000);
    }

    function handleWsMessage(msg) {
      // Expected format: { type: 'key'|'mouse', action: 'down'|'up', code: 'KeyW', button: 0 }
      if (msg.type === 'key') {
        if (msg.action === 'down') triggerKey(msg.code);
        else if (msg.action === 'up') releaseKey(msg.code);
      } else if (msg.type === 'mouse') {
        if (msg.action === 'down') triggerMouse(msg.button);
        else if (msg.action === 'up') releaseMouse(msg.button);
      }
    }

    connect();
  }

  // ============================================
  //  DEBUG HUD
  // ============================================
  let micLevel = 0;

  function updateDebug() {
    if (!CONFIG.debug) {
      debug.style.display = 'none';
      return;
    }
    debug.style.display = 'block';

    const bar = '|'.repeat(Math.round(micLevel / 3));
    debug.textContent =
      `state:  ${currentSprite}\n` +
      `voice:  ${activeStates.voice}\n` +
      `keys:   ${activeStates.keys}  held: [${[...heldKeys].join(', ')}]\n` +
      `mouse:  ${activeStates.mouse}\n` +
      `mic:    ${micLevel.toFixed(1)} ${bar}\n` +
      `thresholds: talk=${CONFIG.mic.talkThreshold}  scream=${CONFIG.mic.screamThreshold}`;
  }

  // ============================================
  //  BOOT
  // ============================================
  // Preload all sprites so transitions are instant
  Object.values(CONFIG.sprites).forEach((src) => {
    if (Array.isArray(src)) {
      src.forEach((frame) => { const img = new Image(); img.src = frame; });
    } else {
      const img = new Image();
      img.src = src;
    }
  });

  // Start idle animation if idle is animated
  const idleSprite = CONFIG.sprites['idle'];
  if (Array.isArray(idleSprite)) {
    startAnimation('idle');
  } else {
    dog.src = idleSprite;
  }

  initMic();
  initWebSocket();

  // Run debug HUD loop if enabled
  if (CONFIG.debug) {
    setInterval(updateDebug, 100);
  }

  console.log('[overlay] Dog overlay loaded. Sprites:', Object.keys(CONFIG.sprites).join(', '));
})();
