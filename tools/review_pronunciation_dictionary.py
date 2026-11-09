"""Reproducible dictionary comparison, deliberately NOT a full human sign-off.

CMUdict is vendored only for the app's words, under CMUDICT-LICENSE.txt.
Optional BEEP 1.0 input is used locally for pronunciation research only; neither
its dictionary nor its transcriptions are redistributed in this application.
"""
import argparse
import collections
import csv
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PHONE = dict(zip(
    'AA AE AH AO AW AY B CH D DH EH ER EY F G HH IH IY JH K L M N NG OW OY P R S SH T TH UH UW V W Y Z ZH'.split(),
    'ɑ æ ə ɔ aʊ aɪ b tʃ d ð ɛ ɚ eɪ f ɡ h ɪ i dʒ k l m n ŋ oʊ ɔɪ p ɹ s ʃ t θ ʊ u v w j z ʒ'.split()))
VOWELS = set('AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW'.split())
# These can match a dictionary perfectly while being wrong for the sentence.
HETERONYMS = set('lead leads leading read reading wind winds winding wound bow bows bowed close closes use used house housed live lives minute minutes refuse object record records present presents produce conduct contract content permit subject separate alternate invalid entrance desert tear tears row does bases sow number axes duplicate polish coordinate moderate increase survey export import progress project frequent digest upset abstract attribute compound console contest contrast convict decrease defect extract impact incense insert insult perfect protest rebel reject suspect transfer transport'.split())

def phones_to_ipa(phones):
    """Phonemes plus vowel stress, not a guessed syllabification."""
    result = []
    stress = []
    for phone in phones:
        base = re.sub('[012]', '', phone)
        if base not in PHONE:
            raise ValueError('Unsupported CMU phone: ' + phone)
        level = int(phone[-1]) if phone[-1:].isdigit() else 0
        result.append('ʌ' if base == 'AH' and level else
                      'ɝ' if base == 'ER' and level else PHONE[base])
        if base in VOWELS:
            stress.append(level)
    return ''.join(result), stress

def ipa_signature(reading):
    if not reading.startswith('/') or not reading.endswith('/'):
        return None
    body = reading[1:-1].replace('g', 'ɡ').replace('r', 'ɹ').replace('ː', '').replace('.', '')
    values = sorted(set(PHONE.values()) | {'ʌ', 'ɝ'}, key=len, reverse=True)
    vowel_values = {PHONE[v] for v in VOWELS} | {'ʌ', 'ɝ'}
    result, stress, pending = [], [], 0
    while body:
        if body[0] in 'ˈˌ':
            if pending:
                return None
            pending = 1 if body[0] == 'ˈ' else 2
            body = body[1:]
            continue
        phone = next((v for v in values if body.startswith(v)), None)
        if phone is None:
            return None
        result.append(phone)
        if phone in vowel_values:
            stress.append(pending)
            pending = 0
        body = body[len(phone):]
    return (''.join(result), stress) if not pending else None

def compare_us(reading, variants):
    sig = ipa_signature(reading)
    if sig is None:
        return 'not_ipa' if not reading.startswith('/') else 'unsupported_ipa'
    signatures = [phones_to_ipa(v) for v in variants]
    if sig in signatures:
        return 'phonemes_and_vowel_stress_match'
    if sig[0] in [s[0] for s in signatures]:
        return 'stress_differs'
    return 'phonemes_differ'

def beep_comparison(path, pron):
    mapping = {k.lower(): v for k, v in PHONE.items()}
    mapping.update(ah='ʌ', ax='ə', er='ɜ', oh='ɒ', ow='əʊ', ia='ɪə', ea='ɛə', ua='ʊə')
    entries = collections.defaultdict(list)
    for line in path.read_text(encoding='latin1').splitlines():
        if not line or line.startswith('#'):
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        word = parts[0].lower()
        if word not in pron:
            continue
        ps = [re.sub('[012]', '', p.lower()) for p in parts[1:]]
        if all(p in mapping for p in ps):
            entries[word].append(''.join(mapping[p] for p in ps))
    outcomes = {}
    for word, reading in pron.items():
        signature = ipa_signature(reading)
        outcomes[word] = ('not_found' if word not in entries else
                          'hangul_not_comparable' if signature is None else
                          'broad_phonemes_match' if signature[0] in entries[word] else
                          'different_accent_or_transcription_needs_review')
    return {'source': 'https://openslr.org/14/', 'version': 'BEEP 1.0 (1997)',
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'limitations': 'Research comparison only; no lexical stress in most entries. Differences from American English are not classified as errors. No BEEP transcriptions redistributed.',
            'outcomes': outcomes}

def build_report():
    pron = json.loads((ROOT/'english-study/pronunciations.json').read_text())
    reference = json.loads((ROOT/'english-study/cmudict-reference.json').read_text())
    review = json.loads((ROOT/'english-study/pronunciation-review.json').read_text())
    uk = json.loads((ROOT/'english-study/uk-comparison.json').read_text())
    prior = json.loads((ROOT/'english-study/prior-pronunciation-fixes.json').read_text())
    rows = {}
    for word, reading in sorted(pron.items()):
        variants = reference['entries'].get(word, [])
        comparison = compare_us(reading, variants) if variants else 'not_found'
        manual = review['words'].get(word, {})
        reasons = []
        if manual.get('unconfirmed'):
            reasons.append(manual['reason'])
        elif word in HETERONYMS and not manual.get('contextReviewed'):
            reasons.append('품사·뜻에 따른 발음이 달라 문맥별 확인 필요')
        if not manual.get('verified') and comparison != 'phonemes_and_vowel_stress_match':
            reasons.append('한글 독음 수동 대조 필요' if comparison == 'not_ipa' else '미국식 사전 대조 확인 필요: ' + comparison)
        status = ('needs_review' if manual.get('unconfirmed') else
                  'confirmed_error' if manual.get('before') is not None and manual.get('correctionType') != 'approximation_refinement' else
                  'needs_review' if reasons else
                  'supported_approximation' if manual.get('reviewScope') in ['broad_segment_approximation', 'British_broad_segment_approximation', 'letter_names_only'] else
                  'dictionary_match')
        rows[word] = {'status': status, 'before': manual.get('before', reading), 'after': reading,
                      'usComparison': comparison, 'ukComparison': uk['outcomes'][word],
                      'reasons': reasons, 'sources': manual.get('sources', []),
                      'ukReviewed': bool(manual.get('ukReviewed')),
                      'hangulReviewed': bool(manual.get('hangulReviewed')),
                      'contextReviewed': bool(manual.get('contextReviewed')),
                      'reviewer': manual.get('reviewer', 'automated comparison'),
                      'reviewScope': manual.get('reviewScope', 'US_dictionary_signature'),
                      'matchMethod': ('reviewed_learning_approximation' if manual.get('hangulReviewed') and not reading.startswith('/') else
                                      'reviewed_context_or_dictionary' if manual.get('verified') else 'CMU_phonemes_and_vowel_stress'),
                      'unresolvedContexts': manual.get('unresolvedContexts', []),
                      'pendingKind': manual.get('pendingKind') if reasons else None,
                      'remainingReason': manual.get('remainingReason') if reasons else None,
                      'priorFixGroups': prior.get(word, []),
                      'correctionType': manual.get('correctionType', 'confirmed_error') if manual.get('before') is not None else None,
                      'correctionReason': manual.get('reason') if manual.get('before') is not None else None,
                      'contextOnlyCorrection': bool(manual.get('contextOnly')),
                      'legacyOnlyCorrection': bool(manual.get('legacyOnly'))}
    return {'date': review.get('date', '2026-11-09'), 'baselineCommit': '1181fa802da8acc9c3eb886e4b7bcc1077ca0b76',
            'total': len(rows), 'counts': dict(collections.Counter(r['status'] for r in rows.values())),
            'limitations': ['dictionary_match means US phonemes and vowel stress match a CMU entry, or the specifically cited manual review; it is not full contextual or UK certification.',
                            'All 3715 keys checked in both dictionary lookups. A reviewed Korean learning approximation is not an exact transcription or an independent UK stress check.',
                            'BEEP is an old research reference without reliable stress; UK differences are review candidates, never automatic errors.',
                            'AI-assisted review; no human phonetician sign-off. Unresolved spellings, proper names and ambiguous bare options are never guessed.'],
            'us': {'source': reference['source'], 'package': reference['package'], 'entriesFound': len(reference['entries'])},
            'uk': {k: v for k, v in uk.items() if k != 'outcomes'},
            'ukCounts': dict(collections.Counter(uk['outcomes'].values())),
            'pendingAfterCorrection': sum(bool(r['reasons']) for r in rows.values()),
            'reviewMethodCounts': dict(collections.Counter(r['matchMethod'] for r in rows.values())),
            'priorFixRecheck': {group:dict(collections.Counter(r['status'] for r in rows.values() if group in r['priorFixGroups']))
                               for group in ['prior_70_reading_fixes','prior_2124_stress_moves']},
            'words': rows}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--beep', type=Path)
    args = parser.parse_args()
    if args.beep:
        pron = json.loads((ROOT/'english-study/pronunciations.json').read_text())
        uk = beep_comparison(args.beep, pron)
        (ROOT/'english-study/uk-comparison.json').write_text(json.dumps(uk, ensure_ascii=False, indent=2)+'\n')
    report = build_report()
    (ROOT/'english-study/pronunciation-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    with (ROOT/'english-study/pronunciation-audit.tsv').open('w', newline='') as stream:
        writer=csv.writer(stream, delimiter='\t', lineterminator='\n')
        writer.writerow(['word','status','before','after','US comparison','UK comparison','review scope','remaining review','correction reason','sources'])
        for word,row in report['words'].items():
            writer.writerow([value or '-' for value in [word,row['status'],row['before'],row['after'],row['usComparison'],row['ukComparison'],row['reviewScope'],'; '.join(row['reasons']),row['correctionReason'], '; '.join(row['sources'])]])
    pending={word:row for word,row in report['words'].items() if row['reasons']}
    (ROOT/'english-study/pronunciation-pending.json').write_text(json.dumps({'date':report['date'],'total':len(pending),'words':pending},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k: v for k, v in report.items() if k in ['total', 'counts', 'us', 'ukCounts']}, ensure_ascii=False))

if __name__ == '__main__':
    main()
