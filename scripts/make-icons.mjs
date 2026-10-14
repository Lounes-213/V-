#!/usr/bin/env node
/**
 * Generates the app icons.
 *
 * The mark is drawn analytically (rounded square + play glyph + film perforation)
 * and encoded as PNG with node's own zlib — no image dependency, and the output
 * is deterministic, so the same bytes are produced on every machine.
 *
 * Run: node scripts/make-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

/* ------------------------------------------------------------- PNG output -- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/** rgba: Uint8Array of width*height*4, already unpremultiplied. */
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------ the artwork -- */

const INK = [11, 15, 20];
const PRIMARY = [25, 195, 125];
const PRIMARY_DEEP = [14, 143, 91];
const GOLD = [232, 176, 75];

const mix = (a, b, t) => a.map((value, index) => Math.round(value + (b[index] - value) * t));

/** Signed distance to a rounded rectangle, negative inside. */
function roundedRect(px, py, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(px - cx) - (halfW - radius);
  const dy = Math.abs(py - cy) - (halfH - radius);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - radius;
}

/** Signed distance to a triangle (negative inside), using half-plane tests. */
function triangle(px, py, points) {
  let inside = true;
  let best = Infinity;
  for (let i = 0; i < 3; i += 1) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % 3];
    const ex = bx - ax;
    const ey = by - ay;
    const len = Math.hypot(ex, ey) || 1;
    const distance = ((px - ax) * ey - (py - ay) * ex) / len;
    if (distance > 0) inside = false;
    best = Math.min(best, Math.abs(distance));
  }
  return inside ? -best : best;
}

/**
 * Draws one icon. `coverage` samples the shape 3x3 per pixel so edges are
 * antialiased without a canvas.
 */
function render(size, { padding = 0, radiusRatio = 0.24, background = PRIMARY } = {}) {
  const rgba = new Uint8Array(size * size * 4);
  const centre = size / 2;
  const inner = size / 2 - padding * size;
  const radius = inner * radiusRatio * 2;

  const glyph = inner * 0.44;
  const play = [
    [centre - glyph * 0.42, centre - glyph * 0.62],
    [centre - glyph * 0.42, centre + glyph * 0.62],
    [centre + glyph * 0.66, centre],
  ];

  const samples = 3;
  const step = 1 / (samples + 1);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let plate = 0;
      let mark = 0;
      let dot = 0;
      for (let sy = 1; sy <= samples; sy += 1) {
        for (let sx = 1; sx <= samples; sx += 1) {
          const px = x + sx * step;
          const py = y + sy * step;
          if (roundedRect(px, py, centre, centre, inner, inner, radius) < 0) plate += 1;
          if (triangle(px, py, play) < 0) mark += 1;
          // Two film perforations in the bottom-left, the studio's print mark.
          if (
            roundedRect(px, py, centre - inner * 0.5, centre + inner * 0.52, inner * 0.1, inner * 0.1, inner * 0.05) < 0 ||
            roundedRect(px, py, centre - inner * 0.2, centre + inner * 0.52, inner * 0.1, inner * 0.1, inner * 0.05) < 0
          ) {
            dot += 1;
          }
        }
      }
      const total = samples * samples;
      const plateAlpha = plate / total;
      const markAlpha = mark / total;
      const dotAlpha = dot / total;

      // Background: vertical gradient, so the app icon is not a flat block.
      const gradient = mix(background, PRIMARY_DEEP, Math.min(1, Math.max(0, (y / size) * 0.9 + 0.05)));
      let colour = gradient;
      if (dotAlpha > 0) colour = mix(colour, GOLD, dotAlpha * 0.95);
      if (markAlpha > 0) colour = mix(colour, [244, 248, 252], markAlpha);

      const index = (y * size + x) * 4;
      rgba[index] = colour[0];
      rgba[index + 1] = colour[1];
      rgba[index + 2] = colour[2];
      rgba[index + 3] = Math.round(plateAlpha * 255);
    }
  }
  return encodePng(size, size, rgba);
}

mkdirSync("public/icons", { recursive: true });

const outputs = [
  ["public/icons/icon-192.png", render(192)],
  ["public/icons/icon-512.png", render(512)],
  ["public/icons/maskable-512.png", render(512, { padding: 0.14, radiusRatio: 0.3 })],
  ["public/icons/apple-touch-icon.png", render(180, { radiusRatio: 0.22 })],
];

for (const [path, buffer] of outputs) {
  writeFileSync(path, buffer);
  console.log(`${path} — ${buffer.length} bytes`);
}

// The favicon is the same artwork at 32px, drawn on the ink background.
writeFileSync("public/icons/favicon-32.png", render(32, { background: INK, radiusRatio: 0.2 }));
console.log("public/icons/favicon-32.png");
