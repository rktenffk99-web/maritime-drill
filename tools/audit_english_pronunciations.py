"""Audit every displayed English-word pronunciation, not just a few examples.

An automatic audit detects contaminated fragments and missing entries; it is not a
claim that every English accent or Korean phonetic approximation was manually verified.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
UNCONFIRMED = {"ramain", "boatsuain"}  # Source spellings are not established words.
ORDINAL_SUFFIX = "서수 접미부(숫자와 함께 읽음)"
SPACED_INITIALISMS = set("""
imo psc ais lsa smcs mlc isps scs iala dsc lo lt oscs cont mrcs hf ne msi
imdg cm khz psi mf lop ibc hpa mm bc igc stbd km nne pst unclos ism kg
""".split())
VARIANT_READINGS = {"a", "the", "to", "kg"}
IPA = re.compile(r"^/[^/\s()+,:?_\[\]]+/$")
HANGUL = re.compile(r"^[가-힣]+(?: [가-힣]+)*$")
TOKEN = re.compile(r"^[a-z]+(?:'[a-z]+)?$")
REGRESSION = {
    "a": "어 / 에이",
    "the": "더 / 디",
    "of": "어브",
    "to": "투 / 터",
    "and": "앤드",
    "are": "아르",
    "was": "워즈",
    "from": "프럼",
    "as": "애즈",
    "good": "굿",
    "steady": "스테디",
    "cpa": "씨피에이",
    "ukc": "유케이씨",
    "lighthouse's": "/lˈaɪthˌaʊsɪz/",
}

def audit_pronunciations(pron):
    if not isinstance(pron, dict):
        raise ValueError("Pronunciation data must be an object")
    errors = []
    counts = {"entries": len(pron), "ipa": 0, "hangul": 0, "unconfirmed": 0}
    for word, reading in sorted(pron.items()):
        if not TOKEN.fullmatch(word):
            errors.append(f"{word}: invalid English token")
        if not isinstance(reading, str) or not reading.strip():
            errors.append(f"{word}: missing pronunciation")
            continue
        if word in UNCONFIRMED:
            if reading != "발음 미확정":
                errors.append(f"{word}: unverified source spelling must remain explicitly unconfirmed")
            counts["unconfirmed"] += 1
            continue
        if word == "nd":
            if reading != ORDINAL_SUFFIX:
                errors.append("nd: ordinal suffix must not be assigned a standalone word pronunciation")
            continue
        if IPA.fullmatch(reading):
            counts["ipa"] += 1
            continue
        if "/" in reading and word not in VARIANT_READINGS:
            errors.append(f"{word}: slash-separated explanation or unexpected reading")
            continue
        parts = reading.split(" / ")
        if len(parts) > 1 and word not in VARIANT_READINGS:
            errors.append(f"{word}: unexpected multiple readings")
        if len(parts) > 2:
            errors.append(f"{word}: too many readings")
        for part in parts:
            if not HANGUL.fullmatch(part):
                errors.append(f"{word}: phonetic field contains prose, symbols, or IPA fragments: {part}")
            elif " " in part and word not in SPACED_INITIALISMS:
                errors.append(f"{word}: unexpected multiword Korean reading: {part}")
        if len(reading) > 35:
            errors.append(f"{word}: unusually long reading; verify it is not a sentence")
        counts["hangul"] += 1
    if counts["entries"] < 3700:
        errors.append("Pronunciation set is unexpectedly small")
    for word, expected in REGRESSION.items():
        if pron.get(word) != expected:
            errors.append(f"{word}: regression (expected {expected})")
    if errors:
        raise ValueError("Pronunciation audit found " + str(len(errors)) +
                         " problems:\n" + "\n".join(errors[:60]))
    return counts

def audit_generated_glossary(pron):
    data = (ROOT / "english-study-glossary.js").read_text(encoding="utf-8")
    marker = "window.MDEnglishWordStudyData="
    if marker not in data:
        raise ValueError("Generated glossary assignment is missing")
    glossary = json.loads(data.split(marker, 1)[1].strip().removesuffix(";"))
    entries = glossary["lexicon"]
    if set(entries) != set(pron):
        raise ValueError("Source pronunciations and generated glossary cover different words")
    mismatches = [word for word, value in entries.items()
                  if not isinstance(value, list) or len(value) < 2
                  or value[1] != pron[word]]
    if mismatches:
        raise ValueError("Generated glossary pronunciation mismatch: " +
                         ", ".join(mismatches[:40]))
    return {"glossaryWords": len(entries), "glossaryMismatches": 0}

if __name__ == "__main__":
    pron = json.loads((ROOT / "english-study/pronunciations.json").read_text(encoding="utf-8"))
    print(json.dumps({**audit_pronunciations(pron),
                      **audit_generated_glossary(pron)}, ensure_ascii=False))
