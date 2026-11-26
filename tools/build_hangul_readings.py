"""Hangul learning readings for words whose maintained pronunciation is IPA only.

Draft readings are converted from the first CMUdict variant with Korean loanword
conventions (short-vowel final p/t/k as batchim, epenthetic 으, L doubling,
spelling-aligned reduced vowels); english-study/hangul-overrides.json holds
hand-checked readings (place names, NATO letters, words not in CMUdict, and
conventional spellings). Output: english-study/hangul-readings.json.
Run: python tools/build_hangul_readings.py [--check]
"""
import re
CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';JUNG='ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';JONG=['']+list('ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ')
def syl(c,v,j=''):return chr(0xAC00+(CHO.index(c)*21+JUNG.index(v))*28+JONG.index(j))
VOW={'AA':['ㅏ'],'AE':['ㅐ'],'AH':['ㅓ'],'AO':['ㅗ'],'AW':['ㅏ','ㅜ'],'AY':['ㅏ','ㅣ'],'EH':['ㅔ'],'ER':['ㅓ'],'EY':['ㅔ','ㅣ'],'IH':['ㅣ'],'IY':['ㅣ'],'OW':['ㅗ'],'OY':['ㅗ','ㅣ'],'UH':['ㅜ'],'UW':['ㅜ']}
ONS={'B':'ㅂ','CH':'ㅊ','D':'ㄷ','DH':'ㄷ','F':'ㅍ','G':'ㄱ','HH':'ㅎ','JH':'ㅈ','K':'ㅋ','L':'ㄹ','M':'ㅁ','N':'ㄴ','P':'ㅍ','R':'ㄹ','S':'ㅅ','SH':'ㅅ','T':'ㅌ','TH':'ㅅ','V':'ㅂ','Z':'ㅈ','ZH':'ㅈ','NG':'ㅇ'}
EPI={'B':['ㅂ','ㅡ'],'D':['ㄷ','ㅡ'],'G':['ㄱ','ㅡ'],'F':['ㅍ','ㅡ'],'V':['ㅂ','ㅡ'],'S':['ㅅ','ㅡ'],'Z':['ㅈ','ㅡ'],'TH':['ㅅ','ㅡ'],'DH':['ㄷ','ㅡ'],'CH':['ㅊ','ㅣ'],'JH':['ㅈ','ㅣ'],'SH':['ㅅ','ㅣ'],'ZH':['ㅈ','ㅣ'],'HH':['ㅎ','ㅡ'],'K':['ㅋ','ㅡ'],'P':['ㅍ','ㅡ'],'T':['ㅌ','ㅡ'],'R':['ㄹ','ㅡ'],'L':['ㄹ','ㅡ'],'M':['ㅁ','ㅡ'],'N':['ㄴ','ㅡ'],'NG':['ㅇ','ㅡ']}
Y={'ㅏ':'ㅑ','ㅐ':'ㅒ','ㅓ':'ㅕ','ㅔ':'ㅖ','ㅗ':'ㅛ','ㅜ':'ㅠ','ㅣ':'ㅣ','ㅡ':'ㅠ'}
W={'ㅏ':'ㅘ','ㅐ':'ㅙ','ㅓ':'ㅝ','ㅔ':'ㅞ','ㅗ':'ㅝ','ㅜ':'ㅜ','ㅣ':'ㅟ','ㅡ':'ㅜ'}
SHORT={'AE','EH','IH','AH','UH','AA'}
def conv(phones,word=''):
    stress=[re.sub(r'[^\d]','',p) for p in phones];ph=[re.sub(r'\d','',p) for p in phones]
    w=word.lower();n=len(ph);out=[]
    isv=lambda p:p in VOW
    VG=re.findall(r'[aeiouy]+',re.sub(r"'s$","",w))
    vi=[k for k,p in enumerate(ph) if p in VOW]
    if len(VG)==len(vi)+1 and re.search(r'[^aeiouy]e$',w):VG=VG[:-1]
    if len(VG)==len(vi)+1 and re.search(r'[^aeiouy]es$|[^aeiouy]ed$',w):VG=VG[:-1]
    if len(VG)!=len(vi):VG=[]
    vidx={k:j for j,k in enumerate(vi)}
    def vowel(i):
        p=ph[i];vs=list(VOW[p])
        g0=VG[vidx[i]] if VG and vidx.get(i) is not None else ''
        if p in('AA','AO') and g0.startswith('au'):vs=['ㅗ']
        if p=='AA' and (g0.startswith('o') or (not VG and 'o' in w and 'a' not in w)):vs=['ㅗ']
        if p in('AH','IH') and stress[i]=='0' and VG and vidx.get(i) is not None and vidx[i]<len(VG):
            g=VG[vidx[i]];prevp=ph[i-1] if i>0 else ''
            if prevp not in('SH','ZH') and not g.startswith('io'):
                if g[0] in 'iy':vs=['ㅣ']
                elif g[0]=='o' and prevp in('K',) and i+1<n and ph[i+1] in('N','M'):vs=['ㅓ']
                elif g[0]=='o' and not g.startswith('ou') and not (vidx[i]==len(VG)-1 and i+1<n and ph[i+1] in('N','M')):vs=['ㅗ']
                elif g[0]=='e' and vidx[i]==0:vs=['ㅣ']
                elif p=='IH':vs=['ㅣ']
        if p=='AH' and stress[i]=='0':
            if i==0 and w.startswith('o'):vs=['ㅗ']
            if i+1<n and ph[i+1]=='L' and (i+2==n or not isv(ph[i+2])) and i>0 and ph[i-1] in('B','P','K','G','T','D','F'):vs=['ㅡ']
        if p=='OW' and i==n-1:vs=['ㅗ','ㅜ']
        if p=='AH' and stress[i]=='0' and i>0 and ph[i-1] in('Z','S') and i==n-2 and ph[i+1]=='N':vs=['ㅡ']
        if p=='UW' and i>0 and ph[i-1] in('D','T','N') and (g0.startswith('u') or re.search(r'[dtn]ew',w)):vs=['ㅠ']
        if p in('EH','IH','IY','UH','AY','AW','EY') and i+1<n and ph[i+1]=='R' and (i+2==n or not isv(ph[i+2])):vs=vs+['ㅓ']
        return vs
    def push(c,vs):
        out.append([c,vs[0],''])
        for v in vs[1:]:out.append(['ㅇ',v,''])
    def lastopen():return out and out[-1][2]==''
    i=0
    while i<n:
        p=ph[i];nxt=ph[i+1] if i+1<n else None
        if isv(p):
            push('ㅇ',vowel(i))
            if p=='ER' and nxt and isv(nxt):out.append(['ㄹ','ㅓ','']);out.pop();ph[i]='ER';  # handled below
            i+=1;continue
        if p in('Y','W') and nxt and isv(nxt):
            vs=vowel(i+1);g=Y if p=='Y' else W
            if p=='W' and ph[i+1]=='AA':vs=['ㅓ']+vs[1:]
            if p=='Y' and ph[i+1]=='AH' and 'u' in w:vs=['ㅜ']+vs[1:]
            push('ㅇ',[g.get(vs[0],vs[0])]+vs[1:]);i+=2;continue
        if p in('Y','W'):push('ㅇ',['ㅣ' if p=='Y' else 'ㅜ']);i+=1;continue
        c=ONS[p]
        if nxt and isv(nxt):
            vs=vowel(i+1)
            if p in('SH','ZH'):vs=[Y.get(vs[0],vs[0])]+vs[1:]
            if p=='L' and i>0 and lastopen():out[-1][2]='ㄹ'
            if p=='NG':
                if lastopen():out[-1][2]='ㅇ'
                c='ㅇ'
            push(c,vs);i+=2;continue
        if nxt=='Y' and i+2<n and isv(ph[i+2]):
            vs=vowel(i+2)
            if ph[i+2]=='AH' and 'u' in w:vs=['ㅜ']+vs[1:]
            elif ph[i+2]=='AH':
                if p=='L' and i>0 and lastopen():out[-1][2]='ㄹ'
                push(c,['ㅣ','ㅓ']);i+=3;continue
            if p=='L' and i>0 and lastopen():out[-1][2]='ㄹ'
            push(c,[Y.get(vs[0],vs[0])]+vs[1:]);i+=3;continue
        if nxt=='W' and p in('K','G','HH') and i+2<n and isv(ph[i+2]):
            vs=vowel(i+2)
            if ph[i+2]=='AA':vs=['ㅓ']+vs[1:]
            push(c,[W.get(vs[0],vs[0])]+vs[1:]);i+=3;continue
        prev=ph[i-1] if i>0 else None
        if p=='M' and out and out[-1][2]=='ㄹ' and nxt is None:out.append(['ㄹ','ㅡ','ㅁ']);i+=1;continue
        if p in('M','N','NG'):
            if i>0 and lastopen():out[-1][2]={'M':'ㅁ','N':'ㄴ','NG':'ㅇ'}[p]
            else:push(*EPI[p][:1],) if False else out.append([EPI[p][0],EPI[p][1],''])
            i+=1;continue
        if p=='L':
            if i>0 and lastopen():out[-1][2]='ㄹ'
            else:out.append(['ㄹ','ㅡ','ㄹ'] if False else ['ㄹ','ㅡ',''])
            i+=1;continue
        if p=='R':
            if prev and isv(prev):i+=1;continue
            out.append(['ㄹ','ㅡ','']);i+=1;continue
        if p=='T' and prev=='AW' and (nxt is None or not isv(nxt)) and nxt not in('S','R','L','Y','W') and lastopen():out[-1][2]='ㅅ';i+=1;continue
        if p in('P','T','K') and prev in SHORT and lastopen() and (nxt is None or (nxt not in('L','R','Y') and (nxt!='W' or p!='K') and not isv(nxt))) and not (p=='T' and nxt=='S' and not (i+2<n and isv(ph[i+2]))):
            out[-1][2]={'P':'ㅂ','T':'ㅅ','K':'ㄱ'}[p];i+=1;continue
        if p=='T' and nxt=='S' and not (i+2<n and isv(ph[i+2])):out.append(['ㅊ','ㅡ','']);i+=2;continue
        if p=='D' and nxt=='Z':out.append(['ㅈ','ㅡ','']);i+=2;continue
        out.append([EPI[p][0],EPI[p][1],''])
        # epenthetic syllable followed by L onset gets ㄹ batchim (블랙)
        i+=1
    # second pass: ER + vowel -> 어 + ㄹ onset
    s=''
    for k,x in enumerate(out):
        s+=syl(*x)
    return s
def conv_er(phones,word=''):
    # insert explicit R between ER and following vowel so the onset logic sees it
    ph=[];
    for k,p in enumerate(phones):
        ph.append(p)
        if p.startswith('ER') and k+1<len(phones) and re.sub(r'\d','',phones[k+1]) in VOW:ph.append('R')
    # mark epenthetic before L: handled by L rule using lastopen (epenthetic syllables are open)
    return conv(ph,word)


def build():
    import json,sys
    from pathlib import Path
    root=Path(__file__).resolve().parents[1]
    cmu=json.loads((root/'english-study/cmudict-reference.json').read_text())['entries']
    phon=json.loads((root/'english-study/pronunciations.json').read_text())
    ov=json.loads((root/'english-study/hangul-overrides.json').read_text())
    out={}
    for w in sorted(phon):
        if not phon[w].startswith('/'):continue
        if w in ov:out[w]=ov[w]
        elif w in cmu:out[w]=conv_er(cmu[w][0],w)
    text=json.dumps(out,ensure_ascii=False,indent=1)
    target=root/'english-study/hangul-readings.json'
    if '--check' in sys.argv:
        if json.loads(target.read_text())!=out:raise SystemExit('hangul-readings.json is stale')
        print('hangul readings up to date:',len(out));return
    target.write_text(text);print('hangul readings:',len(out))

if __name__=='__main__':build()
