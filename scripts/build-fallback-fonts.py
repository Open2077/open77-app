#!/usr/bin/env python3
"""Builds the site's fallback fonts: public/fonts/i18n and src/styles/fallback-fonts.css.

The brand fonts (Druk, Satoshi, Nippo) draw Latin only. Three fallback
families, "Open77 Fallback Display|Body|Label", draw everything else: accents,
Cyrillic, Thai and Japanese. Their files are made in the brand repository
(brand/i18n-fallback-fonts, see its README); this script takes them from there
and prepares them for the web:

- the Latin and Thai files are copied as they are (they are small);
- the Japanese files (5 MB of woff2) are cut into unicode-range slices, so a
  page downloads only the slices of the characters it shows. The "core" slice
  holds kana, CJK punctuation, full-width forms and every kanji the Japanese
  dictionary (src/i18n/messages/ja.json) uses: a Japanese page of the site needs
  that slice and nothing else. The other kanji (server names, player text) are
  in slices of consecutive code points;
- every @font-face rule is written to src/styles/fallback-fonts.css.

Two CSS rules shape the output (see the brand README):

- a browser builds a composite family only from faces with the same
  descriptors, so the Label family, whose Thai file comes in five static cuts,
  is declared once per weight band, Latin and Japanese included;
- the core slice's range overlaps the consecutive slices, and a browser checks
  the last declared face first, so the core comes last: its kanji never pull a
  second slice.

Slice file names carry a hash of their content, so a new build never leaves a
browser with a stale slice.

Run again whenever ja.json gains kanji (scripts/check-i18n.mjs says so):

    uv run --with fonttools==4.68.0 --with brotli python -I scripts/build-fallback-fonts.py \\
        --fonts path/to/brand/i18n-fallback-fonts
"""

import argparse
import hashlib
import io
import json
import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public" / "fonts" / "i18n"
CSS = ROOT / "src" / "styles" / "fallback-fonts.css"
URL = "/fonts/i18n"

# The Latin ranges are what each brand font lacks (measured from their cmaps, brand README).
LATIN = {
    "Display": "U+0023-0026, U+0028-002B, U+002F, U+003A-003E, U+0040, U+005B-0060, U+007B-007E, U+00A0-017E, U+02C6-02C7, U+02D8-02DD, U+0300-0304, U+0306-0308, U+030A-030C, U+0326-0328, U+0400-04FF, U+1E9E, U+2002, U+2009, U+200B, U+2010, U+2013-2015, U+201A, U+201E, U+2020-2022, U+2026, U+2030, U+2032-2033, U+2039-203A, U+2044, U+2052, U+20A1, U+20A3-20A4, U+20A6-20A7, U+20A9, U+20AB-20AD, U+20B1-20B2, U+20B4-20B5, U+20B8-20BA, U+20BC-20BD, U+2116, U+2122, U+2126, U+2190-2193, U+2212, U+2215, U+2219, U+2248, U+2260, U+2264-2265, U+FFFD",
    "Body": "U+00A0, U+00AA, U+00AD, U+00BA, U+0124-0125, U+016C-016D, U+0400-04FF, U+1E9E, U+2011, U+201F, U+2033, U+2060, U+20A3, U+20A9-20AB, U+20AE, U+20B1, U+20B4, U+20B9-20BA, U+20BD, U+20BF, U+2215",
    "Label": "U+0108-0109, U+0114-0115, U+011C-011D, U+0124-0125, U+012C-012D, U+0132-0135, U+0138, U+013F-0140, U+014A-014B, U+014E-014F, U+015C-015D, U+0166-0167, U+016C-016D, U+0400-04FF, U+1E9E, U+2007-200B, U+2010, U+2012, U+2015, U+2032-2033, U+20A1, U+20A3-20A4, U+20A6-20A7, U+20A9, U+20AB, U+20AD, U+20B1-20B2, U+20B5, U+20BC, U+2116, U+2190-2193, U+2215, U+2219",
}
THAI = "U+0E00-0E7F"
# Each role's descriptors, repeated on every face of the family. Label: one band per Thai cut.
DESCRIPTORS = {"Display": [("500", "italic")], "Body": [("300 900", "normal")]}
LABEL_BANDS = [("200 283", "Light"), ("284 337", "Regular"), ("338 384", "Medium"), ("385 438", "SemiBold"), ("439 700", "Bold")]
# Kana, CJK symbols and punctuation, small kana extensions, half/full-width forms: every Japanese page shows some.
JA_ALWAYS = [(0x3000, 0x30FF), (0x31F0, 0x31FF), (0xFF00, 0xFFEF)]
JA_KANJI = (0x4E00, 0x9FFF)
SLICE = 260  # kanji per slice outside the core: about 110 KB of Body, 40 KB of Display


def ranges(codepoints):
    """[0x3041, 0x3042, 0x3044] -> "U+3041-3042, U+3044"."""
    out = []
    for cp in sorted(codepoints):
        if out and cp == out[-1][1] + 1:
            out[-1][1] = cp
        else:
            out.append([cp, cp])
    return ", ".join(f"U+{a:04X}" if a == b else f"U+{a:04X}-{b:04X}" for a, b in out)


def face(family, src, weight, style, unicode_range):
    return (
        f'@font-face {{\n  font-family: "Open77 Fallback {family}";\n  src: url("{src}") format("woff2");\n'
        f"  font-weight: {weight};\n  font-style: {style};\n  font-display: swap;\n  unicode-range: {unicode_range};\n}}\n"
    )


def cut(data, codepoints):
    """A woff2 subset of the font in `data` holding `codepoints`, with every name record and layout feature kept."""
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.name_legacy = True
    options.notdef_outline = True
    options.glyph_names = False
    font = TTFont(io.BytesIO(data))
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=codepoints)
    subsetter.subset(font)
    out = io.BytesIO()
    font.flavor = "woff2"
    font.save(out)
    return out.getvalue()


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--fonts", required=True, type=Path, help="brand/i18n-fallback-fonts")
    parser.add_argument("--dictionary", type=Path, default=ROOT / "src" / "i18n" / "messages" / "ja.json")
    args = parser.parse_args()
    source = args.fonts

    PUBLIC.mkdir(parents=True, exist_ok=True)
    (PUBLIC / "ja").mkdir(exist_ok=True)

    # Latin and Thai: as made in the brand repository.
    copied = ["Open77FallbackDisplay.woff2", "Open77FallbackBody.woff2", "Open77FallbackLabel.woff2",
              "Open77FallbackDisplay-TH.woff2", "Open77FallbackBody-TH.woff2",
              *[f"Open77FallbackLabel-TH-{cut_name}.woff2" for _, cut_name in LABEL_BANDS]]
    licences = sorted(path.name for path in source.glob("OFL-*.txt"))
    for name in copied + licences:
        shutil.copyfile(source / name, PUBLIC / name)

    # Japanese: which kanji the site itself writes.
    dictionary = json.loads(args.dictionary.read_text(encoding="utf-8"))
    used = {ord(ch) for text in strings(dictionary) for ch in text if JA_KANJI[0] <= ord(ch) <= JA_KANJI[1]}

    produced = set()
    rules = {"Display": [], "Body": [], "Label": []}
    report = []
    for role in ("Display", "Body", "Label"):
        data = (source / f"Open77Fallback{role}-JA.woff2").read_bytes()
        cmap = set(TTFont(io.BytesIO(data)).getBestCmap())
        always = {cp for lo, hi in JA_ALWAYS for cp in range(lo, hi + 1) if cp in cmap}
        kanji = sorted(cp for cp in cmap if JA_KANJI[0] <= cp <= JA_KANJI[1])
        missing = sorted(used - set(kanji))
        if missing:
            print(f"warning: {role} JA lacks {''.join(map(chr, missing))} (the OS font will draw them)")
        core = always | (used & set(kanji))
        rest = [cp for cp in kanji if cp not in core]
        slices = [("core", core)] + [(f"{index + 1:02d}", set(rest[start:start + SLICE])) for index, start in enumerate(range(0, len(rest), SLICE))]
        total = 0
        for name, codepoints in slices:
            woff2 = cut(data, codepoints)
            digest = hashlib.sha256(woff2).hexdigest()[:10]
            file = f"{role.lower()}-{name}.{digest}.woff2"
            (PUBLIC / "ja" / file).write_bytes(woff2)
            produced.add(file)
            total += len(woff2)
            if name == "core":
                # The core lists its exact characters; it is declared last (checked first).
                core_rule = (f"{URL}/ja/{file}", ranges(codepoints), len(woff2))
            else:
                lo, hi = min(codepoints), max(codepoints)
                rules[role].append((f"{URL}/ja/{file}", f"U+{lo:04X}-{hi:04X}"))
        rules[role].append(core_rule[:2])
        report.append(f"{role} JA: core {core_rule[2]:,} B ({len(core):,} characters, {len(used & set(kanji)):,} kanji from ja.json), {len(slices) - 1} more slices, {total:,} B in all")

    for stale in (PUBLIC / "ja").glob("*.woff2"):
        if stale.name not in produced:
            stale.unlink()

    css = [
        "/*\n"
        " * GENERATED by scripts/build-fallback-fonts.py from brand/i18n-fallback-fonts: do not edit.\n"
        " *\n"
        " * Fallback faces for the characters the brand fonts lack: accents, Polish and\n"
        " * Turkish letters, ẞ, typographic punctuation, Cyrillic, Thai and Japanese.\n"
        " * Each family sits right after its brand font in the stacks (src/lib/fonts.ts)\n"
        " * and each face's unicode-range is exactly what it adds, so the brand draws\n"
        " * everything it can and a page downloads a face only for the characters it shows.\n"
        " * SIL OFL 1.1, built from Roboto Flex, Manrope, Exo 2, M PLUS 1, Kanit, Anuphan\n"
        " * and Chakra Petch (licences in public/fonts/i18n).\n"
        " *\n"
        " * Every face of a family repeats the same descriptors (a browser only combines\n"
        " * faces that match), which is why Label is declared once per weight band. The\n"
        " * Japanese core slice comes after the other Japanese slices of its family: the\n"
        " * last declared face is checked first, so the site's own kanji never pull a slice.\n"
        " */\n"
    ]
    for role in ("Display", "Body"):
        for weight, style in DESCRIPTORS[role]:
            css.append(f"\n/* {role} */\n")
            css.append(face(role, f"{URL}/Open77Fallback{role}.woff2", weight, style, LATIN[role]))
            css.append(face(role, f"{URL}/Open77Fallback{role}-TH.woff2", weight, style, THAI))
            for src, unicode_range in rules[role]:
                css.append(face(role, src, weight, style, unicode_range))
    for weight, cut_name in LABEL_BANDS:
        css.append(f"\n/* Label, weights {weight.replace(' ', '–')}: Thai {cut_name} */\n")
        css.append(face("Label", f"{URL}/Open77FallbackLabel.woff2", weight, "normal", LATIN["Label"]))
        css.append(face("Label", f"{URL}/Open77FallbackLabel-TH-{cut_name}.woff2", weight, "normal", THAI))
        for src, unicode_range in rules["Label"]:
            css.append(face("Label", src, weight, "normal", unicode_range))
    CSS.write_text("".join(css), encoding="utf-8", newline="\n")

    for line in report:
        print(line)
    print(f"{CSS.relative_to(ROOT)}: {CSS.stat().st_size:,} B, {''.join(css).count('@font-face'):,} faces")


if __name__ == "__main__":
    main()
