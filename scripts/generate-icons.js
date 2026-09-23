import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePng(width, height, isMaskable = false) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data: height rows, each with 1 filter byte + width * 4 bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.42;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter byte: None
    const ny = (y - cy) / radius;

    for (let x = 0; x < width; x++) {
      const colOffset = rowOffset + 1 + x * 4;
      const nx = (x - cx) / radius;
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Deep modern indigo-navy gradient background: #0f172a to #1e1b4b
      const t = (x + y) / (width + height);
      let r = Math.round(15 + t * 25);
      let g = Math.round(23 + t * 20);
      let b = Math.round(42 + t * 50);
      let a = 255;

      // Draw stylized "N" symbol in the center
      const inBoxX = Math.abs(x - cx) < width * 0.28;
      const inBoxY = Math.abs(y - cy) < height * 0.32;
      
      if (inBoxX && inBoxY) {
        const u = (x - (cx - width * 0.28)) / (width * 0.56);
        const v = (y - (cy - height * 0.32)) / (height * 0.64);

        // Left vertical bar
        const leftBar = u >= 0.05 && u <= 0.28;
        // Right vertical bar
        const rightBar = u >= 0.72 && u <= 0.95;
        // Diagonal connection
        const diagSlope = (u - 0.2) / 0.6;
        const diag = Math.abs(v - diagSlope) < 0.16 && u >= 0.2 && u <= 0.8;

        if (leftBar || rightBar || diag) {
          // Vibrant cyan to indigo gradient: #38bdf8 to #6366f1
          r = Math.round(56 + u * 43);
          g = Math.round(189 - u * 87);
          b = Math.round(248 - u * 7);
        }
      }

      rawData[colOffset] = r;
      rawData[colOffset + 1] = g;
      rawData[colOffset + 2] = b;
      rawData[colOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), generatePng(64, 64));
console.log('Generated PNG icons successfully.');
