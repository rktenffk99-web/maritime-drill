// Maritime Drill convenience mode
// Resume banner, answer-aware explanation collapse, problem reporting, wake lock.
(function(){
  'use strict';

  // NAVI2_RECENT_RECALL_20260928: 2급 항해사 최근 신출·복기 21문항
  (function applyNavi2RecentRecall20260928(){
    const data=window.MD_DATA&&window.MD_DATA.navi2;
    if(!data||!Array.isArray(data.QUESTIONS)) return;
    const additions=[{"id":91,"q":"백업 ECDIS의 요건을 5가지 이상 설명하시오.","hint1":"독립성·전원·센서·해도·항로","hint2":"메인 ECDIS 고장 시 즉시 안전하게 인계하고 남은 항해를 계속할 수 있어야 함","answer":"백업 ECDIS는 메인 ECDIS 고장 시 안전하게 기능을 인계하고 남은 항해를 계속할 수 있어야 한다. 주요 요건은 ① 메인 ECDIS와 독립된 장비로 구성할 것, ② 독립된 전원계통과 비상전원에서 운용 가능할 것, ③ 위치·선수방위·속력 등 필요한 센서 입력을 확보하고 공통고장 가능성을 최소화할 것, ④ 최신 공식 ENC와 업데이트 상태를 메인과 동일하게 유지할 것, ⑤ 출항 전 항해계획을 백업 ECDIS에도 준비할 것, ⑥ 해도표시·항로계획·항로감시·선위표시 등 안전항해에 필요한 기능을 수행할 것, ⑦ 형식승인된 적합한 ECDIS를 사용할 것이다.","category":"항해","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"기술기준 검토 답안"}},{"id":92,"q":"Doppler Log의 작동 원리를 설명하시오.","hint1":"도플러 효과·송신주파수와 반사주파수의 차이","hint2":"해저 또는 수중 입자에 초음파를 발사하고 반사파의 주파수 편이를 이용해 상대속도를 계산","answer":"Doppler Log는 선저의 송수파기에서 일정 주파수의 초음파를 비스듬히 발사하고 해저 또는 수중 입자에서 반사되어 돌아오는 신호의 주파수 변화를 측정한다. 선박과 반사체 사이에 상대운동이 있으면 도플러 효과로 송신주파수와 수신주파수 사이에 차이가 생기며, 이 주파수 편이는 선박 속도의 해당 방향 성분에 비례한다. 여러 빔의 값을 조합하여 종·횡방향 속력을 구한다. 해저 반사를 이용하는 Bottom track은 대지속력을, 수중 입자를 이용하는 Water track은 대수속력을 나타낸다.","category":"항해","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"기술기준 검토 답안"}},{"id":93,"q":"(1) 벡터(Vector)의 정의와 (2) 벡터의 구성요소를 설명하시오.","hint1":"크기와 방향을 함께 가지는 양","hint2":"크기(Magnitude)와 방향(Direction), 필요 시 직교성분으로 분해","answer":"벡터는 크기만으로 정해지는 스칼라와 달리 크기와 방향을 함께 가지는 양이다. 기본 구성요소는 ① 크기(Magnitude)와 ② 방향(Direction)이다. 항해 계산에서는 벡터를 북·남 방향 성분과 동·서 방향 성분 또는 x·y 직교성분으로 분해하여 합성·계산할 수 있다. 선속, 조류, 바람의 속도와 방향을 함께 나타낼 때 대표적으로 사용된다.","category":"항해","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"기초이론 검토 답안"}},{"id":94,"q":"IAMSAR에 따라 수색·구조 계획 시 고려하여야 할 사항을 5가지 이상 설명하시오.","hint1":"Datum·수색구역·표적·환경·수색세력","hint2":"조난위치와 표류오차, 기상·시정·풍향풍속·해류, 수색세력의 능력, Sweep width와 Track spacing","answer":"수색·구조 계획 시에는 ① 조난자의 마지막 확인위치와 Datum 및 그 오차, ② 바람·해류·조류·Leeway를 고려한 표류 예상, ③ 표적의 종류·크기·시인성·생존 가능성, ④ 기상·시정·파고·해상상태, ⑤ 투입 가능한 수색구조세력(SRU)의 수·속력·항속거리·탐지능력, ⑥ 수색구역의 크기와 우선순위, ⑦ Sweep width·Track spacing·Coverage factor, ⑧ 적절한 수색패턴과 수색속도 등을 종합적으로 고려한다.","category":"운용","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"IAMSAR 개념 검토 답안"}},{"id":95,"q":"기상도에 표시되는 W, GW, SW, TW의 의미를 설명하시오.","hint1":"Warning·Gale Warning·Storm Warning·Typhoon Warning","hint2":"W 28~33kt, GW 34~47kt, SW 48kt 이상, TW 태풍에 의한 64kt 이상","answer":"해상기상도의 경보 기호에서 W는 Warning으로 최대풍속 28노트 이상 34노트 미만, GW는 Gale Warning으로 34노트 이상 48노트 미만, SW는 Storm Warning으로 48노트 이상, TW는 Typhoon Warning으로 태풍에 의한 최대풍속 64노트 이상을 뜻한다. 기상기관과 도표 체계에 따라 표기 기준을 함께 확인해야 한다.","category":"항해","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"기상도 표기 검토 답안"}},{"id":96,"q":"쌍묘박의 방법을 설명하고 장점과 단점을 말하시오.","hint1":"두 닻을 서로 다른 방향에 투묘하여 파주력 분담·선회범위 제한","hint2":"제1묘 투하 후 이동하여 제2묘 투하, 묘쇄 길이를 조절하여 두 묘가 하중을 분담","answer":"쌍묘박은 두 개의 닻을 서로 다른 방향에 투하하여 두 묘가 파주력을 분담하도록 하는 묘박법이다. 일반적으로 제1묘를 투하한 뒤 선박을 이동시키면서 묘쇄를 신출하고 제2묘를 투하한 후 두 묘쇄 길이를 조절해 원하는 위치에 선박을 잡는다. 장점은 단묘박보다 파주력을 크게 할 수 있고 선회반경을 줄여 제한된 수역이나 강한 풍조류에서 유리하다는 점이다. 단점은 풍향·조류가 크게 변하면 두 묘쇄가 꼬이거나 얽힐 수 있고, 투·양묘 작업이 복잡하며 비상출항이 늦어질 수 있다는 점이다.","category":"운용","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"선박조종 이론 검토 답안"}},{"id":97,"q":"투묘 시 신출할 앵커 샤클(묘쇄) 길이를 결정할 때 고려하여야 할 사항을 설명하시오.","hint1":"수심·조석·저질·풍조류·선박 크기·선회여유","hint2":"수심만으로 고정하지 않고 기상과 저질, 주변 여유수역, 묘쇄·양묘기 한계를 함께 고려","answer":"묘쇄 신출 길이는 ① 수심과 조석에 따른 최대수심, ② 해저 저질과 닻의 파주력, ③ 예상 풍향·풍속·파랑·조류, ④ 선박의 크기·배수량·풍압면적, ⑤ 정박시간과 기상 변화 가능성, ⑥ 주변 선박·장애물과 선회여유수역, ⑦ 묘쇄와 양묘기의 허용하중 및 장비 상태를 고려하여 정한다. 수심 대비 일정 배수는 참고치일 뿐이며 실제 신출량은 현장조건과 회사 절차에 따라 조정한다.","category":"운용","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"선박조종 이론 검토 답안"}},{"id":98,"q":"SOLAS 규정상 Emergency Towing Procedure 또는 Emergency Towing Booklet에 포함되어야 하는 내용을 설명하시오.","hint1":"선수·선미 도면, 장비목록, 통신수단, 예인 준비·실시 절차","hint2":"Ship particulars, 강력점/SWL, 비상상황별 의사결정, 인원·작업분담, 통신계획","answer":"선박별 비상예인절차에는 최소한 ① 가능한 비상예인 배치를 표시한 선수·선미 갑판 도면, ② 비상예인에 사용할 수 있는 선내 장비의 목록과 위치, ③ 선교·갑판·예인선 사이의 통신수단과 방법, ④ 비상예인 준비와 실시를 위한 절차 예시가 포함되어야 한다. Emergency Towing Booklet에는 선명·호출부호·IMO 번호·닻과 체인·흘수·배수량 등 Ship particulars, 예인장비와 강력점의 위치 및 SWL, 비상상황별 의사결정표, 인원과 작업 분담, 정전·Dead ship 상황의 대책, 예인·구난선에 전달할 정보를 포함한 통신계획도 함께 정리한다.","category":"상선전문","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"SOLAS/IMO 지침 검토 답안"}},{"id":99,"q":"VDR(Voyage Data Recorder)에 기록되는 사항을 5가지 이상 설명하시오.","hint1":"시간·위치·속력·선수방위·선교음성","hint2":"VHF 음성, 레이더/ECDIS, 수심, 타명령, 기관명령, 주요 경보 등","answer":"VDR에는 사고조사에 필요한 선박의 상태와 명령·제어 정보가 연속적으로 기록된다. 대표적으로 ① 날짜와 시각, ② 선박 위치, ③ 속력, ④ 선수방위, ⑤ 선교 음성, ⑥ VHF 등 통신 음성, ⑦ 레이더 표시자료와 해당되는 경우 ECDIS/AIS 자료, ⑧ 수심, ⑨ 주요 경보, ⑩ 타 명령과 실제 타각, ⑪ 기관·프로펠러·스러스터 명령과 응답, ⑫ 선체 개구부·수밀문·방화문 관련 상태 등이 있다.","category":"항해","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"SOLAS VDR 항목 검토 답안"}},{"id":100,"q":"선박직원법상 선박직원에 결원이 생겼을 때 승무기준을 적용하지 아니할 수 있는 경우를 설명하시오.","hint1":"선박직원법상 결원이 생긴 경우의 승무기준 특례","hint2":"외국항 간 항행·국외에서 결원 후 본국항까지·항행 중 결원으로 보충 곤란","answer":"선박직원법상 외국의 각 항 간을 항행하는 선박에서 선박직원 결원이 생겼으나 보충하기 곤란한 경우, 본국항과 외국항 간을 항행하는 선박이 국외에서 결원이 생겨 본국항까지 항행하는 경우, 그 밖에 선박이 항행 중 결원이 생겼으나 보충하기 곤란한 경우에는 승무기준의 특례가 인정된다. 선박소유자는 결원을 지체 없이 보충하여야 하고 관련 통보 의무를 준수하여야 한다.","category":"법규","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"현행 법령 대조"}},{"id":101,"q":"선박직원법상 음주와 관련한 혈중알코올농도별 업무정지 및 면허취소 기준을 설명하시오.","hint1":"0.03% 이상 0.08% 미만 / 0.08% 이상 / 측정불응","hint2":"0.03~0.08 미만 1차 업무정지 6개월, 2차 또는 사상사고 면허취소, 0.08 이상·측정불응 면허취소","answer":"선박직원법상 혈중알코올농도 0.03% 이상 0.08% 미만은 1차 위반 시 업무정지 6개월이며, 재위반 또는 사람을 죽게 하거나 다치게 한 경우에는 면허취소이다. 혈중알코올농도 0.08% 이상은 면허취소이고, 음주측정 요구에 따르지 않은 경우도 면허취소이다. 해상교통안전 관련 법령의 음주조종 금지기준 자체와 선박직원법상 면허 행정처분 기준을 구분해서 답해야 한다.","category":"법규","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"현행 법령 대조"}},{"id":102,"q":"해양환경관리법상 선박오염물질기록부 3가지의 종류와 의미를 설명하시오.","hint1":"폐기물기록부·기름기록부·유해액체물질기록부","hint2":"각 기록부가 대상으로 하는 오염물질과 작업내용을 구분","answer":"선박오염물질 관련 기록부는 폐기물기록부, 기름기록부, 유해액체물질기록부로 구분한다. 폐기물기록부에는 선박에서 발생·처리되는 폐기물 관련 사항을, 기름기록부에는 기름의 적재·이송·처리·배출 등 관련 작업을, 유해액체물질기록부에는 산적 운송하는 유해액체물질의 적재·이송·세정·처리·배출 등 관련 작업을 기록한다. 세부 기재사항과 보존기간은 적용 법령과 선종·화물에 따라 확인한다.","category":"법규","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"현행 법령 체계 대조"}},{"id":103,"q":"PSC 검사를 받을 때 선박평형수(Ballast Water)와 관련하여 지적될 수 있는 사항을 설명하시오.","hint1":"증서·BWMP·기록부·선원숙련·BWMS 작동·D-1/D-2 준수","hint2":"문서와 실제 운용이 일치하지 않거나 승인된 관리방법을 따르지 않으면 결함이 될 수 있음","answer":"Ballast Water 관련 PSC 주요 확인사항은 ① 유효한 국제평형수관리증서의 비치와 적용기준, ② 승인된 BWMP의 비치 및 절차 준수, ③ Ballast Water Record Book의 정확한 기록과 실제 탱크·Sounding·작업기록의 일치, ④ 담당 선원의 평형수 관리절차와 BWMS 운용에 대한 숙지, ⑤ BWMS의 정상 작동·정비·알람 및 우회(Bypass) 여부, ⑥ 해당 선박에 적용되는 D-1 또는 D-2 기준 준수 여부, ⑦ 필요 시 채취되는 시료가 배출기준에 부합하는지 등이다.","category":"상선전문","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"BWM/PSC 실무 검토 답안"}},{"id":104,"q":"유해액체물질을 선적하기 전에 선장에게 전달되어야 하는 화물정보를 설명하시오.","hint1":"화물의 정확한 명칭·분류·위험성·수량·취급조건","hint2":"안전 적재·운송에 필요한 정보와 관련 서류를 선적 전에 충분히 제공","answer":"유해액체물질을 선적하기 전에는 선장 또는 그 대리인이 안전한 적재와 운송계획을 세울 수 있도록 화물정보가 사전에 제공되어야 한다. 핵심 내용은 화물의 정확한 선적명과 성질, 오염·위험 분류와 주요 위험성, 선적 수량, 예정 탱크와 적재·양하 조건, 온도·반응성·혼합금지 등 특별 취급사항, 비상 시 조치와 보호구·소화·응급정보 등이다. 최근 복기만 확보된 항목이므로 실제 출제 원문을 확보하면 문제 문구와 답안을 다시 대조한다.","category":"상선전문","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"복기 기반 정리·원문 추후 대조"}},{"id":105,"q":"선박 톤수의 측정 방법을 중량톤수와 용적톤수로 구분하고, 총톤수·순톤수·재화중량톤수 등의 정의를 설명하시오.","hint1":"중량을 나타내는 톤수와 선내 용적을 기준으로 한 톤수 구분","hint2":"Displacement·DWT / GT·NT","answer":"선박 톤수는 크게 중량을 나타내는 톤수와 선박의 용적을 기준으로 하는 톤수로 구분할 수 있다. 배수톤수(Displacement tonnage)는 선박이 밀어낸 물의 중량으로 선박의 실제 중량을 나타낸다. 재화중량톤수(DWT)는 만재배수량에서 경하배수량을 뺀 값으로 화물·연료·청수·식량·선원 등 적재 가능한 총중량이다. 총톤수(GT)는 선박의 전체 폐위공간 용적을 국제톤수측정협약의 산식으로 환산한 지표이며, 순톤수(NT)는 화물·여객 운송에 이용되는 유효공간 등을 기준으로 산정한 지표이다. GT와 NT는 무게의 ton과 직접 같은 단위가 아니다.","category":"상선전문","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"톤수개념 검토 답안"}},{"id":106,"q":"선체 종강도와 관련한 5개의 곡선 명칭을 말하고 각각 설명하시오.","hint1":"중량곡선·부력곡선·하중곡선·전단력곡선·굽힘모멘트곡선","hint2":"중량과 부력의 차이에서 하중, 적분하면 전단력, 다시 적분하면 굽힘모멘트","answer":"선체 종강도 계산에 사용하는 대표적인 5개 곡선은 ① 중량곡선(Weight curve): 선체 길이 방향의 단위길이당 중량분포, ② 부력곡선(Buoyancy curve): 단위길이당 부력분포, ③ 하중곡선(Load curve): 부력과 중량의 차이로 나타나는 순하중분포, ④ 전단력곡선(Shear force curve): 하중곡선을 적분하여 얻는 전단력분포, ⑤ 굽힘모멘트곡선(Bending moment curve): 전단력곡선을 다시 적분하여 얻는 굽힘모멘트분포이다. 이를 통해 Hogging·Sagging 상태와 종강도 부담을 판단한다.","category":"운용","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 면접 복기","answerStatus":"선체강도 이론 검토 답안"}},{"id":107,"q":"공동해손과 관련하여 '적하 5가지'를 설명하시오. (최근 복기 문구)","hint1":"최근 응시자 복기에서 질문 문구만 확인됨","hint2":"기존 공동해손 성립요건 문제와 별도 항목. 원문의 '적하 5가지'가 무엇을 지칭하는지는 미확인","answer":"최근 복기에는 '공동해손 적하 5가지'라는 문구만 남아 있어 무엇을 5가지 말하라는 질문인지 원문을 확정할 수 없다. 기존 공동해손 성립요건 문제와 별도의 출제추적 항목으로 등록하며, 추가 복기나 원문을 확보하면 문제 문구와 정답을 교체해야 한다.","category":"상선전문","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 복기 문구만 확보","answerStatus":"정답 미확정·추가 자료 필요"}},{"id":108,"q":"ISM Code의 목적과 관련한 영문 지문을 읽고 우리말로 해석하시오. (최근 신출 복기·원문 미확보)","hint1":"Safety at sea·prevent injury/loss of life·avoid environmental damage","hint2":"원문은 복기되지 않았으므로 ISM Code 목적의 핵심 의미를 중심으로 대비","answer":"복기에서 영문 원문은 확보되지 않았다. 해석의 핵심은 ISM Code의 목적이 해상에서의 안전 확보, 인명 부상과 생명손실의 방지, 해양환경과 재산에 대한 손상의 방지에 있다는 내용이다. 실제 영문 지문을 확보하면 해당 문장별 해석으로 교체한다.","category":"영어","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 신출 복기","answerStatus":"영문 원문 미확보"}},{"id":109,"q":"해상보험 관련 영문 지문을 읽고 우리말로 해석하시오. (최근 신출 복기·원문 미확보)","hint1":"marine insurance·insured·insurer·risk·loss·indemnity","hint2":"보험 관련 장문 독해 유형으로 출제됨","answer":"복기에서 실제 영문 지문은 확보되지 않았다. 대비할 핵심 어휘는 marine insurance(해상보험), insured(피보험자), insurer(보험자), premium(보험료), insured peril(담보위험), loss(손해), indemnity(손해보상), general average(공동해손), burden of proof(입증책임) 등이다. 원문 확보 시 정확한 문장별 번역을 추가한다.","category":"영어","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 신출 복기","answerStatus":"영문 원문 미확보"}},{"id":110,"q":"선박조종 관련 영문 지문을 읽고 우리말로 해석하시오. (최근 신출 복기·원문 미확보)","hint1":"manoeuvring·turning circle·advance·transfer·stopping distance","hint2":"선박조종 내용의 장문 해석 유형","answer":"복기에서 실제 영문 지문은 확보되지 않았다. 대비할 핵심 어휘는 manoeuvring characteristics(조종특성), turning circle(선회권), advance(종거), transfer(횡거), tactical diameter(전술직경), stopping distance(정지거리), rudder angle(타각), bank effect(안벽효과), squat(스쿼트) 등이다. 원문 확보 시 정확한 문장별 번역으로 보완한다.","category":"영어","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 신출 복기","answerStatus":"영문 원문 미확보"}},{"id":111,"q":"해사영어 장문 지문 2문제를 읽고 우리말로 해석하시오. (최근 신출 복기·원문 미확보)","hint1":"최근 복기에서 장문 2문제 출제 사실만 확인","hint2":"주제와 원문은 미확보","answer":"최근 복기에서 해사영어 장문 2문제가 출제되었다는 사실만 확인되었고 실제 지문과 주제는 확보되지 않았다. 현재는 신출 장문 독해 유형의 출제이력을 남기기 위한 항목이며, 원문을 확보하는 즉시 문제와 해석을 교체해야 한다.","category":"영어","audit":{"reviewedOn":"2026-09-28","questionStatus":"최근 신출 복기","answerStatus":"영문 원문·주제 미확보"}}];
    const existing=new Set(data.QUESTIONS.map(q=>Number(q.id)));
    for(const q of additions){
      if(!existing.has(Number(q.id))){data.QUESTIONS.push(q);existing.add(Number(q.id));}
      if(data.IMP) data.IMP[q.id]=3;
    }
    if(data.meta){
      data.meta.description=data.QUESTIONS.length+'문제 · 면접 기출·최근 복기';
      data.meta.version='2.2-oral-recall-20260928';
      data.meta.auditDate='2026-09-28';
      data.meta.auditScope='90 official questions previously reviewed + 21 recent recall additions';
    }
    try{if(typeof currentMode!=='undefined'&&currentMode==='select'&&typeof renderSubjectSelect==='function')renderSubjectSelect();}catch(e){}
  })();

  const CHECKPOINT_KEY='md_pass_plan_session_checkpoint_v2';
  const REPORTS_KEY='md_problem_reports_v1';
  const RESOLVED_REPORTS_CUTOFF='2026-09-17T03:17:00.000Z';
  let wakeLock=null;

  function appRoot(){return document.getElementById('app');}
  function currentCheckpoint(){
    try{
      const cp=JSON.parse(localStorage.getItem(CHECKPOINT_KEY)||'null');
      if(!cp||cp.version!==2||!Array.isArray(cp.queueKeys)||!cp.queueKeys.length)return null;
      return cp;
    }catch(e){return null}
  }
  function questionChoiceButtons(root){
    const card=root&&root.querySelector('.card');
    if(!card)return [];
    return [...card.querySelectorAll('button')].filter(btn=>{
      const onclick=btn.getAttribute('onclick')||'';
      const text=(btn.textContent||'').trim();
      if(onclick&&/(?:answer|choose|select)/i.test(onclick)&&!/(?:next|prev|back|home|report|bookmark|restart)/i.test(onclick))return true;
      return /^(?:[가나다라]|[㉠㉡㉢㉣]|[①②③④])(?:\s|\.|\)|:|$)/.test(text);
    });
  }
  function inQuestionSession(){
    const root=appRoot();
    return !!root&&questionChoiceButtons(root).length>=2;
  }
  function inPassSession(){
    const root=appRoot();
    if(!root)return false;
    return /문제\s+\d+\s*\/\s*\d+/.test(root.textContent||'') && !!root.querySelector('button[onclick^="chooseNavigatorPassPlanAnswer"]');
  }
  function toast(msg){
    if(typeof window.showToast==='function')window.showToast(msg);else console.log(msg);
  }
  function escapeText(s){return String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}

  function addResumeBanner(){
    const root=appRoot();if(!root||inQuestionSession()||document.getElementById('md-plan-navigation'))return;
    const cp=currentCheckpoint();
    const old=document.getElementById('md-resume-banner');
    if(!cp){if(old)old.remove();return}
    if(old)return;
    const total=cp.queueKeys.length;
    const next=Math.min(total,Math.max(1,(Number(cp.nextIndex)||0)+1));
    const banner=document.createElement('button');
    banner.id='md-resume-banner';
    banner.className='btn btn-accent';
    banner.style.cssText='width:100%;margin:10px 0 14px 0;font-weight:900;position:relative;z-index:3';
    banner.textContent=`이어서 풀기 · ${next}/${total}`;
    banner.addEventListener('click',()=>{
      if(typeof window.startNavigatorPassPlanToday==='function')window.startNavigatorPassPlanToday();
    });
    const firstCard=root.querySelector('.card');
    if(firstCard)root.insertBefore(banner,firstCard);else root.prepend(banner);
  }

  function findFeedback(root){
    for(const el of root.querySelectorAll('div')){
      const t=el.textContent.trim();
      if(el.children.length===0&&(t==='정답'||/^오답\s*·\s*정답/.test(t)))return el;
    }
    return null;
  }
  function applyExplanationMode(){
    const root=appRoot();if(!root||!inPassSession())return;
    const feedback=findFeedback(root);if(!feedback)return;
    const isCorrect=feedback.textContent.trim()==='정답';
    const explain=feedback.nextElementSibling;
    if(!explain||explain.id==='md-explain-toggle')return;
    explain.dataset.mdExplain='1';
    let toggle=root.querySelector('#md-explain-toggle');
    if(!toggle){
      toggle=document.createElement('button');
      toggle.id='md-explain-toggle';
      toggle.className='btn btn-outline';
      toggle.style.cssText='width:100%;margin-top:10px';
      explain.parentNode.insertBefore(toggle,explain);
      toggle.addEventListener('click',()=>{
        const hidden=explain.style.display==='none';
        explain.style.display=hidden?'':'none';
        toggle.textContent=hidden?'해설 접기':'해설 보기';
      });
    }
    if(isCorrect){
      explain.style.display='none';
      toggle.textContent='해설 보기';
    }else{
      explain.style.display='';
      toggle.textContent='해설 접기';
    }
  }

  function findQuestionCounter(root){
    if(!root)return null;
    const exact=/^(?:실전예측|모의|문제)\s*\d+\s*\/\s*\d+$/;
    const loose=/(?:실전예측|모의|문제)\s*\d+\s*\/\s*\d+/;
    const nodes=[...root.querySelectorAll('div,span')];
    return nodes.find(el=>el.children.length===0&&exact.test((el.textContent||'').trim()))
      ||nodes.find(el=>(el.textContent||'').trim().length<80&&loose.test((el.textContent||'').trim()))
      ||null;
  }
  function collectQuestionSnapshot(){
    const root=appRoot();
    const counterEl=findQuestionCounter(root);
    const counter=counterEl?(counterEl.textContent||'').trim():(((root.textContent||'').match(/(?:실전예측|모의|문제)\s*\d+\s*\/\s*\d+/)||[''])[0]);
    const card=root.querySelector('.card');
    const tags=card?[...card.querySelectorAll('.tag')].map(x=>x.textContent.trim()).filter(Boolean):[];
    let question='';
    if(card){
      const choice=questionChoiceButtons(root)[0];
      if(choice){
        let n=choice.parentElement?.previousElementSibling;
        if(n)question=(n.textContent||'').trim();
        if(!question){
          const children=[...card.children],holder=children.find(el=>el===choice||el.contains(choice)),idx=children.indexOf(holder);
          for(let i=idx-1;i>=0;i--){
            const candidate=children[i],text=(candidate.textContent||'').trim();
            if(text&&!candidate.querySelector('button')&&!candidate.classList.contains('tag')){question=text;break}
          }
        }
      }
    }
    return {counter,tags,question};
  }
  function readReports(){
    try{
      const v=JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]'),reports=Array.isArray(v)?v:[];
      const cutoff=Date.parse(RESOLVED_REPORTS_CUTOFF);
      const kept=reports.filter(r=>{
        const t=Date.parse(r&&r.createdAt||'');
        return !Number.isFinite(t)||t>cutoff;
      });
      if(kept.length!==reports.length){
        if(kept.length)localStorage.setItem(REPORTS_KEY,JSON.stringify(kept));
        else localStorage.removeItem(REPORTS_KEY);
      }
      return kept;
    }catch(e){return []}
  }
  function formatReports(reports){
    return reports.map((r,i)=>{
      const detail=String(r.detail||'').trim();
      return `#${i+1} ${r.reason||'신고'}\n시각: ${r.createdAt||''}\n표시: ${(r.tags||[]).join(' · ')} ${r.counter||''}\n문제: ${r.question||''}${detail?`\n신고내용: ${detail}`:''}`;
    }).join('\n\n');
  }
  async function copyReports(){
    const reports=readReports();if(!reports.length){toast('저장된 문제 신고가 없습니다.');return}
    const text=formatReports(reports);
    try{await navigator.clipboard.writeText(text);toast(`문제 신고 ${reports.length}건을 복사했습니다.`)}catch(e){
      const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast(`문제 신고 ${reports.length}건을 복사했습니다.`)
    }
  }
  function clearReports(){
    const reports=readReports();if(!reports.length){toast('삭제할 문제 신고가 없습니다.');return}
    if(typeof window.confirm==='function'&&!window.confirm(`저장된 문제 신고 ${reports.length}건을 모두 삭제하시겠습니까?`))return;
    try{localStorage.removeItem(REPORTS_KEY)}catch(e){}
    document.getElementById('md-report-list-btn')?.remove();
    document.getElementById('md-report-list-modal')?.remove();
    toast(`문제 신고 ${reports.length}건을 삭제했습니다.`);
  }
  function openReportListModal(){
    document.getElementById('md-report-list-modal')?.remove();
    const reports=readReports();
    const overlay=document.createElement('div');overlay.id='md-report-list-modal';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px';
    const rows=reports.length?reports.slice().reverse().map((r,ri)=>{
      const detail=String(r.detail||'').trim();
      return `<div style="padding:10px;border:1px solid #E2E8F0;border-radius:9px;background:#F8FAFC"><div style="font-size:12px;font-weight:900">${escapeText(r.reason||'신고')} · #${reports.length-ri}</div><div style="font-size:10px;color:#64748B;margin-top:3px">${escapeText((r.tags||[]).join(' · '))} ${escapeText(r.counter||'')}</div><div style="font-size:12px;line-height:1.55;margin-top:6px">${escapeText(r.question||'문제 문구 없음')}</div>${detail?`<div style="font-size:12px;line-height:1.55;margin-top:7px;padding:8px;border-radius:7px;background:#FFF;border:1px solid #E2E8F0"><b>신고 내용</b><br>${escapeText(detail)}</div>`:''}</div>`;
    }).join(''):'<div style="padding:18px;text-align:center;color:#64748B">저장된 문제 신고가 없습니다.</div>';
    overlay.innerHTML=`<div class="card" style="width:min(640px,100%);max-height:85vh;overflow:auto;margin:0;background:#fff"><div style="font-size:17px;font-weight:900">저장된 문제 신고 · ${reports.length}건</div><div style="font-size:11px;color:#64748B;margin:5px 0 12px">신고는 이 브라우저의 localStorage에만 저장됩니다. 2026-09-17 검수 완료 이전 신고는 자동 정리되며, 이후 신고만 여기에 남습니다.</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn btn-accent" style="flex:1;min-width:120px" id="md-report-copy" ${reports.length?'':'disabled'}>전체 복사</button><button class="btn btn-outline" style="flex:1;min-width:120px" id="md-report-clear" ${reports.length?'':'disabled'}>전체 삭제</button><button class="btn btn-outline" style="flex:1;min-width:120px" id="md-report-list-close">닫기</button></div><div style="display:flex;flex-direction:column;gap:8px">${rows}</div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#md-report-copy').onclick=copyReports;
    overlay.querySelector('#md-report-clear').onclick=clearReports;
    overlay.querySelector('#md-report-list-close').onclick=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  }
  window.openMaritimeProblemReports=openReportListModal;
  window.copyMaritimeProblemReports=copyReports;
  window.clearMaritimeProblemReports=clearReports;

  function saveReport(reason,detail=''){
    const note=String(detail||'').trim();
    if(reason==='직접 입력'&&!note){toast('신고 내용을 입력해 주세요.');return false}
    const snap=collectQuestionSnapshot();
    const reports=readReports();
    reports.push({createdAt:new Date().toISOString(),reason,detail:note,...snap});
    try{localStorage.setItem(REPORTS_KEY,JSON.stringify(reports.slice(-500)))}catch(e){}
    toast(`문제 신고 저장됨 · ${reason}`);
    document.getElementById('md-report-modal')?.remove();
    return true;
  }
  function openReportModal(){
    document.getElementById('md-report-modal')?.remove();
    const count=readReports().length;
    const overlay=document.createElement('div');overlay.id='md-report-modal';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML=`<div class="card" style="width:min(420px,100%);margin:0;background:#fff"><div style="font-weight:900;font-size:17px;margin-bottom:12px">문제 신고</div><div style="font-size:12px;color:var(--textDim);margin-bottom:12px">현재 문제를 이 브라우저에 저장합니다. 유형을 바로 선택하거나 직접 내용을 입력할 수 있습니다.</div><div id="md-report-actions" style="display:flex;flex-direction:column;gap:8px"></div><div id="md-report-custom" style="display:none;margin-top:10px"><textarea id="md-report-detail" maxlength="500" rows="4" placeholder="어떤 점이 이상한지 직접 입력해 주세요. 예: 보기 3번 문장이 잘린 것 같음" style="width:100%;box-sizing:border-box;resize:vertical;padding:10px;border:1px solid #CBD5E1;border-radius:9px;font:inherit;line-height:1.5"></textarea><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:5px"><span id="md-report-detail-count" style="font-size:10px;color:#64748B">0/500</span><button class="btn btn-accent" id="md-report-custom-save" style="min-width:110px">내용 저장</button></div></div><button class="btn btn-outline" style="width:100%;margin-top:10px" id="md-report-list">저장된 신고 ${count}건 보기</button><button class="btn btn-outline" style="width:100%;margin-top:8px" id="md-report-cancel">취소</button></div>`;
    document.body.appendChild(overlay);
    const actions=overlay.querySelector('#md-report-actions');
    ['정답 이상','해설 이상','오타/깨짐'].forEach(reason=>{const b=document.createElement('button');b.className='btn btn-outline';b.style.width='100%';b.textContent=reason;b.onclick=()=>saveReport(reason);actions.appendChild(b)});
    const customBtn=document.createElement('button');customBtn.className='btn btn-outline';customBtn.style.width='100%';customBtn.textContent='직접 입력(주관식)';actions.appendChild(customBtn);
    const custom=overlay.querySelector('#md-report-custom'),detail=overlay.querySelector('#md-report-detail'),countEl=overlay.querySelector('#md-report-detail-count'),save=overlay.querySelector('#md-report-custom-save');
    customBtn.onclick=()=>{custom.style.display='block';customBtn.style.display='none';setTimeout(()=>detail.focus(),0)};
    detail.addEventListener('input',()=>{countEl.textContent=`${detail.value.length}/500`});
    detail.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();save.click()}});
    save.onclick=()=>saveReport('직접 입력',detail.value);
    overlay.querySelector('#md-report-list').onclick=()=>{overlay.remove();openReportListModal()};
    overlay.querySelector('#md-report-cancel').onclick=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  }
  function addReportButton(){
    const root=appRoot();if(!root||!inQuestionSession()||document.getElementById('md-report-btn'))return;
    const counter=findQuestionCounter(root);
    const b=document.createElement('button');b.id='md-report-btn';b.className='btn btn-outline';
    b.style.cssText='width:auto;padding:8px 10px;font-size:12px;margin-left:6px';b.textContent='문제 신고';b.onclick=openReportModal;
    const count=readReports().length;
    const list=count?document.createElement('button'):null;
    if(list){list.id='md-report-list-btn';list.className='btn btn-outline';list.style.cssText='width:auto;padding:8px 10px;font-size:12px;margin-left:4px';list.textContent=`신고 ${count}`;list.onclick=openReportListModal}
    if(counter&&counter.parentElement){
      counter.parentElement.appendChild(b);if(list)counter.parentElement.appendChild(list);
    }else{
      const card=root.querySelector('.card');if(!card)return;
      const row=document.createElement('div');row.id='md-report-row';row.style.cssText='display:flex;justify-content:flex-end;align-items:center;margin:0 0 8px';
      row.appendChild(b);if(list)row.appendChild(list);card.parentNode.insertBefore(row,card);
    }
  }

  async function requestWakeLock(){
    if(!inQuestionSession()||document.visibilityState!=='visible'||!('wakeLock' in navigator)||wakeLock)return;
    try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null})}catch(e){}
  }
  async function syncWakeLock(){
    if(inQuestionSession())await requestWakeLock();
    else if(wakeLock){try{await wakeLock.release()}catch(e){}wakeLock=null}
  }


  // today-result-subject-breakdown-v1
  function mdResultSubjectName(q){
    let item=null;
    try{if(q&&q._planKey&&typeof ppGetItemByKey==='function')item=ppGetItemByKey(q._planKey)}catch(e){}
    let subject=String((item&&item.subject)||(q&&q.subject)||(q&&q['과목'])||'기타').trim();
    const compact=subject.replace(/\s+/g,'');
    if(/^영어/.test(compact))return '영어';
    if(/^항해/.test(compact))return '항해';
    if(/^법규/.test(compact))return '법규';
    if(/^(운용|선박운용)/.test(compact))return '운용';
    if(/^상선전문/.test(compact))return '상선전문';
    return subject||'기타';
  }
  function mdPercent(n,d){
    if(!d)return '0%';
    const v=Math.round((n/d)*1000)/10;
    return (Number.isInteger(v)?String(v):v.toFixed(1))+'%';
  }
  function mdTodayResultStats(){
    if(typeof planSessionQueue==='undefined'||!Array.isArray(planSessionQueue)||!planSessionQueue.length)return null;
    const answers=(typeof planSessionAnswers!=='undefined'&&Array.isArray(planSessionAnswers))?planSessionAnswers:[];
    let progress=null,today=null,canReadCleared=false;
    try{
      if(typeof ppLoadProgress==='function'&&typeof ppDateKey==='function'&&typeof ppProgressFor==='function'&&typeof ppTodayCleared==='function'){
        progress=ppLoadProgress();today=ppDateKey(new Date());canReadCleared=true;
      }
    }catch(e){}
    const unique=new Map();
    planSessionQueue.forEach((q,i)=>{
      if(!q)return;
      const key=q._planKey?String(q._planKey):'idx:'+i;
      if(unique.has(key))return;
      const answer=answers[i];
      const firstCorrect=Number.isInteger(answer)&&answer===q['정답'];
      let cleared=firstCorrect;
      if(canReadCleared&&q._planKey){
        try{cleared=!!ppTodayCleared(ppProgressFor(progress,q._planKey),today)}catch(e){}
      }
      unique.set(key,{key,subject:mdResultSubjectName(q),firstCorrect,cleared});
    });
    if(!unique.size)return null;
    const bySubject=new Map();
    for(const row of unique.values()){
      const subject=row.subject||'기타';
      if(!bySubject.has(subject))bySubject.set(subject,{subject,total:0,firstCorrect:0,cleared:0});
      const s=bySubject.get(subject);s.total++;if(row.firstCorrect)s.firstCorrect++;if(row.cleared)s.cleared++;
    }
    const preferred=['영어','항해','법규','운용','상선전문','기타'];
    const order=new Map(preferred.map((s,i)=>[s,i]));
    const subjects=[...bySubject.values()].sort((a,b)=>{
      const ao=order.has(a.subject)?order.get(a.subject):preferred.length;
      const bo=order.has(b.subject)?order.get(b.subject):preferred.length;
      return ao-bo||a.subject.localeCompare(b.subject,'ko');
    });
    const total=unique.size;
    const firstCorrect=[...unique.values()].filter(x=>x.firstCorrect).length;
    const cleared=[...unique.values()].filter(x=>x.cleared).length;
    return {subjects,total,firstCorrect,cleared,unresolved:total-cleared};
  }
  function enhanceTodayResult(){
    const root=appRoot();if(!root||document.getElementById('md-today-subject-result'))return;
    const title=[...root.querySelectorAll('h1')].find(el=>(el.textContent||'').trim()==='오늘의 숙제 결과');
    if(!title)return;
    const stats=mdTodayResultStats();if(!stats||!stats.subjects.length)return;
    const firstCard=root.querySelector('.card');if(!firstCard)return;
    const rows=stats.subjects.map(s=>{
      const firstRate=mdPercent(s.firstCorrect,s.total),clearedRate=mdPercent(s.cleared,s.total),unresolved=s.total-s.cleared;
      return '<div style="display:grid;grid-template-columns:minmax(90px,1.15fr) minmax(150px,1.8fr) minmax(135px,1.6fr) minmax(80px,.8fr);gap:12px;align-items:center;padding:11px 14px;border-top:1px solid #E2E8F0">'
        +'<div style="font-size:13px;font-weight:900;color:#0F172A">'+escapeText(s.subject)+'</div>'
        +'<div><div style="display:flex;justify-content:space-between;gap:8px;font-size:11px"><span>'+s.firstCorrect+' / '+s.total+'</span><b>'+firstRate+'</b></div><div style="height:6px;background:#E2E8F0;border-radius:999px;overflow:hidden;margin-top:5px"><div style="height:100%;width:'+firstRate+';background:#7C3AED;border-radius:999px"></div></div></div>'
        +'<div style="font-size:11px"><b style="font-size:12px;color:#334155">'+s.cleared+' / '+s.total+'</b><span style="color:#64748B"> · '+clearedRate+'</span></div>'
        +'<div style="font-size:12px;font-weight:900;color:'+(unresolved?'#B45309':'#047857')+'">'+unresolved+'문제</div>'
        +'</div>';
    }).join('');
    let weakestHtml='';
    if(stats.subjects.length>=2){
      const ranked=stats.subjects.slice().sort((a,b)=>(a.firstCorrect/Math.max(1,a.total))-(b.firstCorrect/Math.max(1,b.total))||(b.total-b.cleared)-(a.total-a.cleared));
      const w=ranked[0];
      weakestHtml='<div style="padding:10px 14px;background:#F8FAFC;border-top:1px solid #E2E8F0;font-size:11px;color:#475569">첫 시도 정답률 최저: <b style="color:#B91C1C">'+escapeText(w.subject)+' '+mdPercent(w.firstCorrect,w.total)+'</b> · 현재 미해결 '+(w.total-w.cleared)+'문제</div>';
    }
    const section=document.createElement('div');
    section.id='md-today-subject-result';section.className='card';section.style.cssText='padding:0;overflow:hidden';
    section.innerHTML=
      '<div style="padding:15px 14px 12px">'
      +'<div style="font-size:16px;font-weight:900;color:#0F172A">과목별 결과</div>'
      +'<div style="font-size:10px;color:#64748B;margin-top:4px">첫 시도 정답률과 현재 숙제 통과 상태를 분리해 표시합니다. 재확인 문제는 중복 집계하지 않습니다.</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;font-size:11px">'
      +'<span style="padding:6px 9px;border-radius:999px;background:#F1F5F9;color:#334155">고유 문항 <b>'+stats.total+'</b></span>'
      +'<span style="padding:6px 9px;border-radius:999px;background:#F5F3FF;color:#6D28D9">첫 시도 정답 <b>'+stats.firstCorrect+' ('+mdPercent(stats.firstCorrect,stats.total)+')</b></span>'
      +'<span style="padding:6px 9px;border-radius:999px;background:#ECFDF5;color:#047857">현재 통과 <b>'+stats.cleared+'</b></span>'
      +'<span style="padding:6px 9px;border-radius:999px;background:#FFF7ED;color:#B45309">미해결 <b>'+stats.unresolved+'</b></span>'
      +'</div></div>'
      +'<div style="overflow-x:auto"><div style="min-width:620px">'
      +'<div style="display:grid;grid-template-columns:minmax(90px,1.15fr) minmax(150px,1.8fr) minmax(135px,1.6fr) minmax(80px,.8fr);gap:12px;padding:8px 14px;background:#F8FAFC;font-size:10px;font-weight:900;color:#64748B"><div>과목</div><div>첫 시도 정답</div><div>현재 통과</div><div>미해결</div></div>'
      +rows+weakestHtml+'</div></div>';
    firstCard.insertAdjacentElement('afterend',section);
  }

  let queued=false;
  function enhance(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;addResumeBanner();applyExplanationMode();addReportButton();enhanceTodayResult();syncWakeLock()});
  }
  new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',enhance);
  document.addEventListener('pointerdown',requestWakeLock,{passive:true});
  document.addEventListener('keydown',requestWakeLock);
  readReports();
  enhance();
})();
