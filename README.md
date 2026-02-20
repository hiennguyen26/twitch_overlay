# Dog Overlay for Twitch / OBS

A lightweight browser-based overlay that swaps dog sprites based on your inputs:
mic (talk/scream), WASD keys, and mouse buttons.

## Quick Start (Windows)

1. Drop your sprites into the `sprites/` folder (see naming below)
2. Double-click `serve.bat`
3. In OBS, add a **Browser Source** pointed at `http://localhost:8080`
4. Done

## Quick Start (Mac/Linux)

1. Drop your sprites into the `sprites/` folder
2. Run `./serve.sh`
3. In OBS, add a **Browser Source** pointed at `http://localhost:8080`

## Sprite Files

Drop your PNG files (transparent background) into `sprites/` with these exact names:

| Filename         | Trigger                        |
|------------------|--------------------------------|
| `idle.png`       | Default / no input             |
| `talk.png`       | Mic detects talking            |
| `scream.png`     | Mic detects yelling            |
| `walk_w.png`     | W key pressed                  |
| `walk_a.png`     | A key pressed                  |
| `walk_s.png`     | S key pressed                  |
| `walk_d.png`     | D key pressed                  |
| `mouse_left.png` | Left click (Mouse 1)           |
| `mouse_side.png` | Side button (Mouse 5 / Forward)|

## OBS Browser Source Settings

- **URL:** `http://localhost:8080`
- **Width:** 1920 (or your stream width)
- **Height:** 1080 (or your stream height)
- **Custom CSS:** leave empty
- Uncheck "Shutdown source when not visible" (keeps mic alive)

## Configuration

Edit `js/config.js` to tweak:

- **Mic thresholds** - adjust `talkThreshold` and `screamThreshold` for your mic
- **Linger timing** - how long sprites stay before returning to idle
- **Priority** - which input wins when multiple fire at once (scream > mouse > keys > talk > idle)
- **Display** - sprite size and position on screen
- **Debug mode** - set `debug: true` to see a live HUD with mic levels and current state

## How Priority Works

When multiple inputs happen at the same time (e.g., you're talking AND pressing W AND clicking), the highest priority sprite wins:

```
scream (4) > mouse clicks (3) > WASD (2) > talk (1) > idle (0)
```

You can change these in `config.js` under `priority`.

## Troubleshooting

**No mic detection?**
- Browser Source needs mic permissions. In OBS, make sure you're using `http://localhost` (not a file:// path)
- Check that your mic is the default input device in Windows Sound settings

**Sprites not loading?**
- Make sure filenames match exactly (case-sensitive)
- Make sure `serve.bat` is running

**Want to calibrate mic thresholds?**
- Set `debug: true` in `js/config.js` and watch the mic level number in the top-left HUD
- Adjust `talkThreshold` and `screamThreshold` to match your levels

## Project Structure

```
twitch_overlay/
  index.html           <- entry point (Browser Source URL)
  serve.bat            <- Windows: double-click to start server
  serve.sh             <- Mac/Linux: run to start server
  css/
    overlay.css        <- styling and positioning
  js/
    config.js          <- all settings (thresholds, sprites, priority)
    overlay.js         <- main engine (mic, keyboard, mouse detection)
  sprites/
    idle.png           <- YOUR sprites go here
    talk.png
    scream.png
    walk_w.png
    walk_a.png
    walk_s.png
    walk_d.png
    mouse_left.png
    mouse_side.png
    README_SPRITES.txt <- reminder of what goes where
```
