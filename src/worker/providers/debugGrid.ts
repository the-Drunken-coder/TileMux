import type { DebugGridSource } from "../sources";
import type { TileCoordinate } from "../utils/zxy";
import { cacheControlHeader, cachePolicyHeader } from "../utils/http";

const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_WIDTH = 256;
const PNG_HEIGHT = 256;

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "\"":
        return "&quot;";
      default:
        return "&apos;";
    }
  });
}

export function debugGridSvg(
  source: DebugGridSource,
  coordinate: TileCoordinate,
): string {
  const label = escapeXml(`${source.id} z${coordinate.z} x${coordinate.x} y${coordinate.y}`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#f8fafc"/>
  <path d="M0 0H256V256H0Z" fill="none" stroke="#0f172a" stroke-width="4"/>
  <path d="M64 0V256M128 0V256M192 0V256M0 64H256M0 128H256M0 192H256" stroke="#94a3b8" stroke-width="1"/>
  <path d="M0 128H256M128 0V256" stroke="#475569" stroke-width="2"/>
  <rect x="16" y="94" width="224" height="68" rx="6" fill="#ffffff" fill-opacity="0.88" stroke="#cbd5e1"/>
  <text x="128" y="119" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="18" fill="#0f172a">TileMux</text>
  <text x="128" y="145" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" fill="#334155">${label}</text>
</svg>`;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;

  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }

  return ((b << 16) | a) >>> 0;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.length);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);

  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes);
  crcInput.set(data, typeBytes.length);
  writeUint32(chunk, 8 + data.length, crc32(crcInput));

  return chunk;
}

function zlibNoCompression(data: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = [];
  let offset = 0;

  while (offset < data.length) {
    const remaining = data.length - offset;
    const blockLength = Math.min(65535, remaining);
    const isFinal = offset + blockLength >= data.length;
    const block = new Uint8Array(5 + blockLength);
    block[0] = isFinal ? 1 : 0;
    block[1] = blockLength & 0xff;
    block[2] = (blockLength >>> 8) & 0xff;
    const inverse = blockLength ^ 0xffff;
    block[3] = inverse & 0xff;
    block[4] = (inverse >>> 8) & 0xff;
    block.set(data.subarray(offset, offset + blockLength), 5);
    blocks.push(block);
    offset += blockLength;
  }

  const output = new Uint8Array(
    2 + blocks.reduce((total, block) => total + block.length, 0) + 4,
  );
  output[0] = 0x78;
  output[1] = 0x01;
  let outputOffset = 2;
  for (const block of blocks) {
    output.set(block, outputOffset);
    outputOffset += block.length;
  }
  writeUint32(output, outputOffset, adler32(data));
  return output;
}

export function debugGridPng(coordinate: TileCoordinate): Uint8Array {
  const stride = 1 + PNG_WIDTH;
  const pixels = new Uint8Array(stride * PNG_HEIGHT);

  for (let y = 0; y < PNG_HEIGHT; y += 1) {
    const rowOffset = y * stride;
    pixels[rowOffset] = 0;
    for (let x = 0; x < PNG_WIDTH; x += 1) {
      let shade = 245;
      if (x === 0 || y === 0 || x === PNG_WIDTH - 1 || y === PNG_HEIGHT - 1) {
        shade = 20;
      } else if (x === 128 || y === 128) {
        shade = 95;
      } else if (x % 64 === 0 || y % 64 === 0) {
        shade = 175;
      }
      pixels[rowOffset + 1 + x] = shade;
    }
  }

  const marker = (coordinate.z + coordinate.x + coordinate.y) % 4;
  for (let y = 100 + marker * 4; y < 156 + marker * 4; y += 1) {
    for (let x = 100; x < 156; x += 1) {
      if (x >= 0 && x < PNG_WIDTH && y >= 0 && y < PNG_HEIGHT) {
        pixels[y * stride + 1 + x] = 225;
      }
    }
  }

  const ihdr = new Uint8Array(13);
  writeUint32(ihdr, 0, PNG_WIDTH);
  writeUint32(ihdr, 4, PNG_HEIGHT);
  ihdr[8] = 8;
  ihdr[9] = 0;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const chunks = [
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlibNoCompression(pixels)),
    pngChunk("IEND", new Uint8Array()),
  ];
  const output = new Uint8Array(
    chunks.reduce((total, chunk) => total + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function debugGridResponse(
  request: Request,
  source: DebugGridSource,
  coordinate: TileCoordinate,
): Response {
  const isPng = coordinate.ext === "png";
  const headers = new Headers({
    "Content-Type": isPng ? "image/png" : "image/svg+xml; charset=utf-8",
    "Cache-Control": cacheControlHeader(
      source.cachePolicy,
      source.cacheTtlSeconds,
    ),
    "X-TileMux-Source": source.id,
    "X-TileMux-Cache-Policy": cachePolicyHeader(
      source.cachePolicy,
      source.cacheTtlSeconds,
    ),
  });

  return new Response(
    request.method === "HEAD"
      ? null
      : isPng
        ? new Blob([toArrayBuffer(debugGridPng(coordinate))], { type: "image/png" })
        : debugGridSvg(source, coordinate),
    { headers },
  );
}
