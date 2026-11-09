# 영어 발음 재검수 — 2026-11-10

기준 커밋: `227be83358dea0e7a0f45af55f6e6196c6923f03` (PR #47 병합 후). 기존 70개 독음 수정과 2,124개 강세 이동을 정답으로 간주하지 않고 다시 대조했다. 이번 검수는 AI 보조 검수이며 발음 전문가의 인적 감수 완료를 뜻하지 않는다.

## 현재 분류

| 분류 | 단어 수 | 의미 |
|---|---:|---|
| 사전 대조 일치 | 2,343 | CMU 음소·강세 서명 일치 또는 항목별 출처로 확인. 모든 영국식·문맥을 보증하지 않음 |
| 근사 독음 검토 | 1,245 | 한글 근사 독음의 주요 음소 또는 약어 철자 읽기 확인. 정확한 IPA·강세 검증과 구분 |
| 오류 확인·수정 | 38 | 이전 검수 18개 + 이번 추가 20개. 아래 두 단어는 일부 문맥 미해결 |
| 확인 필요 | 89 | 근거가 충분하지 않아 정확하다고 승인하지 않음 |
| 전체 | 3,715 | 전체 키를 미국식·영국식 대조 대상으로 처리 |

수정 후에도 추가 확인할 단어는 **91개**다. `needs_review` 89개와 오류 수정 후 일부 단독 보기 문맥이 남은 `record`, `separate` 2개를 합산한 값이다. 이전 1,433개 중 1,342개에 검토 범위를 명시했다. 1,245개 근사 독음 검토를 정확한 IPA 일치로 합산해서는 안 된다.

## 이번 수정

확인된 오류 20개: 단어 발음 필드 19개와 `record` 문맥 표시 1개. 이와 별도로 자음군·복수형 한글 근사 표기 11개를 정밀화했다. 총 30개 단어의 저장 발음 필드가 변경됐다.

| 단어 | 이전 | 수정 | 구분 |
|---|---|---|---|
| `builds` | 빌즈 | 빌드즈 | 근사 표기 보완 |
| `holds` | 홀즈 | 홀드즈 | 근사 표기 보완 |
| `berthed` | 버쓰드 | 버쓰트 | 오류 수정 |
| `things` | 띵스 | 띵즈 | 근사 표기 보완 |
| `records` | /ɹəˈkɔɹdz/ | /ˈɹɛkɚdz/ | 오류 수정 |
| `preventers` | 프리벤터스 | 프리벤터즈 | 오류 수정 |
| `accelerations` | /ˌækˌsɛlɚˈeɪʃənz/ | /ɛkˌsɛləˈɹeɪʃənz/ | 오류 수정 |
| `cont` | 씨 오 엔 티 | 컨티뉴드 | 오류 수정 |
| `transport` | /tɹænˈspɔɹt/ | /ˈtɹænspɔɹt/ | 오류 수정 |
| `helmsman` | 헬름스맨 | 헬름즈맨 | 근사 표기 보완 |
| `perfect` | /pɚˈfɛkt/ | /ˈpɝfɛkt/ | 오류 수정 |
| `degrees` | 디그리스 | 디그리즈 | 근사 표기 보완 |
| `charterer's` | 차터러스 | 차터러즈 | 오류 수정 |
| `usage` | 유세지 | 유시지 | 오류 수정 |
| `meridians` | /mɚˈɪdiənz/ | /məˈɹɪdiənz/ | 오류 수정 |
| `abstract` | /æbˈstɹækt/ | /ˈæbstɹækt/ | 오류 수정 |
| `yielded` | 이일드드 | 이일디드 | 오류 수정 |
| `khz` | 케이 에이치 지 | 킬로허츠 | 오류 수정 |
| `peroxides` | /pɚˈɑkˌsaɪdz/ | /pəˈɹɑksaɪdz/ | 오류 수정 |
| `exempted` | 이그젬티드 | 이그젬프티드 | 근사 표기 보완 |
| `customs` | 커스텀스 | 커스텀즈 | 근사 표기 보완 |
| `cars` | 카스 | 카즈 | 근사 표기 보완 |
| `growler` | 그롤러 | 그라울러 | 오류 수정 |
| `piracy` | 파이어러시 | 파이러시 | 오류 수정 |
| `shall` | 쉘 | 섈 | 오류 수정 |
| `roadsteads` | 로드스테즈 | 로드스테드즈 | 근사 표기 보완 |
| `cartons` | 카튼스 | 카튼즈 | 근사 표기 보완 |
| `st` | /ˈstɹit/ | 세인트 | 오류 수정 |
| `th` | /ˈtiˈeɪtʃ/ | 서수 접미부(숫자와 함께 읽음) | 오류 수정 |
| `dolphins` | 돌핀스 | 돌핀즈 | 근사 표기 보완 |

`record`는 저장된 단독 근사 독음을 임의 교체하지 않고, “Take and record” 등 동사 문맥에 동사 발음을 지정했다. 전체 문맥별 발음 지정은 97개에서 523개로 늘었다. 이번에 남아 있던 동형이의어 40개의 지문·보기 451곳을 확인하고, 분명한 문맥만 지정했다. 애매한 단독 보기 26곳은 사전 대안을 함께 보여준다.

기존 해설의 한글 독음 조각도 영어 원문의 해당 단어와 대응될 때만 교체한다. 예를 들어 `holds`와 `holes`가 함께 있어 옛 독음 “홀즈”의 소속을 정할 수 없으면 문장 전체를 추측해 바꾸지 않는다. 단어별 표는 검수된 값을 표시한다.

## 사전 대조와 예외

- 미국식: 고정 버전 `cmudict==1.1.3`; 전체 3,715개 조회, 3,434개 직접 등재. 일부 명시적 기본형·규칙 활용형 대조는 별도 근거를 남겼다.
- 영국식: BEEP 1.0 전체 조회 결과와 입력 해시를 기록했다. 강세가 불완전한 오래된 자료이므로 영국식 강세 검수 완료의 근거로 쓰지 않았다. 사전 원문·전사 전체를 재배포하지 않는다.
- Cambridge, Oxford, Collins, Dictionary.com의 해당 항목으로 차이·해사 용어를 추가 확인했다. 개별 출처와 검토 범위는 JSON/TSV에 기록했다.
- CMU와 다르더라도 `cyclone`, `interpolation`, `instantaneous`, `lien`은 현행 사전 근거에 따라 기존 유효 발음을 유지했다. `fragile`, `longitude`, `drawing`, `urinals` 등은 유효한 지역 차이를 구분했다.
- 약어 73개는 “약어 철자 읽기”로 명시했다. 철자 읽기를 통용 단어식 독음이나 해사 현장의 표준 발음으로 인증하지 않았다. `St. Nicholas`, `cont`, `kHz`는 실제 문맥에 맞춰 구분했다.

## 미해결 목록

| 유형 | 단어 수 |
|---|---:|
| proper_name_or_trade_name | 13 |
| conventional_spoken_abbreviation | 16 |
| additional_phonetic_source_required | 29 |
| unconfirmed_source_spelling | 10 |
| technical_or_clipped_form | 12 |
| ambiguous_question_sense | 11 |

미해결 91개:

`abo`, `arpa`, `ausrep`, `baar`, `ballot's`, `bareboat`, `barwater`, `boatsuain`, `brocheures`, `busan`, `catched`, `cesser`, `coaltitude`, `codeclination`, `colregs`, `coordinate`, `coriolis`, `cyclolysis`, `deballasting`, `decca`, `decemeber`, `decrease`, `defect`, `departer`, `deratting`, `dewpoint`, `eloran`, `epirb`, `fairlead`, `fathometer`, `firemain`, `floeberg`, `gyrosphere`, `hanbando`, `hatchrails`, `heukryong`, `hongdo`, `increase`, `inerted`, `interco`, `kg`, `kim`, `laydays`, `laytime`, `loadable`, `loadline`, `loxodromic`, `marpol`, `metarea`, `miky`, `misdelivery`, `mislanding`, `moderate`, `mukho`, `navarea`, `navtex`, `nvoc`, `nvocc`, `ordinator`, `overstow`, `polish`, `quadrantal`, `radiobeacons`, `ramain`, `raoult's`, `read`, `record`, `refuse`, `renailed`, `resewn`, `restow`, `sart`, `seastar`, `securite`, `seelonce`, `separate`, `servomechanisms`, `shortlanded`, `shortshipped`, `solas`, `stb'd`, `sternlight`, `sternway`, `sublate`, `transfer`, `valorem`, `var'ly`, `watchkeeping`, `weathertight`, `womanned`, `worthfulness`

오탈자 의심 원문, 고유명사, 통용 약어, 추가 음성 근거가 필요한 전문어는 임의 IPA를 생성하지 않았다. 원문 확인이 필요한 철자 10개도 그대로 보존했다. 각 단어의 남은 사유와 애매한 문제 위치는 [미해결 상세](../../english-study/pronunciation-pending.json)에 있다.

## 재현·검증

- `python tools/review_pronunciation_dictionary.py`: 전체 분류, TSV, 미해결 목록 재생성. BEEP 원본을 별도로 확보한 경우 `--beep PATH`로 조회 결과도 재현할 수 있다.
- `python tools/build_english_word_study.py`, `python tools/audit_english_pronunciations.py`: 3,715개, IPA 2,317개, 한글 1,386개, 원문 철자 미확정 10개. 누락·단어장 불일치 0개.
- `python tools/test_pronunciation_dictionary.py`: 4개 테스트 통과.
- `node tools/test_pronunciation_display.js`: 523개 문맥별 발음, 원문 변경 시 대안 복귀, 철자 미확정, 지역 차이, 기존 독음 조각 대응 검사 통과.
- `node tools/test_english_word_study.js`: 영어 문제 1,225개, 단어 출현 45,885건, 누락 0개.
- GitHub Actions에서 전체 앱 자동 검사와 실제 Chromium 회귀 검사를 실행한다. 브라우저 검사는 전체 1,225문제의 39,717개 표 행, 실제 문제 화면 9개, 모바일 가로 넘침, 원문·정답·해설 및 렌더링 중 저장소 불변을 검사한다. 최종 실행 결과는 PR의 체크를 참조한다.
- 질문·정답·해설 원본, 학습기록 스키마 및 동기화 코드는 변경하지 않았다. 기존 작업 디렉터리의 사용자 변경을 건드리지 않고 분리된 작업 사본에서 수정했다.

## 검수 자료

- [전체 단어별 JSON](../../english-study/pronunciation-audit.json)
- [전체 단어별 TSV](../../english-study/pronunciation-audit.tsv)
- [미해결 91개](../../english-study/pronunciation-pending.json)
- [이번 검수 방법·문맥 결정·변경 내역](../../english-study/remaining-review-20261110.json)
- [이전 검수 보고서](pronunciation-2026-11-09.md)

모든 3,715개 발음의 정확성, 모든 지역 차이와 모든 애매한 문맥까지 검수가 끝났다는 보고가 아니다.
