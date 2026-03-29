/**
 * Generate proper PNG icons for the Chrome extension.
 * Uses zlib for PNG compression. No external deps.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crcBuf]);
}

function createPNG(width, height, pixels) {
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
    const raw = Buffer.alloc(height * (1 + width * 4));
    for (let y = 0; y < height; y++) {
        raw[y * (1 + width * 4)] = 0;
        for (let x = 0; x < width; x++) {
            const si = (y * width + x) * 4;
            const di = y * (1 + width * 4) + 1 + x * 4;
            raw[di] = pixels[si]; raw[di+1] = pixels[si+1];
            raw[di+2] = pixels[si+2]; raw[di+3] = pixels[si+3];
        }
    }
    const compressed = zlib.deflateSync(raw);
    return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', compressed), makeChunk('IEND', Buffer.alloc(0))]);
}

function dist(x, y, cx, cy) {
    return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
}

function inRoundedRect(x, y, w, h, r) {
    if (x < 0 || x >= w || y < 0 || y >= h) return false;
    if (x < r && y < r && dist(x, y, r, r) > r) return false;
    if (x >= w - r && y < r && dist(x, y, w - r, r) > r) return false;
    if (x < r && y >= h - r && dist(x, y, r, h - r) > r) return false;
    if (x >= w - r && y >= h - r && dist(x, y, w - r, h - r) > r) return false;
    return true;
}

function drawIcon(size) {
    const px = new Uint8Array(size * size * 4);
    const r = Math.floor(size * 0.22);
    const center = size / 2;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            if (!inRoundedRect(x, y, size, size, r)) {
                px[i+3] = 0; continue;
            }
            // Gradient: indigo (#6366F1) → purple (#7C3AED)
            const t = (x + y) / (2 * size);
            px[i]   = Math.round(99 + 25 * t);   // R
            px[i+1] = Math.round(102 - 44 * t);  // G
            px[i+2] = Math.round(241 - 4 * t);   // B
            px[i+3] = 255;

            // Draw play triangle
            const triW = size * 0.35;
            const triH = size * 0.4;
            const triX = center - triW * 0.1;
            const dx = x - (triX - triW * 0.3);
            const dy = Math.abs(y - center);
            if (dx > 0 && dx < triW && dy < (dx / triW) * (triH / 2)) {
                px[i] = 255; px[i+1] = 255; px[i+2] = 255; px[i+3] = 230;
            }
        }
    }
    return px;
}

const iconsDir = path.join(__dirname, 'extension', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
    const pixels = drawIcon(size);
    const png = createPNG(size, size, pixels);
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
    console.log(`✅ icon${size}.png (${png.length} bytes)`);
}
console.log('Done!');
