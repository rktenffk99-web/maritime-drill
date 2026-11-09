"""Independent failure cases and full corpus/report consistency checks."""
import json
import unittest
from pathlib import Path
from review_pronunciation_dictionary import build_report, compare_us

ROOT = Path(__file__).resolve().parents[1]

class PronunciationReviewTests(unittest.TestCase):
    def test_dictionary_comparison_detects_wrong_sound_and_stress(self):
        reference = [['IH2', 'N', 'V', 'AE1', 'L', 'IH0', 'D']]
        self.assertEqual(compare_us('/ˌɪnˈvælɪd/', reference), 'phonemes_and_vowel_stress_match')
        self.assertEqual(compare_us('/ˈɪnvælɪd/', reference), 'stress_differs')
        self.assertEqual(compare_us('/ˈɪnvələd/', reference), 'phonemes_differ')
        self.assertEqual(compare_us('/ˈbæks/', [['B','AE1','G','Z']]), 'phonemes_differ')
        self.assertEqual(compare_us('/garbage+/', reference), 'unsupported_ipa')

    def test_complete_reproducible_report(self):
        report = build_report()
        saved = json.loads((ROOT/'english-study/pronunciation-audit.json').read_text())
        self.assertEqual(saved, report, 'Audit report is stale')
        pron = json.loads((ROOT/'english-study/pronunciations.json').read_text())
        self.assertEqual(len(pron), 3715)
        self.assertEqual(set(report['words']), set(pron))
        self.assertEqual(sum(report['counts'].values()), 3715)
        for group, count in [('prior_70_reading_fixes',70),('prior_2124_stress_moves',2124)]:
            self.assertEqual(sum(report['priorFixRecheck'][group].values()), count)
        for word in ['ramain','boatsuain','brocheures','decemeber','miky','barwater',"var'ly",'womanned','catched','departer']:
            self.assertEqual(report['words'][word]['status'], 'needs_review')
            self.assertEqual(pron[word], '발음 미확정')

    def test_curated_contexts_exist_in_actual_questions(self):
        from build_english_word_study import extract, plain, TOKEN
        review=json.loads((ROOT/'english-study/pronunciation-review.json').read_text())
        corpus=extract(); sections={}
        for exam, paper in corpus['MD_PAST'].items():
            for q in paper['questions']:
                if q['과목']!='영어':continue
                year,grade,session=exam.split('-')
                key='|'.join([year,grade,session,'영어',str(q['번호'])])
                sections[key]=[plain(s) for s in [q['문제']]+q['선택지']]
        count=0
        for key, rows in review['contexts'].items():
            for index,row in rows.items():
                self.assertEqual(row['text'], sections[key][int(index)])
                for word,reading in row['readings'].items():
                    self.assertIn(word,[t.lower() for t in TOKEN.findall(row['text'])])
                    count+=1
        self.assertGreater(count,90)

if __name__=='__main__':unittest.main()
