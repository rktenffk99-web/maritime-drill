#!/usr/bin/env python3
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

# Common signs of failed PDF/HWP equation/font conversion.
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
    # A single WHITE SQUARE can be a legitimate diagram label (e.g. □A), so
    # only flag it when it is repeated or occurs in formula-like context.
    for m in re.finditer(r"□{2,}", text):
        findings.append((m.start(), "REPEATED WHITE SQUARE", m.group()))
    for m in re.finditer(r"(?:[A-Za-z]\s*[:=]\s*)?□(?:\s*□){1,}|□{2,}\s*[×x*/÷+\-]", text):
        findings.append((m.start(), "FORMULA WHITE SQUARE", m.group()))
    # Detached subscript/variable suffix seen in converted stems: "... C: 방형계수 ... ] b"
    for m in re.finditer(r"(?:방형계수|block\s*coefficient)[^\n\r]{0,100}[\]\)]\s*b(?=[\s\"'<,.;:)}]|$)", text, re.I):
        findings.append((m.start(), "DETACHED SUBSCRIPT b", m.group()))
    # Deduplicate positions/kinds.
    out = []
    seen = set()
    for item in sorted(findings, key=lambda x: (x[0], x[1])):
        key = (item[0], item[1], item[2])
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out

def print_context(prefix: str, text: str, pos: int, radius: int = 700):
    snippet = compact(text[max(0, pos-radius):min(len(text), pos+radius)])
    print(f"{prefix} {snippet}")

def main() -> int:
    index_text = INDEX.read_text(encoding="utf-8")
    targets = []
    for name, text in decode_bundles(index_text):
        if TARGET_RE.match(name):
            targets.append((name, text))

    print(f"TARGET_BUNDLES={len(targets)}")
    by_grade = Counter()
    total_findings = 0
    focus_hits = 0

    for name, text in targets:
        gm = re.search(r"navi([123])", name)
        if gm:
            by_grade[gm.group(1)] += 1

        hits = suspicious_chars(text)
        keyword_positions = []
        for word in FOCUS_WORDS:
            start = 0
            while True:
                pos = text.find(word, start)
                if pos < 0:
                    break
                keyword_positions.append((pos, word))
                start = pos + len(word)

        if hits or keyword_positions:
            print(f"BUNDLE name={name} suspicious={len(hits)} focus={len(keyword_positions)} chars={len(text)}")

        for pos, word in sorted(keyword_positions):
            focus_hits += 1
            print(f"FOCUS name={name} word={word!r} pos={pos}")
            print_context("  CONTEXT:", text, pos, 1200)

        # Keep output useful: one context per nearby cluster rather than every glyph.
        last_pos = -10_000
        for pos, kind, token in hits:
            total_findings += 1
            if pos - last_pos < 120:
                continue
            cp = " ".join(f"U+{ord(ch):04X}" for ch in token[:12])
            names = " | ".join(unicodedata.name(ch, "<no name>") for ch in token[:8])
            print(f"FINDING name={name} pos={pos} kind={kind} token={token!r} cps={cp} names={names}")
            print_context("  CONTEXT:", text, pos)
            last_pos = pos

    print("GRADE_BUNDLE_COUNTS=" + ",".join(f"{k}:{v}" for k,v in sorted(by_grade.items())))
    print(f"TOTAL_SUSPICIOUS={total_findings}")
    print(f"TOTAL_FOCUS_HITS={focus_hits}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
