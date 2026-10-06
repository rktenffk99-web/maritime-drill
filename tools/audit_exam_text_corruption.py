#!/usr/bin/env python3
from __future__ import annotations
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT_EXTS = {".html", ".js", ".json", ".py", ".md", ".txt", ".yml", ".yaml"}
SKIP_PARTS = {".git", "node_modules"}

KEYWORDS = [
    "Squatting",
    "스쿼팅",
    "선저여유수심",
    "침하량",
    "방형계수",
    "ensureNavi3FrequencyData",
    "getPastExam",
    "MD_NAVI_FREQUENCY",
    "pastExam",
    "frequency",
]

SUSPICIOUS = {
    "\u25a1": "WHITE SQUARE",
    "\ufffd": "REPLACEMENT CHARACTER",
    "\u25af": "WHITE VERTICAL RECTANGLE",
    "\u25ab": "WHITE SMALL SQUARE",
    "\u25fb": "WHITE MEDIUM SQUARE",
    "\u25fd": "WHITE MEDIUM SMALL SQUARE",
}

CONTEXT_PATTERNS = [
    ("detached_subscript_b", re.compile(r"\]\s*b(?=(?:[\s\"'<,.;:)}]|$))")),
    ("detached_subscript_b2", re.compile(r"\)\]\s*b(?=(?:[\s\"'<,.;:)}]|$))")),
    ("box_run", re.compile(r"[□▯▫◻◽]{2,}")),
]

def compact(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()

def nearest_exam_hint(text: str, pos: int) -> str:
    window = text[max(0, pos-2200):min(len(text), pos+900)]
    tags = []
    for pat in [
        r"20\d{2}년\s*\d회",
        r"(?:1|2|3)급\s*항해사",
        r"(?:1|2|3)급",
        r"Q\d{1,3}",
        r"운용|항해|법규|영어|전문",
    ]:
        found = re.findall(pat, window)
        if found:
            tags.append(str(found[-1]))
    return " | ".join(tags[-5:])

def iter_targets():
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXTS:
            continue
        if any(part in SKIP_PARTS for part in path.parts):
            continue
        yield path

def is_private_use(ch: str) -> bool:
    cp = ord(ch)
    return (
        0xE000 <= cp <= 0xF8FF
        or 0xF0000 <= cp <= 0xFFFFD
        or 0x100000 <= cp <= 0x10FFFD
        or unicodedata.category(ch) == "Co"
    )

def main() -> int:
    total = 0
    keyword_hits = 0

    for path in iter_targets():
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        findings = []
        seen = set()

        def add(pos: int, kind: str, token: str):
            key = (pos, kind, token)
            if key not in seen:
                seen.add(key)
                findings.append(key)

        for ch, label in SUSPICIOUS.items():
            start = 0
            while True:
                pos = text.find(ch, start)
                if pos < 0:
                    break
                add(pos, f"{label} U+{ord(ch):04X}", ch)
                start = pos + 1

        for pos, ch in enumerate(text):
            if is_private_use(ch):
                add(pos, f"PRIVATE USE U+{ord(ch):04X}", ch)
            elif unicodedata.category(ch) == "Cc" and ch not in "\n\r\t":
                add(pos, f"CONTROL U+{ord(ch):04X}", ch)

        for name, rx in CONTEXT_PATTERNS:
            for m in rx.finditer(text):
                add(m.start(), name, m.group())

        findings.sort(key=lambda x: x[0])
        if findings:
            rel = path.relative_to(ROOT)
            print(f"FILE {rel}: {len(findings)} suspicious occurrences")
            for i, (pos, kind, token) in enumerate(findings, 1):
                left = max(0, pos - 320)
                right = min(len(text), pos + max(len(token), 1) + 420)
                ctx = compact(text[left:right])
                hint = nearest_exam_hint(text, pos)
                print(f"FINDING {i:04d} pos={pos} kind={kind} token={token!r} hint={hint}")
                print(f"  CONTEXT: {ctx}")
            total += len(findings)

        for kw in KEYWORDS:
            start = 0
            while True:
                pos = text.find(kw, start)
                if pos < 0:
                    break
                rel = path.relative_to(ROOT)
                ctx = compact(text[max(0,pos-500):min(len(text),pos+900)])
                hint = nearest_exam_hint(text, pos)
                print(f"KEYWORD file={rel} kw={kw!r} pos={pos} hint={hint}")
                print(f"  CONTEXT: {ctx}")
                keyword_hits += 1
                start = pos + max(1, len(kw))

    print(f"TOTAL_SUSPICIOUS={total}")
    print(f"TOTAL_KEYWORD_HITS={keyword_hits}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
