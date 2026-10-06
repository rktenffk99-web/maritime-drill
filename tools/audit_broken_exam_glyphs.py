#!/usr/bin/env python3
"""Full audit of navigator past-exam bundles for PDF/HWP equation corruption.

The single-file app stores past papers as gzip+base64 bundles. This scanner
decodes every 1/2/3급 navigator bundle, counts all suspicious private-use
characters, and reports concentration by grade/bundle without guessing fixes.
"""
from __future__ import annotations

import base64
import gzip
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

TARGET_RE = re.compile(
    r"^(?:past-(?:20\d{2})-navi(?:1|2|3)(?:e)?-\d+|past-analysis-navi(?:1|2|3)|past-explain-20\d{2})\.js$"
)
FOCUS_WORDS = ("Squatting", "스쿼팅", "선저여유수심", "침하량", "방형계수")

BAD_GLYPHS = {
    "\ufffd": "REPLACEMENT CHARACTER",
    "\u25af": "WHITE VERTICAL RECTANGLE",
    "\u25ab": "WHITE SMALL SQUARE",
    "\u25fb": "WHITE MEDIUM SQUARE",
    "\u25fd": "WHITE MEDIUM SMALL SQUARE",
}


def compact(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def bundle_name(bundle_id: str) -> str:
    name = bundle_id.removeprefix("md-bundle-")
    if name.endswith("_js"):
        name = name[:-3] + ".js"
    return name


def decode_bundles(index_text: str):
    rx = re.compile(
        r'<script\s+type="application/gzip"\s+id="(md-bundle-[^"]+)">\s*([A-Za-z0-9+/=\r\n]+?)\s*</script>',
        re.S,
    )
    for match in rx.finditer(index_text):
        bid, payload = match.groups()
        name = bundle_name(bid)
        try:
            raw = gzip.decompress(base64.b64decode(re.sub(r"\s+", "", payload)))
            text = raw.decode("utf-8")
        except Exception as exc:
            print(f"BUNDLE_DECODE_ERROR name={name} error={exc!r}")
            continue
        yield name, text


def suspicious_chars(text: str):
    findings = []
    for i, ch in enumerate(text):
        cp = ord(ch)
        cat = unicodedata.category(ch)
        if ch in BAD_GLYPHS:
            findings.append((i, f"{BAD_GLYPHS[ch]} U+{cp:04X}", ch))
        elif cat in {"Co", "Cs"}:
            findings.append((i, f"{cat} U+{cp:04X}", ch))
        elif cat == "Cc" and ch not in "\r\n\t":
            findings.append((i, f"CONTROL U+{cp:04X}", ch))

    for m in re.finditer(r"□{2,}", text):
        findings.append((m.start(), "REPEATED WHITE SQUARE", m.group()))
    for m in re.finditer(r"(?:[A-Za-z]\s*[:=]\s*)?□(?:\s*□){1,}|□{2,}\s*[×x*/÷+\-]", text):
        findings.append((m.start(), "FORMULA WHITE SQUARE", m.group()))
    for m in re.finditer(r"(?:방형계수|block\s*coefficient)[^\n\r]{0,100}[\]\)]\s*b(?=[\s\"'<,.;:)}]|$)", text, re.I):
        findings.append((m.start(), "DETACHED SUBSCRIPT b", m.group()))

    out, seen = [], set()
    for item in sorted(findings, key=lambda x: (x[0], x[1])):
        key = (item[0], item[1], item[2])
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def main() -> int:
    index_text = INDEX.read_text(encoding="utf-8")
    targets = [(n, t) for n, t in decode_bundles(index_text) if TARGET_RE.match(n)]

    grade_bundle_counts = Counter()
    grade_pua_counts = Counter()
    bundle_counts = Counter()
    pua_counts = Counter()
    pua_samples = {}
    total_findings = 0
    focus_rows = []

    for name, text in targets:
        gm = re.search(r"navi([123])", name)
        grade = gm.group(1) if gm else "?"
        grade_bundle_counts[grade] += 1

        hits = suspicious_chars(text)
        total_findings += len(hits)
        bundle_counts[name] += len(hits)

        for idx, ch in enumerate(text):
            if unicodedata.category(ch) == "Co":
                cp = f"U+{ord(ch):04X}"
                pua_counts[cp] += 1
                grade_pua_counts[grade] += 1
                pua_samples.setdefault(
                    cp,
                    (name, compact(text[max(0, idx-90):min(len(text), idx+110)])),
                )

        for word in FOCUS_WORDS:
            start = 0
            while True:
                pos = text.find(word, start)
                if pos < 0:
                    break
                focus_rows.append(
                    (name, word, compact(text[max(0, pos-220):min(len(text), pos+520)]))
                )
                start = pos + len(word)

    print("=== NAVIGATOR EXAM TEXT CORRUPTION AUDIT ===")
    print(f"TARGET_BUNDLES={len(targets)}")
    print("GRADE_BUNDLE_COUNTS=" + ",".join(f"{k}:{v}" for k,v in sorted(grade_bundle_counts.items())))
    print("GRADE_PUA_COUNTS=" + ",".join(f"{k}:{v}" for k,v in sorted(grade_pua_counts.items())))
    print(f"UNIQUE_PUA={len(pua_counts)}")
    print(f"TOTAL_SUSPICIOUS={total_findings}")
    print(f"TOTAL_FOCUS_HITS={len(focus_rows)}")

    print("\nTOP_AFFECTED_BUNDLES")
    for name, count in bundle_counts.most_common(30):
        if count:
            print(f"  {name}: {count}")

    print("\nPUA_CODEPOINT_COUNTS")
    for cp, count in pua_counts.most_common():
        name, sample = pua_samples[cp]
        print(f"  {cp}: {count} first={name} sample={sample}")

    print("\nFOCUS_CONTEXTS")
    seen = set()
    for name, word, sample in focus_rows:
        key = (name, sample)
        if key in seen:
            continue
        seen.add(key)
        print(f"  {name} [{word}] {sample}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
