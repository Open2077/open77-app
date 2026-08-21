/**
 * Regenerates public/brand/ from the painted lockup in brand-src/open77.png.
 *
 * The wordmark is a raster (italic letterforms, speed lines, subtitle). Shipping
 * it as SVG would mean wrapping a bitmap in a data URI, which is not a vector
 * mark. Geometry we can actually construct — the // bars — is written as SVG.
 * Favicons and avatars use that mark, not a squashed lockup.
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
const WORDMARK = { left: 51, top: 199, width: 2071, height: 273 };
/** The 77 numerals, for the monogram PNG. */
const SEVENS = { left: 1518, top: 220, width: 516, height: 256 };

const VOID = { r: 8, g: 14, b: 25, alpha: 1 };
const NAVY = { r: 12, g: 21, b: 36, alpha: 1 };
const CYAN = "#00F7FC";
const VOID_HEX = "#080E19";

/** Parallelogram // at the lockup's ~23° italic, one cyan (the painted mark is not dual-channel). */
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 42"><g transform="translate(8 8)"><path fill="${CYAN}" d="M11 0H18L7 26H0Z"/><path fill="${CYAN}" d="M23 0H30L19 26H12Z"/></g></svg>
`;

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${VOID_HEX}"/><path fill="${CYAN}" d="M10.2 6.5H16.4L9.2 25.5H3Z"/><path fill="${CYAN}" d="M18.8 6.5H25L17.8 25.5H11.6Z"/></svg>
`;

const APP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="${VOID_HEX}"/><rect x="14" y="14" width="484" height="484" rx="84" fill="none" stroke="${CYAN}" stroke-width="16"/><path fill="${CYAN}" d="M168 128H248L168 384H88Z"/><path fill="${CYAN}" d="M280 128H360L280 384H200Z"/></svg>
`;

const AVATAR_CIRCLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${VOID_HEX}"/><circle cx="512" cy="512" r="400" fill="${VOID_HEX}"/><path fill="${CYAN}" d="M336 256H496L336 768H176Z"/><path fill="${CYAN}" d="M560 256H720L560 768H400Z"/></svg>
`;

const OBSOLETE = [
  "logo/open77-logo-dark.svg",
  "logo/open77-logo-light.svg",
  "logo/open77-logo-navy-bg.svg",
  "logo/open77-monogram.svg",
];

function isCyan(r, g, b, a) {
  if (a < 10) return false;
  return Math.min(g, b) - r > 24 && Math.min(g, b) > 70 && r < 200;
}

function isContent(r, g, b, a) {
  if (a < 12) return false;
  return r > 12 || g > 12 || b > 12;
}

async function measure(input) {
  const image = sharp(input);
  const meta = await image.metadata();
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let opaque = 0;
  let transparent = 0;
  let cyanN = 0;
  let cyanR = 0;
  let cyanG = 0;
  let cyanB = 0;
  const hexCounts = new Map();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 8) transparent += 1;
      else opaque += 1;
      if (!isContent(r, g, b, a)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (isCyan(r, g, b, a) && a > 200) {
        cyanN += 1;
        cyanR += r;
        cyanG += g;
        cyanB += b;
        const key = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
        hexCounts.set(key, (hexCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const topHex = [...hexCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    format: meta.format,
    width: meta.width,
    height: meta.height,
    channels: meta.channels,
    hasAlpha: meta.hasAlpha,
    opaque,
    transparent,
    contentBBox: { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 },
    cyanAvg:
      cyanN === 0
        ? null
        : `#${[Math.round(cyanR / cyanN), Math.round(cyanG / cyanN), Math.round(cyanB / cyanN)]
            .map((v) => v.toString(16).padStart(2, "0"))
            .join("")}`,
    cyanMode: topHex?.[0] ?? null,
  };
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
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 10) continue;
    if (isCyan(out[i], out[i + 1], out[i + 2], out[i + 3])) continue;
    out[i] = NAVY.r;
    out[i + 1] = NAVY.g;
    out[i + 2] = NAVY.b;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function resizePng(png, width) {
  return sharp(png).resize({ width, withoutEnlargement: false }).png().toBuffer();
}

async function writePng(filePath, png) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, png);
}

async function rasterSvg(svg, width, height, { background } = {}) {
  const pipeline = sharp(Buffer.from(svg)).resize(width, height);
  if (background) {
    return pipeline.flatten({ background }).png().toBuffer();
  }
  return pipeline.png().toBuffer();
}

async function compositeOnVoid(png, width, height) {
  const fitted = await sharp(png)
    .resize({
      width: Math.round(width * 0.78),
      height: Math.round(height * 0.62),
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  const meta = await sharp(fitted).metadata();
  const left = Math.round((width - meta.width) / 2);
  const top = Math.round((height - meta.height) / 2);
  return sharp({
    create: { width, height, channels: 4, background: VOID },
  })
    .composite([{ input: fitted, left, top }])
    .png()
    .toBuffer();
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
  const stats = await measure(SRC);
  console.log("source", JSON.stringify(stats, null, 2));

  await mkdir(path.join(BRAND, "logo"), { recursive: true });
  await mkdir(path.join(BRAND, "favicon"), { recursive: true });
  await mkdir(path.join(BRAND, "social"), { recursive: true });

  for (const rel of OBSOLETE) {
    await rm(path.join(BRAND, rel), { force: true });
  }

  const darkFull = await extractPadded(CONTENT);
  const lightFull = await toLight(darkFull);
  const darkWord = await extractPadded(WORDMARK, 0.04);
  const lightWord = await toLight(darkWord);
  const dark2000 = await resizePng(darkFull, 2000);
  const light2000 = await resizePng(lightFull, 2000);
  const navyBg = await sharp(dark2000)
    .flatten({ background: VOID })
    .png()
    .toBuffer();

  const uiLight = await sharp(lightWord)
    .resize({ height: 96, withoutEnlargement: false })
    .png()
    .toBuffer();
  const uiDark = await sharp(darkWord)
    .resize({ height: 96, withoutEnlargement: false })
    .png()
    .toBuffer();

  const sevens = await extractPadded(SEVENS, 0.12);
  const sevensMeta = await sharp(sevens).metadata();
  const side = Math.max(sevensMeta.width, sevensMeta.height);
  const sevensSquare = await sharp({
    create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: sevens,
        left: Math.round((side - sevensMeta.width) / 2),
        top: Math.round((side - sevensMeta.height) / 2),
      },
    ])
    .png()
    .toBuffer();
  const monogram = await sharp(sevensSquare).resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

  await writeFile(path.join(BRAND, "logo", "open77-mark.svg"), MARK_SVG);
  await writeFile(path.join(BRAND, "logo", "open77-app-icon.svg"), APP_ICON_SVG);
  await writeFile(path.join(BRAND, "logo", "open77-avatar-circle.svg"), AVATAR_CIRCLE_SVG);
  await writeFile(path.join(BRAND, "favicon", "favicon.svg"), FAVICON_SVG);
  await writeFile(path.join(PUBLIC, "assets", "favicon.svg"), FAVICON_SVG);

  const mark1024 = await rasterSvg(MARK_SVG, 1024, 1024);
  const appIconPng = await rasterSvg(APP_ICON_SVG, 512, 512, { background: VOID });

  const fav16 = await rasterSvg(FAVICON_SVG, 16, 16, { background: VOID });
  const fav32 = await rasterSvg(FAVICON_SVG, 32, 32, { background: VOID });
  const fav48 = await rasterSvg(FAVICON_SVG, 48, 48, { background: VOID });
  const apple = await rasterSvg(FAVICON_SVG, 180, 180, { background: VOID });
  const ico = icoFromPngs([fav16, fav32, fav48]);

  const avatar200 = await rasterSvg(FAVICON_SVG, 200, 200, { background: VOID });
  const avatar512 = await rasterSvg(FAVICON_SVG, 512, 512, { background: VOID });
  const avatar1024 = await rasterSvg(FAVICON_SVG, 1024, 1024, { background: VOID });

  const og = await compositeOnVoid(darkFull, 1200, 630);
  const bannerX = await compositeOnVoid(darkFull, 1500, 500);
  const bannerDiscord = await compositeOnVoid(darkFull, 1920, 1080);
  const bannerDiscordServer = await compositeOnVoid(darkFull, 960, 540);
  const bannerYoutube = await compositeOnVoid(darkFull, 2560, 1440);

  await writePng(path.join(BRAND, "logo", "open77-logo-dark.png"), uiDark);
  await writePng(path.join(BRAND, "logo", "open77-logo-light.png"), uiLight);
  await writePng(path.join(BRAND, "logo", "open77-logo-dark-2000.png"), dark2000);
  await writePng(path.join(BRAND, "logo", "open77-logo-light-2000.png"), light2000);
  await writePng(path.join(BRAND, "logo", "open77-logo-navy-bg.png"), navyBg);
  await writePng(path.join(BRAND, "logo", "open77-monogram-1024.png"), monogram);
  await writePng(path.join(BRAND, "logo", "open77-mark-1024.png"), mark1024);
  await writePng(path.join(BRAND, "logo", "open77-app-icon.png"), appIconPng);

  await writePng(path.join(BRAND, "favicon", "favicon-16.png"), fav16);
  await writePng(path.join(BRAND, "favicon", "favicon-32.png"), fav32);
  await writePng(path.join(BRAND, "favicon", "favicon-48.png"), fav48);
  await writePng(path.join(BRAND, "favicon", "apple-touch-icon.png"), apple);
  await writeFile(path.join(BRAND, "favicon", "favicon.ico"), ico);
  await writeFile(path.join(PUBLIC, "favicon.ico"), ico);
  await writePng(path.join(PUBLIC, "apple-touch-icon.png"), apple);

  await writePng(path.join(BRAND, "social", "avatar-200.png"), avatar200);
  await writePng(path.join(BRAND, "social", "avatar-512.png"), avatar512);
  await writePng(path.join(BRAND, "social", "avatar-1024.png"), avatar1024);
  await writePng(path.join(BRAND, "social", "og-card-1200x630.png"), og);
  await writePng(path.join(BRAND, "social", "banner-x-1500x500.png"), bannerX);
  await writePng(path.join(BRAND, "social", "banner-discord-1920x1080.png"), bannerDiscord);
  await writePng(path.join(BRAND, "social", "banner-discord-server-960x540.png"), bannerDiscordServer);
  await writePng(path.join(BRAND, "social", "banner-youtube-2560x1440.png"), bannerYoutube);

  const kitFiles = await collectBrandFiles(BRAND);
  const zip = zipStore(kitFiles);
  await writeFile(path.join(BRAND, "open77-brand-kit.zip"), zip);

  const darkMeta = await sharp(dark2000).metadata();
  const lightUi = await sharp(uiLight).metadata();
  const names = kitFiles.map((f) => f.name);
  if (names.some((n) => n.endsWith(".zip"))) {
    throw new Error("brand kit zip included itself");
  }

  console.log(
    JSON.stringify(
      {
        dark2000: { width: darkMeta.width, height: darkMeta.height },
        uiLight: { width: lightUi.width, height: lightUi.height },
        kitFiles: names.length,
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
