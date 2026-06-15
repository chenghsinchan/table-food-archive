import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function png(width, height, pixels) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    rows[rowStart] = 0;
    pixels.copy(rows, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    header,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function rect(x1, y1, x2, y2) {
  return [
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2]
  ];
}

function inside(pointX, pointY, polygon) {
  let isInside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > pointY !== yj > pointY && pointX < ((xj - xi) * (pointY - yi)) / (yj - yi) + xi;
    if (intersects) isInside = !isInside;
  }

  return isInside;
}

function translated(shapes, offsetX) {
  return shapes.map((shape) => shape.map(([x, y]) => [x + offsetX, y]));
}

function letterShapes() {
  const gap = 10;
  const t = [rect(0, 0, 60, 12), rect(24, 0, 36, 100)];
  const a = [
    [
      [0, 100],
      [26, 0],
      [39, 0],
      [15, 100]
    ],
    [
      [55, 100],
      [31, 0],
      [44, 0],
      [70, 100]
    ],
    rect(18, 57, 52, 70)
  ];
  const b = [
    rect(0, 0, 12, 100),
    rect(0, 0, 54, 12),
    rect(0, 44, 52, 56),
    rect(0, 88, 54, 100),
    rect(46, 12, 62, 44),
    rect(46, 56, 62, 88)
  ];
  const l = [rect(0, 0, 12, 100), rect(0, 88, 55, 100)];
  const e = [rect(0, 0, 12, 100), rect(0, 0, 60, 12), rect(0, 44, 50, 56), rect(0, 88, 60, 100)];

  let x = 0;
  const shapes = [];
  for (const [letter, width] of [
    [t, 60],
    [a, 70],
    [b, 65],
    [l, 55],
    [e, 60]
  ]) {
    shapes.push(...translated(letter, x));
    x += width + gap;
  }

  return { shapes, width: x - gap, height: 100 };
}

function renderIcon(size, outputPath) {
  const { shapes, width, height } = letterShapes();
  const scale = (size * 0.74) / width;
  const offsetX = (size - width * scale) / 2;
  const offsetY = (size - height * scale) / 2;
  const samples = 3;
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let covered = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const baseX = (x + (sx + 0.5) / samples - offsetX) / scale;
          const baseY = (y + (sy + 0.5) / samples - offsetY) / scale;
          if (shapes.some((shape) => inside(baseX, baseY, shape))) covered += 1;
        }
      }

      const value = Math.round((covered / (samples * samples)) * 255);
      const index = (y * size + x) * 4;
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }
  }

  writeFileSync(outputPath, png(size, size, pixels));
}

renderIcon(192, "public/icon-192.png");
renderIcon(512, "public/icon-512.png");
renderIcon(180, "public/apple-touch-icon.png");
