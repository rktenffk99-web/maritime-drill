#!/usr/bin/env python3
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [ROOT / "index.html"]

# Characters that usually indicate failed PDF/HWP/OCR conversion in the exam bank.
SUSPICIOUS = {
    "\u25a1": "WHITE SQUARE",
    "\ufffd": "REPLACEMENT CHARACTER",
    "\u25af": "WHITE VERTICAL RECTANGLE",
    "\u25ab": "WHITE SMALL SQUARE",
    "\u25fb": "WHITE MEDIUM SQUARE",
    "\u25fd": "WHITE MEDIUM SMALL SQUARE",
}

# Contextual patterns for known conversion failures that do not contain a bad glyph.
CONTEXT_PATTERNS = [
    ("detached_subscript_b", re.compile(r"\]\s*b(?=(?:[\s\"'<,.;:)}]|$))")),
    ("detached_subscript_b2", re.compile(r"\)\]\s*b(?=(?:[\s\"'<,.;:)}]|$))")),
]

def compact(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()

def nearest_exam_hint(text: str, pos: int) -> str:
    window = text[max(0, pos-1800):min(len(text), pos+700)]
    # Keep useful identifiers if present in the embedded object.
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

def main() -> int:
    total = 0
    for path in TARGETS:
        text = path.read_text(encoding="utf-8")
        findings = []

        for ch, label in SUSPICIOUS.items():
            start = 0
            while True:
                pos = text.find(ch, start)
                if pos < 0:
                    break
                findings.append((pos, f"{label} U+{ord(ch):04X}", ch))
                start = pos + 1

        for m in re.finditer(r"[\ue000-\uf8ff]", text):
            findings.append((m.start(), f"PRIVATE USE U+{ord(m.group()):04X}", m.group()))

        for name, rx in CONTEXT_PATTERNS:
            for m in rx.finditer(text):
                findings.append((m.start(), name, m.group()))

        findings.sort(key=lambda x: x[0])
        print(f"FILE {path.name}: {len(findings)} suspicious occurrences")
        for i, (pos, kind, token) in enumerate(findings, 1):
            left = max(0, pos - 240)
            right = min(len(text), pos + max(len(token), 1) + 300)
            ctx = compact(text[left:right])
            hint = nearest_exam_hint(text, pos)
            print(f"FINDING {i:04d} pos={pos} kind={kind} token={token!r} hint={hint}")
            print(f"  CONTEXT: {ctx}")
        total += len(findings)

    print(f"TOTAL_SUSPICIOUS={total}")
    # Audit is informational for now; do not fail CI while we are repairing legacy data.
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
