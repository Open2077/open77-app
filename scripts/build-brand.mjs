/**
 * Regenerates public/brand/ from the painted lockup in brand-src/open77.png.
 *
 * Every asset is cut from the painted lockup itself — the // bars, the 77
 * numerals and the //77 mark are colour-separated crops of the real artwork,
 * not redrawn geometry, so avatars and favicons match the logo exactly.
 * Where letterforms interleave (the N's trailing leg reaches into the slash
 * zone, the first 7 reaches into slash 2's), the cut is a crop plus a
 * colour erase: the slashes are the only saturated cyan in their zone and the
 * numerals the only near-white in theirs.
 *
 * Usage: node scripts/build-brand.mjs
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import process from "node:process";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "brand-src", "open77.png");
const BRAND = path.join(ROOT, "public", "brand");
const PUBLIC = path.join(ROOT, "public");

/** Content bbox measured from opaque pixels in the source lockup. */
const CONTENT = { left: 51, top: 199, width: 2071, height: 314 };
/** Wordmark + speed lines, excluding the MULTIPLAYER MOD subtitle. */
const WORDMARK = { left: 51, top: 199, width: 2071, height: 275 };
/**
 * Glyph zones, in source coordinates. The N's leg ends at x=1286, slash 1
 * starts at x=1316; the first 7 starts at x=1531 where slash 2 still overlaps.
 */
const MARK_ZONE = { left: 1291, top: 199, width: 831, height: 275 };
const SLASH_ZONE = { left: 1291, top: 199, width: 240, height: 275 };
const SEVENS_ZONE = { left: 1501, top: 199, width: 580, height: 275 };

const BG_HI = { r: 10, g: 17, b: 25 };
const BG_LO = { r: 6, g: 9, b: 15 };
const CYAN_GLOW = { r: 34, g: 224, b: 238 };
const NAVY = { r: 12, g: 21, b: 36, alpha: 1 };

const OBSOLETE = [
  "logo/open77-logo-dark.svg",
  "logo/open77-logo-light.svg",
  "logo/open77-logo-navy-bg.svg",
  "logo/open77-monogram.svg",
  // The mark used to be redrawn vector geometry; it is now a cut of the
  // painted artwork, which only exists as raster.
  "logo/open77-mark.svg",
  "logo/open77-app-icon.svg",
  "logo/open77-avatar-circle.svg",
];

function isCyan(r, g, b, a) {
  if (a < 10) return false;
  return b > r + 60 && g > r + 40;
}

function isWhite(r, g, b, a) {
  if (a < 10) return false;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return !isCyan(r, g, b, a) && mx - mn < 60;
}

async function rawOf(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function rawToSharp(raw) {
  return sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } });
}

/** Zeroes haze pixels (alpha < 10) — matte residue from background removal. */
function cleanHaze(raw) {
  const { data } = raw;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }
  return raw;
}

/** Erases 'white' or 'cyan' pixels inside [fromX, toX). */
function erase(raw, mode, fromX = 0, toX = Infinity) {
  const { data, width, height } = raw;
  const upper = Math.min(toX, width);
  for (let y = 0; y < height; y += 1) {
    for (let x = fromX; x < upper; x += 1) {
      const i = (y * width + x) * 4;
      const kill =
        mode === "white"
          ? isWhite(data[i], data[i + 1], data[i + 2], data[i + 3])
          : isCyan(data[i], data[i + 1], data[i + 2], data[i + 3]);
      if (kill) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      }
    }
  }
  return raw;
}

/** Crops to the bbox of pixels with alpha >= 24. */
function trimRaw(raw) {
  const { data, width, height } = raw;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] >= 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("trimRaw: empty image");
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    data.copy(out, y * w * 4, ((y + minY) * width + minX) * 4, ((y + minY) * width + minX + w) * 4);
  }
  return { data: out, width: w, height: h };
}

async function extractGlyph(zone, { eraseMode = null, eraseTo = Infinity } = {}) {
  const crop = await sharp(SRC).extract(zone).ensureAlpha().png().toBuffer();
  let raw = cleanHaze(await rawOf(crop));
  if (eraseMode) raw = erase(raw, eraseMode, 0, eraseTo);
  return rawToSharp(trimRaw(raw)).png().toBuffer();
}

async function extractPadded(region, padRatio = 0.08) {
  const padX = Math.round(region.width * padRatio);
  const padY = Math.round(region.height * padRatio);
  const inner = await sharp(SRC).extract(region).ensureAlpha().png().toBuffer();
  return sharp({
    create: {
      width: region.width + padX * 2,
      height: region.height + padY * 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: inner, left: padX, top: padY }])
    .png()
    .toBuffer();
}

async function toLight(png) {
  const raw = cleanHaze(await rawOf(png));
  const { data } = raw;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;
    if (isCyan(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
    data[i] = NAVY.r;
    data[i + 1] = NAVY.g;
    data[i + 2] = NAVY.b;
  }
  return rawToSharp(raw).png().toBuffer();
}

/**
 * Branded background: vertical navy gradient with soft cyan glows, rendered
 * per-pixel at 1/8 scale and upscaled — a full-resolution radial gradient
 * would band, the upscale interpolation keeps it smooth.
 * Glows: [cxFrac, cyFrac, radiusFrac(of width), alpha 0-255].
 */
const BANNER_GLOWS = [
  [0.8, 0.05, 0.45, 40],
  [0.1, 1.02, 0.36, 18],
];
const TILE_GLOWS = [
  [0.82, 0.06, 0.75, 26],
  [0.1, 1.0, 0.55, 13],
];

async function glowBackground(width, height, glows) {
  const sw = Math.max(48, Math.round(width / 8));
  const sh = Math.max(48, Math.round(height / 8));
  const data = Buffer.alloc(sw * sh * 4);
  for (let y = 0; y < sh; y += 1) {
    const t = y / (sh - 1);
    const baseR = BG_HI.r + (BG_LO.r - BG_HI.r) * t;
    const baseG = BG_HI.g + (BG_LO.g - BG_HI.g) * t;
    const baseB = BG_HI.b + (BG_LO.b - BG_HI.b) * t;
    for (let x = 0; x < sw; x += 1) {
      let a = 0;
      for (const [cx, cy, cr, alpha] of glows) {
        const dx = x - cx * sw;
        const dy = y - cy * sh;
        const r = cr * sw;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < r) {
          const f = 1 - d / r;
          a += alpha * f * f;
        }
      }
      const k = Math.min(255, a) / 255;
      const i = (y * sw + x) * 4;
      data[i] = Math.round(baseR + (CYAN_GLOW.r - baseR) * k);
      data[i + 1] = Math.round(baseG + (CYAN_GLOW.g - baseG) * k);
      data[i + 2] = Math.round(baseB + (CYAN_GLOW.b - baseB) * k);
      data[i + 3] = 255;
    }
  }
  return sharp(data, { raw: { width: sw, height: sh, channels: 4 } })
    .resize(width, height, { kernel: "cubic" })
    .png()
    .toBuffer();
}

/** Centres `art` on a glow background at `widthFrac` of the canvas width. */
async function compositeOnGlow(art, width, height, widthFrac, glows = BANNER_GLOWS) {
  const meta = await sharp(art).metadata();
  const targetW = Math.round(width * widthFrac);
  const targetH = Math.round((targetW * meta.height) / meta.width);
  const fitted = await sharp(art).resize({ width: targetW }).png().toBuffer();
  const bg = await glowBackground(width, height, glows);
  return sharp(bg)
    .composite([
      {
        input: fitted,
        left: Math.round((width - targetW) / 2),
        top: Math.round((height - targetH) / 2),
      },
    ])
    .png()
    .toBuffer();
}

function roundedMask(size, radius) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`,
  );
}

function circleMask(size) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
}

/** Square glow tile with the mark centred; radiusFrac > 0 rounds the corners. */
async function glyphTile(size, mark, markFrac, { radiusFrac = 0, circle = false } = {}) {
  const tile = await compositeOnGlow(mark, size, size, markFrac, TILE_GLOWS);
  if (!circle && radiusFrac <= 0) return tile;
  const mask = circle ? circleMask(size) : roundedMask(size, Math.round(size * radiusFrac));
  return sharp(tile)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function resizePng(png, width) {
  return sharp(png).resize({ width, withoutEnlargement: false }).png().toBuffer();
}

async function resizeSquare(png, size) {
  return sharp(png).resize(size, size).png().toBuffer();
}

async function writePng(filePath, png) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, png);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function zipStore(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const compressed = deflateRawSync(file.data);
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    const localFull = Buffer.concat([local, name, compressed]);
    locals.push(localFull);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, name]));
    offset += localFull.length;
  }
  const centralDir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, centralDir, end]);
}

function icoFromPngs(pngs) {
  const count = pngs.length;
  const headerSize = 6 + 16 * count;
  let offset = headerSize;
  const entries = [];
  for (const png of pngs) {
    entries.push({ bytes: png.length, offset });
    offset += png.length;
  }
  const out = Buffer.alloc(offset);
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(count, 4);
  for (let i = 0; i < count; i += 1) {
    const o = 6 + i * 16;
    const size = [16, 32, 48][i];
    out.writeUInt8(size, o);
    out.writeUInt8(size, o + 1);
    out.writeUInt8(0, o + 2);
    out.writeUInt8(0, o + 3);
    out.writeUInt16LE(1, o + 4);
    out.writeUInt16LE(32, o + 6);
    out.writeUInt32LE(entries[i].bytes, o + 8);
    out.writeUInt32LE(entries[i].offset, o + 12);
  }
  for (let i = 0; i < count; i += 1) {
    pngs[i].copy(out, entries[i].offset);
  }
  return out;
}

/** favicon.svg is the real painted tile wrapped as SVG, so it stays one file. */
function svgWrapPng(png, size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><image width="${size}" height="${size}" href="data:image/png;base64,${png.toString("base64")}"/></svg>
`;
}

async function collectBrandFiles(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectBrandFiles(abs, rel)));
      continue;
    }
    if (entry.name.endsWith(".zip")) continue;
    files.push({ name: rel.replaceAll("\\", "/"), data: await readFile(abs) });
  }
  return files;
}

async function main() {
  await mkdir(path.join(BRAND, "logo"), { recursive: true });
  await mkdir(path.join(BRAND, "favicon"), { recursive: true });
  await mkdir(path.join(BRAND, "social"), { recursive: true });

  for (const rel of OBSOLETE) {
    await rm(path.join(BRAND, rel), { force: true });
  }

  // Lockup family.
  const darkFull = await extractPadded(CONTENT);
  const lightFull = await toLight(darkFull);
  const darkWord = await extractPadded(WORDMARK, 0.04);
  const lightWord = await toLight(darkWord);
  const dark2000 = await resizePng(darkFull, 2000);
  const light2000 = await resizePng(lightFull, 2000);
  const navyBg = await compositeOnGlow(darkFull, 2000, 700, 0.82);

  const uiLight = await sharp(lightWord).resize({ height: 96 }).png().toBuffer();
  const uiDark = await sharp(darkWord).resize({ height: 96 }).png().toBuffer();

  // Glyph cuts from the painted artwork.
  const mark = await extractGlyph(MARK_ZONE, { eraseMode: "white", eraseTo: 34 });
  const slashes = await extractGlyph(SLASH_ZONE, { eraseMode: "white" });
  const sevens = await extractGlyph(SEVENS_ZONE, { eraseMode: "cyan", eraseTo: 220 });

  const markSquare = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: await sharp(mark).resize({ width: 920 }).png().toBuffer(),
        left: 52,
        top: Math.round((1024 - (920 * (await sharp(mark).metadata()).height) / (await sharp(mark).metadata()).width) / 2),
      },
    ])
    .png()
    .toBuffer();
  const monogram = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: await sharp(sevens).resize({ width: 880 }).png().toBuffer(),
        left: 72,
        top: Math.round((1024 - (880 * (await sharp(sevens).metadata()).height) / (await sharp(sevens).metadata()).width) / 2),
      },
    ])
    .png()
    .toBuffer();

  const appIcon = await glyphTile(1024, mark, 0.76, { radiusFrac: 0.22 });

  // Favicons: the // device is the only cut that stays legible at 16px.
  const fav512 = await glyphTile(512, slashes, 0.46, { radiusFrac: 0.19 });
  const fav256 = await resizeSquare(fav512, 256);
  const fav48 = await resizeSquare(fav512, 48);
  const fav32 = await resizeSquare(fav512, 32);
  const fav16 = await resizeSquare(fav512, 16);
  const ico = icoFromPngs([fav16, fav32, fav48]);
  const faviconSvg = svgWrapPng(fav256, 256);
  const apple = await glyphTile(180, mark, 0.82);

  // Avatars: the //77 glyphs stacked — // above, 77 below. In one line the
  // ~3:1 mark can never be more than a third of the circle tall; stacked, the
  // same painted cuts fill most of it while Discord's crop keeps everything.
  async function avatarStackTile(size, { circle = false } = {}) {
    const slash = await sharp(slashes).resize({ height: Math.round(size * 0.33) }).png().toBuffer();
    const slashMeta = await sharp(slash).metadata();
    const sev = await sharp(sevens).resize({ width: Math.round(size * 0.72) }).png().toBuffer();
    const sevMeta = await sharp(sev).metadata();
    const gap = Math.round(size * 0.05);
    const top = Math.round((size - (slashMeta.height + gap + sevMeta.height)) / 2);
    const bg = await glowBackground(size, size, TILE_GLOWS);
    let tile = await sharp(bg)
      .composite([
        { input: slash, left: Math.round((size - slashMeta.width) / 2), top },
        { input: sev, left: Math.round((size - sevMeta.width) / 2), top: top + slashMeta.height + gap },
      ])
      .png()
      .toBuffer();
    if (circle) {
      tile = await sharp(tile)
        .composite([{ input: circleMask(size), blend: "dest-in" }])
        .png()
        .toBuffer();
    }
    return tile;
  }
  const avatar1024 = await avatarStackTile(1024);
  const avatar512 = await resizeSquare(avatar1024, 512);
  const avatar200 = await resizeSquare(avatar1024, 200);
  const avatarCircle = await avatarStackTile(1024, { circle: true });

  // Social banners: the full lockup on the glow background.
  const og = await compositeOnGlow(darkFull, 1200, 630, 0.72);
  const bannerX = await compositeOnGlow(darkFull, 1500, 500, 0.44);
  const bannerDiscord = await compositeOnGlow(darkFull, 1920, 1080, 0.6);
  const bannerDiscordServer = await compositeOnGlow(darkFull, 960, 540, 0.62);
  const bannerYoutube = await compositeOnGlow(darkFull, 2560, 1440, 0.54);
  const bannerTiktok = await compositeOnGlow(darkFull, 1080, 1920, 0.86);

  await writePng(path.join(BRAND, "logo", "open77-logo-dark.png"), uiDark);
  await writePng(path.join(BRAND, "logo", "open77-logo-light.png"), uiLight);
  await writePng(path.join(BRAND, "logo", "open77-logo-dark-2000.png"), dark2000);
  await writePng(path.join(BRAND, "logo", "open77-logo-light-2000.png"), light2000);
  await writePng(path.join(BRAND, "logo", "open77-logo-navy-bg.png"), navyBg);
  await writePng(path.join(BRAND, "logo", "open77-monogram-1024.png"), monogram);
  await writePng(path.join(BRAND, "logo", "open77-mark-1024.png"), markSquare);
  await writePng(path.join(BRAND, "logo", "open77-app-icon.png"), appIcon);

  await writePng(path.join(BRAND, "favicon", "favicon-16.png"), fav16);
  await writePng(path.join(BRAND, "favicon", "favicon-32.png"), fav32);
  await writePng(path.join(BRAND, "favicon", "favicon-48.png"), fav48);
  await writePng(path.join(BRAND, "favicon", "apple-touch-icon.png"), apple);
  await writeFile(path.join(BRAND, "favicon", "favicon.ico"), ico);
  await writeFile(path.join(BRAND, "favicon", "favicon.svg"), faviconSvg);
  await writeFile(path.join(PUBLIC, "favicon.ico"), ico);
  await writeFile(path.join(PUBLIC, "assets", "favicon.svg"), faviconSvg);
  await writePng(path.join(PUBLIC, "apple-touch-icon.png"), apple);

  await writePng(path.join(BRAND, "social", "avatar-200.png"), avatar200);
  await writePng(path.join(BRAND, "social", "avatar-512.png"), avatar512);
  await writePng(path.join(BRAND, "social", "avatar-1024.png"), avatar1024);
  await writePng(path.join(BRAND, "social", "avatar-circle-1024.png"), avatarCircle);
  await writePng(path.join(BRAND, "social", "og-card-1200x630.png"), og);
  await writePng(path.join(BRAND, "social", "banner-x-1500x500.png"), bannerX);
  await writePng(path.join(BRAND, "social", "banner-discord-1920x1080.png"), bannerDiscord);
  await writePng(path.join(BRAND, "social", "banner-discord-server-960x540.png"), bannerDiscordServer);
  await writePng(path.join(BRAND, "social", "banner-youtube-2560x1440.png"), bannerYoutube);
  await writePng(path.join(BRAND, "social", "banner-tiktok-1080x1920.png"), bannerTiktok);

  // Content hash of the OG card, appended to its URL as ?v= by src/lib/site.ts.
  // Link scrapers (Discord, Telegram) and the CDN cache previews per URL, so a
  // regenerated card must move to a fresh URL or nobody ever refetches it.
  await writeFile(
    path.join(ROOT, "src", "lib", "brand-assets.json"),
    `${JSON.stringify({ ogCard: createHash("sha256").update(og).digest("hex").slice(0, 8) }, null, 2)}\n`,
  );

  const kitFiles = await collectBrandFiles(BRAND);
  const zip = zipStore(kitFiles);
  await writeFile(path.join(BRAND, "open77-brand-kit.zip"), zip);

  const markMeta = await sharp(mark).metadata();
  const slashMeta = await sharp(slashes).metadata();
  const sevensMeta = await sharp(sevens).metadata();
  console.log(
    JSON.stringify(
      {
        mark: { width: markMeta.width, height: markMeta.height },
        slashes: { width: slashMeta.width, height: slashMeta.height },
        sevens: { width: sevensMeta.width, height: sevensMeta.height },
        kitFiles: kitFiles.length,
        kitSha: createHash("sha256").update(zip).digest("hex").slice(0, 16),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
