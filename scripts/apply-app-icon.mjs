import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";

const inputPath = process.argv[2];
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

if (!inputPath) {
  throw new Error("Usage: node scripts/apply-app-icon.mjs /path/to/source.png");
}

const source = readPng(readFileSync(inputPath));
fillBoundaryWhiteWithBlack(source);

writePngFile(resize(source, 180), "public/apple-touch-icon.png");
writePngFile(resize(source, 192), "public/icon-192.png");
writePngFile(resize(source, 512), "public/icon-512.png");

function readPng(buffer) {
  const signature = buffer.subarray(0, 8);
  if (signature.toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Input must be a PNG.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      if (data[8] !== 8 || (colorType !== 2 && colorType !== 6)) {
        throw new Error("Only 8-bit RGB or RGBA PNGs are supported.");
      }
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset += length + 12;
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  const rgba = Buffer.alloc(width * height * 4);
  let inputOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const row = Buffer.from(inflated.subarray(inputOffset, inputOffset + stride));
    inputOffset += stride;
    unfilter(row, previous, channels, filter);

    for (let x = 0; x < width; x += 1) {
      const sourceIndex = x * channels;
      const targetIndex = (y * width + x) * 4;
      rgba[targetIndex] = row[sourceIndex];
      rgba[targetIndex + 1] = row[sourceIndex + 1];
      rgba[targetIndex + 2] = row[sourceIndex + 2];
      rgba[targetIndex + 3] = channels === 4 ? row[sourceIndex + 3] : 255;
    }

    previous = row;
  }

  return { width, height, rgba };
}

function unfilter(row, previous, bytesPerPixel, filter) {
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
    const up = previous[index] ?? 0;
    const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] ?? 0 : 0;

    if (filter === 1) {
      row[index] = (row[index] + left) & 255;
    } else if (filter === 2) {
      row[index] = (row[index] + up) & 255;
    } else if (filter === 3) {
      row[index] = (row[index] + Math.floor((left + up) / 2)) & 255;
    } else if (filter === 4) {
      row[index] = (row[index] + paeth(left, up, upLeft)) & 255;
    } else if (filter !== 0) {
      throw new Error(`Unsupported PNG filter: ${filter}`);
    }
  }
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

function fillBoundaryWhiteWithBlack(image) {
  const { width, height, rgba } = image;
  const queue = [];
  const seen = new Uint8Array(width * height);

  for (let x = 0; x < width; x += 1) {
    pushIfWhite(x, 0);
    pushIfWhite(x, height - 1);
  }

  for (let y = 1; y < height - 1; y += 1) {
    pushIfWhite(0, y);
    pushIfWhite(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 2) {
    const x = queue[cursor];
    const y = queue[cursor + 1];
    const index = (y * width + x) * 4;
    rgba[index] = 0;
    rgba[index + 1] = 0;
    rgba[index + 2] = 0;
    rgba[index + 3] = 255;

    pushIfWhite(x + 1, y);
    pushIfWhite(x - 1, y);
    pushIfWhite(x, y + 1);
    pushIfWhite(x, y - 1);
  }

  for (let index = 0; index < rgba.length; index += 4) {
    const luminance = (rgba[index] + rgba[index + 1] + rgba[index + 2]) / 3;
    if (luminance < 18) {
      rgba[index] = 0;
      rgba[index + 1] = 0;
      rgba[index + 2] = 0;
      rgba[index + 3] = 255;
    }
  }

  function pushIfWhite(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (seen[pixel]) return;
    const index = pixel * 4;
    if ((rgba[index] + rgba[index + 1] + rgba[index + 2]) / 3 > 12) {
      seen[pixel] = 1;
      queue.push(x, y);
    }
  }
}

function resize(sourceImage, size) {
  const output = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(sourceImage.width - 1, Math.floor((x / size) * sourceImage.width));
      const sourceY = Math.min(sourceImage.height - 1, Math.floor((y / size) * sourceImage.height));
      const sourceIndex = (sourceY * sourceImage.width + sourceX) * 4;
      const targetIndex = (y * size + x) * 4;
      output[targetIndex] = sourceImage.rgba[sourceIndex];
      output[targetIndex + 1] = sourceImage.rgba[sourceIndex + 1];
      output[targetIndex + 2] = sourceImage.rgba[sourceIndex + 2];
      output[targetIndex + 3] = sourceImage.rgba[sourceIndex + 3];
    }
  }

  return { width: size, height: size, rgba: output };
}

function writePngFile(image, outputPath) {
  writeFileSync(outputPath, png(image.width, image.height, image.rgba));
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

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
