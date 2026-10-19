// lib/nesextract.mjs: generic NES ROM asset extraction toolkit (port track Part A).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseInesHeader, splitRom, md5Hex, assertRomMd5,
  decodeChrTile, decodeChrBank, parseOam,
  NES_PALETTE, nesPaletteColor, tileToRgb, writeChrPng,
} from '../lib/nesextract.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = '/tmp/nesextract-test';
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });

function makeRom({ prgBanks = 1, chrBanks = 1, flags6 = 0x10, flags7 = 0x00, byte8 = 0x00, trainer = false, fill = 0xab } = {}) {
  const hdr = Buffer.from([0x4e, 0x45, 0x53, 0x1a, prgBanks, chrBanks, flags6, flags7, byte8, 0, 0, 0, 0, 0, 0, 0]);
  const body = Buffer.alloc(prgBanks * 16384 + chrBanks * 8192, fill);
  return Buffer.concat([hdr, trainer ? Buffer.alloc(512, 0) : Buffer.alloc(0), body]);
}

test('parseInesHeader reads banks, mapper, mirroring', () => {
  const h = parseInesHeader(makeRom());
  assert.equal(h.format, 'iNES');
  assert.equal(h.prgBanks, 1);
  assert.equal(h.chrBanks, 1);
  assert.equal(h.prgSize, 16384);
  assert.equal(h.chrSize, 8192);
  assert.equal(h.mapper, 1); // flags6 0x10 -> low nibble 1
  assert.equal(h.mirroring, 'horizontal');
  assert.equal(h.battery, false);
  assert.equal(h.trainer, false);
  assert.equal(h.headerLen, 16);
});

test('parseInesHeader mirroring / battery / trainer / four-screen flags', () => {
  assert.equal(parseInesHeader(makeRom({ flags6: 0x01 })).mirroring, 'vertical');
  const fs = parseInesHeader(makeRom({ flags6: 0x0b })); // vertical + battery + four-screen
  assert.equal(fs.mirroring, 'four-screen');
  assert.equal(fs.battery, true);
  assert.equal(parseInesHeader(makeRom({ flags6: 0x14, trainer: true })).headerLen, 528);
});

test('parseInesHeader NES 2.0 extended mapper', () => {
  const h = parseInesHeader(makeRom({ flags6: 0x10, flags7: 0x08, byte8: 0x01 }));
  assert.equal(h.format, 'NES 2.0');
  assert.equal(h.mapper, 0x101);
});

test('parseInesHeader rejects bad magic and short buffers', () => {
  const bad = makeRom();
  bad[0] = 0x00;
  assert.throws(() => parseInesHeader(bad), /bad magic/);
  assert.throws(() => parseInesHeader(Buffer.alloc(10)), /at least 16 bytes/);
});

test('splitRom slices prg/chr and rejects truncation', () => {
  const rom = makeRom({ prgBanks: 2, chrBanks: 1 });
  const { header, prg, chr } = splitRom(rom);
  assert.equal(prg.length, 32768);
  assert.equal(chr.length, 8192);
  assert.equal(header.prgBanks, 2);
  assert.throws(() => splitRom(rom.subarray(0, 100)), /truncated PRG/);
});

test('md5Hex + assertRomMd5 match and mismatch', () => {
  const rom = makeRom();
  const d = md5Hex(rom);
  assert.match(d, /^[0-9a-f]{32}$/);
  assert.equal(assertRomMd5(rom, d, { label: 'test' }), d);
  assert.throws(() => assertRomMd5(rom, '0'.repeat(32), { label: 'test' }), /MD5 mismatch/);
});

test('decodeChrTile decodes 2bpp planar rows', () => {
  const b = Buffer.alloc(16, 0);
  b[0] = 0xaa; // 10101010
  b[8] = 0x55; // 01010101
  const t = decodeChrTile(b);
  assert.deepEqual(t[0], [1, 2, 1, 2, 1, 2, 1, 2]);
  for (const row of t.slice(1)) assert.deepEqual(row, [0, 0, 0, 0, 0, 0, 0, 0]);
  const full = decodeChrTile(Buffer.concat([Buffer.alloc(8, 0xff), Buffer.alloc(8, 0xff)]));
  assert.deepEqual(full[3], [3, 3, 3, 3, 3, 3, 3, 3]);
  assert.throws(() => decodeChrTile(Buffer.alloc(8)), /16 bytes/);
});

test('decodeChrBank tiles an 8KB CHR bank into 512 tiles', () => {
  const tiles = decodeChrBank(Buffer.alloc(8192, 0));
  assert.equal(tiles.length, 512);
  assert.deepEqual(tiles[511][7], [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.throws(() => decodeChrBank(Buffer.alloc(17)), /multiple of 16/);
});

test('parseOam decodes sprite fields and offscreen parking', () => {
  const oam = Buffer.alloc(256, 0xff);
  oam[0] = 10; oam[1] = 5; oam[2] = 0b11100010; oam[3] = 20; // pal 2, behind bg, flipH, flipV
  const s = parseOam(oam);
  assert.equal(s.length, 64);
  assert.deepEqual([s[0].y, s[0].tile, s[0].x], [10, 5, 20]);
  assert.equal(s[0].palette, 2);
  assert.equal(s[0].priority, 'behind');
  assert.equal(s[0].flipH, true);
  assert.equal(s[0].flipV, true);
  assert.equal(s[0].offscreen, false);
  assert.equal(s[1].offscreen, true); // y=$FF parked
  assert.throws(() => parseOam(Buffer.alloc(100)), /256 bytes/);
});

test('NES palette has 64 entries with canonical anchor colors', () => {
  assert.equal(NES_PALETTE.length, 64);
  assert.deepEqual(nesPaletteColor(0x00), [0x54, 0x54, 0x54]);
  assert.deepEqual(nesPaletteColor(0x0d), [0, 0, 0]);
  assert.deepEqual(nesPaletteColor(0x30), [0xec, 0xee, 0xec]);
  assert.deepEqual(nesPaletteColor(0x40), nesPaletteColor(0x00)); // wraps like PPU mirrors
});

test('tileToRgb maps pixel values through a 4-color palette', () => {
  const rgb = tileToRgb([[0, 1], [2, 3]], [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3]]);
  assert.deepEqual(rgb, [[[0, 0, 0], [1, 1, 1]], [[2, 2, 2], [3, 3, 3]]]);
});

test('writeChrPng emits a valid PNG tile sheet', () => {
  const tiles = decodeChrBank(Buffer.alloc(32, 0)); // 2 tiles
  const out = join(DIR, 'chr.png');
  const r = writeChrPng(tiles, out);
  assert.ok(existsSync(out));
  assert.equal(r.width, 16 * 8 * 2);
  assert.equal(r.tiles, 2);
  const sig = readFileSync(out).subarray(0, 8);
  assert.deepEqual([...sig], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.throws(() => writeChrPng([], join(DIR, 'empty.png')), /no tiles/);
});

test('CLI: gamepress nesextract parses a ROM end to end', () => {
  const rom = join(DIR, 'test.nes');
  writeFileSync(rom, makeRom());
  const bin = join(ROOT, 'bin', 'gamepress.mjs');
  const out = execFileSync('node', [bin, 'nesextract', rom], { encoding: 'utf8' });
  assert.match(out, /iNES ROM/);
  assert.match(out, /mapper 1/);
  assert.match(out, /512 tiles/);
  assert.match(out, /md5 [0-9a-f]{32}/);
  const digest = md5Hex(readFileSync(rom));
  const ok = execFileSync('node', [bin, 'nesextract', rom, '--md5', digest, '--chr-png', join(DIR, 'cli-chr.png')], { encoding: 'utf8' });
  assert.match(ok, /\(asserted\)/);
  assert.ok(existsSync(join(DIR, 'cli-chr.png')));
  assert.throws(() => execFileSync('node', [bin, 'nesextract', rom, '--md5', '0'.repeat(32)], { stdio: 'pipe' }), /MD5 mismatch|Command failed/);
  assert.throws(() => execFileSync('node', [bin, 'nesextract', join(DIR, 'nope.nes')], { stdio: 'pipe' }), /ROM not found|Command failed/);
  rmSync(DIR, { recursive: true, force: true });
});
