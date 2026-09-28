"""Add 21 recent 2급 항해사 oral-recall questions to the final bundled app. Safe to rerun."""
from pathlib import Path
import json
import re

p = Path("index.html")
text = p.read_text(encoding="utf-8-sig")
original = text

EXTRA = [
 {
  "id": 91,
  "q": "백업 ECDIS의 요건을 5가지 이상 설명",
  "hint1": "메인 ECDIS 고장 시 독립적으로 안전항해를 계속할 수 있는 백업수단",
  "hint2": "독립성·형식승인·최신 ENC·항로계획/감시·독립 전원·항해센서·안전한 인계",
  "answer": "백업 ECDIS는 메인 ECDIS가 고장 나더라도 안전하게 항해를 계속할 수 있도록 독립적으로 구성되어야 합니다.\n- 메인 ECDIS 고장 시 즉시 안전하게 기능을 인계받을 수 있을 것\n- 형식승인된 ECDIS로서 항해에 필요한 해도정보를 표시할 수 있을 것\n- 최신 상태의 ENC와 항해계획(Route plan)이 준비되어 있을 것\n- 항로계획 및 항로감시 기능을 수행할 수 있을 것\n- 메인 ECDIS와 독립된 전원 공급이 가능하고 주전원·비상전원에 적절히 연결될 것\n- GNSS 등 위치정보와 Gyro compass, Speed log 등 필요한 항해센서 정보를 받을 수 있을 것\n- 단일 고장으로 메인과 백업 ECDIS가 동시에 기능을 상실하지 않도록 독립성이 확보될 것",
  "category": "항해",
  "source": "2026 최근 복기"
 },
 {
  "id": 92,
  "q": "Doppler Log(도플러 선속계)의 작동 원리를 설명",
  "hint1": "송신 음파와 해저 반사 수신 음파의 주파수 차",
  "hint2": "도플러 효과·주파수 편이·주파수 차가 선속에 비례",
  "answer": "도플러 선속계는 도플러 효과를 이용하여 선속을 측정합니다. 선저에서 해저를 향해 음파를 발사하면 선박이 이동하고 있기 때문에 해저에서 반사되어 돌아오는 음파의 주파수는 송신주파수와 달라집니다. 이 송신주파수와 수신주파수의 차이인 도플러 주파수 편이는 선박의 속력에 비례하므로 이를 계산하여 선박의 속력을 구합니다.",
  "category": "항해",
  "source": "2026 최근 복기"
 },
 {
  "id": 93,
  "q": "벡터(Vector)의 정의와 구성요소에 대하여 설명",
  "hint1": "크기와 방향을 동시에 가지는 양",
  "hint2": "Magnitude·Direction·직교 성분으로 분해·합성",
  "answer": "벡터는 크기와 방향을 동시에 가지는 양입니다. 선박의 속력과 침로를 함께 나타내는 속도벡터가 대표적인 예입니다.\n- 구성요소는 크기(Magnitude)와 방향(Direction)입니다.\n- 벡터는 서로 직각인 두 성분, 예를 들면 동서방향 성분과 남북방향 성분으로 분해할 수 있습니다.\n- 반대로 각 성분을 합성하면 하나의 합성벡터(Resultant vector)를 구할 수 있습니다.",
  "category": "항해",
  "source": "2026 최근 복기"
 },
 {
  "id": 94,
  "q": "IAMSAR에 따라 수색구조 계획을 수립할 때 고려하여야 할 사항을 5가지 설명",
  "hint1": "Datum 추정·수색구역·SAR 자원·수색패턴·현장조정",
  "hint2": "표류 고려 추정위치 / Search area / SAR facilities / Search pattern / On-scene coordination",
  "answer": "IAMSAR에 따른 수색계획 수립 시 핵심 고려사항은 다음과 같습니다.\n- 바람과 해류 등에 의한 표류를 고려하여 수색기준점(Datum) 또는 조난자의 추정위치를 산정\n- 위치오차와 표류오차 등을 고려하여 수색구역(Search area)을 결정\n- 투입할 선박·항공기 등 SAR 시설과 필요한 장비를 선정\n- 기상, 시정, 해상상태, 수색대상 및 투입세력을 고려하여 적절한 수색패턴을 선정\n- 현장지휘·통신·수색세력 간 협조 등 현장조정(On-scene coordination) 계획을 수립\n추가로 수색패턴 선택에는 수색선박의 수와 종류, 수색구역 크기, 조난선의 종류와 크기, 시정, 운고, 해상상태, 주·야간 여부 등이 영향을 줍니다.",
  "category": "상선전문",
  "source": "2026 최근 복기"
 },
 {
  "id": 95,
  "q": "기상도에 표시되는 W, GW, SW, TW의 의미를 설명",
  "hint1": "W Warning, GW Gale Warning, SW Storm Warning, TW Typhoon Warning",
  "hint2": "W Near Gale / GW 34~47kt / SW 48kt 이상 / TW 태풍 경보",
  "answer": "- W: Warning 또는 Near Gale Warning. 열대저기압의 최대풍속이 대략 28노트 이상 34노트 미만인 경우를 나타냅니다.\n- GW: Gale Warning. 최대풍속이 34노트 이상 48노트 미만인 강풍 경보입니다.\n- SW: Storm Warning. 최대풍속이 48노트 이상인 폭풍 경보입니다.\n- TW: Typhoon Warning. 태풍에 대한 경보로 일반적으로 최대풍속 64노트 이상의 태풍급 열대저기압을 나타냅니다.",
  "category": "항해",
  "source": "2026 최근 복기"
 },
 {
  "id": 96,
  "q": "쌍묘박의 정의와 방법 및 장단점을 설명",
  "hint1": "두 개의 닻을 사용하여 파주력을 높이고 선체 요잉을 줄이는 묘박법",
  "hint2": "두 닻을 적절한 간격·각도로 투묘 / 파주력 증가·요잉 감소 / 묘쇄 얽힘·양묘 곤란",
  "answer": "쌍묘박은 선수의 두 닻을 모두 사용하여 선박을 계류하는 방법입니다.\n- 방법: 풍향·조류와 수심·수역을 고려하여 첫 번째 닻을 투하한 뒤 선박을 이동시켜 두 번째 닻을 일정한 간격과 각도로 투하하고 양쪽 묘쇄 길이를 조정하여 선박이 두 닻 사이에서 안정되도록 합니다.\n- 장점: 단묘박보다 파주력을 크게 할 수 있고 선체의 좌우 요잉과 선회범위를 줄일 수 있어 강풍이나 강한 조류에서 유리합니다.\n- 단점: 풍향·조류가 크게 변하면 두 묘쇄가 서로 꼬이거나 얽힐 수 있고 양묘가 복잡하며 긴급출항 시 시간이 많이 걸릴 수 있습니다.",
  "category": "운용",
  "source": "2026 최근 복기"
 },
 {
  "id": 97,
  "q": "투묘 시 내어줄 앵커 케이블(묘쇄·샤클) 길이를 결정할 때 고려할 사항을 설명",
  "hint1": "수심·조석·저질·풍조류·선박 크기·기상·묘박수역·선회여유",
  "hint2": "수심+조석 / 저질·파주력 / 풍압·조류 / 선박 크기 / 예보 / 주변 장애물 / Swinging circle",
  "answer": "묘쇄 길이는 단순히 수심만으로 결정하지 않고 다음 사항을 함께 고려합니다.\n- 현재 수심과 조석에 따른 예상 최대수심\n- 해저 저질과 닻의 파주력\n- 풍향·풍속, 조류의 방향·세기와 파랑\n- 선박의 크기, 흘수 및 풍압면적\n- 향후 기상·해상 악화 가능성\n- 묘박지의 넓이와 주변 선박·암초·해저시설 등 장애물\n- 묘쇄를 내었을 때 형성되는 선회반경(Swinging circle)\n- 닻과 묘쇄의 상태 및 긴급 양묘·출항 가능성",
  "category": "운용",
  "source": "2026 최근 복기"
 },
 {
  "id": 98,
  "q": "SOLAS상 Emergency Towing Procedure(비상예인절차)에 포함되어야 하는 내용을 설명",
  "hint1": "Ship particulars·예인장비/Strong point·Rigging·통신·절차·장비 위치",
  "hint2": "선박 주요제원 / 예인점·SWL / 연결도면 / 선수·선미 절차 / 통신 / Dead ship / 비상해제 / 장비목록",
  "answer": "비상예인절차는 해당 선박에 맞게 작성되어 선내에 비치되어야 하며 비상 시 신속히 예인 준비를 할 수 있도록 다음 내용을 포함합니다.\n- 선명, 호출부호, IMO 번호, 흘수·배수량 범위 등 선박 주요제원(Ship particulars)\n- 선수·선미의 예인 가능한 Strong point, 비트·볼라드 등의 위치와 허용하중(SWL)\n- 앵커, 체인, 계류삭 등 이용 가능한 예인 관련 장비의 제원과 위치\n- 예인삭을 연결·조립·Rigging하는 방법과 관련 배치도·도면\n- 선수 및 선미에서 비상예인을 준비하고 실시하는 절차\n- 주전원 상실 또는 Dead ship 상태에서의 준비사항\n- 예인선과 본선 사이의 통신방법 및 교환해야 할 선박상태 정보\n- 조타·추진·갑판기계 사용 가능 여부와 비상해제(Emergency release) 방법\n- 필요 시 타와 축의 고정, Ballast·Trim 조정 등 추가 준비사항\n- 해상상태와 본선 상태를 고려한 안전한 예인속력 및 운용상 제한사항",
  "category": "상선전문",
  "source": "2026 최근 복기"
 },
 {
  "id": 99,
  "q": "항해자료기록장치(VDR)에 기록·유지되어야 하는 항해자료를 5가지 이상 설명",
  "hint1": "시간·위치·속력·침로·선교음성·VHF·Radar·Echo sounder·Alarm",
  "hint2": "날짜/시간, 위치, SOG/STW, 침로, Bridge audio, VHF, Radar, 음향측심, 경보, 타/기관 상태",
  "answer": "- 날짜 및 시간\n- 선박의 위치\n- 대수속력 및 대지속력\n- 선박의 침로 및 선수방위\n- 선교에서 발생하는 대화내용\n- 선박운항과 관련한 VHF 통신내용\n- 설치가 요구되는 Radar에 표시되는 자료\n- 음향측심자료\n- 선교에 표시되는 경보사항\n- 타의 상태 및 Heading/Track controller의 상태\n- 주기관 및 Bow thruster의 상태\n- 수밀문·방화문 등 선교에 표시되는 개구 상태\n- 풍속·풍향 자료(관련 센서가 설치된 경우)\n- ECDIS 및 AIS 표시자료(설치된 경우)",
  "category": "항해",
  "source": "2026 최근 복기"
 },
 {
  "id": 100,
  "q": "선박직원법상 선박직원의 결원이 발생한 경우 승무기준의 특례가 허용되는 경우를 설명",
  "hint1": "외국항 간 항행·국외에서 결원 후 본국항까지·항행 중 결원으로 보충 곤란",
  "hint2": "선박직원법 제12조: 일정한 결원 상황에서 일시적 특례, 선박소유자는 지체 없이 보충",
  "answer": "선박직원법상 선박직원의 결원이 생겼으나 즉시 보충하기 곤란한 경우 일정한 범위에서 승무기준의 특례가 인정될 수 있습니다.\n- 외국의 각 항 사이를 항행하는 선박에서 결원이 생겼으나 보충하기 곤란한 경우\n- 본국항과 외국항 사이를 항행하는 선박이 국외에서 결원이 생겨 본국항까지 항행하는 경우\n- 그 밖에 선박의 항행 중 결원이 생겼으나 보충하기 곤란한 경우\n다만 선박소유자는 결원을 지체 없이 보충하여야 하고 결원 발생 사실과 보충계획을 해양수산부장관에게 지체 없이 알려야 합니다.",
  "category": "법규",
  "source": "2026 최근 복기"
 },
 {
  "id": 101,
  "q": "선박직원법상 음주와 관련한 혈중알코올농도 기준 및 업무정지·면허취소 기준을 설명",
  "hint1": "0.03% 이상 0.08% 미만 / 0.08% 이상 / 측정거부",
  "hint2": "0.03~0.08 미만: 최초 6개월 정지, 재위반 또는 사상사고 취소 / 0.08 이상 취소 / 측정거부 취소",
  "answer": "선박직원법상 음주 관련 해기사 면허 행정처분 기준은 다음과 같습니다.\n- 혈중알코올농도 0.03% 이상 0.08% 미만: 최초 위반은 6개월 업무정지\n- 위 범위에서 다시 위반한 경우 또는 음주 상태에서 사람을 죽거나 다치게 한 경우: 면허취소\n- 혈중알코올농도 0.08% 이상: 면허취소\n- 음주측정을 거부한 경우: 면허취소\n※ 면접에서는 해상교통안전법상의 운항·음주금지 기준과 선박직원법상의 해기사 면허 행정처분 기준을 구분하여 답하는 것이 중요합니다.",
  "category": "법규",
  "source": "2026 최근 복기"
 },
 {
  "id": 102,
  "q": "해양환경관리법상 선박오염물질기록부 3가지를 말하고 설명",
  "hint1": "폐기물기록부·기름기록부·유해액체물질기록부",
  "hint2": "폐기물 / 기름 / 유해액체물질의 취급·배출 등 관련 작업을 각각 기록",
  "answer": "선박오염물질기록부는 다음 3가지입니다.\n- 폐기물기록부: 선박에서 발생하는 폐기물의 배출·소각·육상인도 등 관련 작업을 기록\n- 기름기록부: 기름 및 유성혼합물의 적재·이송·처리·배출 등 관련 작업을 기록\n- 유해액체물질기록부: 산적 유해액체물질의 적재·이송·세정·배출 등 관련 작업을 기록\n각 기록부는 관련 법령에 따라 작성하고 최종 기재 후 정해진 기간 동안 선내에 보관하여야 합니다.",
  "category": "법규",
  "source": "2026 최근 복기"
 },
 {
  "id": 103,
  "q": "PSC 검사에서 선박평형수(Ballast Water) 관련으로 지적될 수 있는 사항을 설명",
  "hint1": "IBWMC·BWMP·기록부·BWMS·승무원 숙지·D-1/D-2 준수",
  "hint2": "유효 증서·승인 BWMP·BWRB / 기록과 실제 일치 / BWMS 정상 / D-1·D-2 준수 / 교육·숙지",
  "answer": "PSC에서 선박평형수와 관련하여 주로 확인되는 사항은 다음과 같습니다.\n- 유효한 국제선박평형수관리증서(IBWMC)의 비치와 유효성\n- 승인된 선박평형수관리계획서(BWMP)의 비치 및 절차 준수 여부\n- Ballast Water Record Book의 적정 기재와 실제 탱크 상태·작업내역의 일치 여부\n- 적용되는 D-1 또는 D-2 기준을 증서와 계획서에 맞게 준수하는지 여부\n- D-2 적용선의 BWMS가 형식승인 상태이고 정상 작동하는지, 알람·정비·교정기록 등이 적절한지 여부\n- 승무원이 BWMS 운전, 비상절차, 기록방법 등을 숙지하고 관련 교육·훈련 기록을 보유하는지 여부\n- 평형수 및 침전물 관리가 계획서에 따라 이루어지는지 여부",
  "category": "상선전문",
  "source": "2026 최근 복기"
 },
 {
  "id": 104,
  "q": "유해액체물질을 산적 선적하기 전에 선장 또는 본선에 전달되어야 하는 화물정보를 설명",
  "hint1": "제품명·성분·물리화학적 특성·위험성·누출/접촉/화재 대응·이송/세정 절차",
  "hint2": "Shipping name / mixture analysis / properties & reactivity / spill / personal contact / fire fighting / transfer·tank cleaning·gas freeing·ballasting",
  "answer": "유해액체물질을 선적하기 전에는 선장 또는 본선이 그 화물을 안전하게 취급할 수 있도록 충분한 화물정보가 제공되어야 합니다.\n- IBC Code 등에 따른 정확한 제품명(Shipping name)\n- 혼합물인 경우 위험성에 영향을 주는 주요 성분과 분석정보\n- 밀도, 증기압, 인화성, 독성, 부식성, 반응성 등 물리·화학적 성질과 위험성\n- 누출 또는 유출 시 취하여야 할 조치\n- 인체 접촉 시의 응급조치 및 보호조치\n- 화재 발생 시의 소화방법과 적절한 소화매체\n- 화물 이송, 탱크 세정, 가스프리 및 밸러스트 작업 시 필요한 절차와 주의사항\n안전한 운송에 필요한 정보가 충분하지 않은 경우에는 화물을 받아서는 안 됩니다.",
  "category": "상선전문",
  "source": "2026 최근 복기"
 },
 {
  "id": 105,
  "q": "선박 톤수의 종류를 중량톤수와 용적톤수로 구분하고 총톤수·순톤수·재화중량톤수 등의 의미를 설명",
  "hint1": "중량 기준: 배수톤수·재화중량톤수 / 용적 기준 지표: 총톤수·순톤수",
  "hint2": "Displacement·DWT·GT·NT / GT·NT는 실제 무게 단위가 아닌 용적 기반 지표",
  "answer": "선박 톤수는 크게 중량을 기준으로 보는 것과 선박 내부 용적을 기준으로 산정하는 것으로 나눌 수 있습니다.\n- 배수톤수(Displacement tonnage): 선박이 밀어낸 물의 중량으로 그 상태에서 선박 자체의 실제 중량과 같습니다.\n- 재화중량톤수(DWT): 만재배수량에서 경하배수량을 뺀 값으로 화물·연료·청수·선용품·승무원 등 선박이 안전하게 실을 수 있는 총중량을 나타냅니다.\n- 총톤수(GT): 선박 전체 폐위공간의 용적을 바탕으로 국제협약의 산식에 따라 산정한 선박 크기의 지표입니다.\n- 순톤수(NT): 여객·화물 운송에 이용되는 공간 등을 바탕으로 산정한 영업능력 관련 지표입니다.\n총톤수와 순톤수는 이름에 '톤'이 들어가지만 실제 중량을 나타내는 단위가 아니라 용적을 기초로 산정한 무차원 지표입니다.",
  "category": "상선전문",
  "source": "2026 최근 복기"
 },
 {
  "id": 106,
  "q": "선체 종강도 곡선 5가지의 명칭과 각각의 의미를 설명",
  "hint1": "중량·부력·하중·전단력·굽힘모멘트 곡선",
  "hint2": "Weight → Buoyancy → Load → Shearing force → Bending moment",
  "answer": "- 중량곡선(Weight curve): 선체 길이 방향으로 선체 자체와 화물·연료 등 중량이 어떻게 분포하는지를 나타낸 곡선\n- 부력곡선(Buoyancy curve): 선체 길이 방향으로 각 부분에 작용하는 부력의 분포를 나타낸 곡선\n- 하중곡선(Load curve): 각 위치에서 부력과 중량의 차이에 의해 발생하는 순하중의 분포를 나타낸 곡선\n- 전단력곡선(Shearing force curve): 하중을 선체 길이 방향으로 누적하여 얻는 전단력의 변화를 나타낸 곡선\n- 굽힘모멘트곡선(Bending moment curve): 전단력을 길이 방향으로 누적하여 얻는 굽힘모멘트의 분포를 나타낸 곡선으로 선체의 Hogging·Sagging 경향과 종강도 상태를 판단하는 데 사용합니다.",
  "category": "상선전문",
  "source": "2026 최근 복기"
 },
 {
  "id": 107,
  "q": "공동해손이 성립하는 대표적인 희생손해 중 적화 관련 손해를 5가지 이상 설명",
  "hint1": "투하 손실·투하로 인한 침손·소화손해·임의좌초·중량경감 하역·피난항 하역",
  "hint2": "Cargo sacrifice examples",
  "answer": "- 투하(Jettison)로 인한 화물의 손실\n- 투하행위로 인한 해수 침손\n- 소화작업으로 인한 누손·화물 변질 등 화물의 손해\n- 임의좌초로 인한 화물의 손해\n- 좌초된 선박의 중량을 줄이기 위해 실시한 하역으로 인한 손해\n- 피난항에서 공동의 안전을 위해 행한 하역작업 중 발생한 손해",
  "category": "상선전문",
  "source": "2026 최근 복기"
 },
 {
  "id": 108,
  "q": "다음 ISM Code·SMS 관련 영문을 해석하시오. (최근 복기형·실제 출제 원문 미상 대비) \"The safety management system should ensure safe practices in ship operation, provide safeguards against identified risks, and continuously improve the safety-management skills of personnel.\"",
  "hint1": "safe practices / safeguards against identified risks / improve safety-management skills",
  "hint2": "안전한 선박운항 관행 / 식별된 위험에 대한 안전대책 / 인원의 안전관리 능력 향상",
  "answer": "안전경영시스템은 선박 운항에서 안전한 관행을 확보하고, 식별된 위험에 대한 안전대책을 마련하며, 인원의 안전관리 능력을 지속적으로 향상시키도록 해야 한다는 뜻입니다.\n※ 최근 복기에서 ISM Code 목적 관련 영문이 출제되었다는 내용만 확인되어 실제 출제 지문은 알려져 있지 않으므로 이 문항은 같은 개념의 대비용 문장입니다.",
  "category": "영어",
  "source": "2026 최근 복기"
 },
 {
  "id": 109,
  "q": "다음 해상보험 관련 영문을 해석하시오. (최근 복기형·실제 출제 원문 미상 대비) \"Marine insurance covers losses caused by insured perils. When a constructive total loss occurs, the assured may give notice of abandonment and claim as for a total loss.\"",
  "hint1": "insured perils / constructive total loss / notice of abandonment",
  "hint2": "담보위험 / 추정전손 / 위부통지",
  "answer": "해상보험은 보험에서 담보하는 위험으로 인해 발생한 손해를 보상합니다. 추정전손이 발생한 경우 피보험자는 위부통지를 하고 전손으로 보험금을 청구할 수 있다는 뜻입니다.\n※ 최근 복기에서 보험 관련 영어 독해가 출제되었다는 내용만 확인되어 실제 출제 지문은 알려져 있지 않으므로 이 문항은 같은 분야의 대비용 문장입니다.",
  "category": "영어",
  "source": "2026 최근 복기"
 },
 {
  "id": 110,
  "q": "다음 선박조종 관련 영문을 해석하시오. (최근 복기형·실제 출제 원문 미상 대비) \"When a ship passes close to a bank, hydrodynamic pressure may push the bow away from the bank and draw the stern toward it. The officer should reduce speed and maintain sufficient steering margin.\"",
  "hint1": "bank effect / bow away / stern toward / reduce speed / steering margin",
  "hint2": "안벽효과: 선수는 안벽에서 밀리고 선미는 안벽 쪽으로 끌림",
  "answer": "선박이 안벽 가까이 통과할 때 유체역학적 압력 때문에 선수는 안벽에서 바깥쪽으로 밀리고 선미는 안벽 쪽으로 끌릴 수 있습니다. 항해사는 속력을 줄이고 충분한 조타 여유를 유지해야 한다는 뜻입니다.\n※ 최근 복기에서 선박조종 관련 영어 지문이 출제되었다는 내용만 확인되어 실제 출제 지문은 알려져 있지 않으므로 이 문항은 같은 분야의 대비용 문장입니다.",
  "category": "영어",
  "source": "2026 최근 복기"
 },
 {
  "id": 111,
  "q": "다음 해사영어 장문을 해석하시오. (최근 복기형·실제 출제 원문 미상 대비) \"Before departure, the officer must verify that nautical information is up to date and that backup arrangements are ready. If the primary navigation system fails, the vessel should transfer promptly to the backup system and continue the voyage safely.\"",
  "hint1": "before departure / up to date / backup arrangements / primary navigation system fails",
  "hint2": "출항 전 최신 항해정보와 백업 준비 확인 / 주 항법시스템 고장 시 백업으로 전환",
  "answer": "출항 전에 항해사는 항해정보가 최신 상태인지와 백업 준비가 되어 있는지를 확인해야 합니다. 주 항법시스템이 고장 나면 선박은 즉시 백업시스템으로 전환하여 안전하게 항해를 계속해야 한다는 뜻입니다.\n※ 복기에는 장문 영어 해석이 출제되었다는 사실만 있고 원문이 남아 있지 않아 실제 출제문을 재현한 것이 아닌 대비용 문장입니다.",
  "category": "영어",
  "source": "2026 최근 복기"
 }
]

payload = json.dumps(EXTRA, ensure_ascii=False, indent=1)
supplement = (
    '<script data-bundled-src="data-navi2-recall.js">\n'
    '(function(){\n'
    "  'use strict';\n"
    '  const EXTRA = ' + payload + ';\n'
    '  const data = window.MD_DATA && window.MD_DATA["navi2"];\n'
    '  if(!data || !Array.isArray(data.QUESTIONS)) return;\n'
    '  const existing = new Set(data.QUESTIONS.map(q => Number(q.id)));\n'
    '  for(const q of EXTRA){ if(!existing.has(Number(q.id))) data.QUESTIONS.push(q); }\n'
    '  data.QUESTIONS.sort((a,b) => Number(a.id)-Number(b.id));\n'
    '  if(data.meta){\n'
    '    data.meta.description = data.QUESTIONS.length + "문제 · 면접 기출·최근 복기";\n'
    '    data.meta.version = "2.2-oral-recall-20260928";\n'
    '    data.meta.auditDate = "2026-09-28";\n'
    '    data.meta.auditScope = "90 official + 21 recent recall questions";\n'
    '    data.meta.auditBasis = "2023 official oral set + 2026 recent recall additions; current Korean law and IMO/IHO review where applicable";\n'
    '  }\n'
    '})();\n'
    '</script>'
)

# Replace any previous generated supplement, then insert immediately after the base navi2 bundle.
text = re.sub(
    r'\n?<script data-bundled-src="data-navi2-recall\.js">.*?</script>\n?',
    '\n',
    text,
    flags=re.S,
)
marker = '// ── 2급 항해사 면접 데이터'
start = text.find(marker)
if start < 0:
    raise SystemExit('navi2 base data marker not found')
end = text.find('</script>', start)
if end < 0:
    raise SystemExit('navi2 base data script end not found')
end += len('</script>')
text = text[:end] + '\n' + supplement + text[end:]

if text.count('data-bundled-src="data-navi2-recall.js"') != 1:
    raise SystemExit('navi2 recall supplement injection failed')

if text != original:
    p.write_text(text, encoding='utf-8')
print('navi2 recent oral recall patch applied: 21 questions')
