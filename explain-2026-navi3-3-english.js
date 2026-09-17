// 2026년 제3회 3급항해사(상선) 영어 상세 해설
// 2024~2025 영어 해설의 구성(지문 독해·청크·어휘·보기·정답 근거·핵심 암기)에 맞춘 보강판.
(function(){
  'use strict';
  const previous=window.get2026Navi3Session3Explain;
  const M=['㉮','㉯','㉰','㉱'];
  const C='#0EA5E9',G='#94A3B8',Y='#FEF3C7';
  const H=s=>String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const DATA={
    1:{
      ko:'다음 무선 교신의 빈칸에 가장 알맞은 문장을 고르는 문제입니다. 상대선이 “signal strength one”이라고 했으므로 수신상태가 매우 나쁜 상황입니다.',
      chunks:[['How do you read me?','하우 두 유 리드 미','내 신호가 어떻게 들립니까? / 수신상태가 어떻습니까?'],['I read you bad','아이 리드 유 배드','귀선의 신호가 나쁘게 들립니다'],['with signal strength one','위드 시그널 스트렝스 원','신호강도 1로 들립니다'],['Advise try VHF channel 06.','어드바이즈 트라이 브이에이치에프 채널 제로 식스','VHF 채널 06을 시도해 보기를 권고합니다']],
      vocab:[['read','리드','무선통신에서 상대 신호의 수신상태를 말할 때 쓰는 표현'],['signal strength','시그널 스트렝스','신호 강도'],['advise','어드바이즈','권고하다; SMCP에서 지시·권고를 간결하게 전달할 때 자주 사용']],
      choices:['계속 말하십시오.','정보가 없습니다.','VHF 채널 06을 시도해 보기를 권고합니다.','귀하의 메시지를 받을 준비가 되어 있습니다.'],
      grammar:'SMCP의 “Advise + 동사원형”은 “~하기를 권고한다”는 간결한 통신형 표현입니다. 여기서는 수신상태가 매우 나쁘므로 다른 채널 사용을 권고하는 문장이 문맥에 맞습니다.',
      why:'signal strength one은 양호한 수신이 아니라 매우 약한 수신을 뜻합니다. 따라서 단순히 “Go ahead”라고 하거나 수신 준비를 알리는 것보다 다른 VHF 채널을 시도하라는 ㉰가 자연스럽습니다.',
      memory:'How do you read me? = 수신상태 질문 → 신호가 매우 약하면 다른 채널 시도 권고.'
    },
    2:{
      ko:'“더 감아들여야 할 묘쇄는 얼마나 남아 있는가?”를 SMCP식 영어로 고르는 문제입니다.',
      chunks:[['How many shackles','하우 메니 섀클즈','몇 샤클이'],['are left','아 레프트','남아 있는가'],['to come in?','투 컴 인','감아들여져야 할 / 들어와야 할']],
      vocab:[['shackle','섀클','묘쇄의 길이를 세는 단위인 샤클(절)'],['be left','비 레프트','남아 있다'],['come in','컴 인','묘쇄가 감겨 들어오다']],
      choices:['몇 샤클이 가야 하는가? — much는 가산명사 shackles와 맞지 않습니다.','물속에 케이블이 몇 개 있는가? — 의미가 다릅니다.','몇 개의 케이블을 감아올려야 하는가? — shackle 수를 묻는 표현이 아닙니다.','감아들여야 할 샤클이 몇 개 남았는가?'],
      grammar:'shackle은 셀 수 있는 명사이므로 수량을 물을 때 “How many shackles”가 맞습니다. “be left to + 동사”는 “~할 것이 남아 있다”의 구조입니다.',
      why:'한국어 문장의 핵심은 “남아 있는 샤클 수”입니다. 이를 그대로 담은 “How many shackles are left to come in?”이 정답입니다.',
      memory:'shackle은 가산명사 → How many shackles. “are left to come in” = 감아들일 것이 남아 있다.'
    },
    3:{
      ko:'“The vessel does not have steerageway.”와 같은 뜻을 고르는 문제입니다.',
      chunks:[['The vessel','더 베슬','그 선박은'],['does not have','더즈 낫 해브','가지고 있지 않다'],['steerageway','스티어리지웨이','타효를 얻을 수 있을 정도의 대수속력/전진력']],
      vocab:[['steerageway','스티어리지웨이','타가 효과를 발휘할 만큼 물을 가르는 속력'],['answer the wheel','앤서 더 휠','타를 먹다, 조타에 반응하다']],
      choices:['선박이 안전하게 항주하고 있다.','선박이 매우 빠르게 선회한다.','선박이 후진하고 있다.','선박이 타에 반응하지 않는다.'],
      grammar:'“answer the wheel”은 일반 영어의 answer가 아니라 해사 관용표현으로 “조타에 반응하다”라는 뜻입니다.',
      why:'steerageway가 없으면 타 주위의 유동이 충분하지 않아 조타효과를 기대하기 어렵습니다. 따라서 “does not answer the wheel”이 가장 같은 의미입니다.',
      memory:'steerageway 없음 ≈ 타효 없음 → does not answer the wheel.'
    },
    4:{
      ko:'“묘쇄의 장력이 어떠합니까?”에 해당하는 표준 표현의 빈칸을 고르는 문제입니다.',
      chunks:[['How much weight','하우 머치 웨이트','얼마나 많은 하중이'],['is on','이즈 온','~에 걸려 있는가'],['the cable?','더 케이블','묘쇄에']],
      vocab:[['weight on the cable','웨이트 온 더 케이블','묘쇄에 걸리는 하중·장력 상태'],['cable','케이블','이 문맥에서는 anchor cable, 즉 묘쇄']],
      choices:['grow / for — 문법과 의미 모두 맞지 않습니다.','tension / to — “tension to the cable”은 이 표준표현이 아닙니다.','weight / on — “How much weight is on the cable?”','counter / on — counter는 문맥상 의미가 맞지 않습니다.'],
      grammar:'“How much + 불가산명사 + is on + 대상?” 구조입니다. weight는 여기서 하중의 양을 뜻해 much와 결합합니다.',
      why:'SMCP에서 묘쇄에 걸린 장력·하중 상태를 묻는 표현은 “How much weight is on the cable?”이므로 ㉰가 맞습니다.',
      memory:'묘쇄 장력 질문 = How much weight is on the cable?'
    },
    5:{
      ko:'“What is the container capacity of the vessel?”에 알맞게 답하는 문제입니다. 컨테이너선의 적재능력 단위를 묻습니다.',
      chunks:[['What is','왓 이즈','무엇입니까'],['the container capacity','더 컨테이너 커패서티','컨테이너 적재능력은'],['of the vessel?','오브 더 베슬','그 선박의']],
      vocab:[['container capacity','컨테이너 커패서티','컨테이너선의 적재능력'],['TEU','티이유','Twenty-foot Equivalent Unit, 20피트 컨테이너 환산 단위']],
      choices:['7,500 tons — 중량 단위라 컨테이너 적재개수 능력 표현으로 부적절합니다.','8,800 TEU — 컨테이너선 적재능력의 표준적 표현입니다.','5,000 boxes — 일상어 box는 공식적인 용량 단위가 아닙니다.','8,000 cubic metres — 용적 단위입니다.'],
      grammar:'capacity 뒤에 무엇을 단위로 표현하는지가 핵심입니다. 컨테이너선은 통상 TEU로 환산해 표시합니다.',
      why:'문항은 컨테이너선의 capacity를 묻고 있으므로 “8,800 TEU”가 정답입니다.',
      memory:'컨테이너 적재능력 = TEU. ton은 중량, m³는 용적.'
    },
    6:{
      ko:'SMCP에서 IMO-Class가 어떤 규정에 따라 분류되는지를 묻는 문제입니다.',
      chunks:[['IMO-Class means','아이엠오 클래스 민즈','IMO Class란 ~을 뜻한다'],['group of dangerous or hazardous goods','그룹 오브 데인저러스 오어 해저더스 굿즈','위험하거나 유해한 화물의 분류군'],['in sea transport','인 씨 트랜스포트','해상운송에서'],['as classified in the IMDG Code','애즈 클래시파이드 인 디 아이엠디지 코드','IMDG Code에 따라 분류된']],
      vocab:[['hazardous goods','해저더스 굿즈','위험물'],['marine pollutants','머린 폴루턴츠','해양오염물질'],['IMDG Code','아이엠디지 코드','International Maritime Dangerous Goods Code, 국제해상위험물규칙']],
      choices:['IBC Code — 산적 위험화학품 관련 코드입니다.','ISPS Code — 선박·항만시설 보안 관련 코드입니다.','IGC Code — 산적 액화가스 운송선 관련 코드입니다.','IMDG Code — 포장 위험물의 해상운송 분류·취급 규정입니다.'],
      grammar:'“as classified in ~”은 “~에 분류된 바에 따라”라는 수동분사 구조입니다.',
      why:'문장 자체가 해상운송 위험물·유해물질·해양오염물질의 class를 묻고 있으므로 IMDG Code가 맞습니다.',
      memory:'IMO-Class ↔ IMDG Code.'
    },
    7:{
      ko:'“홍도 주위 해역에 소형 어선들이 있습니다. 주의하여 항해하십시오.”에 맞게 전치사와 명사를 넣는 문제입니다.',
      chunks:[['Small fishing boats','스몰 피싱 보츠','소형 어선들이'],['in area around Hongdo island','인 에어리어 어라운드 홍도 아일랜드','홍도 주변 해역에 있다'],['Navigate with caution.','내비게이트 위드 코션','주의하여 항해하십시오']],
      vocab:[['in area','인 에어리어','어떤 해역·구역 안에'],['with caution','위드 코션','주의하여, 조심해서'],['navigate','내비게이트','항해하다']],
      choices:['at / caution — area에는 in이 자연스럽습니다.','in / carefully — 첫 빈칸은 가능하지만 “with carefully”가 되므로 틀립니다.','in / caution — 두 표현 모두 자연스럽습니다.','at / carefully — 두 빈칸 모두 맞지 않습니다.'],
      grammar:'전치사 with 뒤에는 명사 caution이 와야 합니다. carefully는 부사이므로 “Navigate carefully”처럼 전치사 없이 써야 합니다.',
      why:'“in area”와 “with caution”의 결합이 모두 성립하는 ㉰가 정답입니다.',
      memory:'in an area / with caution. 부사 carefully를 쓰면 Navigate carefully.'
    },
    8:{
      ko:'“Traffic lane has been stopped temporarily.”의 밑줄 의미와 가장 가까운 단어를 고르는 문제입니다.',
      chunks:[['Traffic lane','트래픽 레인','통항로가'],['has been stopped','해즈 빈 스탑트','중단되었다'],['temporarily','템퍼러릴리','일시적으로']],
      vocab:[['suspend','서스펜드','일시 중단하다'],['divert','다이버트','우회시키다, 방향을 바꾸다'],['discontinue','디스컨티뉴','중단하다; 문맥에 따라 장기·영구 중단 뉘앙스 가능']],
      choices:['avoided — 피하다','suspended — 일시 중단되다','diverted — 우회되다','discontinued — 중단되다'],
      grammar:'현재완료 수동 “has been stopped”는 “중단된 상태가 되었다”는 뜻입니다. temporarily가 있으므로 ‘일시 중단’ 의미가 핵심입니다.',
      why:'suspend는 서비스·운항·활동을 일시적으로 중단한다는 뜻이므로 “stopped temporarily”와 가장 정확히 대응합니다.',
      memory:'stopped temporarily = suspended.'
    },
    9:{
      ko:'“You are heading towards my tow.”의 정확한 해석을 고르는 문제입니다.',
      chunks:[['You are heading','유 아 헤딩','귀선은 향하고 있다'],['towards','터워즈','~쪽으로'],['my tow','마이 토우','내가 예인 중인 피예인물/예인열 쪽으로']],
      vocab:[['head towards','헤드 터워즈','~을 향해 가다'],['tow','토우','예인; 문맥상 피예인물 또는 예인열']],
      choices:['귀선은 본선을 향하여 오고 있다.','귀선은 본선의 피예인물을 향하여 가고 있다.','귀선은 본선과 피예인물 사이로 향하고 있다.','귀선은 피예인물과 같은 방향으로 가고 있다.'],
      grammar:'“be heading towards + 목적어”는 “~을 향해 가고 있다”입니다. 여기서 my tow는 “나의 예인행위”가 아니라 현재 끌고 있는 피예인물/예인열을 가리킵니다.',
      why:'따라서 상대선이 본선 자체가 아니라 본선이 끌고 있는 피예인물을 향하고 있다는 ㉯가 맞습니다.',
      memory:'my tow = 내가 끌고 있는 것. heading towards my tow = 피예인물 쪽으로 접근.'
    },
    10:{
      ko:'해사 약어의 공식 풀네임이 정확한 것을 고르는 문제입니다.',
      chunks:[['Select one','셀렉트 원','하나를 고르시오'],['which has correct SMCP expression','위치 해즈 커렉트 에스엠씨피 익스프레션','SMCP 표현이 정확한 것을']],
      vocab:[['MMSI','엠엠에스아이','Maritime Mobile Service Identity'],['MRCC','엠알씨씨','Maritime Rescue Co-ordination Centre'],['EPIRB','이퍼브','Emergency Position-Indicating Radio Beacon'],['SART','사트','Search and Rescue Transponder 계열 약어']],
      choices:['SART: Search And Radio Transmitter — 공식 풀네임이 아닙니다.','MRCC: Marine Rescue Coordination Center — 첫 단어가 Maritime이어야 합니다.','MMSI: Maritime Mobile Service Identity number — 핵심 공식명칭이 맞습니다.','EPIRB: Emergency Position Indexing Radio Beacon — Position-Indicating이 맞습니다.'],
      grammar:'약어 문제는 뜻이 비슷한 단어를 섞은 오답이 많으므로 각 단어를 정확히 외우는 편이 안전합니다.',
      why:'MMSI의 공식 명칭은 Maritime Mobile Service Identity이므로 ㉰가 맞습니다.',
      memory:'MMSI = Maritime Mobile Service Identity. MRCC는 Maritime, EPIRB는 Position-Indicating.'
    },
    11:{
      ko:'충돌위험을 판단할 때 접근선의 무엇을 주의 깊게 관찰하는지를 묻는 문장입니다.',
      chunks:[['Risk of collision','리스크 오브 컬리전','충돌의 위험은'],['can be ascertained','캔 비 애서테인드','확인될 수 있다'],['by carefully watching','바이 케어풀리 와칭','주의 깊게 관찰함으로써'],['compass bearing of an approaching vessel','컴퍼스 베어링 오브 언 어프로칭 베슬','접근하는 선박의 나침방위']],
      vocab:[['ascertain','애서테인','확인하다, 알아내다'],['compass bearing','컴퍼스 베어링','나침방위'],['approaching vessel','어프로칭 베슬','접근하는 선박']],
      choices:['track — 항적','ship’s motion — 선박의 운동','true course — 진침로','compass bearing — 나침방위'],
      grammar:'“by + 동명사”는 방법을 나타냅니다. 즉 “~을 관찰함으로써 충돌위험을 확인한다”는 구조입니다.',
      why:'충돌위험 판단의 대표 기준은 접근선의 compass bearing이 뚜렷하게 변하는지 여부를 지속 관찰하는 것입니다. 따라서 ㉱가 맞습니다.',
      memory:'collision risk 판단 → approaching vessel의 compass bearing 관찰.'
    },
    12:{
      ko:'태양·달·별을 육분의로 관측하는 항법의 명칭을 묻는 문제입니다.',
      chunks:[['involves taking observations','인볼브즈 테이킹 옵저베이션즈','관측하는 것을 포함한다'],['of the sun, moon and stars','오브 더 선 문 앤 스타즈','태양·달·별을'],['with a sextant','위드 어 섹스턴트','육분의로']],
      vocab:[['celestial','설레스철','천체의'],['observation','옵저베이션','관측'],['sextant','섹스턴트','육분의']],
      choices:['Gyro-Navigation — 자이로 관련 항법','Celestial Navigation — 천문항법','Terrestrial Navigation — 지문항법','Electronic Navigation — 전자항법'],
      grammar:'“involve + 동명사”는 “~하는 것을 포함하다”입니다. taking observations가 involve의 목적어입니다.',
      why:'천체를 육분의로 관측해 선위를 구하는 방법은 Celestial Navigation이므로 ㉯가 맞습니다.',
      memory:'sun / moon / stars + sextant = Celestial Navigation.'
    },
    13:{
      ko:'화물 적부에서 broken space에 해당하지 않는 공간을 고르는 문제입니다.',
      chunks:[['Which of the following','위치 오브 더 팔로잉','다음 중 어느 것이'],['is NOT','이즈 낫','~이 아닌가'],['a broken space?','어 브로큰 스페이스','broken space인가']],
      vocab:[['broken space','브로큰 스페이스','화물 적재 시 실제 화물로 채우기 어려워 낭비되는 공간'],['hold','홀드','화물창'],['pillar','필러','기둥'],['bracket','브래킷','브래킷·보강재']],
      choices:['화물과 화물 사이의 빈 공간 — 적부상 broken space가 될 수 있습니다.','화물창의 frame과 pillar 사이 공간 — 화물 사이에 생긴 적부 손실공간이라는 설명과 다릅니다.','화물과 pillar 사이 공간 — 적부상 이용하기 어려운 공간입니다.','화물과 bracket 사이 공간 — 적부상 이용하기 어려운 공간입니다.'],
      grammar:'NOT을 놓치면 반대로 고르게 되는 문제입니다. 먼저 “broken space가 아닌 것”을 찾는 문제인지 확인해야 합니다.',
      why:'frame과 pillar 자체 사이의 구조적 공간은 이 문항에서 말하는 화물 적부로 인해 생기는 broken space의 사례로 보지 않으므로 ㉯가 정답입니다.',
      memory:'broken space = 화물 적부 때문에 활용하지 못하는 틈. 문제의 NOT 표시 확인.'
    },
    14:{
      ko:'천수에서 고속으로 항해할 때 좌초위험을 키우는 현상을 묻는 문제입니다.',
      chunks:[['passing over a shallow patch','패싱 오버 어 섈로 패치','얕은 수역을 지나면서'],['at high speed','앳 하이 스피드','고속으로'],['may be in danger of grounding','메이 비 인 데인저 오브 그라운딩','좌초 위험에 처할 수 있다'],['a small reduction in speed','어 스몰 리덕션 인 스피드','약간의 감속이'],['has a significant effect in reducing squat','해즈 어 시그니피컨트 이펙트 인 리듀싱 스쿼트','squat 감소에 큰 효과가 있다']],
      vocab:[['shallow patch','섈로 패치','얕은 수역'],['grounding','그라운딩','좌초'],['squat','스쿼트','천수·제한수역 고속항행 시 선체가 침하하고 트림이 변하는 현상']],
      choices:['list — 횡경사','pressure — 압력','squat — 스쿼트 현상','free surface — 자유수면 효과'],
      grammar:'“which in turn”은 앞 문장의 결과가 다시 다음 결과를 낳는다는 뜻으로 “그 결과 다시” 정도로 해석합니다.',
      why:'감속하면 squat이 크게 줄어 좌초 위험도 감소한다는 문맥이므로 빈칸은 squat입니다.',
      memory:'shallow water + high speed + grounding risk → squat. 속도 감소가 핵심 대책.'
    },
    15:{
      ko:'“One yellow band, yellow X or yellow symbol”이 어떤 항로표지를 설명하는지 묻는 문제입니다.',
      chunks:[['One yellow band','원 옐로 밴드','하나의 황색 띠'],['yellow X','옐로 엑스','황색 X'],['or yellow symbol','오어 옐로 심벌','또는 황색 기호']],
      vocab:[['special mark','스페셜 마크','특수표지'],['safe water mark','세이프 워터 마크','안전수역표지'],['isolated danger mark','아이솔레이티드 데인저 마크','고립장애표지']],
      choices:['Special marks — 특수표지','Safe water marks — 안전수역표지','New danger marks — 신위험물표지','Isolated danger marks — 고립장애표지'],
      grammar:'이 문제는 문법보다 표지의 색·기호 조합을 영어 명칭과 연결하는 어휘·지식 문제입니다.',
      why:'황색 계통과 X형/특수기호는 Special mark를 식별하는 대표적인 특징이므로 ㉮가 맞습니다.',
      memory:'Yellow + X/special symbol → Special mark.'
    },
    16:{
      ko:'“when this alarm is sounded”에서 sounded를 가장 자연스럽게 바꿀 수 있는 단어를 고르는 문제입니다.',
      chunks:[['the muster list shall specify','더 머스터 리스트 셸 스페서파이','비상배치표는 명시해야 한다'],['the general emergency alarm','더 제너럴 이머전시 얼람','일반비상경보를'],['when this alarm is sounded','웬 디스 얼람 이즈 사운디드','이 경보가 울릴 때/발령될 때']],
      vocab:[['muster list','머스터 리스트','비상배치표'],['sound an alarm','사운드 언 얼람','경보를 울리다'],['raise an alarm','레이즈 언 얼람','경보를 발하다/울리다']],
      choices:['lifted — 들어 올려진','tuned — 조율된','raised — 발령된/울려진','changed — 변경된'],
      grammar:'alarm은 “sound an alarm”과 “raise an alarm” 모두 자연스러운 결합입니다. 수동태에서는 “alarm is sounded/raised”가 됩니다.',
      why:'문맥상 “경보가 울리다·발령되다”와 가장 가까운 것은 raised이므로 ㉰가 맞습니다.',
      memory:'sound/raise an alarm = 경보를 울리다.'
    },
    17:{
      ko:'IMO ships’ routeing에서 “위험이 가능한 한 없도록 특별히 조사되었고 선박에게 따라가도록 권고되는 항로”의 용어를 묻습니다.',
      chunks:[['a route which has been specially examined','어 루트 위치 해즈 빈 스페셜리 이그재민드','특별히 조사된 항로'],['to ensure so far as possible','투 인슈어 소 파 애즈 파서블','가능한 한 보장하기 위해'],['that it is free of dangers','댓 잇 이즈 프리 오브 데인저스','위험이 없도록'],['along which ships are advised to navigate','얼롱 위치 쉽스 아 어드바이즈드 투 내비게이트','선박에게 따라 항해하도록 권고되는']],
      vocab:[['routeing','루팅','선박 항로설정'],['free of dangers','프리 오브 데인저스','위험물이 없는'],['recommended track','레커멘디드 트랙','권고항로']],
      choices:['two-way route — 양방향 항로','inshore traffic zone — 연안통항대','recommended path — 이 정의의 공식 용어가 아닙니다.','recommended track — 권고항로'],
      grammar:'“along which”는 관계대명사 구조로 “그 항로를 따라”라고 해석합니다. “be advised to navigate”는 “항해하도록 권고받다”입니다.',
      why:'제시된 정의가 IMO routeing의 recommended track 정의와 일치하므로 ㉱가 정답입니다.',
      memory:'specially examined + free of dangers + advised to navigate → recommended track.'
    },
    18:{
      ko:'MARPOL Annex I에서 특별한 오염방지 강제조치가 필요한 해역의 용어를 묻는 정의형 문제입니다.',
      chunks:[['a sea area where','어 씨 에어리어 웨어','~한 해역'],['for recognized technical reasons','포 레커그나이즈드 테크니컬 리즌즈','인정된 기술적 이유로'],['in relation to its oceanographical and ecological condition','인 릴레이션 투 이츠 오셔너그래피컬 앤 이컬라지컬 컨디션','해양학적·생태학적 조건과 관련하여'],['special mandatory methods','스페셜 맨더토리 메서즈','특별한 강제 방법이'],['for the prevention of sea pollution by oil','포 더 프리벤션 오브 씨 폴루션 바이 오일','기름에 의한 해양오염 방지를 위해']],
      vocab:[['oceanographical','오셔너그래피컬','해양학적인'],['ecological','이컬라지컬','생태학적인'],['mandatory','맨더토리','의무적인, 강제적인'],['special area','스페셜 에어리어','특별해역']],
      choices:['nearest land — 최근접 육지','coastal area — 연안해역','special area — 특별해역','prohibited zone — 금지구역'],
      grammar:'긴 문장이지만 골격은 “( ) means a sea area where ... methods ... are required.”입니다. 중간 수식어를 걷어내면 정의가 보입니다.',
      why:'MARPOL에서 특정 해역의 특성 때문에 특별한 강제 오염방지조치가 요구되는 해역은 special area이므로 ㉰가 맞습니다.',
      memory:'MARPOL + 특별 강제 오염방지조치 요구 해역 = special area.'
    },
    19:{
      ko:'SOLAS에 따른 양방향 VHF 무선전화 장비의 최소 수량을 선박 종류·톤수별로 고르는 문제입니다.',
      chunks:[['At least three two-way VHF radiotelephone apparatus','앳 리스트 쓰리 투웨이 브이에이치에프 레이디오텔러폰 애퍼래터스','최소 3대의 양방향 VHF 무선전화 장비'],['on every passenger ship','온 에브리 패신저 쉽','모든 여객선에'],['and on every cargo ship of 500 gross tonnage and upwards','앤 온 에브리 카고 쉽 오브 파이브 헌드레드 그로스 터니지 앤 업워즈','500톤 이상 모든 화물선에'],['At least two','앳 리스트 투','최소 2대'],['300 gross tonnage and upwards but less than 500','쓰리 헌드레드 그로스 터니지 앤 업워즈 벗 레스 댄 파이브 헌드레드','300톤 이상 500톤 미만']],
      vocab:[['at least','앳 리스트','적어도'],['and upwards','앤 업워즈','이상'],['less than','레스 댄','미만'],['two-way VHF radiotelephone','투웨이 브이에이치에프 레이디오텔러폰','양방향 VHF 무선전화기']],
      choices:['(a) 1, (b) 2','(a) 2, (b) 1','(a) 2, (b) 3','(a) 3, (b) 2'],
      grammar:'“500 gross tonnage and upwards”는 500GT 이상, “300 ... and upwards but less than 500”은 300GT 이상 500GT 미만입니다.',
      why:'문항의 기준은 여객선 및 500GT 이상 화물선 3대, 300GT 이상 500GT 미만 화물선 2대이므로 ㉱가 맞습니다.',
      memory:'two-way VHF: 여객선/≥500GT 화물선 3대, 300≤GT<500 화물선 2대.'
    },
    20:{
      ko:'선박이 용선계약상 선적·양하 준비가 완료되었음을 도착 후 대리점 등에 알리는 서면의 명칭을 묻습니다.',
      chunks:[['a written notice or note','어 리튼 노티스 오어 노트','서면 통지서'],['produced by the master of a ship','프로듀스트 바이 더 마스터 오브 어 쉽','선장이 작성한'],['as soon as his ship arrives','애즈 순 애즈 히즈 쉽 어라이브즈','선박이 도착하자마자'],['stating that the ship is ready','스테이팅 댓 더 쉽 이즈 레디','선박이 준비되었음을 명시하는'],['to load and/or discharge','투 로드 앤드 오어 디스차지','선적 및/또는 양하할 준비가']],
      vocab:[['notice','노티스','통지'],['readiness','레디니스','준비가 된 상태'],['charter party','차터 파티','용선계약서'],['discharge','디스차지','양하하다']],
      choices:['Bill of lading — 선하증권','Shipping order — 선적지시서','Mate’s receipt — 본선수취증','Notice of Readiness — 하역준비완료통지서'],
      grammar:'“stating that ...”은 앞의 notice를 설명하는 분사구문으로 “~라고 명시하는 통지서”입니다.',
      why:'정의가 그대로 Notice of Readiness(NOR)에 해당하므로 ㉱가 정답입니다.',
      memory:'도착 + 선적/양하 준비 완료를 서면 통지 = NOR (Notice of Readiness).'
    },
    21:{
      ko:'MARPOL 각 Annex의 오염방지 대상 설명 중 틀린 것을 찾는 문제입니다.',
      chunks:[['Select one','셀렉트 원','하나를 고르시오'],['which has the wrong explanation','위치 해즈 더 롱 엑스플러네이션','설명이 틀린 것을']],
      vocab:[['noxious liquid substances in bulk','녹셔스 리퀴드 섭스턴시즈 인 벌크','산적 유해액체물질'],['sewage','수어리지','오수'],['harmful substances in packaged form','함풀 섭스턴시즈 인 패키지드 폼','포장형태의 유해물질'],['garbage','가비지','선박 쓰레기']],
      choices:['Annex II — 산적 유해액체물질 오염방지: 맞는 설명입니다.','Annex IV — 선박 오수 오염방지: 맞는 설명입니다.','Annex V — 포장형태 유해물질 오염방지: 틀린 설명입니다. 포장형태 유해물질은 Annex III입니다.','Annex VI — 선박 대기오염 방지: 맞는 설명입니다.'],
      grammar:'“wrong explanation”을 찾는 역문제입니다. 각 Annex 번호와 대상을 일대일로 대응해야 합니다.',
      why:'MARPOL Annex V는 garbage 관련 규정이고, harmful substances carried by sea in packaged form은 Annex III이므로 ㉰가 틀린 설명입니다.',
      memory:'Annex III = packaged harmful substances / Annex V = garbage.'
    },
    22:{
      ko:'항해용선계약에서 선적·양하에 정해진 기간의 명칭을 묻는 문제입니다.',
      chunks:[['On a voyage charter party','온 어 보이지 차터 파티','항해용선계약에서'],['the charter will specify','더 차터 윌 스페서파이','용선계약은 명시한다'],['a definite period of time','어 데피닛 피리어드 오브 타임','정해진 기간을'],['for loading or discharging of cargo','포 로딩 오어 디스차징 오브 카고','화물의 선적 또는 양하를 위한'],['This time is called laydays.','디스 타임 이즈 콜드 레이데이즈','이 기간을 laydays라 한다']],
      vocab:[['voyage charter party','보이지 차터 파티','항해용선계약'],['laydays','레이데이즈','시험 문맥에서 선적·양하에 허용된 약정기간'],['demurrage','디머리지','허용시간 초과에 따른 체선료'],['dispatch','디스패치','조기 완료에 따른 조출료']],
      choices:['laydays — 약정된 선적·양하 기간','demurrage — 기간 초과 시 체선료','dispatch — 조기 완료 시 조출료','days of readiness — 해당 용어가 아닙니다.'],
      grammar:'“This time is called ~”는 “이 기간을 ~라고 부른다”는 수동구문입니다.',
      why:'제시된 보기 중 선적·양하를 위해 정한 기간 자체를 뜻하는 것은 laydays이므로 ㉮가 맞습니다.',
      memory:'기간 자체 = laydays/laytime 계열, 초과 비용 = demurrage, 조기 완료 보상 = dispatch.'
    },
    23:{
      ko:'MARPOL에서 탱크 드레인·세정수·기타 유성혼합물을 모으도록 지정된 탱크의 명칭을 묻습니다.',
      chunks:[['a tank specifically designated','어 탱크 스페서피컬리 데지그네이티드','특별히 지정된 탱크'],['for the collection of','포 더 컬렉션 오브','~을 모으기 위한'],['tank drainings','탱크 드레이닝즈','탱크 배출액'],['tank washings','탱크 워싱즈','탱크 세정수'],['other oily mixtures','아더 오일리 믹스처즈','기타 유성혼합물']],
      vocab:[['designate','데지그네이트','지정하다'],['drainings','드레이닝즈','배출액'],['oily mixture','오일리 믹스처','유성혼합물'],['slop tank','슬롭 탱크','잔유·세정수 등을 모으는 탱크']],
      choices:['slop tank — 유성 잔액·세정수 집수 탱크','center tank — 중앙탱크','wing tank — 윙탱크','ballast tank — 평형수탱크'],
      grammar:'“designated for the collection of ~”는 “~의 수집을 위해 지정된”이라는 수동분사 수식입니다.',
      why:'정의가 slop tank의 용도와 일치하므로 ㉮가 정답입니다.',
      memory:'tank drainings + washings + oily mixtures → slop tank.'
    },
    24:{
      ko:'소화주관(firemain) 수압시험·검사 지시문에서 실제 검사 항목으로 언급되지 않은 것을 찾는 문제입니다.',
      chunks:[['conduct a 150 PSI hydrostatic test','컨덕트 어 원피프티 피에스아이 하이드로스태틱 테스트','150 PSI 수압시험을 실시하라'],['Inspect all valves, piping, pipe hangers, braces and couplings','인스펙트 올 밸브즈 파이핑 파이프 행어즈 브레이시즈 앤 커플링즈','모든 밸브·배관·행거·브레이스·커플링을 검사하라'],['for leaks, rust and deterioration','포 릭스 러스트 앤 디티어리어레이션','누설·녹·열화 여부를'],['In the event any hydrant valve leaks','인 디 이벤트 애니 하이드런트 밸브 릭스','소화전 밸브가 누설될 경우'],['they shall be marked','데이 셸 비 마크트','표시해야 한다']],
      vocab:[['hydrostatic test','하이드로스태틱 테스트','수압시험'],['leak','리크','누설'],['rust','러스트','녹'],['deterioration','디티어리어레이션','열화·노후'],['coupling','커플링','배관 연결이음']],
      choices:['couplings for leaks — 커플링의 누설: 지문에 포함됩니다.','pipe hangers for rust — 행거의 녹: 지문에 포함됩니다.','braces for deterioration — 브레이스의 열화: 지문에 포함됩니다.','valves for opening failure — 밸브의 개방불량: 지문에 명시되지 않습니다.'],
      grammar:'“Inspect A, B, C for X, Y, Z”는 나열된 모든 설비를 X/Y/Z 관점에서 검사하라는 구조입니다.',
      why:'지문은 valves를 포함해 누설·녹·열화를 검사하라고 하지만 opening failure 점검은 언급하지 않았습니다. 따라서 ㉱가 정답입니다.',
      memory:'검사항목은 지문에 적힌 leaks / rust / deterioration. opening failure는 없음.'
    },
    25:{
      ko:'“Pratique ( ), weighed anchor and proceeded to her berth.”의 빈칸에 가장 자연스러운 단어를 고르는 문제입니다.',
      chunks:[['Pratique granted','프라티크 그랜티드','검역상 입항허가를 받고'],['weighed anchor','웨이드 앵커','양묘하고'],['proceeded to her berth','프로시디드 투 허 버스','자기 선석으로 진행했다']],
      vocab:[['pratique','프라티크','검역 후 선박에 부여되는 입항·교통 허가'],['grant','그랜트','허가하다, 부여하다'],['weigh anchor','웨이 앵커','닻을 올리다, 양묘하다'],['berth','버스','선석']],
      choices:['missed — 놓친','acquired — 취득한; 이 관용표현에는 부자연스럽습니다.','granted — 허가된','uncleared — 미허가된'],
      grammar:'항해일지식 문장에서는 “Pratique granted”처럼 “pratique was granted”의 was를 생략한 압축 표현이 쓰일 수 있습니다.',
      why:'pratique는 당국이 선박에 “grant”하는 허가이므로 “Pratique granted”가 관용적이고 문맥에도 맞습니다.',
      memory:'pratique granted = 검역상 입항허가 완료. weigh anchor = 양묘하다.'
    }
  };

  function chunksHtml(rows){
    return rows.map(([en,pron,ko])=>`<span style="color:${C};font-weight:bold">${H(en)}</span> <span style="color:${G};font-size:.9em">[${H(pron)}]</span><br>→ ${H(ko)}<br>`).join('');
  }
  function vocabHtml(rows){
    return rows.map(([w,p,k])=>`<span style="background:${Y};padding:1px 4px;border-radius:3px">★ ${H(w)}</span> <span style="color:${G};font-size:.9em">[${H(p)}]</span> → ${H(k)}<br>`).join('');
  }
  function choicesHtml(q,d){
    const opts=Array.isArray(q['선택지'])?q['선택지']:[];
    return opts.map((o,i)=>`<strong>${M[i]||String(i+1)} ${H(String(o).replace(/^\s*[㉮㉯㉰㉱]\s*/,''))}</strong><br>→ ${H(d.choices[i]||'')}<br>`).join('');
  }
  function detailExplain(q,n){
    const d=DATA[n];if(!d)return null;
    const idx=Number(q['정답']);const opts=Array.isArray(q['선택지'])?q['선택지']:[];
    const answer=Number.isInteger(idx)&&idx>=0&&idx<opts.length?String(opts[idx]).replace(/^\s*[㉮㉯㉰㉱]\s*/,'').trim():'';
    const title=Number.isInteger(idx)&&idx>=0&&idx<4?`정답 ${M[idx]}${answer?' · '+H(answer):''}`:'정답 해설';
    const html=`━━ 지문 독해 ━━<br>${H(d.ko)}<br><br>${chunksHtml(d.chunks)}<br>`+
      `━━ 핵심 어휘·표현 ━━<br>${vocabHtml(d.vocab)}<br>`+
      `━━ 보기 해석 ━━<br>${choicesHtml(q,d)}<br>`+
      `━━ 문장 구조·포인트 ━━<br>${H(d.grammar)}<br><br>`+
      `━━ 정답 해설 ━━<br><strong>${title}</strong><br>${H(d.why)}<br><br>`+
      `━━ 핵심 암기 ━━<br><strong>${H(d.memory)}</strong>`;
    return {html,loading:false};
  }

  window.get2026Navi3Session3Explain=function(q){
    if(q&&Number(q._year)===2026&&String(q._short||q._planGrade||'')==='navi3'&&Number(q._session||q['회차'])===3&&String(q['과목']||'')==='영어'){
      const n=Number(q['번호']);
      const detailed=detailExplain(q,n);
      if(detailed)return detailed;
    }
    return typeof previous==='function'?previous(q):null;
  };
})();
