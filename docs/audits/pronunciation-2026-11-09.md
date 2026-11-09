# 영어 발음 전수 대조 — 2026-11-09

**전수 대조·분류는 수행했으나, 전체 발음 정확성 검수 완료는 아닙니다.**

기준 커밋: `1181fa802da8acc9c3eb886e4b7bcc1077ca0b76`. 전체 3,715개 단어, 영어 1,225문항, 원문 단어 45,885회.

| 구분 | 단어 수 | 해석 |
|---|---:|---|
| 사전 일치 | 2,265 | CMU 미국식 음소·모음 강세 일치 또는 명시된 개별 사전 대조. 영국식·문맥 전체 검수 완료를 뜻하지 않음 |
| 확인된 오류 | 18 | 13개 기본 독음 수정 + 5개 동형이의어의 문맥별 표시 보완 |
| 확인 필요 | 1,432 | 한글 근사 독음, 사전 미등재, 미확인 철자·고유명, 문맥 판정 등 |

수정 후 추가 확인이 필요한 단어는 **1,433개**입니다. 위의 확인 필요 1,432개에, 오류로 분류된 `separate`의 일부 단독 보기(품사 불명)를 포함합니다. 단독 보기는 품사별 사전 발음을 함께 표시하며 추측해 선택하지 않습니다.

원본 발음 필드 변경은 **21개**(확인된 독음 오류 13개 + 근거 없는 독음 철회 8개)입니다. 별도로 5개 단어의 품사별 표시와 94개 지문·보기 구간의 발음 97건을 보완했습니다. 미확정 철자는 기존 2개를 포함해 10개입니다. `buoy`·`stowage`에는 확인한 미국식·영국식 차이를 표시합니다.

## 사전과 판정 기준

- [CMUdict](https://github.com/cmusphinx/cmudict), Python `cmudict==1.1.3`: 3,434개 등재, 281개 미등재. 비교에 사용한 해당 단어의 모든 발음 변형을 `cmudict-reference.json`에 라이선스와 함께 보존했습니다. IPA를 음소 및 모음별 강세로 변환해 비교합니다. 음절 경계·강세 기호가 음절 첫 자음 앞에 있는지까지 자동 보증하지 않습니다.
- [BEEP 1.0](https://openslr.org/14/), 1997년 영국식 연구용 사전: 3,511개 등재, 204개 미등재. IPA 926개는 넓은 음소 표기가 일치, 1,354개는 미국식·영국식 또는 전사 차이로 추가 검토, 1,231개는 한글 등으로 직접 비교 불가. 강세가 대부분 없는 오래된 자료이므로 차이를 오류로 처리하지 않았습니다. 연구용 대조 결과와 원본 SHA-256만 보존하고 BEEP 사전·발음 전사는 앱이나 저장소에 배포하지 않습니다. Tony Robinson 및 기여자들의 작업을 참고했습니다.
- Cambridge: [invalid](https://dictionary.cambridge.org/dictionary/english/invalid), [subject](https://dictionary.cambridge.org/us/pronunciation/english/subject), [nor](https://dictionary.cambridge.org/us/dictionary/english/nor), [use](https://dictionary.cambridge.org/pronunciation/english/use), [close](https://dictionary.cambridge.org/pronunciation/english/close), [present](https://dictionary.cambridge.org/dictionary/english/present), [conduct](https://dictionary.cambridge.org/dictionary/english/conduct), [separate](https://dictionary.cambridge.org/dictionary/english/separate), [buoy](https://dictionary.cambridge.org/dictionary/english/buoy), [buoyancy](https://dictionary.cambridge.org/dictionary/english/buoyancy), [davit](https://dictionary.cambridge.org/pronunciation/english/davit).
- PONS: [stowage](https://en.pons.com/translate/english-french/stowage). `stbd`는 Cambridge 발행 항해 용어집의 starboard 축약형과 실제 항해일지 문맥 대조. 각 수정의 출처는 `pronunciation-review.json`에 기록했습니다.

## 기존 수정의 재검증

| 이전 수정군 | 대조 대상 | 사전 일치 | 추가 오류 확인 | 확인 필요 |
|---|---:|---:|---:|---:|
| 독음 오류 70개 | 70 | 0 | 1 | 69 |
| IPA 강세 이동 2,124개 | 2,124 | 2,082 | 4 | 38 |

이전 독음 69개가 전부 틀렸다는 뜻이 아닙니다. 대부분 한글 또는 약어여서 CMU IPA와 동일하다는 자동 판정을 할 수 없으므로 검증 완료로 세지 않았습니다. 초기 강세 이동군의 일치도 역시 **미국식 음소·모음 강세 대조**이며 강세 기호 위치 전체의 독립적인 수동 검수가 아닙니다.

## 주요 수정

- `invalid`: 현재 BWMS 문항은 '무효인' 형용사. 병약자를 뜻하는 명사의 첫 음절 강세를 형용사 발음으로 수정.
- `subject`: 현재 문항들의 명사·형용사에 동사 발음이 표시되던 오류 수정.
- `nor`: Neither ... nor 접속사를 NOR 약어처럼 읽던 오류 수정.
- `bags`, `slings`, `tonnes`, `passengers`, `orders`, `timbers`, `shackles`: 잘못된 말음·복수형 독음을 사전 IPA로 교체.
- `davits`: 데이비츠 독음을 확인된 davit 및 규칙 복수형에 근거해 수정. `buoyancy`: 이중모음 독음 수정. `stbd`: 실제 항해일지의 starboard 축약 읽기로 수정.
- `use`, `close`, `present`, `conduct`, `separate`: 문항 ID뿐 아니라 지문·보기 원문이 정확히 같을 때만 검수한 발음 사용. 원문이 바뀌거나 품사가 불명확하면 품사별 대안을 표시.
- `barwater`, `boatsuain`, `brocheures`, `catched`, `decemeber`, `departer`, `miky`, `ramain`, `var'ly`, `womanned`: 발음 미확정. 원문은 고치지 않고 추정 발음을 철회/보류.
- 기존 해설의 단일 단어 독음도 동일 데이터로 표시. 문장 독음은 확인한 토큰만 보정하고, 전체는 미검수라고 명시. 문장 발음을 단어 발음으로 임의 합성하지 않음.

## 검증

- `python tools/test_pronunciation_dictionary.py`: 전체 키, 재현 가능한 보고서, 사전 음소·강세 오류 검출, 실제 원문과 문맥 검수값 일치 확인.
- `node tools/test_pronunciation_display.js`: 97개 문맥 발음, 바뀐 원문에 이전 판정 미적용, 미확정 철자에 발음 미생성, 미국식·영국식 대안, 기존 해설 독음 경로 확인.
- `node tools/test_english_word_study.js`: 1,225문항·45,885회 단어 검사 및 문제·정답·기존 해설 데이터 불변 확인.
- `python tools/audit_english_pronunciations.py`: 3,715개 필드 형식과 실제 표시용 사전의 동기화 확인.
- 학습기록 보존: record safety 11개, progress storage 6개, data identity 15개 테스트 통과.
- 전체 `bash tools/check_app.sh`는 기존 `test_mastery_sessions_v522.js:125`의 구술 복습 날짜 불일치(기대 2026-10-25, 실제 2026-10-24)로 중단. 원본 main의 index.html에서도 동일 실패 재현. 한국 시간대로 다시 실행해도 동일. 이 PR에서 관련 학습·일정 코드를 변경하지 않았음.
- 로컬 Chromium 다운로드는 차단되었으나, [독립 GitHub Actions 브라우저 검사](https://github.com/rktenffk99-web/maritime-drill/actions/runs/42559801433)는 **통과**. 새 프로필·외부 통신 차단으로 1,225문항·39,717행을 DOM에서 검사하고, invalid·use/bags·close·separate의 실제 문제 카드 4개와 데스크톱·모바일 화면을 확인. JS 오류 0개, 모바일 가로 넘침 없음. NOR 원문은 밑줄 위치가 누락돼 기존 출제 차단을 유지하면서 단어 표의 수정 발음만 별도 검증. 문제·정답·기존 해설·단어 표 렌더링 중 저장기록 불변 및 문제 화면 전환 중 기존 기록 표식 보존 확인. [실행 결과 JSON](pronunciation-browser-result.json), [데스크톱](pronunciation-desktop.png), [모바일](pronunciation-mobile.png).

## 파일과 재현

- [전체 TSV](../../english-study/pronunciation-audit.tsv): 단어별 분류, 변경 전후, 미국식·영국식 대조 결과, 미해결 사유.
- [전체 JSON](../../english-study/pronunciation-audit.json): 출처·이전 수정군·검수 범위를 포함한 상세 결과.
- `python tools/review_pronunciation_dictionary.py`: 저장된 비교 근거로 보고서 재현(외부 API·추정 발음 생성 없음).
- 영국식 연구 비교를 다시 하려면 공식 BEEP 사본을 별도로 받아 `--beep /path/to/beep-1.0` 지정. BEEP을 저장소에 추가하지 말 것.

완료되지 않은 범위: 모든 한글 독음의 개별 수동 대조, 모든 영국식 발음·강세의 최신 사전 재대조, 나머지 동형이의어와 해사 약어의 문맥별 발음, 문장 전체 독음. 이 범위를 해결하기 전에는 '3,715개 정확성 검수 완료'로 표시할 수 없습니다.
