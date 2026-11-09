# 남은 발음 항목 후속 수정 — 2026-11-10

기준: PR #48의 `86302385ba066d4b6bec83be4aa226a0712fc361`. 미해결로 남았던 91개 모두를 다시 분류했다. 신뢰할 수 있는 사전·해사 자료 또는 문제 전체 문맥으로 42개를 추가 확인했고, 49개는 정확하다고 승인하지 않았다. 확인되지 않은 발음은 생성하지 않았다. AI 보조 검수이며 인적 감수 완료를 뜻하지 않는다.

## 현재 상태

| 분류 | 개수 |
|---|---:|
| 사전 대조 일치 또는 항목별 직접 근거 확인 | 2,374 |
| 학습용 한글 근사 독음·철자 읽기 검토 | 1,247 |
| 확인된 오류 수정(검수 단계 누적) | 45 |
| 확인 필요 | 49 |
| 전체 | 3,715 |

이번 추가 오류는 **6개**다. 기존 39개와 합산해 45개이며, 기존 최초 70개·2,124개 이력과 단순 합산한 숫자는 아니다. 정확한 IPA 대조와 한글 근사 표기·철자 읽기는 별개로 분류한다.

## 직접 확인해 수정한 오류

| 항목 | 문제 | 반영 |
|---|---|---|
| Fathometer | 강세가 있는 두 번째 모음을 약모음처럼 적음 | 미국식 /fæˈðɑmɪtɚ/, 영국식 /fəˈðɒmɪtə/ |
| cyclolysis | 끝부분을 라이시스처럼 표시 | 미국식 /saɪˈklɑləsɪs/ |
| Ballot’s | 법칙의 고유명에 일반명사 ballots의 /ˈbæləts/ 적용 | Buys Ballot’s 법칙: 미국식 /bəˈlɑts/, 영국식 /bəˈlɒts/ |
| valorem | ad valorem의 약모음·강세 위치가 불명확한 한글 표기 | /vəˈlɔrəm/ |
| var’ly | variably 계열 독음을 적용했던 항해일지 축약 | 논문에서 variously의 축약 확인, 미국식 /ˈvɛriəsli/ |
| KG | 복원성 문제의 대문자 KG에 킬로그램 혼합 | 케이 지, 용골 위 무게중심 높이. 질량 단위 kg와 구분 |

문제 원문·보기·정답은 수정하지 않았다. KG의 기본 뜻 보충만 실제 문맥을 반영했다. 사전에 이미 맞는 한글 근사 표기를 IPA로 바꾼 경우는 오류 수에 포함하지 않았다. 저장 발음 필드 변경은 총 42개다.

## 문맥과 표시 조건

문맥 지정은 **523곳 → 540곳**으로 늘었다. 단독 보기뿐 아니라 문제 지문·빈칸 구조를 함께 확인했다. 예를 들어 `as if read by them`의 `read`는 과거분사 /red/, `the (record) of the information`의 `record`는 명사, `does not (separate)`의 `separate`는 동사다. 의미가 맞지 않는 오답 보기라도 문장의 동사 자리라면 그 품사에 해당하는 사전 발음을 지정했다.

문맥별 지정은 지문과 보기의 정확한 텍스트가 **모두** 일치할 때만 적용된다. 같은 보기 문자열을 다른 지문에 재사용하면 기존 품사 판정이 적용되지 않고 사전 대안으로 돌아간다. 원문이 수정된 경우와 어미·품사가 확정되지 않는 경우를 추측하지 않는다.

`co-ordinator`를 토큰 분석기가 `co`, `ordinator`로 나누는 경우 `ordinator`를 독립 단어처럼 읽지 않도록 전체 단어 발음을 안내한다.

## 불확실한 독음 처리

- 출처로 확인하지 못한 약어 10개는 기존 단어식 추정 독음을 제거하고 **약어 철자 읽기**로 표시했다. 통용 단어식 발음은 미확정으로 남겼다.
- 발음 근거가 없는 선박·등대명 5개는 기존 한글 추정 독음을 숨기고 **발음 미확정**으로 표시했다. 한국 지명의 한글 표기와 영어 발음도 구분했다.
- 미확정 단어나 미검증 약어 독음이 섞인 기존 해설 문장의 한글 독음도 그대로 제시하지 않고, 단어별 표를 확인하도록 안내한다. 렌더링 결과만 바꾸며 기존 해설 자료는 보존한다.
- `boatsuain`, `Miky`, `womanned`처럼 철자·부적절 표현 문제에 나온 오답 보기는 교정어로 덮어쓰지 않았다. 표준형 참고를 별도로 표시하면서 원문과 정답을 보존했다.

확인 필요 49개:

`abo`, `ausrep`, `baar`, `barwater`, `boatsuain`, `brocheures`, `catched`, `coaltitude`, `coordinate`, `deballasting`, `decemeber`, `decrease`, `departer`, `deratting`, `eloran`, `epirb`, `firemain`, `gyrosphere`, `hanbando`, `hatchrails`, `heukryong`, `hongdo`, `increase`, `inerted`, `loadline`, `marpol`, `metarea`, `miky`, `misdelivery`, `mislanding`, `mukho`, `navarea`, `nvoc`, `nvocc`, `overstow`, `radiobeacons`, `ramain`, `renailed`, `resewn`, `restow`, `sart`, `seastar`, `shortlanded`, `shortshipped`, `solas`, `sternlight`, `watchkeeping`, `womanned`, `worthfulness`

일부는 오답 보기에 의도적으로 쓰인 비표준 철자다. 일부는 고유명·통용 약어·전문어의 신뢰할 음성 또는 강세 자료가 부족하다. `increase/decrease`의 반의어 쌍이나 `coordinate`의 애매한 대체어 보기에는 확인된 사전 대안을 유지한다. 이 목록을 임의 IPA 생성으로 없애지 않았다.

## 출처와 한계

- Cambridge, Collins, Dictionary.com: 발음이 표시된 해당 표제어·파생형을 확인. 개별 URL은 단어별 검수 자료에 기록.
- Boris Pritchard, *An Illustrated Maritime Dictionary, English–Croatian*, 2024-10판, University of Rijeka 공식 제공본: 해사 단어·약어의 명시적 발음과 페이지를 기록. 원본 전체를 재배포하지 않음.
- Huang & Shen (2011), *Logbook Language Characteristics and Recordation Requirement*, DOI 10.5539/elt.v4n2p107: 일지 축약의 풀어쓰기 근거. 발음은 별도 발음사전과 대조.
- 해상 무선의 SECURITE·SEELONCE는 일반 영어식 철자 읽기와 구별. Maritime NZ·TAIC·ITU 무선규칙의 원어·호출 안내와 프랑스어 사전을 함께 사용.
- 미국식·영국식 전사가 다른 경우 구분해서 표시. Coriolis처럼 사전별 발음이 다른 항목은 한 형태를 오류로 몰지 않고 출처별 대안을 제시.
- BEEP 조회 결과도 현재 저장 발음으로 다시 생성했다. BEEP는 강세가 불완전한 연구용 자료이며, 전체 영국식 검수 완료를 주장하지 않는다.

## 검증

- 사전 분류 재현·전체 문맥 원문 일치·미확정 철자 보호·단어장 누락 검사.
- 지문만 바뀌고 보기는 같은 경우에도 과거 문맥 지정이 남지 않는 회귀 검사.
- 1,225개 영어 문제와 45,885개 단어 출현을 검사. 문제·정답·해설 자료 및 저장소를 렌더링 중 변경하지 않는 브라우저 검사.
- 실제 문제 카드 검사를 기존 9개에서 15개로 확대: read, KG, Ballot’s, Fathometer, var’ly, 미확정 선박명 포함.
- 최종 자동·브라우저 실행 결과는 [PR #48](https://github.com/rktenffk99-web/maritime-drill/pull/48)의 현재 커밋 체크를 참조.

## 전체 자료

- [이번 91개 재검수와 변경 이력](../../english-study/final-review-20261110.json)
- [전체 3,715개 분류 JSON](../../english-study/pronunciation-audit.json)
- [단어별 TSV](../../english-study/pronunciation-audit.tsv)
- [미해결 49개와 사유](../../english-study/pronunciation-pending.json)
- [직전 검수 보고서](pronunciation-2026-11-10.md)

## 추가 보정 (2026-11-10)

- `restow`: 학습용 한글 근사 `리스토` → `리스토우`. Cambridge `stow`(미 /stoʊ/, 영 /stəʊ/)와 Wiktionary의 `re- + stow`를 근거로 어말을 보정했습니다.
- `coaltitude`: `코알티튜드` → `코앨티튜드`. 미국 NGA *Bowditch*의 항해 용어 정의와 Cambridge `altitude`의 /æ/ 모음에 근거해 보정했습니다.

**두 단어 모두 합성어 전체의 IPA와 강세는 확정되지 않았으므로 미해결 49개에 유지**했습니다. 문제·정답·원본 해설·학습기록은 변경하지 않았습니다. 사전 출처: https://dictionary.cambridge.org/pronunciation/english/stow ; https://en.wiktionary.org/wiki/restow ; https://dictionary.cambridge.org/pronunciation/english/altitude ; https://msi.nga.mil/api/publications/download?key=16693975%2FSFH00000%2FBowditch_Vol_2_LoRes_2019.pdf
