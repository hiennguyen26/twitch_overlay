/**
 * Generates colored placeholder PNGs in /sprites for testing.
 * Each state gets a distinct color so you can visually verify swaps.
 *
 * No dependencies — uses raw PNG binary generation.
 *
 * Run:  node tests/generate-test-sprites.js
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const SPRITES_DIR = path.join(__dirname, '..', 'sprites');

// Filename → color (R, G, B)
const SPRITES = {
  'idle_tongue_in':  [100, 100, 100],  // gray
  'idle_tongue_out': [130, 130, 130],  // lighter gray
  'talk_1':          [0,   180, 80],   // green
  'talk_2':          [0,   220, 100],  // lighter green
  'scream':          [220, 40,  40],   // red
  'wasd_1':          [40,  120, 220],  // blue
  'wasd_2':          [80,  160, 255],  // lighter blue
  'mouse_click':     [220, 220, 40],   // yellow
};

const SIZE = 128; // px

function createPng(width, height, r, g, b) {
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const offset = 1 + x * 4;
      const border = x < 3 || x >= width - 3 || y < 3 || y >= height - 3;
      const labelZone = y >= height / 2 - 12 && y <= height / 2 + 12;
      if (border) {
        row[offset] = 255; row[offset+1] = 255; row[offset+2] = 255; row[offset+3] = 255;
      } else if (labelZone) {
        row[offset] = Math.floor(r*0.5); row[offset+1] = Math.floor(g*0.5); row[offset+2] = Math.floor(b*0.5); row[offset+3] = 255;
      } else {
        row[offset] = r; row[offset+1] = g; row[offset+2] = b; row[offset+3] = 230;
      }
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crcBuffer = Buffer.alloc(4); crcBuffer.writeUInt32BE(crc32(crcData) >>> 0, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

if (!fs.existsSync(SPRITES_DIR)) fs.mkdirSync(SPRITES_DIR, { recursive: true });

for (const [name, [r, g, b]] of Object.entries(SPRITES)) {
  const filePath = path.join(SPRITES_DIR, `${name}.png`);
  fs.writeFileSync(filePath, createPng(SIZE, SIZE, r, g, b));
  console.log(`  ✓ ${name}.png  (${r}, ${g}, ${b})`);
}

console.log(`\nGenerated ${Object.keys(SPRITES).length} test sprites in ${SPRITES_DIR}`);
