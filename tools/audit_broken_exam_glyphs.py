#!/usr/bin/env python3
"""Audit built exam data for broken PDF/OCR glyphs.

This is intentionally conservative: it reports suspicious characters and nearby
source context. It does not guess at unknown formulas.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [
    ROOT / "index.html",
    ROOT / "navi2-reviewed-content.js",
    ROOT / "explain-2026-navi3-3.js",
    ROOT / "explain-2026-navi3-3-english.js",
]

# PUA = common result of Korean HWP/PDF math-font extraction.
BROKEN_RE = re.compile(r"[\uE000-\uF8FF\uFFFD\u25A1]")
# Long runs are especially likely to be formulas rendered as empty boxes.
RUN_RE = re.compile(r"(?:[\uE000-\uF8FF\uFFFD\u25A1][ \t]*){2,}")

MAX_CONTEXTS_PER_FILE = 80
WINDOW = 220


def clean_context(s: str) -> str:
    s = s.replace("\n", " ").replace("\r", " ").replace("\t", " ")
    return re.sub(r"\s+", " ", s).strip()


def classify_context(ctx: str) -> str:
    low = ctx.lower()
    if "navi2" in low or "2급" in ctx:
        return "2급"
    if "navi3" in low or "3급" in ctx:
        return "3급"
    if "navi1" in low or "1급" in ctx:
        return "1급"
    return "미분류"


def audit_file(path: Path):
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8", errors="replace")
    matches = list(BROKEN_RE.finditer(text))
    codepoints = Counter(f"U+{ord(m.group(0)):04X}" for m in matches)
    grade_counts = Counter()
    samples = []
    seen = set()

    for m in matches:
        a = max(0, m.start() - WINDOW)
        b = min(len(text), m.end() + WINDOW)
        ctx = clean_context(text[a:b])
        grade = classify_context(ctx)
        grade_counts[grade] += 1

        # De-duplicate nearby repeated glyphs from the same formula.
        key = (grade, ctx[:180])
        if key in seen:
            continue
        seen.add(key)
        cps = " ".join(f"U+{ord(ch):04X}" for ch in m.group(0))
        samples.append((grade, cps, ctx))
        if len(samples) >= MAX_CONTEXTS_PER_FILE:
            break

    runs = list(RUN_RE.finditer(text))
    return {
        "path": path,
        "count": len(matches),
        "runs": len(runs),
        "codepoints": codepoints,
        "grades": grade_counts,
        "samples": samples,
    }


def main() -> int:
    reports = [r for p in TARGETS if (r := audit_file(p))]
    total = sum(r["count"] for r in reports)
    total_runs = sum(r["runs"] for r in reports)
    all_cps = Counter()
    all_grades = Counter()
    for r in reports:
        all_cps.update(r["codepoints"])
        all_grades.update(r["grades"])

    print("=== broken exam glyph audit ===")
    print(f"files={len(reports)} suspicious_chars={total} suspicious_runs={total_runs}")
    print("codepoints:", ", ".join(f"{k}:{v}" for k, v in all_cps.most_common()) or "none")
    print("grade-nearby:", ", ".join(f"{k}:{v}" for k, v in all_grades.most_common()) or "none")

    for r in reports:
        print(f"\n--- {r['path'].name} ---")
        print(
            f"suspicious_chars={r['count']} runs={r['runs']} "
            f"grades={dict(r['grades'])} codepoints={dict(r['codepoints'])}"
        )
        for i, (grade, cps, ctx) in enumerate(r["samples"], 1):
            print(f"[{i:03d}] grade={grade} cp={cps} :: {ctx}")

    # Audit only. Unknown glyphs must not make the production rebuild fail.
    # Known/verified formulas are covered by regression tests in
    # test_reported_content_fixes.js.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
