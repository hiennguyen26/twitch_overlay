# Setup & Test Commands

## Prerequisites

- **Python 3** (for the local HTTP server)
- **Node.js 18+** (for the input server + tests)
- **OBS Studio** (for streaming)

---

## Mac Setup & Test

```bash
# 1. Clone the repo
git clone https://github.com/hiennguyen26/twitch_overlay.git
cd twitch_overlay

# 2. Install Node dependencies
npm install

# 3. Generate colored test sprites (so you can test without real art)
node tests/generate-test-sprites.js

# 4. Run the automated test suite (121 tests)
npm test

# 5. Start the local HTTP server
./serve.sh
#   → overlay is now at http://localhost:8080

# 6. Open the interactive test page in your browser
open http://localhost:8080/test.html
#   → press WASD, click mouse, talk into mic, run automated tests

# 7. Open the actual overlay (what OBS will see)
open http://localhost:8080
#   → transparent page with the sprite in the bottom-left

# 8. (Optional) Start the input server for global key/mouse capture in OBS
node input-server.js
#   → captures WASD + Mouse1 + Mouse5 globally, sends to overlay via WebSocket
```

---

## Windows Setup & Test

```cmd
REM 1. Clone the repo
git clone https://github.com/hiennguyen26/twitch_overlay.git
cd twitch_overlay

REM 2. Install Node dependencies
npm install

REM 3. Generate colored test sprites
node tests\generate-test-sprites.js

REM 4. Run the automated test suite (121 tests)
npm test

REM 5. Start the local HTTP server (double-click serve.bat, or run:)
python -m http.server 8080

REM 6. Open the interactive test page in your browser
start http://localhost:8080/test.html

REM 7. Open the actual overlay
start http://localhost:8080

REM 8. (Optional) Start the input server for OBS global capture
node input-server.js
```

---

## What Each Command Does

| Command | What it does |
|---|---|
| `npm install` | Installs `ws` (WebSocket lib) and optionally `iohook2` (global input hooks) |
| `node tests/generate-test-sprites.js` | Creates 9 colored placeholder PNGs in `sprites/` — each state is a different color so you can visually verify sprite swaps |
| `npm test` | Runs 121 automated checks: config validation, file existence, HTML structure, CSS, code analysis, priority logic |
| `./serve.sh` or `serve.bat` | Starts Python HTTP server on port 8080 |
| `http://localhost:8080/test.html` | Interactive test page — has clickable WASD/mouse buttons, live mic bar, state monitor, and automated test runner with 28 browser tests |
| `http://localhost:8080` | The actual overlay (transparent background, just the sprite) — this is what you point OBS at |
| `node input-server.js` | Captures global keyboard (WASD) and mouse (1, 5) events and sends them to the overlay via WebSocket on port 9001. Required for OBS since embedded browser can't capture keyboard/mouse |

---

## Testing Checklist

### Node Tests (`npm test`)
- [x] All 9 sprite paths defined in config
- [x] All 9 sprite PNG files exist
- [x] Priority ordering correct (idle < talk < walk < mouse < scream)
- [x] Mic thresholds valid (scream > talk > 0)
- [x] FFT size is power of 2
- [x] All linger timers > 0
- [x] HTML structure (loads css, config before overlay, has #dog + #debug)
- [x] CSS has transparent body, fixed position sprite
- [x] All trigger/release functions exist in overlay.js
- [x] WebSocket protocol matches between overlay.js and input-server.js
- [x] Key repeat guard in place
- [x] Test API exposed on window.__overlay
- [x] Launcher scripts exist and reference correct ports

### Browser Tests (`test.html` → "Run Full Test Sequence")
- [x] Initial state is idle
- [x] Each WASD key triggers correct sprite
- [x] Each WASD key release returns to idle after linger
- [x] Mouse 1 triggers mouse_left
- [x] Mouse 5 triggers mouse_side
- [x] Mouse release returns to idle after linger
- [x] Voice talk state works
- [x] Voice scream state works
- [x] Voice linger expires to idle
- [x] Priority: walk beats talk
- [x] Priority: mouse beats talk
- [x] Priority: mouse beats walk
- [x] Priority: scream beats everything
- [x] Multi-key hold: last key wins, releasing one falls back to other held key

### Manual Tests (do these yourself)
- [ ] Talk into mic → sprite changes to talk (green placeholder)
- [ ] Yell into mic → sprite changes to scream (red placeholder)
- [ ] Mic goes quiet → sprite returns to idle (gray) after ~250ms
- [ ] In OBS: add Browser Source at `http://localhost:8080` — sprite shows on transparent background
- [ ] In OBS with input-server running: press WASD in your game → sprite swaps

---

## OBS Setup

1. Start the HTTP server: `serve.bat` (Windows) or `./serve.sh` (Mac)
2. Start the input server: `node input-server.js`
3. In OBS → Sources → + → **Browser Source**
   - URL: `http://localhost:8080`
   - Width: `1920`
   - Height: `1080`
   - Uncheck "Shutdown source when not visible"
4. Position/resize the browser source as needed in your scene

---

## Swapping In Your Real Sprites

Once you have your AI-generated dog sprites:

1. Put them in the `sprites/` folder with these exact names:
   - `idle.png`, `talk.png`, `scream.png`
   - `walk_w.png`, `walk_a.png`, `walk_s.png`, `walk_d.png`
   - `mouse_left.png`, `mouse_side.png`
2. Refresh OBS Browser Source (right-click → Refresh)
3. That's it — no code changes needed

To regenerate test placeholders later: `node tests/generate-test-sprites.js`
