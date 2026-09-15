from pathlib import Path
import base64, gzip, json, re

PATH=Path('index.html')
text=PATH.read_text(encoding='utf-8-sig')
original=text
EXPLAIN_ID='md-bundle-past-explain-2026_js'
EXAM_ID='md-bundle-past-2026-navi3-3_js'
MARKERS=['㉮','㉯','㉰','㉱']

# Concise verified teaching notes for every 2026 3급 제3회 item.
# The answer/choice itself is read from the embedded paper so the note cannot drift from the displayed choice text.
RATIONALE={
'항해':[
'선체 영구자기의 수직분력은 수직 영구자석(heeling-error magnet)으로 보정하며, 플린더스 바는 주로 유도자기의 수직 성분에 따른 반원차 보정에 쓰입니다.',
'자이로컴퍼스의 속도오차는 선속이 커질수록 커지고, 남북 성분이 큰 침로에서 두드러지며, 위도가 높아질수록 같은 속도에 대한 영향이 커집니다.',
'자유 자이로를 지구상 중위도에 두면 지구자전에 의해 로터축이 수평면에서 도는 성분과 경사하는 성분을 함께 보이므로 회전운동과 경사운동이 병행됩니다.',
'대양에서 단순한 소각도 변침이 필요하다는 이유만으로 자동조타를 수동으로 바꿀 필요는 없습니다. 장시간 자동조타 후 점검, 특별경계 수역, 빈번한 변침 수역에서는 수동조타 준비·시험이 중요합니다.',
'IALA 방위표지의 색띠는 북 BY, 동 BYB, 남 YB, 서 YBY입니다. 따라서 동→서→남→북은 BYB→YBY→YB→BY 순서입니다.',
'미국·일본·필리핀 등은 IALA Region B를 채택합니다. 대한민국과 유럽 대부분은 Region A이므로 지역 체계를 혼동하지 않아야 합니다.',
'무신호는 안개·눈 등으로 시계가 나빠져 항해 안전에 지장이 있을 때 음향으로 항행 정보를 제공하는 항로표지입니다. 소리의 방향·세기만으로 정확한 위치나 거리를 정밀 산출하는 장치는 아닙니다.',
'총도·항양도·해안도는 항해용 해도의 축척·용도 분류에 속하지만 조류도는 조류의 방향·속도 정보를 표시하는 특수도이므로 일반 항해용 해도 종류와 구별합니다.',
'항로지(Sailing Directions)는 해안·항만·항로·위험물·법규 등 항해에 필요한 서술형 정보를 모은 수로서지로, 육상의 여행안내서와 비슷한 역할을 합니다.',
'비표준항의 조시·조고는 표준항 자료에 조시차와 조고비를 적용해 보정합니다. 조화상수 자체를 그대로 적용하는 문제가 아닙니다.',
'북태평양 중위도에서는 편서풍이 해수 표층을 동쪽으로 밀어 북태평양 해류를 형성하는 주요 바람계가 됩니다.',
'수평협각법은 세 물표의 기하학적 배치가 교차각을 좋게 만들어야 합니다. 중앙 물표가 좌우 물표 연결선보다 관측자 쪽에 가까운 배치가 유리하므로 반대 설명이 부적절합니다.',
'좁고 통항이 어려운 수로는 시계가 좋은 주간에, 횡압·조종 부담을 줄이도록 조류가 약한 시기를 택하는 것이 가장 안전합니다.',
'중분위도항법은 비교적 짧은 거리와 중위도에서 평면 근사를 이용하는 항법입니다. 교재상 평균위도 60° 이하·항정 600해리 이내에서는 오차를 약 1% 이하로 봅니다.',
'피험선 또는 위험예방선은 항만 입출항·좁은 수로·연안에서 안전한 이안거리를 유지하는 기준선으로 쓰입니다. 움직이는 다른 선박과의 충돌회피 판단용 선은 아닙니다.',
'점면항법은 위도차와 동서거를 평면 삼각법으로 다루지만 경도차(변경)를 직접 다루는 개념이 없어 중분위도항법 계산의 보조법으로 사용됩니다.',
'태양 출몰방위각을 관측할 때는 시수평에서 태양 하변의 고도가 태양의 겉보기 반지름과 같아 중심이 사실상 진수평에 해당하는 순간을 잡는 것이 표준적인 관측 시점입니다.',
'천체가 자오선을 통과하는 정중 부근에서는 시간에 따른 방위 변화가 크게 나타나는 조건이 되므로 방위각 변화가 최대가 되는 시기로 봅니다.',
'경도 145°25′E는 표준시차가 약 UTC+10인 구역입니다. 지방시 11월 27일 05:15에서 10시간을 빼면 UTC는 11월 26일 19:15가 됩니다.',
'레이더파는 대기 굴절 때문에 광선보다 지구 곡률을 더 따라 진행하는 것으로 취급하므로 레이더 수평선은 광학적 수평선보다 일반적으로 더 멉니다.',
'상대운동 벡터는 타선의 운동을 자선에 대한 상대운동으로 표시한 벡터입니다. 진운동 벡터와 동일한 개념이 아니며 상대운동 표시에서 타선이 자선에 대해 어떻게 움직이는지를 나타냅니다.',
'제2차 소인에 의한 거짓상은 다음 송신 주기에서 이전 펄스의 반사파가 들어와 생기므로 실제 물표와 방위는 같지만 표시 거리가 잘못됩니다.',
'펄스폭은 거리방향 분해능과 최소탐지거리 등에 큰 영향을 줍니다. 방위분해능은 주로 안테나 수평 빔폭의 영향을 받으므로 펄스폭 영향이 작습니다.',
'두 고정점까지의 거리 차가 일정한 점들의 자취는 쌍곡선입니다. 이 성질은 쌍곡선 항법의 기본 기하학입니다.',
'연안항로의 이안거리와 주요 지점 통과시각은 선박 크기, 기상·시정·해상, 선위측정 정확도 등 항해안전 요소로 정합니다. 화물의 가격 변동은 항로 안전 선정 기준이 아닙니다.'
],
'운용':[
'재화중량톤수(DWT)는 만재배수량에서 경하배수량을 뺀 값으로, 화물·연료·청수·선용품·승무원 등 실어 나를 수 있는 전체 중량 여유를 뜻합니다.',
'윈치, 데크 초크, 볼라드는 계류삭을 취급·유도·고정하는 계선설비입니다. Side opening은 선체 측면의 출입·하역용 개구부로 계선설비가 아닙니다.',
'선저도료 체계에서 방청도료(A/C)로 강재를 보호한 뒤 그 위에 B/T 계열 도료를 시공하는 순서로 설명합니다. 방오도료 위에 B/T를 덮는 순서가 아닙니다.',
'Reach는 전타를 시작한 위치에서 정상선회권의 중심까지 원침로 방향으로 잰 거리입니다. Advance는 보통 90° 변침 시까지 원침로 방향으로 전진한 거리입니다.',
'선박 6자유도 중 정횡 방향의 직선 왕복운동은 Sway입니다. Surge는 선수미 방향, Heave는 상하 방향 직선운동입니다.',
'강풍·파랑·강한 조류에서 큰 파주력을 확보할 때 두 닻을 서로 다른 방향에 놓아 사용하는 이묘박을 적용할 수 있습니다.',
'Cofferdam은 탱크·구획 사이를 격리하는 빈 공간으로 누설·오염 확산을 막는 구조입니다. Bilge keel, anti-rolling tank, gyroscopic stabilizer처럼 횡요를 억제하는 장치가 아닙니다.',
'무게중심이 정횡으로 GG′만큼 이동하면 가상 G를 기준으로 한 복원정에 횡이동 성분 GG′cosθ가 가감됩니다. 문항은 그 보정량의 크기를 묻습니다.',
'복원성 향상에는 무게중심을 낮추는 것이 유리합니다. 밸러스트로 무게중심을 높이면 GM과 복원여유가 줄어 전복 위험이 커질 수 있습니다.',
'중량을 양하하면 제거 중량을 음(-)의 중량으로 두어 모멘트 원리를 적용합니다. 새 배수량은 Δ-w이고, G는 제거된 중량의 반대 방향으로 이동합니다.',
'당직 인수 시에는 현재 선위, 선장의 지시, 예상 조류·해류 등 즉시 안전운항에 필요한 정보를 직접 확인합니다. 일출·일몰 시각 자체는 이 문항의 필수 자기확인 항목이 아닙니다.',
'하역당직 인계는 자선의 흘수·수심·조석, 빌지·평형수, 선적·잔존화물 등 자선 하역안전 정보가 핵심입니다. 주변 선석 다른 선박의 하역 진행상황은 필수 인계사항이 아닙니다.',
'정체전선은 서로 비슷한 세력의 기단 경계가 거의 이동하지 않는 전선으로 일반적으로 동서로 길게 형성되는 경우가 많습니다. 남북으로 놓일 때가 많다는 설명이 부적절합니다.',
'ASAS는 Analysis Surface Asia, 즉 아시아 지상 해석도를 뜻합니다. 고층 해석도나 파랑 해석도와 구별합니다.',
'지상일기도의 관측기호에서는 기압값을 숫자로 부호화해 기입합니다. 날씨·운량 등은 별도의 기호나 정해진 방식으로 표시합니다.',
'보일러 압력이 설정값을 넘으면 안전밸브가 자동으로 열려 증기를 방출해 과압을 방지합니다.',
'냉동사이클에서 증발기는 저압 냉매가 증발하면서 주위로부터 열을 흡수하는 열교환기입니다. 응축기는 반대로 외부로 열을 방출합니다.',
'사람이 물에 빠지는 순간부터 계속 눈으로 위치를 확인한 경우에는 Single turn이 가장 빠른 회수조선입니다. Williamson/Scharnow turn은 위치를 놓쳤거나 원항적 복귀가 필요한 경우에 유리합니다.',
'침수율(permeability)은 어떤 구획의 전체 용적 중 실제로 물이 들어갈 수 있는 빈 용적의 비율입니다. 침수속도나 선박 전체 침수비율이 아닙니다.',
'쇼크 환자는 기도·호흡·순환을 유지하고 출혈을 통제하며 체온을 보존해야 합니다. 수술 가능성이 있는 환자에게 음식이나 음료를 임의로 주는 것은 흡인 위험 등 때문에 부적절합니다.',
'타박상과 피하출혈의 초기 처치는 안정, 냉찜질, 손상부위 거상 등이 기본입니다. 초기에 마사지를 하면 출혈과 부종을 악화시킬 수 있습니다.',
'IAMSAR의 부채꼴 수색은 표적 위치가 비교적 정확하고 수색구역이 작으며 한 척의 수색선이 반복해서 기준점을 통과할 때 효과적인 방식입니다.',
'수색 중에도 COLREG가 적용되고 조종·경고신호와 통신은 중요합니다. 큰 변침을 한 번에 하기보다 다른 수색선이 예측하기 쉽도록 단계적으로 조정할 수 있으므로 이를 무조건 바람직하지 않다고 한 설명이 틀립니다.',
'BRM/선내 인적자원관리의 목적은 안전하고 효율적인 운항, 좋은 의사소통·팀워크·사기 유지입니다. 선장의 권위를 정당화하는 것 자체가 목적은 아닙니다.',
'가장 바람직한 복종은 명령의 필요성과 업무상 타당성을 이해하고 수용하는 형태입니다. 감정·두려움·개인적 취약성에 의한 복종보다 전문적입니다.'
],
'법규':[
'방파제 입구 부근에서 입항선과 출항선이 마주칠 때 입항선은 방파제 밖에서 출항선의 진로를 피해야 합니다. 좁은 입구에서 출항선의 안전한 이탈을 우선시키는 취지입니다.',
'선원법상 승무 중 직무 외 원인으로 부상·질병이 생긴 경우 선박소유자는 요양에 필요한 비용을 3개월 범위에서 부담합니다.',
'선박직원법령상 허가에 의한 승무기준 특례 사유에는 항행예정시간이 4시간 이내인 국내항 사이를 긴급히 항행할 필요가 있는 경우가 포함됩니다.',
'선박위치발신장치 대상 중 연해구역 이상을 항해하는 예선·유조선·위험물산적운송선은 총톤수 50톤 이상이 기준입니다. 따라서 30톤 유조선은 이 기준에 해당하지 않습니다.',
'임시검사는 선박시설의 개조·수리, 무선설비 설치, 만재흘수선 변경 등 안전성에 영향을 주는 경우를 대상으로 합니다. 선박검사증서의 선적항 변경은 그 자체로 임시검사 사유가 아닙니다.',
'해양사고에는 충돌·침몰·멸실 등 선박 또는 인명·운항과 관련된 법정 사고유형이 포함됩니다. 단순한 선박 화물의 유실만을 독립된 해양사고 유형으로 보는 것은 이 문항의 정의와 맞지 않습니다.',
'선박해양오염비상계획서는 법령상 정해진 검인절차를 거쳐 선박에 비치해야 하며, 이 문항에서는 해양경찰청장의 검인을 정답으로 묻고 있습니다.',
'기관구역의 기름오염 방지에는 기름여과장치, 선저폐수 농도경보 등 기관실 빌지 처리 설비가 핵심입니다. Slop tank는 주로 유조선 화물구역의 세정수·유성혼합물 저장과 관련됩니다.',
'선장이 긴급 필요 때문에 적하를 처분한 경우 손해배상액은 그 화물이 정상적으로 도달했을 시점의 양륙항 가격을 기준으로 산정합니다.',
'공동해손은 공동위험을 피하기 위한 의도적이고 합리적인 희생 또는 비용이 있고 그 결과 공동이익이 보전되는 구조입니다. 선박과 운송물 전부가 반드시 남아 있어야 한다는 요건은 아닙니다.',
'교통안전특정해역에서 통항시각 변경 등의 명령 대상은 거대선·위험화물운반선 등 법정 선박입니다. 문항의 180m 예인선열은 해당 길이기준에 미달하는 선택지입니다.',
'안전관리체제(ISM 성격)는 회사·선장의 책임과 권한, 절차 및 문서관리 등을 포함합니다. 선박 보안 자체는 ISPS 체계의 영역이므로 SMS 필수 항목으로 묻는 문항에서는 제외됩니다.',
'어로종사선은 일반적으로 조종불능선, 조종제한선, 흘수제약선의 진로를 피해야 하지만 범선에 대해서는 어로종사선이 더 우선하는 관계이므로 범선이 정답입니다.',
'흘수제약선은 가항수역의 수심·폭과 자기 흘수의 관계 때문에 현재 침로에서 벗어날 능력이 심하게 제한된 동력선입니다.',
'안전한 속력 결정의 일반 고려요소에는 시계, 교통밀도, 조종성능, 바람·해상·조류, 흘수와 가용수심 등이 있습니다. 항행보조시설 자체는 이 문항의 일반요소 목록에 해당하지 않습니다.',
'통항분리수역에서도 어로 자체가 절대 금지되는 것은 아니며, 어로선은 통항로를 따라가는 선박의 통항을 방해해서는 안 됩니다. 따라서 “어로작업을 할 수 없다”가 틀린 설명입니다.',
'COLREG의 안전속력은 충돌을 피하기 위해 적절하고 효과적인 동작을 취할 수 있고 당시의 사정에 알맞은 거리에서 멈출 수 있는 속력을 뜻합니다.',
'앞지르기 규칙은 서로 시계 안에 있는 선박의 항법에 속합니다. 경계, 충돌위험 판단, 좁은 수로 규칙은 시계상태와 무관하게 적용되는 부분에 포함됩니다.',
'홍색-백색-홍색 전주등을 수직으로 표시하는 선박은 조종성능제한선(RAM)입니다. 주간에는 구형-마름모꼴-구형 형상물을 수직으로 표시합니다.',
'레이더로 충돌위험을 확인했더라도 피항동작은 충분히 크고 명확해야 하며 상대선 쪽으로 위험하게 변침해서는 안 됩니다. 이 그림 문항은 제시된 상대배치에 따라 좌현 변침 선택지를 정답으로 제시합니다.',
'예인선은 기본 예인 마스트등과 선미·예인등을 표시하며, 길이 50m 이상이면 추가 마스트등을 표시합니다. 제시된 등화 조합은 문항에서 50m 이상·예인선열 200m 이하의 경우에 해당합니다.',
'주간 구형-마름모꼴-구형은 조종성능제한선의 형상물입니다. 준설작업선은 대표적인 조종성능제한 작업선입니다.',
'트롤망 이외의 어로종사선은 위에 홍색, 아래에 백색 전주등을 표시합니다. 대수속력이 없으면 현등과 선미등은 추가하지 않습니다.',
'조종신호는 서로 시계 안에서 항행 중인 선박이 실제 변침·후진 등 자기 조종의도를 알리는 신호입니다. 다른 선박에게 “동의”를 구하는 것이 일반 조종신호의 요건은 아닙니다.',
'좁은 수로에서 상대선 우현 쪽으로 앞지르려는 선박은 장음 2회에 단음 1회를 이어 울립니다. 좌현 쪽 앞지르기는 장음 2회+단음 2회와 구별합니다.'
],
'영어':[
'“I read you bad with signal strength one”은 수신상태가 매우 나쁘다는 뜻이므로 다른 작업채널로 재시도하자는 “Advise try VHF channel 06.”이 자연스러운 후속 통신입니다.',
'묘쇄를 감아들이는 상황에서 남은 샤클 수를 묻는 표준 표현은 “How many shackles are left to come in?”입니다. shackle은 앵커체인의 길이 단위입니다.',
'“does not have steerageway”는 타효가 생길 만큼 물에 대한 전진속력이 없어 조타가 듣지 않는다는 뜻이므로 “does not answer the wheel”과 같은 의미입니다.',
'묘쇄 장력은 관용적으로 “How much weight is on the cable?”로 묻습니다. 여기서 weight on the cable은 체인에 걸린 하중·장력을 뜻합니다.',
'컨테이너선의 적재능력은 표준 20피트 컨테이너 환산단위인 TEU로 나타내므로 “8,800 TEU”와 같은 응답이 맞습니다.',
'IMO-Class는 해상운송 위험물의 분류를 말하며 IMDG Code가 위험물·유해물질의 분류와 운송기준을 정합니다.',
'해역 안에 있다는 표현은 “in area”, 주의해서 항해하라는 SMCP 표현은 “Navigate with caution.”이므로 in / caution 조합이 맞습니다.',
'“suspended”는 일시 중단된이라는 뜻으로 “stopped temporarily”와 가장 가깝습니다. discontinued는 보통 더 영구적인 중단 뉘앙스가 있습니다.',
'“my tow”에서 tow는 예인하는 본선이 아니라 본선에 의해 끌려가는 피예인물·피예인선을 뜻합니다.',
'MMSI의 정식 명칭은 Maritime Mobile Service Identity number입니다. SART, MRCC, EPIRB의 제시된 잘못된 확장형과 구별합니다.',
'COLREG에서 충돌위험은 상황이 허용하면 접근선의 compass bearing이 뚜렷하게 변하는지 지속 관측하여 판단할 수 있습니다.',
'태양·달·별을 육분의로 관측하여 선위를 구하는 항법은 Celestial Navigation, 즉 천문항법입니다.',
'Broken space는 화물과 화물 또는 화물과 선체구조 사이에 생겨 실제 적재에 활용되지 못하는 잔여공간입니다. frame과 pillar 사이의 구조공간 자체는 문항의 broken space가 아닙니다.',
'천수에서 고속항해하면 squat가 커져 흘수가 증가한 것처럼 선체가 가라앉을 수 있습니다. 감속하면 squat가 크게 줄어 좌초 위험도 낮아집니다.',
'황색 띠·황색 X·황색 특수기호는 특정 용도나 구역을 알리는 Special mark의 특징입니다.',
'경보가 울렸다는 “alarm is sounded”는 경보가 발령·제기되었다는 뜻으로 raised가 가장 가까운 대체어입니다.',
'IMO Ships’ Routeing에서 recommended track은 가능한 위험이 없도록 특별히 조사되어 선박이 따라가도록 권고되는 항적을 뜻합니다.',
'MARPOL Annex I에서 해양학적·생태학적 조건과 교통특성 때문에 기름오염 방지를 위한 특별한 강제조치가 필요한 해역은 special area입니다.',
'SOLAS 기준상 여객선과 500GT 이상 화물선에는 양방향 VHF 장비 3대, 300GT 이상 500GT 미만 화물선에는 2대가 요구됩니다.',
'선박이 계약상 목적항에 도착해 용선계약 조건에 따라 하역 준비가 완료되었음을 선장 측이 통지하는 서면이 Notice of Readiness(NOR)입니다.',
'MARPOL Annex V는 선박 쓰레기(garbage)를 다루며, 포장형태 유해물질은 Annex III입니다. 따라서 Annex V를 packaged harmful substances로 설명한 선택지가 틀립니다.',
'항해용선에서 적·양하에 허용된 일정 기간을 laydays/laytime이라고 합니다. 이를 넘으면 조건에 따라 demurrage가 발생할 수 있습니다.',
'MARPOL에서 탱크 배수·세정수 등 유성혼합물을 모으도록 지정한 탱크가 slop tank입니다.',
'제시문은 밸브·배관·행거·브레이스·커플링의 누설, 녹, 열화를 검사하라고 합니다. 밸브의 opening failure 검사는 문장에 적혀 있지 않습니다.',
'“Pratique granted”는 검역당국으로부터 입항·교통허가가 부여되었다는 관용 표현입니다. 따라서 granted가 자연스럽습니다.'
],
'상선전문':[
'순적화 중량톤수는 적하에 실제 사용할 수 있는 중량으로, 적하중량에서 연료유·청수·밸러스트 잔량 등 항해에 필요한 소모품·잔량을 뺀 값으로 봅니다.',
'트림모멘트는 400×10=4,000 ton·m이고 MCTC가 160 ton·m/cm이므로 트림변화는 4,000/160=25cm입니다. TPC는 이 계산에 쓰이지 않습니다.',
'만재흘수선표의 F는 Fresh Water Summer Load Line, 즉 하기 담수 만재흘수선을 뜻합니다. TF는 열대 담수선입니다.',
'일반적인 중량화물과 경량화물 구분 기준은 40 ft³당 1 long ton을 기준으로 한 적부계수 개념을 사용합니다.',
'Cargo stowage plan에는 화물 종류·수량, 적부 위치, 양하지 등이 표시됩니다. 하역인부 투입 인원은 적부도의 기본 기재사항이 아닙니다.',
'펌프·배관의 국부압력이 액체의 포화증기압 아래로 내려가 기포가 생겼다가 붕괴하면서 진동·소음·손상을 일으키는 현상이 cavitation입니다.',
'Sweat는 공기 중 수증기가 차가운 표면이나 화물에 응결하는 현상으로, 화물창 공기의 노점과 표면온도의 관계가 핵심입니다.',
'선박법은 한국선박의 국적·등록·선적항·톤수와 관련된 기본사항을 규율합니다. 승무원 자격이나 근로조건, 안전설비는 다른 해사법령의 주된 영역입니다.',
'총톤수는 국내 해사법령 적용에서 선박의 크기를 나타내는 용적기반 지표입니다. 중량을 나타내는 값이 아니며 순톤수·재화중량톤수와 목적이 다릅니다.',
'선박법상 선박 종류의 기본 분류는 기선·범선·부선입니다. 여객선·화물선 등은 용도에 따른 다른 분류입니다.',
'선박 등기와 등록은 대상선박·선적항·절차가 법정되어 있습니다. “취득한 날부터 30일 이내 등록”이라고 일률적으로 단정한 선택지는 법정 등록절차의 표현과 맞지 않아 오답입니다.',
'선박국적증서에는 선박번호, 선적항, 주요 식별·톤수사항 등이 기재되지만 검사일은 선박검사증서 영역이므로 국적증서 기재사항이 아닙니다.',
'국제톤수증서는 국제총톤수뿐 아니라 순톤수 등 협약상 톤수 정보를 포함하므로 “국제총톤수만 기재”한다는 설명이 틀립니다.',
'정기선은 정해진 항로·일정으로 규칙적으로 운항하며 다수 화주의 일반·포장화물을 취급하는 특성이 강합니다. 특정 화주와의 용선계약은 정기선의 본질적 특징이 아닙니다.',
'항해용선계약에서는 선박 운항·선원 배승은 선주 측이 맡고 적양하에 laytime·demurrage 조항을 둡니다. 운임이 확정됐다는 이유만으로 모든 지연손해가 자동으로 용선자 부담이라는 설명은 부정확합니다.',
'시험에서 사용하는 전통적인 BDI 구성 운임지수 명칭과 비교할 때 BHI는 제시된 구성요소가 아닙니다. BDI 구성은 시기별 개편이 있으므로 이 문항은 해당 교재·시험 체계의 명칭을 기준으로 풉니다.',
'도선사·선장·해원이 선박의 항해 또는 관리 과정에서 일으킨 과실을 해상운송법상 항해과실(nautical fault)이라고 합니다.',
'정기선 운임은 공표운임·운임동맹 등의 영향으로 비교적 안정적이고 개별 화주와 완전히 자유롭게 매번 협상하는 성격이 약합니다.',
'P&I는 선원·제3자 인명, 충돌·부두손상 등 선주의 배상책임을 주로 담보합니다. 좌초로 인한 자기 선체 자체 손상은 통상 Hull & Machinery 보험 영역입니다.',
'SOLAS는 선박의 구조·소방·구명·항해안전 장비 등 인명안전 국제기준을 정합니다. 선원 자격·당직·훈련의 주된 국제기준은 STCW입니다.',
'SOLAS상 구조정은 비상 시 신속 투입할 수 있도록 계속 준비되어야 하며, 문항 기준으로 5분 이내 진수 가능한 상태가 요구됩니다.',
'자유낙하식 구명정의 퇴선훈련에서는 정해진 주기로 승정·고정 후 실제 이탈 없이 진수절차를 시작하는 훈련을 하며, 문항이 묻는 주기는 3개월입니다.',
'MARPOL Annex V 특별해역에서 분쇄·분말화된 음식찌꺼기도 가장 가까운 육지에서 최소 12해리 이상 떨어져 항해 중일 때 조건부 배출할 수 있습니다. 6해리에서 가능하다는 설명이 틀립니다.',
'선박보고제도는 SMC가 조난 부근 선박과 연락수단·능력을 신속히 파악해 지원선박을 찾고 대응시간을 줄이는 데 도움을 줍니다. 대응시간을 늘리는 것은 효과가 아닙니다.',
'MLC에서 성인 선원의 건강진단서는 통상 최대 2년 유효하고 색각 관련 증명은 별도 기준이 적용됩니다. “16세 미만 선원”을 전제로 한 설명은 MLC의 선원 최저연령 체계와 맞지 않아 이 문항의 오답입니다.'
]
}

for subject,notes in RATIONALE.items():
    if len(notes)!=25:
        raise SystemExit(f'{subject} rationale count is {len(notes)}, expected 25')

def script_pattern(script_id):
    return re.compile(r'(<script[^>]*\bid=["\']'+re.escape(script_id)+r'["\'][^>]*>)(.*?)(</script>)',re.S|re.I)

def decode_body(body):
    compact=re.sub(r'\s+','',body.strip())
    raw=base64.b64decode(compact)
    return gzip.decompress(raw).decode('utf-8')

def encode_body(decoded):
    packed=gzip.compress(decoded.encode('utf-8'),compresslevel=9,mtime=0)
    return base64.b64encode(packed).decode('ascii')

def replace_script(script_id,new_decoded):
    global text
    pat=script_pattern(script_id);m=pat.search(text)
    if not m:raise SystemExit(f'script not found: {script_id}')
    text=text[:m.start(2)]+encode_body(new_decoded)+text[m.end(2):]

def get_script(script_id):
    m=script_pattern(script_id).search(text)
    if not m:raise SystemExit(f'script not found: {script_id}')
    return decode_body(m.group(2))

def parse_q_calls(decoded):
    rows=[];pos=0
    while True:
        start=decoded.find('Q(',pos)
        if start<0:break
        i=start+2;depth=1;in_str=False;esc=False
        while i<len(decoded) and depth:
            ch=decoded[i]
            if in_str:
                if esc:esc=False
                elif ch=='\\':esc=True
                elif ch=='"':in_str=False
            else:
                if ch=='"':in_str=True
                elif ch=='(':depth+=1
                elif ch==')':depth-=1
            i+=1
        if depth:raise SystemExit('unterminated Q call')
        raw_args=decoded[start+2:i-1]
        try:vals=json.loads('['+raw_args+']')
        except Exception:
            pos=i;continue
        if len(vals)>=6 and isinstance(vals[0],int):rows.append((start,i,vals))
        pos=i
    return rows

# Correct 2026 3급 제3회 항해 Q21. IMO radar terminology defines a relative vector
# as predicted target movement relative to own ship; the bundled key had pointed to the true-vector choice.
exam=get_script(EXAM_ID)
rows=parse_q_calls(exam)
q21=[r for r in rows if r[2][0]==21 and r[2][4]=='항해']
if len(q21)!=1:raise SystemExit(f'could not uniquely locate 항해 Q21: {len(q21)}')
start,end,vals=q21[0]
if vals[3] not in (0,2):raise SystemExit(f'unexpected current 항해 Q21 answer: {vals[3]}')
if vals[3]!=2:
    vals[3]=2
    args=json.dumps(vals,ensure_ascii=False,separators=(',',':'))[1:-1]
    exam=exam[:start]+'Q('+args+')'+exam[end:]
    replace_script(EXAM_ID,exam)

# Re-read corrected paper and build the 125 explanation entries.
exam=get_script(EXAM_ID)
rows=parse_q_calls(exam)
questions={}
for _,_,vals in rows:
    if len(vals)<6:continue
    num,question,choices,answer,subject,_=vals[:6]
    if subject in RATIONALE and 1<=num<=25:
        questions[(subject,num)]={'question':question,'choices':choices,'answer':answer}
if len(questions)!=125:raise SystemExit(f'parsed {len(questions)} session-3 questions, expected 125')

explain=get_script(EXPLAIN_ID)
missing=[]
entries=[]
for subject in ['항해','운용','법규','영어','상선전문']:
    for num in range(1,26):
        key=f'2026|navi3|3|{subject}|{num}'
        if key in explain:continue
        q=questions[(subject,num)]
        ans=int(q['answer'])
        if ans<0 or ans>=len(q['choices']):raise SystemExit(f'invalid answer index: {key}={ans}')
        choice=str(q['choices'][ans])
        rationale=RATIONALE[subject][num-1]
        html=(
            '━━ 정답 해설 ━━'
            f'<strong>정답: {MARKERS[ans]} {choice}</strong><br>'
            f'{rationale}<br>'
            '━━ 핵심 암기 ━━'
            f'<strong>{subject} Q{num}</strong>: {choice}'
        )
        entries.append(f'  {json.dumps(key,ensure_ascii=False)}: {{ html: {json.dumps(html,ensure_ascii=False)} }},')
        missing.append(key)

if entries:
    close=explain.rfind('});')
    if close<0:raise SystemExit('explanation object closing marker not found')
    explain=explain[:close]+('\n' if not explain[:close].endswith('\n') else '')+'\n'.join(entries)+'\n'+explain[close:]
    count_match=re.search(r'(항목 수:\s*)(\d+)',explain)
    if count_match:
        old_count=int(count_match.group(2));new_count=old_count+len(entries)
        explain=explain[:count_match.start(2)]+str(new_count)+explain[count_match.end(2):]
    replace_script(EXPLAIN_ID,explain)

if text!=original:
    PATH.write_text(text,encoding='utf-8')
    print(f'patched 2026 session3: added {len(entries)} explanations; radar Q21 corrected')
else:
    print('2026 session3 explanations already complete and radar Q21 already corrected')
