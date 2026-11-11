import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height) {
  // RGBA buffer with filter byte per scanline
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      
      // Rounded corner check (radius 24)
      const r = 24;
      const dx = x < r ? r - x : x > width - 1 - r ? x - (width - 1 - r) : 0;
      const dy = y < r ? r - y : y > height - 1 - r ? y - (height - 1 - r) : 0;
      if (dx * dx + dy * dy > r * r) {
        // Transparent outside rounded corner
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Background gradient: VS Code Blue (#007ACC to #005A9E)
      const t = y / height;
      const bgR = Math.round(0);
      const bgG = Math.round(122 - 30 * t);
      const bgB = Math.round(204 - 45 * t);

      // Simple database cylinder icon geometry in the center (from y=30 to y=98, x=34 to x=94)
      const cx = width / 2;
      const cy = height / 2;
      const inIconX = Math.abs(x - cx) <= 28;
      const inIconY = y >= 28 && y <= 100;

      let isCylinder = false;
      let isCylinderHighlight = false;

      if (inIconX && inIconY) {
        // 3 stacked disks
        const disk1 = Math.pow((x - cx) / 28, 2) + Math.pow((y - 40) / 10, 2) <= 1;
        const disk2 = Math.pow((x - cx) / 28, 2) + Math.pow((y - 64) / 10, 2) <= 1;
        const disk3 = Math.pow((x - cx) / 28, 2) + Math.pow((y - 88) / 10, 2) <= 1;
        const body1 = y >= 40 && y <= 64;
        const body2 = y >= 64 && y <= 88;

        if (disk1 || disk2 || disk3 || body1 || body2) {
          isCylinder = true;
          // Shading
          if (x >= 40 && x <= 50) isCylinderHighlight = true;
        }
      }

      if (isCylinder) {
        if (isCylinderHighlight) {
          rawData[pixelOffset] = 255;
          rawData[pixelOffset + 1] = 255;
          rawData[pixelOffset + 2] = 255;
          rawData[pixelOffset + 3] = 255;
        } else {
          rawData[pixelOffset] = 210;
          rawData[pixelOffset + 1] = 235;
          rawData[pixelOffset + 2] = 255;
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        rawData[pixelOffset] = bgR;
        rawData[pixelOffset + 1] = bgG;
        rawData[pixelOffset + 2] = bgB;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  // PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // Deflate compression
  ihdrData[11] = 0; // Filter method
  ihdrData[12] = 0; // Interlace method
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcBuf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(crcBuf);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return ~c >>> 0;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

const png = createPng(128, 128);
fs.writeFileSync('public/icon.png', png);
console.log('Successfully generated public/icon.png (128x128)');
