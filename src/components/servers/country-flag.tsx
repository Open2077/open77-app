import type { ReactNode } from "react";

import { isCountryCode, languageDisplayName, regionCode, regionDisplayName } from "@/lib/locale";

/**
 * Country flags for the server browser.
 *
 * Drawn as inline SVG rather than emoji. Emoji flags are the obvious choice and
 * the wrong one here: Windows ships no flag glyphs, so Chrome and Edge render
 * `🇫🇷` as the bare letters "FR" while Firefox draws its own bundled set — three
 * different renderings for an audience that is overwhelmingly on Windows,
 * because this is a Cyberpunk 2077 mod. Inline SVG is identical everywhere, and
 * unlike a flag CDN it costs no third-party request per row.
 *
 * Every flag shares the `0 0 60 40` viewBox and is drawn at row scale — roughly
 * 18×12 CSS pixels — so the marks are deliberately simplified: coats of arms,
 * emblems and fine charges are omitted where they would be sub-pixel anyway.
 * The set covers the places server operators plausibly list rather than all ~250
 * ISO regions; anything else falls back to {@link NoFlagMark}. A flag is never
 * the only carrier of meaning — callers render the country code or name beside
 * it (see {@link ServerLocale}).
 */

type Band = string | readonly [color: string, weight: number];

/** Equal or weighted stripes across the whole field. */
function Bands({ dir, bands }: { dir: "h" | "v"; bands: readonly Band[] }) {
  const stripes = bands.map((band) =>
    typeof band === "string" ? { color: band, weight: 1 } : { color: band[0], weight: band[1] },
  );
  const total = stripes.reduce((sum, stripe) => sum + stripe.weight, 0) || 1;
  const span = dir === "h" ? 40 : 60;

  return (
    <>
      {stripes.map((stripe, index) => {
        const before = stripes.slice(0, index).reduce((sum, prior) => sum + prior.weight, 0);
        const at = (before / total) * span;
        const size = (stripe.weight / total) * span;
        return dir === "h" ? (
          <rect key={index} x="0" y={at} width="60" height={size} fill={stripe.color} />
        ) : (
          <rect key={index} x={at} y="0" width={size} height="40" fill={stripe.color} />
        );
      })}
    </>
  );
}

/** The Nordic cross, offset towards the hoist as all five of them are. */
function NordicCross({ field, cross, inner }: { field: string; cross: string; inner?: string }) {
  return (
    <>
      <rect x="0" y="0" width="60" height="40" fill={field} />
      <rect x="16" y="0" width="9" height="40" fill={cross} />
      <rect x="0" y="15.5" width="60" height="9" fill={cross} />
      {inner ? (
        <>
          <rect x="18.5" y="0" width="4" height="40" fill={inner} />
          <rect x="0" y="18" width="60" height="4" fill={inner} />
        </>
      ) : null}
    </>
  );
}

/** Five-pointed star as a polygon, so no flag needs a shared `<defs>` id. */
function starPoints(cx: number, cy: number, radius: number, rotation = 0): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? radius : radius * 0.382;
    const angle = ((i * 36 + rotation - 90) * Math.PI) / 180;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(" ");
}

function Star({ cx, cy, r, fill, rotation }: { cx: number; cy: number; r: number; fill: string; rotation?: number }) {
  return <polygon points={starPoints(cx, cy, r, rotation)} fill={fill} />;
}

/**
 * The Union Flag, filling the whole 60×40 field. Factored out because Australia
 * and New Zealand carry it in their canton at half scale.
 */
function UnionFlag() {
  return (
    <>
      <rect x="0" y="0" width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" fill="none" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" fill="none" stroke="#C8102E" strokeWidth="3.5" />
      <path d="M30,0 V40 M0,20 H60" fill="none" stroke="#FFFFFF" strokeWidth="13" />
      <path d="M30,0 V40 M0,20 H60" fill="none" stroke="#C8102E" strokeWidth="7" />
    </>
  );
}

const WHITE = "#FFFFFF";

/**
 * ISO 3166-1 alpha-2 → the marks that draw it, in the shared `0 0 60 40` field.
 */
const FLAGS: Readonly<Record<string, () => ReactNode>> = {
  // ---- Vertical tricolours ----
  FR: () => <Bands dir="v" bands={["#002654", WHITE, "#ED2939"]} />,
  IT: () => <Bands dir="v" bands={["#009246", WHITE, "#CE2B37"]} />,
  IE: () => <Bands dir="v" bands={["#169B62", WHITE, "#FF883E"]} />,
  BE: () => <Bands dir="v" bands={["#101010", "#FDDA24", "#EF3340"]} />,
  RO: () => <Bands dir="v" bands={["#002B7F", "#FCD116", "#CE1126"]} />,
  MX: () => <Bands dir="v" bands={["#006847", WHITE, "#CE1126"]} />,
  PE: () => <Bands dir="v" bands={["#D91023", WHITE, "#D91023"]} />,
  NG: () => <Bands dir="v" bands={["#008751", WHITE, "#008751"]} />,

  // ---- Horizontal bands ----
  DE: () => <Bands dir="h" bands={["#101010", "#DD0000", "#FFCE00"]} />,
  NL: () => <Bands dir="h" bands={["#AE1C28", WHITE, "#21468B"]} />,
  LU: () => <Bands dir="h" bands={["#ED2939", WHITE, "#00A1DE"]} />,
  RU: () => <Bands dir="h" bands={[WHITE, "#0039A6", "#D52B1E"]} />,
  AT: () => <Bands dir="h" bands={["#ED2939", WHITE, "#ED2939"]} />,
  HU: () => <Bands dir="h" bands={["#CE2939", WHITE, "#477050"]} />,
  BG: () => <Bands dir="h" bands={[WHITE, "#00966E", "#D62612"]} />,
  LT: () => <Bands dir="h" bands={["#FDB913", "#006A44", "#C1272D"]} />,
  EE: () => <Bands dir="h" bands={["#0072CE", "#101010", WHITE]} />,
  UA: () => <Bands dir="h" bands={["#005BBB", "#FFD500"]} />,
  PL: () => <Bands dir="h" bands={[WHITE, "#DC143C"]} />,
  ID: () => <Bands dir="h" bands={["#E70011", WHITE]} />,
  RS: () => <Bands dir="h" bands={["#C6363C", "#0C4076", WHITE]} />,
  SI: () => <Bands dir="h" bands={[WHITE, "#005CE6", "#ED1C24"]} />,
  SK: () => <Bands dir="h" bands={[WHITE, "#0B4EA2", "#EE1C25"]} />,
  HR: () => <Bands dir="h" bands={["#FF0000", WHITE, "#171796"]} />,
  LV: () => <Bands dir="h" bands={[["#9E3039", 2], [WHITE, 1], ["#9E3039", 2]]} />,
  CO: () => <Bands dir="h" bands={[["#FCD116", 2], ["#003893", 1], ["#CE1126", 1]]} />,
  ES: () => <Bands dir="h" bands={[["#AA151B", 1], ["#F1BF00", 2], ["#AA151B", 1]]} />,
  AR: () => <Bands dir="h" bands={["#75AADB", WHITE, "#75AADB"]} />,
  TH: () => (
    <Bands
      dir="h"
      bands={[["#A51931", 1], [WHITE, 1], ["#2D2A4A", 2], [WHITE, 1], ["#A51931", 1]]}
    />
  ),

  // ---- Nordic crosses ----
  DK: () => <NordicCross field="#C8102E" cross={WHITE} />,
  SE: () => <NordicCross field="#005293" cross="#FECB00" />,
  FI: () => <NordicCross field={WHITE} cross="#002F6C" />,
  NO: () => <NordicCross field="#BA0C2F" cross={WHITE} inner="#00205B" />,
  IS: () => <NordicCross field="#02529C" cross={WHITE} inner="#DC1E35" />,

  // ---- Everything else, drawn mark by mark ----
  GB: () => <UnionFlag />,

  US: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill={WHITE} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x="0" y={(i * 40) / 6.5} width="60" height={40 / 13} fill="#B22234" />
      ))}
      <rect x="0" y="0" width="24" height={(40 / 13) * 7} fill="#3C3B6E" />
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={3 + col * 4.5}
            cy={2.8 + row * 5.2}
            r="1.1"
            fill={WHITE}
          />
        )),
      )}
    </>
  ),

  CA: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill={WHITE} />
      <rect x="0" y="0" width="15" height="40" fill="#D80621" />
      <rect x="45" y="0" width="15" height="40" fill="#D80621" />
      <polygon
        points="30,7 32,13 37,11 35.5,16 41,15.5 38,19.5 44,22 38.5,24 39.5,28 33.5,26.5 31.5,32 30,29 28.5,32 26.5,26.5 20.5,28 21.5,24 16,22 22,19.5 19,15.5 24.5,16 23,11 28,13"
        fill="#D80621"
      />
    </>
  ),

  JP: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill={WHITE} />
      <circle cx="30" cy="20" r="11.5" fill="#BC002D" />
    </>
  ),

  CH: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill="#D52B1E" />
      <rect x="25.5" y="8" width="9" height="24" fill={WHITE} />
      <rect x="18" y="15.5" width="24" height="9" fill={WHITE} />
    </>
  ),

  BR: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill="#009B3A" />
      <polygon points="30,4 56,20 30,36 4,20" fill="#FEDF00" />
      <circle cx="30" cy="20" r="9" fill="#002776" />
      <path d="M21.6,22.4 Q30,16.5 38.4,22.4" fill="none" stroke={WHITE} strokeWidth="2.6" />
    </>
  ),

  PT: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill="#FF0000" />
      <rect x="0" y="0" width="24" height="40" fill="#006600" />
      <circle cx="24" cy="20" r="7" fill="#FFE900" stroke="#FFFFFF" strokeWidth="0.8" />
      <circle cx="24" cy="20" r="3.4" fill="#DA291C" />
    </>
  ),

  GR: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill={WHITE} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="0" y={(i * 40) / 4.5} width="60" height={40 / 9} fill="#0D5EAF" />
      ))}
      <rect x="0" y="0" width="22.2" height="22.2" fill="#0D5EAF" />
      <rect x="8.9" y="0" width="4.4" height="22.2" fill={WHITE} />
      <rect x="0" y="8.9" width="22.2" height="4.4" fill={WHITE} />
    </>
  ),

  TR: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill="#E30A17" />
      <circle cx="24" cy="20" r="8.5" fill={WHITE} />
      <circle cx="27.5" cy="20" r="6.8" fill="#E30A17" />
      <Star cx={38} cy={20} r={4.6} fill={WHITE} />
    </>
  ),

  KR: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill={WHITE} />
      <circle cx="30" cy="20" r="8" fill="#CD2E3A" />
      <path d="M22,20 a4,4 0 0,1 8,0 a4,4 0 0,0 8,0 a8,8 0 0,1 -16,0 z" fill="#0047A0" />
      <g fill="#101010">
        <rect x="8" y="8" width="8" height="1.6" transform="rotate(33 12 8.8)" />
        <rect x="44" y="8" width="8" height="1.6" transform="rotate(-33 48 8.8)" />
        <rect x="8" y="30.4" width="8" height="1.6" transform="rotate(-33 12 31.2)" />
        <rect x="44" y="30.4" width="8" height="1.6" transform="rotate(33 48 31.2)" />
      </g>
    </>
  ),

  CN: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill="#DE2910" />
      <Star cx={10} cy={10} r={5.5} fill="#FFDE00" />
      <Star cx={20} cy={4} r={2} fill="#FFDE00" />
      <Star cx={24} cy={8.5} r={2} fill="#FFDE00" />
      <Star cx={24} cy={14} r={2} fill="#FFDE00" />
      <Star cx={20} cy={18} r={2} fill="#FFDE00" />
    </>
  ),

  VN: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill="#DA251D" />
      <Star cx={30} cy={20} r={11} fill="#FFFF00" />
    </>
  ),

  IN: () => (
    <>
      <Bands dir="h" bands={["#FF9933", WHITE, "#138808"]} />
      <circle cx="30" cy="20" r="5" fill="none" stroke="#000088" strokeWidth="1.4" />
      <circle cx="30" cy="20" r="1.1" fill="#000088" />
    </>
  ),

  CZ: () => (
    <>
      <rect x="0" y="0" width="60" height="20" fill={WHITE} />
      <rect x="0" y="20" width="60" height="20" fill="#D7141A" />
      <polygon points="0,0 26,20 0,40" fill="#11457E" />
    </>
  ),

  CL: () => (
    <>
      <rect x="0" y="0" width="60" height="20" fill={WHITE} />
      <rect x="0" y="20" width="60" height="20" fill="#D52B1E" />
      <rect x="0" y="0" width="20" height="20" fill="#0039A6" />
      <Star cx={10} cy={10} r={5.5} fill={WHITE} />
    </>
  ),

  SG: () => (
    <>
      <rect x="0" y="0" width="60" height="20" fill="#ED2939" />
      <rect x="0" y="20" width="60" height="20" fill={WHITE} />
      <circle cx="13" cy="10" r="7" fill={WHITE} />
      <circle cx="17" cy="10" r="6" fill="#ED2939" />
      <Star cx={20.5} cy={5} r={1.9} fill={WHITE} />
      <Star cx={25} cy={8.4} r={1.9} fill={WHITE} />
      <Star cx={23.3} cy={13.8} r={1.9} fill={WHITE} />
      <Star cx={17.7} cy={13.8} r={1.9} fill={WHITE} />
      <Star cx={16} cy={8.4} r={1.9} fill={WHITE} />
    </>
  ),

  AU: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill="#012169" />
      <g transform="scale(0.5)">
        <UnionFlag />
      </g>
      <Star cx={15} cy={30} r={4} fill={WHITE} />
      <Star cx={45} cy={9} r={2.6} fill={WHITE} />
      <Star cx={52} cy={19} r={2.6} fill={WHITE} />
      <Star cx={45} cy={31} r={2.6} fill={WHITE} />
      <Star cx={38.5} cy={20} r={2.2} fill={WHITE} />
      <Star cx={47.5} cy={24} r={1.4} fill={WHITE} />
    </>
  ),

  NZ: () => (
    <>
      <rect x="0" y="0" width="60" height="40" fill="#012169" />
      <g transform="scale(0.5)">
        <UnionFlag />
      </g>
      <Star cx={47} cy={10} r={2.8} fill="#C8102E" />
      <Star cx={53} cy={21} r={2.8} fill="#C8102E" />
      <Star cx={46} cy={31} r={2.8} fill="#C8102E" />
      <Star cx={40} cy={20} r={2.4} fill="#C8102E" />
    </>
  ),
};

/**
 * The readable name for a listing's region subtag: "France" for `FR`, "Latin
 * America" for `419`, and an explicit phrase when the operator gave none — so
 * "no region" is stated rather than left as a gap.
 */
export function countryLabel(code: string | null | undefined): string {
  const region = regionCode(code);
  return region ? regionDisplayName(region) : "Region not specified";
}

/**
 * The neutral marker shown when a listing gives no region (`en`), gives a
 * macro-region (`es-419`), or names a country this set does not draw. It
 * inherits `currentColor`, so it sits in the theme instead of fighting it — and
 * it is never shown alone, always beside the code or name.
 */
function NoFlagMark() {
  return (
    <>
      <circle cx="30" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <path
        d="M18,20 h24 M30,8 c5,5 5,19 0,24 M30,8 c-5,5 -5,19 0,24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
    </>
  );
}

/**
 * One flag, or the neutral marker. Always `aria-hidden`: the meaning lives in
 * the text label the caller renders next to it.
 */
export function CountryFlag({ code, width = 18 }: { code?: string | null; width?: number }) {
  const known = isCountryCode(code) ? FLAGS[code] : undefined;
  return (
    <svg
      className={`flag${known ? "" : " flag-none"}`}
      viewBox="0 0 60 40"
      width={width}
      height={Math.round((width * 2) / 3)}
      aria-hidden="true"
      focusable="false"
    >
      {known ? known() : <NoFlagMark />}
    </svg>
  );
}

/**
 * Flag plus the country's full name — the roomier form, for the detail page.
 * The name is the label; the flag only decorates it.
 */
export function FlaggedCountry({
  code,
  className,
  width = 18,
}: {
  code?: string | null;
  className?: string;
  width?: number;
}) {
  return (
    <span className={className}>
      <CountryFlag code={code} width={width} />
      <span>{countryLabel(code)}</span>
    </span>
  );
}

/**
 * A listing's origin, as shown on a browser row: flag, then the region code and
 * the language chip. The flag is decoration; the codes carry the meaning, and
 * an unknown region reads as the same "—" the browser already uses for an
 * unknown ping. The full country and language names ride along in `title` for
 * anyone who wants them.
 */
export function ServerLocale({
  country,
  lang,
  className,
}: {
  country?: string | null;
  lang: string;
  className?: string;
}) {
  const shortCode = regionCode(country);
  return (
    <span
      className={className}
      title={`${countryLabel(country)} · ${languageDisplayName(lang.toLowerCase())}`}
    >
      <CountryFlag code={country} width={16} />
      <span className="flag-code">{shortCode ?? "—"}</span>
      <span className="flag-sep" aria-hidden="true">
        ·
      </span>
      <span className="flag-lang">{lang}</span>
    </span>
  );
}
