/**
 * ============================================
 *  OVERLAY CONFIG - Tweak everything here
 * ============================================
 */

const CONFIG = {

  // --- Sprite file paths ---
  // Swap images by replacing the PNGs in /sprites (keep the filenames)
  //
  // Single-frame sprites use a string path.
  // Animated sprites use an array of paths — the overlay will cycle through them.
  sprites: {
    idle:       ['sprites/idle_tongue_in.png', 'sprites/idle_tongue_out.png'],  // subtle panting
    talk:       ['sprites/talk_1.png', 'sprites/talk_2.png'],  // alternating mouth frames
    scream:     'sprites/scream.png',
    wasd:       ['sprites/wasd_1.png', 'sprites/wasd_2.png'],  // alternating frames
    mouse:      'sprites/mouse_click.png',   // same sprite for left + side click
  },

  // --- Animation (ms per frame for animated sprites) ---
  animation: {
    idle: 600,   // slow panting rhythm
    talk: 200,   // how fast talk frames alternate
    wasd: 250,   // how fast WASD frames alternate
  },

  // --- Mic thresholds (0-255 scale) ---
  // Open debug mode and watch the mic level to calibrate
  mic: {
    talkThreshold:   15,   // avg volume to trigger "talk" sprite
    screamThreshold: 150,  // avg volume to trigger "scream" sprite (needs a real yell)
    smoothing:       0.85, // 0-1, higher = less jumpy (AnalyserNode smoothing)
    fftSize:         256,  // frequency bins, power of 2
  },

  // --- Timing ---
  lingering: {
    voiceMs: 250,   // how long talk/scream sprite stays after sound stops
    keyMs:   150,   // how long WASD sprite stays after key release
    mouseMs: 150,   // how long mouse sprite stays after button release
  },

  // --- Priority (higher number = higher priority) ---
  // When multiple inputs fire at once, the highest priority wins
  priority: {
    idle:       0,
    talk:       1,
    wasd:       2,
    mouse:      3,
    scream:     4,
  },

  // --- Display ---
  display: {
    width:  '256px',
    height: '256px',
    bottom: '20px',
    left:   '20px',
  },

  // --- WebSocket (input server for OBS) ---
  // The overlay connects to this to receive global key/mouse events
  // Run input-server.js on your PC to capture inputs outside the browser
  wsUrl: 'ws://localhost:9001',

  // --- Debug ---
  debug: false, // set true to show live state + mic level on screen
};
