// lib/nesextract.mjs — generic NES ROM asset extraction toolkit (port track Part A).
//
// Mechanical, game-agnostic helpers for reading a user's own NES ROM dump:
// iNES/NES 2.0 header parsing, MD5 checksum assertion, CHR tile decoding
// (2bpp planar -> pixel arrays), OAM sprite parsing, NES palette handling,
// and CHR tile-sheet PNG previews (written with node:zlib — no npm deps).
//
// No game-specific pattern searches live here — game-specific table hunting
// (sprite pointer tables, collision grids, enemy placement) belongs in
// per-game scripts built on top of this module. Legal rule (see
// docs/tracks/port.md): the user supplies the ROM; extracted assets stay
// private; distribute only the tools and reimplemented code.
//
// CLI: gamepress nesextract <rom.nes> [--md5 <hex>] [--chr-png <out.png>]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { resolve, basename, dirname } from 'node:path';

const INES_MAGIC = [0x4e, 0x45, 0x53, 0x1a]; // "NES\x1a"

/**
 * Parse a 16-byte iNES (or NES 2.0) header.
 * Returns { format, prgBanks, chrBanks, prgSize, chrSize, mapper, mirroring,
 * battery, trainer, headerLen, romSize }.
 * prgBanks are 16KB units, chrBanks are 8KB units (0 = CHR RAM, no CHR ROM).
 * Throws on a short buffer or bad magic.
 */
export function parseInesHeader(buf) {
  if (!buf || buf.length < 16) throw new Error('parseInesHeader: need at least 16 bytes');
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== INES_MAGIC[i]) throw new Error('parseInesHeader: bad magic — not an iNES ROM');
  }
  const prgBanks = buf[4];
  const chrBanks = buf[5];
  const f6 = buf[6];
  const f7 = buf[7];
  const fourScreen = !!(f6 & 0x08);
  const mirroring = fourScreen ? 'four-screen' : (f6 & 0x01 ? 'vertical' : 'horizontal');
  const nes2 = (f7 & 0x0c) === 0x08;
  // iNES.1: mapper = high nibble of flags7 + high nibble of flags6.
  // NES 2.0 extends to 12 bits via byte 8 bits 0-3.
  const mapper = nes2
    ? ((((buf[8] & 0x0f) << 8) | (f7 & 0xf0) | (f6 >> 4)) >>> 0)
    : (((f7 & 0xf0) | (f6 >> 4)) >>> 0);
  const battery = !!(f6 & 0x02);
  const trainer = !!(f6 & 0x04);
  const headerLen = 16 + (trainer ? 512 : 0);
  return {
    format: nes2 ? 'NES 2.0' : 'iNES',
    prgBanks, chrBanks,
    prgSize: prgBanks * 16384,
    chrSize: chrBanks * 8192,
    mapper, mirroring, battery, trainer,
    headerLen, romSize: buf.length,
  };
}

/** Split a full ROM buffer into { header, prg, chr } using the parsed header. Throws on truncation. */
export function splitRom(buf) {
  const header = parseInesHeader(buf);
  const prgEnd = header.headerLen + header.prgSize;
  if (buf.length < prgEnd) throw new Error(`splitRom: truncated PRG (need ${prgEnd} bytes, have ${buf.length})`);
  const prg = buf.subarray(header.headerLen, prgEnd);
  const chr = buf.subarray(prgEnd, prgEnd + header.chrSize);
  if (chr.length < header.chrSize) throw new Error(`splitRom: truncated CHR (need ${header.chrSize} bytes, have ${chr.length})`);
  return { header, prg, chr };
}

/** MD5 hex digest of a buffer (ROM checksum assertion). */
export function md5Hex(buf) {
  return createHash('md5').update(buf).digest('hex');
}

/**
 * Assert a ROM's MD5 before any tool touches it (port track workflow step 1).
 * Returns the digest on match; throws on mismatch.
 */
export function assertRomMd5(buf, expected, { label = 'ROM' } = {}) {
  const actual = md5Hex(buf);
  const want = String(expected).trim().toLowerCase();
  if (actual !== want) {
    throw new Error(`${label}: MD5 mismatch — got ${actual}, expected ${want}. Wrong dump or wrong game; refusing to extract.`);
  }
  return actual;
}

/**
 * Decode one 8x8 CHR tile (16 bytes, 2bpp planar) into 8 rows of 8 pixel
 * values (0-3). Bytes 0-7 are the low bitplane, bytes 8-15 the high bitplane;
 * bit 7 of each byte is the leftmost pixel.
 */
export function decodeChrTile(bytes) {
  if (!bytes || bytes.length < 16) throw new Error('decodeChrTile: need 16 bytes');
  const px = [];
  for (let y = 0; y < 8; y++) {
    const lo = bytes[y];
    const hi = bytes[y + 8];
    const row = [];
    for (let x = 0; x < 8; x++) {
      const bit = 7 - x;
      row.push(((lo >> bit) & 1) | (((hi >> bit) & 1) << 1));
    }
    px.push(row);
  }
  return px;
}

/** Decode a whole CHR bank (multiple of 16 bytes) into an array of 8x8 tiles. */
export function decodeChrBank(chrBytes) {
  if (!chrBytes || chrBytes.length % 16 !== 0) throw new Error('decodeChrBank: CHR size must be a multiple of 16 bytes');
  const tiles = [];
  for (let o = 0; o < chrBytes.length; o += 16) tiles.push(decodeChrTile(chrBytes.subarray(o, o + 16)));
  return tiles;
}

/**
 * Parse 256 bytes of OAM (sprite attribute memory) into 64 sprite entries.
 * Byte layout per sprite: Y, tile index, attributes, X.
 * Attributes: bits 0-1 palette, bit 5 priority (0 front / 1 behind bg),
 * bit 6 flip horizontal, bit 7 flip vertical.
 */
export function parseOam(oam) {
  if (!oam || oam.length < 256) throw new Error('parseOam: need 256 bytes of OAM');
  const sprites = [];
  for (let i = 0; i < 64; i++) {
    const y = oam[i * 4];
    const tile = oam[i * 4 + 1];
    const attr = oam[i * 4 + 2];
    const x = oam[i * 4 + 3];
    sprites.push({
      index: i, y, tile, x,
      palette: attr & 0x03,
      priority: (attr & 0x20) ? 'behind' : 'front',
      flipH: !!(attr & 0x40),
      flipV: !!(attr & 0x80),
      offscreen: y >= 0xef, // $FF (and $EF+) parks the sprite below the 240-line screen
    });
  }
  return sprites;
}

// Canonical 2C02 64-color NES master palette ($00-$3F), as [r,g,b] triples.
const NES_PALETTE_HEX = [
  '545454', '001E74', '08104C', '300088', '440064', '5C0030', '540400', '3C1800',
  '202A00', '083A00', '004000', '003C00', '00323C', '000000', '000000', '000000',
  '989698', '084CC4', '306EF6', '485AD4', '6A4CD4', '883CB0', 'A03E2E', '785200',
  '546600', '3C7E08', '288E00', '008C00', '0084C4', '000000', '000000', '000000',
  'ECEEEC', '5C9EF8', '78B8FA', '709EFA', '9488FA', 'B87CF6', 'D0826A', 'BC9A58',
  '8CA844', '4CC25E', '28D25E', '00C8B8', '00CCC8', '000000', '000000', '000000',
  'ECEEEC', 'A8C8F8', 'B8D0FA', 'C0C0FA', 'D0B8FA', 'E8B0F2', 'F0A4B8', 'E8B888',
  'D0C468', '90D878', '78E078', '64E090', '60D8D8', '000000', '000000', '000000',
];
/** The 64-entry NES master palette as [r, g, b] triples. */
export const NES_PALETTE = NES_PALETTE_HEX.map(h => [
  parseInt(h.slice(0, 2), 16),
  parseInt(h.slice(2, 4), 16),
  parseInt(h.slice(4, 6), 16),
]);

/** Master palette color for index 0-63 (index wraps, like PPU $3F00 mirrors). */
export function nesPaletteColor(i) {
  return NES_PALETTE[i & 0x3f];
}

/** Map an 8x8 decoded tile through a 4-entry [r,g,b] palette to 8x8 RGB rows. */
export function tileToRgb(tile, palette4) {
  return tile.map(row => row.map(v => palette4[v & 3]));
}

// Minimal PNG writer (truecolor, no interlace) — enough for CHR previews. ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([td, data])));
  return Buffer.concat([len, td, data, crc]);
}

/**
 * Render decoded CHR tiles as a PNG tile sheet.
 * tiles: array of 8x8 pixel arrays (0-3). paletteIdx: 4 NES palette indices
 * (default grayscale $0F black / $00 / $10 / $30 white). scale: integer zoom.
 */
export function writeChrPng(tiles, outPath, { cols = 16, paletteIdx = [0x0f, 0x00, 0x10, 0x30], scale = 2 } = {}) {
  if (!tiles || !tiles.length) throw new Error('writeChrPng: no tiles to render');
  const pal = paletteIdx.map(nesPaletteColor);
  const rows = Math.ceil(tiles.length / cols);
  const w = cols * 8 * scale;
  const h = rows * 8 * scale;
  const raw = Buffer.alloc(h * (1 + w * 3));
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0; // filter: none
    const ty = Math.floor(y / (8 * scale));
    const py = Math.floor((y % (8 * scale)) / scale);
    for (let x = 0; x < w; x++) {
      const tx = Math.floor(x / (8 * scale));
      const px = Math.floor((x % (8 * scale)) / scale);
      const tile = tiles[ty * cols + tx];
      const [r, g, b] = pal[(tile ? tile[py][px] : 0) & 3];
      raw[p++] = r;
      raw[p++] = g;
      raw[p++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 2; // truecolor
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(outPath, png);
  return { path: resolve(outPath), width: w, height: h, tiles: tiles.length, bytes: png.length };
}

/**
 * CLI entry: read a user-supplied NES ROM, parse + assert it, decode CHR.
 * Options: { md5 } assert the dump's checksum; { chrPng } write a CHR preview.
 * Returns a result object with human-readable `lines` for CLI printing.
 */
export function nesextractCommand(romPath, { md5 = null, chrPng = null } = {}) {
  const abs = resolve(romPath);
  if (!existsSync(abs)) throw new Error(`ROM not found: ${romPath}`);
  const buf = readFileSync(abs);
  const { header, chr } = splitRom(buf);
  const digest = md5Hex(buf);
  if (md5) assertRomMd5(buf, md5, { label: basename(abs) });
  const tiles = chr.length ? decodeChrBank(chr) : [];
  let png = null;
  if (chrPng) png = writeChrPng(tiles, resolve(chrPng));
  const lines = [
    `${basename(abs)} — ${header.format} ROM`,
    `  PRG: ${header.prgBanks} x 16KB (${header.prgSize} bytes)   CHR: ${header.chrBanks} x 8KB (${header.chrSize} bytes)${header.chrBanks ? ` -> ${tiles.length} tiles` : ' (CHR RAM)'}`,
    `  mapper ${header.mapper}   mirroring ${header.mirroring}${header.battery ? '   battery' : ''}${header.trainer ? '   trainer' : ''}`,
    `  md5 ${digest}${md5 ? ' (asserted)' : ''}`,
  ];
  if (png) lines.push(`  chr preview -> ${png.path} (${png.width}x${png.height}, ${png.tiles} tiles)`);
  return { command: 'nesextract', path: abs, md5: digest, header, tileCount: tiles.length, chrPng: png ? png.path : null, lines };
}
