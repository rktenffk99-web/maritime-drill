"""Build offline lexical supplements and audit every 2/3-grade merchant-navigation English paper.

The audit measures lexical lookup coverage, NOT human validation of every translation.
Original question-local definitions take priority; global definitions are labelled basic senses.
"""
from pathlib import Path
import re,json,gzip,base64,html,collections,argparse
ROOT=Path(__file__).resolve().parents[1]
TOKEN=re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)?")
def plain(s):
    return re.sub(r'<[^>]*>', ' ', html.unescape(str(s))).replace('’',"'")
def bundles():
    src=(ROOT/'index.html').read_text(encoding='utf-8-sig')
    for m in re.finditer(r'<script[^>]*id="(md-bundle-[^"]+)"[^>]*>(.*?)</script>',src,re.S):
        try: yield m[1],gzip.decompress(base64.b64decode(m[2])).decode()
        except (ValueError,OSError): continue

def extract():
    # Evaluate only compressed data modules, never application code or DOM behavior.
    import subprocess,tempfile
    data=[raw for sid,raw in bundles() if re.search(r'past-(?:explain-|20\d\d-navi[23]-)',sid)]
    runner="const vm=require('node:vm'),fs=require('node:fs');const c={window:{}};vm.createContext(c);for(const s of JSON.parse(fs.readFileSync(0,'utf8')))vm.runInContext(s,c);process.stdout.write(JSON.stringify(c.window));"
    return json.loads(subprocess.run(['node','-e',runner],input=json.dumps(data),text=True,capture_output=True,check=True).stdout)

def definitions(corpus):
    candidates=collections.defaultdict(list);pron={};local={}
    for key,value in corpus['MD_EXPLAIN'].items():
        if '|영어|' not in key:continue
        source=value.get('html','');local[key]={}
        for t in re.findall(r'<span[^>]*>(.*?)</span>',source,re.S):
            t=plain(t).strip()
            m=re.match(r'★?\s*([A-Za-z]+(?:[\x27-][A-Za-z]+)?)\s*\(([^)]*[가-힣][^)]*)\)',t)
            if m and re.search(r'[,，、]\s*[^\s]',m[2]):
                word=m[1].lower();definition=m[2]
                candidates[word].append(definition);local[key][word]=definition
        for m in re.finditer(r'([^<>]+)</span>\s*<span[^>]*>\[([^\]]+)\]',source):
            word=re.sub(r'^★\s*','',plain(m[1]).strip()).split('(')[0].strip().lower()
            if TOKEN.fullmatch(word):pron.setdefault(word,m[2])
    lex={w:collections.Counter(ds).most_common(1)[0][0] for w,ds in candidates.items()}
    provenance={w:'existing-explanations' for w in lex}
    for line in (ROOT/'english-study/lexicon-additions.tsv').read_text().splitlines():
        if not line.strip() or line.startswith('#'):continue
        keys,definition=line.split('=',1)
        for w in keys.split(','):
            w=w.strip();lex[w]=definition;provenance[w]='supplement'
    return lex,pron,local,provenance

IRREGULAR={'losses':'loss','entries':'entry','bodies':'body','duties':'duty','men':'man','went':'go','gone':'go','got':'get','gotten':'get','gave':'give','given':'give','brought':'bring','built':'build','caught':'catch','took':'take','taken':'take','thrown':'throw','drew':'draw','drawn':'draw','wrote':'write','written':'write','understood':'understand','spoke':'speak','spoken':'speak','made':'make','met':'meet','saw':'see','heard':'hear','left':'leave','held':'hold','found':'find','broke':'break','broken':'break','torn':'tear','rang':'ring','risen':'rise','rose':'rise','fell':'fall','fallen':'fall','paid':'pay','bought':'buy','swept':'sweep','laid':'lay','lit':'light','lent':'lend','stood':'stand','worn':'wear','died':'die','doing':'do','says':'say','goes':'go'}
def resolve(w,lex):
    if w in lex:return lex[w]
    if w in IRREGULAR and IRREGULAR[w] in lex:return f'{IRREGULAR[w]}의 불규칙 변화형; '+lex[IRREGULAR[w]]
    if w.endswith("'s") and w[:-2] in lex:return f'{w[:-2]}의 소유격: '+lex[w[:-2]]
    candidates=[]
    if w.endswith('ies'):candidates.append((w[:-3]+'y','복수형·3인칭 단수형'))
    if w.endswith('es'):candidates.append((w[:-2],'복수형·3인칭 단수형'))
    if w.endswith('s'):candidates.append((w[:-1],'복수형·3인칭 단수형'))
    if w.endswith('ied'):candidates.append((w[:-3]+'y','과거형·과거분사'))
    if w.endswith('ed'):
        candidates.extend([(w[:-1],'과거형·과거분사'),(w[:-2],'과거형·과거분사')])
        if len(w)>4 and w[-3]==w[-4]:candidates.append((w[:-3],'과거형·과거분사'))
    if w.endswith('ing'):
        candidates.extend([(w[:-3],'현재분사·동명사'),(w[:-3]+'e','현재분사·동명사')])
        if len(w)>5 and w[-4]==w[-5]:candidates.append((w[:-4],'현재분사·동명사'))
    for base,form in candidates:
        if base in lex:return f'{base}의 {form}; '+lex[base]
    return None

def main():
    corpus=extract();lex,oldpron,local,provenance=definitions(corpus)
    rows=[];words=collections.Counter()
    for exam,value in corpus['MD_PAST'].items():
        if not re.search(r'-navi[23]-',exam):continue
        for q in value['questions']:
            if q['과목']!='영어':continue
            key='|'.join([exam.split('-')[0],exam.split('-')[1],exam.split('-')[2],'영어',str(q['번호'])])
            sections=[q['문제']]+q['선택지'];tokens=[[w.lower() for w in TOKEN.findall(plain(s))] for s in sections]
            words.update(w for ts in tokens for w in ts)
            rows.append({'id':key,'tokens':tokens,'count':sum(map(len,tokens)),'missing':[w for ts in tokens for w in ts if not resolve(w,lex)]})
    missing=sorted({w for row in rows for w in row['missing']})
    if missing:raise SystemExit('Missing lexical entries: '+', '.join(missing))
    # Pronunciations are a maintained subset, generated from CMUdict and original explanations.
    phonetics=json.loads((ROOT/'english-study/pronunciations.json').read_text())
    data={w:[resolve(w,lex),phonetics.get(w) or oldpron.get(w,'발음 미확인')] for w in sorted(words)}
    # Keep local notes only for words actually appearing in that question; no cross-question
    # contextual meaning is silently presented as a locally verified interpretation.
    local={row['id']:{w:d for w,d in local.get(row['id'],{}).items() if w in {w for ts in row['tokens'] for w in ts}} for row in rows}
    local={k:v for k,v in local.items() if v}
    payload={'lexicon':data,'local':local}
    js='// Generated by tools/build_english_word_study.py. Basic senses, not a claim of full contextual review.\nwindow.MDEnglishWordStudyData='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n'
    (ROOT/'english-study-glossary.js').write_text(js)
    report={'questionCount':len(rows),'uniqueWords':len(words),'wordOccurrences':sum(words.values()),'missingWords':missing,'unconfirmedPronunciations':[w for w,v in data.items() if v[1]=='발음 미확인'],'unresolvedSourceSpellings':[],'manualContextReviewComplete':False,'definitionSource':'existing explanations + maintained lexical supplement','questions':rows}
    (ROOT/'english-study/coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    bygrade=collections.Counter(row['id'].split('|')[1] for row in rows)
    print(json.dumps({k:v for k,v in report.items() if k!='questions'},ensure_ascii=False));print(dict(bygrade))
if __name__=='__main__':main()
