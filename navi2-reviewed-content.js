// Approved 2026-09-28 audit of the existing navi2 oral-interview data.
// Baseline: 8d7a43a76e52a9104e7fd59e32619c87ee00d4e6.
// Scope: 75 official + 21 recall questions; fishing IDs 31–45 are untouched.
// Keep the existing QUESTIONS and MD_CONCEPTS schemas and stable IDs.
(function(global){
  'use strict';
  const questionUpdates = {
  "4": {
    "oralAnswer": "우선피항선은 주로 무역항 수상구역에서 운항하며 다른 선박의 진로를 피해야 하는 선박입니다. 부선과 그 예인선, 노·삿대선, 예선, 등록 항만운송관련사업자 소유선, 등록 해양환경·해양폐기물관리업자 소유선, 그 밖의 20톤 미만 선박입니다. 다만 예인선에 결합되어 운항하는 압항부선과 폐기물해양배출업 등록선의 제외 조건을 구별합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "6": {
    "hint2": "출입항·좁은 수로·사고 빈발해역 / 제한시계로 충돌·좌초 우려·풍조류로 보침 곤란·어선군 또는 통항량 급증·항해설비 고장",
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "9": {
    "answer": "(1) 마스트등\n - 선체 종방향중심선상에 있는 백등을 뜻하며 225˚의 수평의 호를 고르게 비추고, 정선수로부터 각 현의 정횡후 22.5˚까지 비추도록 설치되어 있는 등화\n(2) 현등\n - 우현의 녹등, 좌현의 홍등을 말하며 각기 112.5 ˚의 수평의 호를 고르게 비추고, 정선수로부터 각현 정횡 후 22.5˚까지 비추도록 설치되어 있는 등화\n(3) 선미등\n - 실행가능한 한 선미에 가깝게 놓여 있는 백등을 말하고, 135˚의 수평의 호를 고르게 비추며 정선미로부터 각 현측에 67.5˚까지 비출 수 있도록 설치되어 있는 등화\n(4) 전주등\n - 360˚의 수평의 호를 고르게 비추는 등화\n(5) 섬광등\n - 매분 120회 또는 그 이상의 횟수로 규칙적인 간격의 섬광을 발하는 등화",
    "oralAnswer": "마스트등은 백색 225도, 현등은 좌현 홍색·우현 녹색으로 각각 112.5도, 선미등은 백색 135도입니다. 전주등은 수평 360도를 고르게 비추는 등이고, 국제 COLREG의 섬광등은 매분 120회 이상 규칙적인 간격으로 섬광을 발하는 등입니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정"
    }
  },
  "10": {
    "hint2": "서로 시계 내: 우현 단음 1회·좌현 단음 2회·후진기관 단음 3회. 제한시계에서 항행 중 대수전진: 장음 1회, 항행 중 정지하여 대수전진 없음: 장음 2회(약 2초 간격), 모두 2분 이하 간격.",
    "oralAnswer": "서로 시계 내에서 우현 변침은 단음 1회, 좌현 변침은 단음 2회, 후진기관 사용은 단음 3회입니다. 제한시계에서 항행 중인 동력선은 대수전진하면 장음 1회, 정지하여 대수전진하지 않으면 약 2초 간격의 장음 2회를 울립니다. 두 경우 모두 반복 간격은 2분 이하이며 정박 신호와 구별합니다.",
    "q": "국제해상충돌방지규칙상 동력선의 조종신호 및 무중신호와 관련한 다음 문항에 대한 설명 (1) 서로 시계 내에서 오른쪽으로 변경하고 있는 경우 조종신호 (2) 서로 시계 내에서 왼쪽으로 변경하고 있는 경우 조종신호 (3) 서로 시계 내에서 기관을 후진하고 있는 경우 조종신호 (4) 제한시계 내에서 항행 중 대수전진하는 동력선의 무중신호 (5) 제한시계 내에서 항행 중 정지하여 대수전진하지 않는 동력선의 무중신호",
    "answer": "(1) 서로 시계 내에서 오른쪽으로 변경하고 있는 경우 조종신호\n - 단음 1회\n(2) 서로 시계 내에서 왼쪽으로 변경하고 있는 경우 조종신호\n - 단음 2회\n(3) 서로 시계 내에서 기관을 후진하고 있는 경우 조종신호\n - 단음 3회\n(4) 제한시계 내에서 항행 중 대수전진하는 동력선의 무중신호\n - 2분을 넘지 않는 간격으로 장음 1회\n(5) 제한시계 내에서 항행 중 정지하여 대수전진하지 않는 동력선의 무중신호\n - 2분을 넘지 않는 간격으로 약 2초의 간격을 둔 장음 2회",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "B",
      "questionStatus": "공식 기출 취지 대조·질문 표현 보정",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "11": {
    "answer": "폐기물기록부에는 각 배출 또는 소각 작업별로 다음 사항을 기록한다.\n- 날짜와 시각\n- 선박의 위치(위도·경도). 화물잔류물을 해상 배출한 경우에는 배출 시작 위치와 종료 위치\n- 폐기물의 종류·분류\n- 종류별 추정 배출량 또는 소각량. 폐기물량은 원칙적으로 세제곱미터(m³)로 추정한다.\n- 작업을 담당한 사관의 서명\n사고성 또는 예외적 유실·배출도 사유, 세부내용, 예방·최소화 조치와 함께 기록한다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "12": {
    "hint2": "SOLAS·LL·COLREG·TONNAGE·ILO 147·MARPOL·STCW",
    "answer": "선박안전법 제68조와 시행령 제16조에 열거된 협약은 다음 7개이다.\n- SOLAS: 해상에서의 인명안전을 위한 국제협약\n- Load Lines: 만재흘수선에 관한 국제협약\n- COLREG: 국제 해상충돌 예방규칙 협약\n- TONNAGE: 선박톤수 측정에 관한 국제협약\n- ILO 147: 상선의 최저기준에 관한 국제협약\n- MARPOL: 선박으로부터의 오염방지를 위한 국제협약\n- STCW: 선원의 훈련·자격증명 및 당직근무에 관한 국제협약",
    "oralAnswer": "선박안전법 시행령 제16조에는 SOLAS, 만재흘수선협약, COLREG, 선박톤수측정협약, 상선의 최저기준협약, MARPOL, STCW가 열거되어 있습니다. 일반적인 PSC에서 검사하는 MLC·BWM 등의 범위와 이 조문의 열거는 구별해야 합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "14": {
    "q": "선박안전법상 국제항해에 종사하는 총톤수 500톤 이상·길이 24미터 이상 화물선과 관련된 국제협약검사증서 5종의 명칭과 대체관계를 설명",
    "hint1": "SOLAS 개별 3증서·이를 대신하는 통합 1증서·국제만재흘수선증서",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "B",
      "questionStatus": "공식 기출 취지 대조·질문 표현 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "15": {
    "hint2": "해기사: 제4조 면허를 받은 사람 / 선박직원: 해기사로서 법정 9개 직무를 수행하는 사람, 승무자격인정 외국 해기사 포함",
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "16": {
    "answer": "공동해손은 공동의 해상사업에 참여한 재산을 공동의 위험에서 보전하기 위하여 비상한 희생 또는 비용을 고의적이고 합리적으로 부담한 경우 성립한다.\n- 선박·화물 등 공동 해상사업의 재산에 현실적이고 공동된 위험이 있을 것\n- 공동의 안전을 위한 처분일 것\n- 공동의 안전을 위해 희생 또는 비용을 고의적이고 합리적으로 부담할 것\n- 통상비용이 아닌 비상한 희생 또는 비용이 발생할 것\n- 보전된 재산이 있으면 각 이해관계자가 항해 종료 시의 분담가액에 따라 공동해손을 분담한다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "17": {
    "hint1": "청구자는 보험담보에 들어오는 손해, 보험자는 면책사유를 입증",
    "hint2": "열거위험담보와 전위험담보의 입증 범위 구별 / 운송인의 책임과 보험자의 책임 구별",
    "answer": "(1) 의미\n - 거증책임은 주장한 사실을 증명하지 못했을 때 그 불이익을 누가 부담하는지를 뜻한다.\n(2) 원칙\n - 보험금 청구자는 보험계약과 보험기간 중 담보범위에 드는 손해를 입증하고, 면책을 주장하는 보험자는 원칙적으로 그 면책사유를 입증한다.\n - 열거위험담보는 열거된 담보위험과 손해의 인과관계가 문제된다. 전위험담보에서는 우연한 손해임을 입증하되 모든 경우에 정확한 사고 원인까지 특정해야 하는 것은 아니다.\n - 구체적인 부담은 약관과 준거법에 따르며, 운송인의 감항능력 주의의무·면책 입증과 혼동하지 않는다.",
    "oralAnswer": "거증책임은 사실을 증명하지 못했을 때 누가 불이익을 받는가의 문제입니다. 보험금 청구자는 담보범위에 드는 손해를, 면책을 주장하는 보험자는 원칙적으로 면책사유를 입증합니다. 열거위험담보와 전위험담보는 필요한 입증 범위가 다르며, 운송인의 책임 입증 문제와도 구별해야 합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "18": {
    "answer": "보험약관에서 담보될 수 있는 해상위험의 예는 다음과 같다.\n- 좌초\n- 침몰·전복\n- 충돌·접촉\n- 화재·폭발\n- 투하\n- 지진·화산분화·낙뢰\n실제 담보범위와 면책은 보험증권 및 ICC(A/B/C) 조건에 따른다. 해적, 선원악행, 포획·억류 등을 모든 적하보험에서 공통으로 담보한다고 말하면 안 된다.",
    "oralAnswer": "담보 해상위험의 예로 좌초, 침몰·전복, 충돌·접촉, 화재·폭발, 투하, 지진·화산분화·낙뢰를 들 수 있습니다. 다만 실제 담보범위는 보험증권과 ICC 조건에 따르며, 전위험담보에도 면책사항이 있습니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "19": {
    "hint2": "Berth: 적·양하 선주 부담 / FIO: 모두 화주 측 / FI: 선적만 화주 측 / FO: 양륙만 화주 측",
    "answer": "- Berth term(Liner term): 선적·양륙 비용을 모두 선주 측이 부담하는 조건\n- F.I.O.(Free In and Out): 선적·양륙 비용을 모두 화주·용선자 측이 부담하는 조건\n- F.I.(Free In): 선적비용은 화주·용선자 측, 양륙비용은 선주 측 부담\n- F.O.(Free Out): 선적비용은 선주 측, 양륙비용은 화주·용선자 측 부담\n여기서 Free는 선주 측에 비용 부담이 없다는 뜻이다. 하역작업의 법적 책임까지 누가 부담하는지는 용선계약 등 별도 조항을 확인한다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정"
    }
  },
  "20": {
    "hint1": "Sequential·Flow-through·Dilution의 3가지 교환법",
    "hint2": "순차 배출·주입 / 넘침흐름 / 같은 유량 주입·배출. 체적 95% 교환, 펌핑식은 원칙적으로 탱크 용적 3배.",
    "oralAnswer": "평형수 교환법은 세 가지입니다. Sequential은 비운 뒤 다시 채우고, Flow-through는 새 물을 넣어 기존 물을 넘쳐 배출하며, Dilution은 같은 유량을 주입·배출해 수위를 유지합니다. 체적 95% 교환이 기준이고, 펌핑식은 원칙적으로 3배를 통과시키되 95% 달성을 입증하면 적게 할 수 있습니다. D-2 적용선이 교환만으로 배출기준을 대체할 수 있는 것은 아닙니다.",
    "currentLawNote": "교환법과 D-1 95% 기준은 유지된다. 다만 D-2 최종 이행기한은 2024.9.8이며, D-2 적용선은 교환만으로 배출기준을 대체할 수 없다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정",
      "lawStatus": "2026 현행 기준 반영",
      "currentLawNote": "교환법과 D-1 95% 기준은 유지된다. 다만 D-2 최종 이행기한은 2024.9.8이며, D-2 적용선은 교환만으로 배출기준을 대체할 수 없다."
    }
  },
  "21": {
    "currentLawNote": "교환 위치는 B-4, 교환율은 D-1이다. 2024.9.8 D-2 이행기한 이후에도 승인된 경우의 교환 요건을 설명할 수 있으나 D-2의 임의 대체수단은 아니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정",
      "lawStatus": "2026 현행 기준 반영",
      "currentLawNote": "교환 위치는 B-4, 교환율은 D-1이다. 2024.9.8 D-2 이행기한 이후에도 승인된 경우의 교환 요건을 설명할 수 있으나 D-2의 임의 대체수단은 아니다."
    }
  },
  "23": {
    "answer": "(1) 의미\n - 현실전손이 아직 발생하지 않았더라도 현실전손이 불가피해 보이거나 보존·회수·수리에 드는 비용이 법과 약관상 비교가액을 초과하여 합리적으로 포기할 수 있는 손해이다.\n(2) 성립과 통지\n - 추정전손의 구체적 요건은 선박·화물 등 보험목적물, 준거법과 약관에 따라 다르다. 전손으로 청구하려면 원칙적으로 상당한 주의를 다하여 위부통지를 해야 한다.\n - 영국법 준거 계약에서는 MIA 제62조에 따라 통지로 보험자에게 이익이 생길 가능성이 없는 경우 또는 보험자가 통지를 면제한 경우 등의 예외가 있다. 단순히 보험자가 사고를 안다는 이유만으로 생략하지 않는다.\n(3) 위부\n - 보험목적물의 잔존 권리를 보험자에게 넘기고 전손으로 보상받겠다는 의사를 표시하는 것이다.",
    "oralAnswer": "추정전손은 현실전손이 불가피하거나 회수·수리 등에 드는 비용이 법과 약관의 비교가액을 넘어 합리적으로 포기할 수 있는 손해입니다. 전손으로 청구하려면 원칙적으로 위부통지를 합니다. 위부는 잔존 권리를 보험자에게 넘기고 전손보상을 청구하는 것이며, 구체적인 요건은 목적물과 약관에 따라 구별합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "25": {
    "hint1": "18시간: 통로·계단·출구·승강기, 기관·발전·제어장소",
    "hint2": "소방원장구·조타장치·해당 펌프와 시동장소·탱커 화물펌프룸. 소집·승정장소·선측 밖은 3시간 대상과 구별.",
    "answer": "SOLAS II-1/43의 화물선 18시간 비상조명 대상은 다음과 같다.\n- 업무용·거주용 통로, 계단, 출구, 인원용 승강기 내부와 승강로\n- 기관구역, 주발전장소 및 그 제어장소\n- 모든 제어장소, 기관제어실, 주·비상배전반 위치\n- 소방원장구 보관장소\n- 조타장치\n- 해당 소화펌프·스프링클러펌프·비상빌지펌프 및 전동기 시동장소\n- 2002년 7월 1일 이후 건조 탱커의 화물펌프룸\n※ 소집·승정장소와 선측 밖의 비상조명은 제43.2.1의 3시간 대상과 구별한다.",
    "oralAnswer": "화물선의 18시간 비상조명 대상은 통로·계단·출구·승강기, 기관구역과 주발전·제어장소, 제어실과 배전반, 소방원장구 보관장소, 조타장치, 해당 소화·스프링클러·비상빌지펌프와 시동장소, 적용 탱커의 화물펌프룸입니다. 소집·승정장소와 선측 밖의 3시간 요건은 별도입니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "27": {
    "q": "SOLAS 협약상 다음 용어의 정의에 대해 설명 (1) 주관청 (2) 여객 (3) 여객선 (4) 탱커",
    "answer": "(1) 주관청\n - 선박이 그 국가의 국기를 게양할 자격을 가진 국가의 정부\n(2) 여객\n - 선장·선원, 선박의 업무에 고용되거나 종사하는 사람 및 1세 미만의 유아를 제외한 사람\n(3) 여객선\n - 12인을 초과하는 여객을 운송하는 선박\n(4) 탱커\n - 인화성 액체화물의 산적운송을 위하여 건조되거나 개조된 화물선",
    "oralAnswer": "주관청은 선박이 국기를 게양할 자격을 가진 국가의 정부입니다. 여객은 선장·선원·선박업무 종사자와 1세 미만 유아를 제외한 사람이고, 여객선은 여객 12명을 초과해 운송하는 선박입니다. 탱커는 인화성 액체화물을 산적으로 운송하도록 건조·개조된 화물선입니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "B",
      "questionStatus": "공식 기출 취지 대조·질문 표현 보정",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "30": {
    "hint2": "익수자 쪽 전타 → 원침로에서 60도 회두 시 반대 전타 → 역침로 20도 전 타 중앙 → 역침로 정침",
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "52": {
    "hint2": "SOG / crossing from port side / alter course to give way / CPA less than 1.0 mile / heavy traffic",
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "58": {
    "hint1": "On which side must I rig the pilot ladder?",
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "61": {
    "answer": "(1) 정적 복원력\n - 선박이 일정 각도로 기울었을 때 원위치로 되돌리려는 복원모멘트이다. 해당 각도에서 배수중량 × 복원정(GZ)으로 나타낸다.\n(2) 동적 복원력\n - 선박을 직립상태에서 어느 횡경사각까지 기울이는 데 필요한 일, 즉 그 과정에서 복원모멘트가 한 일이다. 복원정 곡선의 해당 각도까지의 면적에 배수중량을 곱하여 구한다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "63": {
    "hint2": "전진: 보침·위치 선정·작업시간 유리, 묘쇄 충격·전방 수역 주의 / 후진: 닻 걸림·타력 제어 유리, 보침·위치 선정 어려움",
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "64": {
    "answer": "- 투묘 직후 확정한 육상물표의 방위·거리 또는 레이더 거리선을 반복 측정한다.\n- GPS·ECDIS의 선위 궤적과 앵커 알람을 확인하여, 신출 묘쇄와 선박 길이를 고려한 선회반경 밖으로 지속적으로 이동하는지 본다.\n- 안전한 위치에서 묘쇄의 방향·긴장·비정상 진동을 육안 또는 설치된 계측장치로 확인하며, 움직이거나 장력이 걸린 묘쇄에 손을 대지 않는다. 묘쇄가 계속 팽팽하거나 비정상 진동이 있으면 주묘를 의심한다.\n- 선수가 풍상으로 돌아오지 않거나 바람을 같은 현측에서 계속 받고, 대수·대지속력 또는 측심값이 지속적으로 변하면 주묘 가능성이 크다.\n- 의심되면 즉시 선장 호출, 기관·제2묘 준비, 주변선박·VTS 통보 등 비상조치를 취한다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정"
    }
  },
  "67": {
    "hint2": "장비 화면·제조자 지시로 재전송 중지 → 지원 시 DSC self-cancel → CH16 음성 취소 → 관계 구조기관 확인·기록",
    "answer": "(1) 취소 절차\n - 장비 화면과 제조자 지침에 따라 오발신·자동 재전송을 중지한다. ITU 절차의 대안은 전원을 끈 뒤 10초 후 켜고 해당 화면 지시를 따르는 것이다. 장비가 지원하면 DSC distress self-cancel을 실시한다.\n - VHF 채널 16에서 모든 무선국에 음성 취소통보를 한다.\n - 관계 해안국·구조기관에도 잘못 발신했음을 알리고 필요한 확인을 받으며, 청취를 유지하고 무선기록에 남긴다.\n(2) 통보 예\n - All stations, All stations, All stations.\n - This is [선명 3회], [호출부호], MMSI [9자리].\n - Please cancel my distress alert of [시각] UTC.\n - Master, [호출부호]. Out.",
    "oralAnswer": "장비의 화면 지시에 따라 재전송을 중지하고, 지원하는 장비는 DSC 자체 취소를 합니다. 이어 채널16에서 All stations를 3회 호출하고 선명·호출부호·MMSI와 오발신 UTC 시각을 넣어 취소를 통보합니다. 관계 해안국·구조기관에 확인하고 청취와 무선기록을 유지합니다.",
    "currentLawNote": "2024.1.1부터 IMO MSC.514(105)가 A.814(19)를 대체. 취소 세부 절차는 ITU Resolution 349(Rev.WRC-23) 및 해당 장비 지시를 따른다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정",
      "lawStatus": "2026 현행 기준 반영",
      "currentLawNote": "2024.1.1부터 IMO MSC.514(105)가 A.814(19)를 대체. 취소 세부 절차는 ITU Resolution 349(Rev.WRC-23) 및 해당 장비 지시를 따른다."
    }
  },
  "69": {
    "oralAnswer": "부면심은 수선면의 도심으로 미소 트림의 회전축이 지나는 점입니다. 기출 예시의 보통선형에서는 중앙에서 전후로 길이의 약 1/30~1/60 부근이며 실제 값은 해당 선박 LCF를 사용합니다. 그 수직선상에서 소량을 적·양화하면 평균흘수는 변하지만 1차적인 트림 변화는 없습니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "70": {
    "answer": "- 유동수가 들어 있는 tank에 유동수를 가득 채움\n- 유동수가 들어 있는 tank를 비움\n- 설계·승인된 종방향 수밀격벽으로 탱크의 자유표면 폭을 줄임",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "71": {
    "hint1": "정답 미확정: 선회 말기가 가리키는 운동 단계를 먼저 확인",
    "hint2": "공식 예시와 앱 개념의 설명이 불일치. 고정 속력감소율을 암기하지 말 것.",
    "answer": "[정답 미확정·추가 자료 필요]\n공식 기출의 예시 설명과 앱의 속력 감소 설명을 하나의 정답으로 확정할 근거를 확보하지 못했습니다. 선회 단계와 횡경사 모멘트의 도해·전문자료를 확인한 뒤 답변을 확정해야 합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "A",
      "questionStatus": "공식 문항 원문 대조",
      "answerGrade": "C",
      "answerStatus": "정답 미확정·추가 자료 필요",
      "conceptGrade": "C",
      "conceptStatus": "원문·근거 확보 전 보류",
      "sourceRef": "공식 PDF 운용 예시문제 11; 역학 설명의 독립 검증 근거 추가 필요.",
      "sourceUrl": "",
      "lawStatus": "정답 확정 전 보류",
      "currentLawNote": ""
    }
  },
  "72": {
    "hint2": "우현타 → 타의 횡방향 힘이 선미를 좌현으로 밀어 선수 우회두",
    "answer": "(1) 우현타 사용 시 우회두하는 이유\n - 전진 중 타 주위의 유동과 압력차로 타에 유체력이 발생한다. 그 횡방향 성분이 선미를 좌현으로 밀어 선수를 우현으로 회두시킨다.\n(2) 회두를 일으키는 힘\n - 타에 작용하는 유체력의 횡방향 성분과 그 작용점의 모멘트 팔에 따른 회두모멘트이다.",
    "oralAnswer": "전진 중 우현타를 사용하면 타에 생기는 유체력의 횡방향 성분이 선미를 좌현으로 밀고 선수를 우현으로 회두시킵니다. 이 횡력과 모멘트 팔에 따른 회두모멘트가 선박을 돌립니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "73": {
    "hint1": "추종성: 타명령에 대한 응답 / 침로안정성: 외란 후 회두가 감쇠해 직진으로 정착 / 선회성: 일정 타각의 회두 능력",
    "hint2": "추종성: 지그재그 / 침로안정성: 나선·역나선·pull-out / 선회성: 선회권시험",
    "answer": "(1) 추종성\n - 타명령에 얼마나 신속하고 적절하게 회두운동이 응답하는지 나타내며 지그재그시험으로 평가한다.\n(2) 침로안정성\n - 타를 고정하고 작은 외란이 사라진 뒤 회두운동이 감쇠해 다시 직선운동으로 정착하는 성질이다. 원래 침로로 자동 복귀한다는 뜻은 아니다. 나선·역나선·pull-out 시험 등으로 평가한다.\n(3) 선회성\n - 일정 타각에서 선박이 회두하는 능력이다. 선회권시험의 종거·횡거·전술직경 등으로 평가한다.",
    "oralAnswer": "추종성은 타명령에 대한 회두 응답으로 지그재그시험에서 봅니다. 침로안정성은 외란이 사라진 뒤 회두가 감쇠해 직진으로 정착하는 성질로 나선·역나선·pull-out 시험 등으로 봅니다. 선회성은 일정 타각에서 도는 능력으로 선회권시험의 종거·횡거·전술직경을 평가합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정"
    }
  },
  "74": {
    "answer": "(1) 위험(Hazard) 의 정의와 예\n - 위험요인으로 본질적으로 위험을 초래할 수 있는 상황이나 조건을 의미함\n - 예를 들어 전기, 기름, LNG, LPG 등은 위험이 높다고 할 수 있음 \n(2) 위험성 (Risk) 의 정의와 예\n - 위험요인으로 인해 위해·사고가 발생할 가능성 (빈도)과 결과(심각성)의 조합을 의미하며 이에 따라 위험성의 수준이 결정됨\n - 예를 들어 문어발식으로 사용하는 전기콘센트는 위험성이 높다고 할 수 있으며, 과부하가 걸리지 않도록 바른 방법으로 사용되는 전기콘센트는 위험성이 낮다고 할 수 있음\n - 따라서 위험성의 수준을 결정하기 위해서는 빈도와 결과를 판단할 수 있는 상황이 주어져야 함",
    "oralAnswer": "Hazard는 전기·기름·가스처럼 손상을 일으킬 잠재력이 있는 위험요인입니다. Risk는 그 위험요인으로 위해·사고가 발생할 가능성과 결과의 심각성을 조합한 수준입니다. 따라서 같은 전기도 사용상태와 관리방법에 따라 위험성은 달라집니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정"
    }
  },
  "75": {
    "answer": "다음은 직립 부근의 작은 횡경사에 대한 초기복원성의 구분이다.\n(1) 안정 상태\n - 무게중심 (G)이 메타센터 (M)보다 아래쪽에 위치하는 경우로 선박이 기울어지기 전의 상태로 되돌아가려는 복원 모멘트가 작용하며, GM은 양의 값을 가짐\n(2) 중립 상태\n - 무게중심 (G)과 메타센터 (M)의 위치가 일치하여 한점에 있는 경우로 선박의 중력과 부력이 동일한 직선상에서 작용하여 복원 모멘트가 발생하지 않고 기울어진 상태로 정지하게 되며 GM은 영의 값을 가짐\n \n(3) 불안정 상태\n - 무게중심 (G)이 메타센터 (M)보다 위쪽에 위치하는 경우로 선박이 기울어진 방향으로 더욱 기울어지게 하려는 모멘트가 작용하며, GM은 음의 값을 가짐",
    "oralAnswer": "초기복원성에서 G가 M보다 아래면 GM이 양으로 복원모멘트가 생기는 안정 상태입니다. G와 M이 일치하면 GM이 0으로 기운 상태에 머무는 중립 상태이고, G가 M보다 위면 GM이 음으로 더 기울려는 모멘트가 생기는 불안정 상태입니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "78": {
    "answer": "(1) 의미\n - 레이더 화면에 계획침로와 평행하면서 안전한 정횡거리만큼 떨어지도록 설정한 고정 기준선이다. 보통 EBL 또는 평행인덱스 기능을 이용해 레이더로 식별 가능한 해안선·고정물표에 접하도록 설정한다.\n(2) 사용목적\n - 물표가 평행방위선에 대해 어떻게 움직이는지 연속 감시하여 자선의 횡편위와 안전거리 유지 여부를 즉시 판단한다. 선위결정의 대체수단이 아니라 레이더에 의한 지속적인 항로감시 보조수단이다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정"
    }
  },
  "79": {
    "answer": "AIS 송신정보는 크게 다음과 같이 구분한다.\n- 정적정보: MMSI, IMO 번호, 호출부호·선명, 선종, 선박 길이·폭, 안테나 위치\n- 동적정보: 선위와 정확도·UTC 시각, COG, SOG, 선수방위, ROT, 항행상태\n- 항해관련정보: 현재 최대흘수, 위험화물 종류, 목적항과 ETA, 필요 시 항로계획\n- 안전관련정보: 특정 선박 또는 전체에 보내는 짧은 안전관련 메시지\n동적정보 대부분은 센서에서 자동 갱신되지만 항행상태·흘수·목적항·ETA 등은 당직자가 정확히 입력하고 최신화해야 한다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정"
    }
  },
  "80": {
    "hint1": "ENC 개정·새로운 위험물·항행제한으로 과거 항로의 안전성이 달라질 수 있음",
    "hint2": "최신 ENC·현재 흘수·UKC·Safety contour·Safety depth·XTD로 Route check 재실행",
    "audit": {
      "reviewedOn": "2026-09-28"
    }
  },
  "82": {
    "answer": "- 정확한 UTC와 본선 위치를 기록하고 태양·항성 등 천체의 자이로방위를 관측한다.\n- 천측력에서 해당 UTC의 GHA와 적위를 구하고, 경도를 적용하여 LHA를 계산한다.\n- 관측위도·적위·LHA를 이용해 항해용 천측계산표나 계산기로 천체의 진방위 Zn을 구한다.\n- 자이로오차는 '진방위 − 자이로방위'로 계산하며, 차를 -180도~+180도 범위로 정리한 뒤 양(+)이면 East, 음(-)이면 West로 표시한다.\n- 관측과 계산을 반복해 신뢰성을 확인하고 Compass Error Book 및 Deck Log Book에 기록한다.",
    "oralAnswer": "UTC·선위와 천체의 자이로방위를 관측합니다. 천측력의 GHA·적위와 경도로 LHA를 구하고 위도·적위·LHA로 진방위 Zn을 계산합니다. 진방위에서 자이로방위를 빼고 0/360도 경계를 보정해 양수는 East, 음수는 West로 기록합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "87": {
    "hint2": "미설정 기본값 30m / 지정 등심선이 없으면 다음 깊은 등심선 / 흘수·UKC·조석·Squat 등을 고려",
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "88": {
    "hint1": "ENC 수록 축척보다 크게 확대하면 overscale 표시를 확인",
    "hint2": "확대해도 원자료의 정확도·세부정보는 늘지 않음. 축척 경계·음영·문구는 장비별 표시 확인",
    "answer": "- ENC의 편집축척보다 지나치게 축소하면 SCAMIN 때문에 일부 물표·문자 정보가 숨겨지고 정보가 겹칠 수 있다.\n- 지나치게 확대하면 Over-scale 표시가 나타나며, 화면이 커져 보여도 원자료의 정확도나 상세도가 높아지는 것은 아니다.\n- 대축척 ENC가 있는지 확인하고, Over-scale·No data 표시와 해도 축척 경계와 사용 중인 셀의 편집축척을 확인한다.\n- SCAMIN을 무분별하게 해제하면 화면 혼잡으로 중요한 정보를 놓칠 수 있다. 필요한 축척을 바꾸어 교차 확인하고 한 축척 화면만으로 안전을 판단하지 않는다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "answerGrade": "B+",
      "answerStatus": "공식 예시·독립 근거 대조 후 보정",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "89": {
    "currentLawNote": "2026~2028년 신규 설치 ECDIS는 MSC.530(106)/Rev.1 또는 MSC.232(82)를 선택 적용할 수 있고, 2029년 이후 신규 설치는 새 기준을 따른다. 기존 모든 ECDIS의 2026년 교체 의무가 아니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정",
      "lawStatus": "2026 현행 기준 반영",
      "currentLawNote": "2026~2028년 신규 설치 ECDIS는 MSC.530(106)/Rev.1 또는 MSC.232(82)를 선택 적용할 수 있고, 2029년 이후 신규 설치는 새 기준을 따른다. 기존 모든 ECDIS의 2026년 교체 의무가 아니다."
    }
  },
  "91": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "IMO MSC.232(82) §§5.8·6·11·16, Appendix 6(backup)·7(RCDS).; IMO MSC.530(106)/Rev.1: 2026–2028 신규 설치 선택 적용, 2029 신규 설치부터 의무. 기존 모든 ECDIS의 2026 교체 의무가 아님.",
      "sourceUrl": "https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MSCResolutions/MSC.232%2882%29.pdf",
      "lawStatus": "관련 규정·기술자료 대조",
      "currentLawNote": ""
    }
  },
  "92": {
    "hint1": "송신 음파와 반사·산란되어 수신된 음파의 도플러 주파수 차",
    "hint2": "해저 기준 ground tracking: 대지속력 / 수중 산란체 기준 water tracking: 대수속력",
    "answer": "도플러 선속계는 송신한 음파와 되돌아오는 음파 사이의 주파수 차를 측정하고, 송수신 방향을 고려하여 상대속력을 계산합니다.\n- 해저 반사를 이용하는 Ground tracking에서는 대지속력을 구합니다.\n- 수중 산란체의 반사를 이용하는 Water tracking에서는 그 수층에 대한 대수속력을 구합니다.\n장비 형식·수심·수신상태에 따라 사용할 수 있는 모드가 달라집니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "FURUNO DS-60(대지·대수속력), DS-85(대수속력) 제조사 공식 설명 및 운용설명서.",
      "sourceUrl": "https://www.furuno.com/en/products/speedlog/ds-60/index.html",
      "lawStatus": "관련 규정·기술자료 대조",
      "currentLawNote": ""
    }
  },
  "93": {
    "q": "[복기·원문 미확보] Vector의 정의 및 구성요소",
    "hint1": "질문 불확실: 일반 벡터인지 항해장비 벡터인지 확인 필요",
    "hint2": "Vector 앞뒤 문장·진벡터/상대벡터 여부·요구 개수 확보 필요",
    "answer": "[질문 불확실·추가 자료 필요]\n실제 질문이 가리키는 벡터의 종류와 구성요소의 범위를 확인하지 못했습니다. 질문 원문을 확보한 뒤 답변을 확정해야 합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "C",
      "answerStatus": "정답 미확정·추가 자료 필요",
      "conceptGrade": "C",
      "conceptStatus": "원문·근거 확보 전 보류",
      "sourceRef": "실제 출제 원문 미확보; 관련 공식 자료는 해당 복기의 정답 확정 근거가 아님.",
      "sourceUrl": "",
      "lawStatus": "정답 확정 전 보류",
      "currentLawNote": ""
    }
  },
  "94": {
    "q": "[복기·질문 불확실] IAMSAR 수색구조 고려사항",
    "hint1": "수색계획·수색패턴·현장조정 중 실제 질문 범위 확인",
    "hint2": "IAMSAR 해당 권·절과 요구 개수의 원문 필요",
    "answer": "[질문 불확실·추가 자료 필요]\n수색계획 수립인지 수색패턴 선정인지 실제 질문 범위와 요구 개수를 확보하지 못했습니다. 현재의 5항목을 IAMSAR의 유일한 정답 목록으로 확정하지 않습니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "C",
      "answerStatus": "정답 미확정·추가 자료 필요",
      "conceptGrade": "C",
      "conceptStatus": "원문·근거 확보 전 보류",
      "sourceRef": "실제 출제 원문 미확보; 관련 공식 자료는 해당 복기의 정답 확정 근거가 아님.",
      "sourceUrl": "",
      "lawStatus": "정답 확정 전 보류",
      "currentLawNote": ""
    }
  },
  "95": {
    "q": "일본 기상청 ASAS 지상분석일기도의 W, GW, SW, TW 의미를 설명",
    "hint1": "W: Warning / GW: Gale Warning / SW: Storm Warning / TW: Typhoon Warning",
    "hint2": "W: 28 이상 34kt 미만 / GW: 34 이상 48kt 미만 / SW: 48kt 이상 / TW: 태풍 64kt 이상",
    "answer": "일본 기상청 ASAS 범례를 기준으로 답합니다.\n- W(Warning): 최대풍속 28노트 이상 34노트 미만의 열대저기압에 대한 경보\n- GW(Gale Warning): 최대풍속 34노트 이상 48노트 미만의 해상강풍경보\n- SW(Storm Warning): 최대풍속 48노트 이상의 해상폭풍경보\n- TW(Typhoon Warning): 최대풍속 64노트 이상의 태풍에 대한 해상태풍경보",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "일본 기상청 아시아태평양 지상분석일기도 ASAS 공식 범례.",
      "sourceUrl": "https://www.jma.go.jp/jma/kishou/know/kurashi/ASAS_kaisetu.html",
      "lawStatus": "관련 규정·기술자료 대조",
      "currentLawNote": ""
    }
  },
  "96": {
    "q": "[복기·질문 불확실] 쌍묘박의 방법과 장단점",
    "hint1": "복기 원문과 두 닻의 배치·묘쇄 방향 확인 필요",
    "hint2": "두 닻의 사용만으로 특정 묘박법·파주력 증가를 단정하지 않음",
    "answer": "[질문 불확실·추가 자료 필요]\n실제 질문에서 말하는 쌍묘박의 배치와 방법을 확인하지 못했습니다. 복기 원문 또는 도해를 확보한 뒤 해당 방법의 절차·장단점을 확정해야 합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "C",
      "answerStatus": "정답 미확정·추가 자료 필요",
      "conceptGrade": "C",
      "conceptStatus": "원문·근거 확보 전 보류",
      "sourceRef": "실제 출제 원문 미확보; 관련 공식 자료는 해당 복기의 정답 확정 근거가 아님.",
      "sourceUrl": "",
      "lawStatus": "정답 확정 전 보류",
      "currentLawNote": ""
    }
  },
  "97": {
    "answer": "묘쇄 길이는 단순히 수심만으로 결정하지 않고 다음 사항을 함께 고려합니다.\n- 현재 수심, 조석에 따른 예상 최대수심 및 수면 위 묘쇄공 높이\n- 해저 저질과 닻의 파주력\n- 풍향·풍속, 조류의 방향·세기와 파랑\n- 선박의 크기, 흘수 및 풍압면적\n- 향후 기상·해상 악화 가능성\n- 묘박지의 넓이와 주변 선박·암초·해저시설 등 장애물\n- 묘쇄를 내었을 때 형성되는 선회반경(Swinging circle)\n- 닻·묘쇄·양묘기의 상태와 운용한계, 긴급 양묘·출항 가능성",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "AMSA NSCV C7D ed.1.5 §§1.6·2.2(묘박장비의 환경·선박 크기·저질·운용지침), 한국선 적용 법규로 이식하지 않고 기술원리 교차확인.",
      "sourceUrl": "https://www.amsa.gov.au/sites/default/files/2024-10/nscv-c7d-ed-1.5-20241001.pdf",
      "lawStatus": "관련 규정·기술자료 대조",
      "currentLawNote": ""
    }
  },
  "98": {
    "hint1": "선수·선미 갑판도 / 사용 가능한 장비목록 / 통신 / 준비·실행 예시절차",
    "hint2": "Booklet 보완: 선박 제원·SWL·조직과 임무·상황별 의사결정표·연결도면. 영어 비치.",
    "answer": "비상예인절차는 본선에 맞게 작성·비치하며 SOLAS의 다음 4요소를 포함합니다.\n- 선수·선미에서 사용할 수 있는 배치를 나타낸 갑판도\n- 비상예인에 사용할 수 있는 선내 장비목록\n- 통신 수단과 방법\n- 비상예인 준비·실행을 쉽게 하는 예시절차\n최신 Booklet 지침에 따라 선박 제원, 예인점·장비의 SWL, 선내 조직과 담당 임무, 상황별 의사결정표와 연결도면 등을 정리하며 영어로 비치합니다.",
    "currentLawNote": "MSC.1/Circ.1255/Rev.1(2025.8.28)이 종전 지침을 대체. SOLAS의 비상예인절차와 선종·건조일에 따라 요구되는 비상예인설비는 구별한다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "SOLAS II-1/3-4.2 및 MSC.1/Circ.1255/Rev.1(2025.8.28), §§4·5.",
      "sourceUrl": "https://puc.overheid.nl/PUC/Handlers/DownloadDocument.ashx?ValChk=91hmHgBQ4pplrCtgcvkvzMpWmVvGYUzdkmeb1fKvw5g1&identifier=PUC_1969_14&type=pdf&versienummer=3",
      "lawStatus": "현행 기준 보완",
      "currentLawNote": "MSC.1/Circ.1255/Rev.1(2025.8.28)이 종전 지침을 대체. SOLAS의 비상예인절차와 선종·건조일에 따라 요구되는 비상예인설비는 구별한다."
    }
  },
  "99": {
    "hint1": "날짜·시간 / 위치 / 속력 / 선수방위 / 선교음성 / VHF / Radar / 수심",
    "hint2": "Heading은 선수방위. 기록 범위는 VDR 설치시기·적용 성능기준·센서 구성 확인.",
    "answer": "VDR의 대표 기록사항은 다음과 같습니다.\n- 날짜·시간, 선박 위치\n- 대수·대지속력과 선수방위(Heading)\n- 선교 음성 및 VHF 통신\n- 레이더 표시자료와 음향측심자료\n- 주요 경보, 타 명령·응답, 기관·추진기 명령·응답\n- 해당 기준과 설치 구성에 따른 ECDIS 표시·AIS 자료, 개구 상태, 풍향·풍속 등\n구체적인 의무 기록 범위는 VDR의 설치시기와 적용 성능기준을 확인합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "IMO MSC.333(90) §5.5(2014.7.1 이후 설치 VDR), 구형은 해당 설치시기 성능기준 별도.",
      "sourceUrl": "https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MSCResolutions/MSC.333%2890%29.pdf",
      "lawStatus": "관련 규정·기술자료 대조",
      "currentLawNote": ""
    }
  },
  "100": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "선박직원법 제2조·제9조·제12조, 시행 2025.12.17.",
      "sourceUrl": "https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029901959",
      "lawStatus": "관련 규정·기술자료 대조",
      "currentLawNote": ""
    }
  },
  "101": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "선박직원법 제2조·제9조·제12조, 시행 2025.12.17.",
      "sourceUrl": "https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029901959",
      "lawStatus": "관련 규정·기술자료 대조",
      "currentLawNote": ""
    }
  },
  "102": {
    "answer": "선박오염물질기록부는 다음 3가지입니다.\n- 폐기물기록부: 선박에서 발생하는 폐기물의 배출·소각·육상인도 등 관련 작업을 기록\n- 기름기록부: 기름 및 유성혼합물의 적재·이송·처리·배출 등 관련 작업을 기록\n- 유해액체물질기록부: 산적 유해액체물질의 적재·이송·세정·배출 등 관련 작업을 기록\n각 기록부는 관련 법령에 따라 작성하고 최종 기재 후 3년 동안 선내에 보관하여야 합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "해양환경관리법 제30조제1·2항(폐기물·기름·유해액체물질 기록부, 최종기재 후 3년).",
      "sourceUrl": "https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1030393449",
      "lawStatus": "관련 규정·기술자료 대조",
      "currentLawNote": ""
    }
  },
  "103": {
    "hint1": "해당 선박의 증서·승인 BWMP·현행 BWRB / D-2·BWMS 운전·승무원 숙지",
    "hint2": "D-2 적용 확인 / 2025.2.1 새 기록부 서식 / 2025.10.1 승인 전자기록부 사용 가능",
    "answer": "PSC에서는 본선에 적용되는 BWM 요건을 기준으로 다음을 확인합니다.\n- 증서 대상선의 유효한 국제선박평형수관리증서와 승인된 BWMP\n- 현행 서식의 BWRB 기재, 실제 작업·탱크 상태와의 일치\n- D-2 적용 및 형식승인된 BWMS의 정상 운전, 알람·정비·교정 상태\n- 승무원의 운전·고장·비상절차와 기록방법 숙지\n- 평형수·침전물 관리 및 승인된 예외·비상조치 준수\n2024.9.8 이후 D-2 적용선이 임의로 D-1 교환만 선택할 수는 없습니다. 전자기록부도 승인 요건을 충족해야 합니다.",
    "currentLawNote": "D-2 최종 이행기한 2024.9.8. MEPC.369(80)의 BWRB 새 서식은 2025.2.1, MEPC.383(81)의 전자기록부 관련 개정은 2025.10.1 발효. 전자기록부는 일률 의무가 아니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "BWM B-3·B-4·D-1·D-2 및 G6(MEPC.288(71), amended MEPC.371(80)). D-2 최종 이행기한 2024.9.8.",
      "sourceUrl": "https://www.imo.org/en/mediacentre/hottopics/pages/implementing-the-bwm-convention.aspx",
      "lawStatus": "현행 기준 보완",
      "currentLawNote": "D-2 최종 이행기한 2024.9.8. MEPC.369(80)의 BWRB 새 서식은 2025.2.1, MEPC.383(81)의 전자기록부 관련 개정은 2025.10.1 발효. 전자기록부는 일률 의무가 아니다."
    }
  },
  "104": {
    "hint1": "화물배치도·정확한 제품명·위험성분 분석·물리화학 특성·누출/접촉/화재 대응",
    "hint2": "화물이송·세정·가스프리·밸러스트 주의 / 해당 시 억제제 증명서 / 정보 부족 시 선적 거부",
    "answer": "선적 전 선장에게 안전한 운송에 필요한 다음 정보를 제공합니다.\n- 화물배치도와 정확한 제품명(Shipping name)\n- 혼합물의 위험 주요성분에 관한 제조자 또는 인정 전문가의 인증 분석정보\n- 물리·화학적 성질, 반응성 등 위험 특성\n- 누출·유출 대응, 인체 접촉 응급조치, 소화방법·소화매체\n- 이송·탱크 세정·가스프리·밸러스트 작업 절차\n- 해당되는 경우 억제제 또는 안정제 증명서\n안전한 운송에 필요한 정보가 충분하지 않으면 화물을 받아서는 안 됩니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "IBC Code 16.2.2–16.2.4, 네덜란드 해사당국 제공 IMO 원문.",
      "sourceUrl": "https://puc.overheid.nl/nsi/doc/PUC_2391_14/",
      "lawStatus": "관련 규정·기술자료 대조",
      "currentLawNote": ""
    }
  },
  "105": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "IMO International Convention on Tonnage Measurement of Ships, 1969; GT/NT는 용적 기반 지수.",
      "sourceUrl": "https://www.imo.org/en/about/conventions/pages/international-convention-on-tonnage-measurement-of-ships.aspx",
      "lawStatus": "관련 규정·기술자료 대조",
      "currentLawNote": ""
    }
  },
  "106": {
    "hint2": "중량·부력 분포의 차 → 하중곡선 → 적분하여 전단력곡선 → 적분하여 굽힘모멘트곡선",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "B",
      "answerStatus": "복기 출제문구 미확인·학습내용을 독립 근거로 검증한 수정안",
      "conceptGrade": "B",
      "conceptStatus": "공식·일차 자료 기반 보완안",
      "sourceRef": "US Naval Academy EN400 Course Notes Ch.6: 중량·부력 차→하중, 적분→전단력·굽힘모멘트.",
      "sourceUrl": "https://www.usna.edu/NAOE/_files/documents/Courses/EN400/EN400_Course_Notes_Fall_AY2021_July2020.pdf",
      "lawStatus": "관련 규정·기술자료 대조",
      "currentLawNote": ""
    }
  },
  "107": {
    "q": "[복기·질문 불확실] 공동해손 관련 “적하 5가지”",
    "hint1": "적하손해·비용·성립요건 중 실제 질문 대상 확인 필요",
    "hint2": "복기 원문과 요구한 5항목의 범위 필요",
    "answer": "[질문 불확실·추가 자료 필요]\n“공동해손 적하 5가지”라는 주제만으로 정답 목록을 확정할 수 없습니다. 실제 질문 문구와 요구 대상을 확보한 뒤 York-Antwerp Rules의 해당 요건·예외에 따라 답변을 작성해야 합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "C",
      "answerStatus": "정답 미확정·추가 자료 필요",
      "conceptGrade": "C",
      "conceptStatus": "원문·근거 확보 전 보류",
      "sourceRef": "실제 출제 원문 미확보; 관련 공식 자료는 해당 복기의 정답 확정 근거가 아님.",
      "sourceUrl": "",
      "lawStatus": "정답 확정 전 보류",
      "currentLawNote": ""
    }
  },
  "108": {
    "q": "[최근 복기·원문 미확보] ISM Code·SMS 영어 해석",
    "hint1": "실제 출제 영어 지문 미확보",
    "hint2": "원문 사진·정확한 전사 등 추가 자료 필요",
    "answer": "[원문 미확보·정답 미확정]\n실제 출제 지문을 확보하지 못하여 번역 답변을 확정하지 않습니다. 영어 원문을 확보한 뒤 전문용어와 문장 전체를 대조해야 합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "C",
      "answerStatus": "정답 미확정·추가 자료 필요",
      "conceptGrade": "C",
      "conceptStatus": "원문·근거 확보 전 보류",
      "sourceRef": "실제 출제 원문 미확보; 관련 공식 자료는 해당 복기의 정답 확정 근거가 아님.",
      "sourceUrl": "",
      "lawStatus": "정답 확정 전 보류",
      "currentLawNote": ""
    }
  },
  "109": {
    "q": "[최근 복기·원문 미확보] 보험 영어 해석",
    "hint1": "실제 출제 영어 지문 미확보",
    "hint2": "원문 사진·정확한 전사 등 추가 자료 필요",
    "answer": "[원문 미확보·정답 미확정]\n실제 출제 지문을 확보하지 못하여 번역 답변을 확정하지 않습니다. 영어 원문을 확보한 뒤 전문용어와 문장 전체를 대조해야 합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "C",
      "answerStatus": "정답 미확정·추가 자료 필요",
      "conceptGrade": "C",
      "conceptStatus": "원문·근거 확보 전 보류",
      "sourceRef": "실제 출제 원문 미확보; 관련 공식 자료는 해당 복기의 정답 확정 근거가 아님.",
      "sourceUrl": "",
      "lawStatus": "정답 확정 전 보류",
      "currentLawNote": ""
    }
  },
  "110": {
    "q": "[최근 복기·원문 미확보] 선박조종 영어 해석",
    "hint1": "실제 출제 영어 지문 미확보",
    "hint2": "원문 사진·정확한 전사 등 추가 자료 필요",
    "answer": "[원문 미확보·정답 미확정]\n실제 출제 지문을 확보하지 못하여 번역 답변을 확정하지 않습니다. 영어 원문을 확보한 뒤 전문용어와 문장 전체를 대조해야 합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "C",
      "answerStatus": "정답 미확정·추가 자료 필요",
      "conceptGrade": "C",
      "conceptStatus": "원문·근거 확보 전 보류",
      "sourceRef": "실제 출제 원문 미확보; 관련 공식 자료는 해당 복기의 정답 확정 근거가 아님.",
      "sourceUrl": "",
      "lawStatus": "정답 확정 전 보류",
      "currentLawNote": ""
    }
  },
  "111": {
    "q": "[최근 복기·원문 미확보] 기타 장문 해사영어 영어 해석",
    "hint1": "실제 출제 영어 지문 미확보",
    "hint2": "원문 사진·정확한 전사 등 추가 자료 필요",
    "answer": "[원문 미확보·정답 미확정]\n실제 출제 지문을 확보하지 못하여 번역 답변을 확정하지 않습니다. 영어 원문을 확보한 뒤 전문용어와 문장 전체를 대조해야 합니다.",
    "audit": {
      "reviewedOn": "2026-09-28",
      "questionGrade": "C",
      "questionStatus": "최근 복기 주제·원문 미확보",
      "answerGrade": "C",
      "answerStatus": "정답 미확정·추가 자료 필요",
      "conceptGrade": "C",
      "conceptStatus": "원문·근거 확보 전 보류",
      "sourceRef": "실제 출제 원문 미확보; 관련 공식 자료는 해당 복기의 정답 확정 근거가 아님.",
      "sourceUrl": "",
      "lawStatus": "정답 확정 전 보류",
      "currentLawNote": ""
    }
  },
  "1": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "2": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "3": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "7": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "8": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "13": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "24": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "29": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "47": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "48": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "50": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "55": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "56": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "57": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "59": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "62": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "65": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "66": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "68": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "81": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "86": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  },
  "90": {
    "audit": {
      "reviewedOn": "2026-09-28",
      "conceptGrade": "B",
      "conceptStatus": "검증 근거에 따라 보정"
    }
  }
};
  const conceptUpdates = {
  "1": {
    "explanation": "조종제한선(RAM)은 작업의 성질 때문에 규칙이 요구하는 조종을 할 수 없어 다른 선박의 진로를 피할 수 없는 선박이다. Rule 3(g)는 항로표지·케이블 작업, 준설·측량, 항행 중 보급, 항공기 발착, 기뢰제거, 심하게 진로이탈이 제한되는 예인 등 6유형을 예시한다."
  },
  "2": {
    "terms": "• 예인선 70m·예인 길이 200m 초과: 전부 수직 마스트등 3개 + 후부 높은 마스트등 1개\n• 현등·선미등·예선등, 마름모꼴 형상물",
    "explanation": "Rule 24. 예인 길이는 예인선 선미에서 피예인물 뒤끝까지 잰다. 200m 초과이면 예인용 마스트등 3개를 수직으로 표시한다. 이 문제의 예인선은 70m이므로 두 번째 마스트등도 필요하다. 피예인선은 현등·선미등과 마름모꼴 형상물을 표시한다."
  },
  "3": {
    "explanation": "입출항법 제12조의 항로 항법은 6개 항으로 정리한다. 진입·이탈선 피항, 병렬항행 금지, 마주칠 때 우측통항, 원칙적 추월 금지와 예외, 위험물운송선박·흘수제약선 진로방해 금지, 범선 지그재그 금지이다."
  },
  "4": {
    "explanation": "입출항법 제2조의 우선피항선 6유형. 부선 항목에서는 예인선에 결합되어 운항하는 압항부선을 제외하며, 해양폐기물관리업자 소유선 중 폐기물해양배출업 등록선은 제외한다."
  },
  "6": {
    "terms": "• 직접 지휘 7사유: 출입항·좁은 수로·사고 빈발해역·제한시계·보침 곤란·교통 혼잡·설비 고장",
    "explanation": "선원법 제9조와 시행규칙 제4조의2의 조건을 함께 적용한다. 단순한 악천후라는 이유만으로 열거를 대체하지 말고, 시계 제한에 따른 충돌·좌초 우려 또는 침로 유지 곤란 등의 요건을 말한다."
  },
  "7": {
    "explanation": "통항분리방식 내 적절한 통항로를 안전하게 이용할 수 있는 선박은 원칙적으로 연안통항대를 이용하지 않는다. 20m 미만선·범선·어로 중인 선박 및 입출항·시설 접근·즉각적인 위험 회피 등의 예외를 구별한다."
  },
  "8": {
    "explanation": "마스트등 최소 시인거리는 길이 50m 이상 6해리, 20m 이상 50m 미만 5해리, 12m 이상 20m 미만 3해리, 12m 미만 2해리이다. 이 문항의 대상은 50m 이상이므로 6해리로 답한다."
  },
  "10": {
    "explanation": "Rule 34의 서로 시계 내 조종신호와 Rule 35의 제한시계 신호를 구별한다. 항행 중 정지한 동력선과 정박선의 신호는 다르다.",
    "terms": "• 서로 시계 내: 우현 단음 1·좌현 단음 2·후진기관 단음 3\n• 제한시계·항행 중: 대수전진 장음 1, 정지하여 대수전진 없음 장음 2\n• 반복 간격 2분 이하, 장음 2회 사이 약 2초"
  },
  "11": {
    "terms": "• 해양배출 기록: 날짜·시각·위치·분류·추정량(m³)·담당사관 서명",
    "explanation": "기록은 적용 서식의 분류를 쓴다. MARPOL은 Part I A–I와 화물잔류물 Part II J·K를 구별한다. 보존기간은 MARPOL Annex V에서 최소 2년이지만, 이 질문의 국내 해양환경관리법 제30조는 최종기재 후 3년이다."
  },
  "12": {
    "terms": "• 법정 열거 7협약: SOLAS·LL·COLREG·TONNAGE·ILO 147·MARPOL·STCW",
    "explanation": "문제에 지정된 선박안전법 시행령 제16조를 기준으로 답한다. 다른 법률·국제협약에 근거한 일반 PSC 검사범위를 이 목록과 혼합하지 않는다."
  },
  "13": {
    "explanation": "항해에 필요한 최신 해도와 항해용 간행물을 갖춘다. SOLAS 요건을 충족하는 ECDIS와 적절한 독립 백업을 갖춘 경우 종이해도를 대체할 수 있다. RCDS 운용 때의 종이해도 요건은 별도로 구별한다."
  },
  "14": {
    "terms": "• 화물선안전구조·안전설비·안전무선 / 통합 화물선안전 / 국제만재흘수선",
    "explanation": "화물선안전증서는 구조·설비·무선의 3개 증서를 대신하는 통합증서이다. 5종의 명칭을 답하되 한 선박에 SOLAS 4증서를 동시에 요구한다고 말하지 않는다."
  },
  "15": {
    "terms": "• 해기사: 선박직원법 제4조의 면허 소지자\n• 선박직원: 선장·항해사·기관장·기관사·전자기관사·통신장·통신사·운항장·운항사",
    "explanation": "해기사는 면허 자격의 개념이고 선박직원은 선박에서 해당 직무를 수행하는 사람의 개념이다. 제10조의2에 따라 승무자격을 인정받은 외국 해기사도 선박직원 정의에 포함된다."
  },
  "16": {
    "terms": "• 공동의 위험·공동의 안전 목적·고의적이고 합리적인 처분·비상한 희생 또는 비용",
    "explanation": "YAR Rule A의 공동해손행위 요건이다. 위험을 발생시킨 당사자의 과실 문제와 공동해손행위 자체의 고의성은 구별하며, 과실에 관한 구상·항변은 Rule D에 따라 별도로 판단한다."
  },
  "17": {
    "explanation": "보험계약과 운송계약의 책임을 구별한다. 전위험담보도 무조건 지급하는 보험은 아니지만, 피보험자에게 항상 특정 사고 원인의 입증을 요구하는 것은 부정확하다. 약관·준거법에 따른다."
  },
  "18": {
    "explanation": "ICC(A)는 면책을 제외한 전위험담보이고 B·C는 열거위험담보이다. 각 위험이 모든 약관에서 담보되는 것은 아니며 전쟁·파업 등은 별도 조건을 확인한다."
  },
  "20": {
    "explanation": "BWM D-1은 체적 95% 교환 기준이다. 3배 펌핑은 기준을 충족하는 것으로 보는 방법이며, 적은 펌핑량으로도 95% 교환을 입증할 수 있다. 일반 적용선의 D-2 단계적 이행기한은 2024.9.8까지였으며, 2026에는 교환을 D-2의 자유로운 대체수단으로 설명하지 않는다."
  },
  "21": {
    "explanation": "교환 해역은 BWM B-4의 규정이고, D-1은 교환율 기준이다. 200해리·200m가 우선이며 불가능할 때 50해리·200m, 또는 지정해역 규정을 적용한다. D-2 적용선이 이 해역에서 교환했다는 이유만으로 D-2를 충족하는 것은 아니다."
  },
  "23": {
    "terms": "• CTL: 현실전손 불가피 또는 법·약관상 비용 기준 초과\n• 위부: 잔존 권리 이전과 전손청구",
    "explanation": "MIA 60–62의 목적물별 요건을 구별한다. 회복비용이 보험금액을 넘으면 언제나 추정전손이라는 식으로 단순화하지 않는다. 위부통지 예외도 보험자의 단순한 사고 인지와 다르다. 영국 MIA의 통지 예외를 모든 국내법 준거 계약에 그대로 적용하지 않는다."
  },
  "24": {
    "terms": "• SOPEP: Shipboard Oil Pollution Emergency Plan\n• 필수 4항목: 보고·연락처·유출통제·당국과 협조",
    "explanation": "MARPOL Annex I/37. 유조선은 150GT 이상, 유조선 외 선박은 400GT 이상이 대상이다. 선장과 사관이 이해하는 업무언어로 작성하며, 영문만이 유일한 의무 언어라고 단정하지 않는다."
  },
  "25": {
    "terms": "• 화물선 18시간: SOLAS II-1/43.2.2\n• 소집·승정장소·선측 밖: 43.2.1의 3시간",
    "explanation": "화물선 18시간과 여객선 36시간을 일괄 적용하지 않는다. 화물선의 소집·승정장소·선측 밖 조명은 별도 3시간 요건이다."
  },
  "27": {
    "terms": "• 주관청: 기국 정부\n• 여객: 선장·선원·선박업무 종사자·1세 미만 유아 제외\n• 여객선: 여객 12명 초과\n• 탱커: 인화성 액체 산적운송 화물선",
    "explanation": "SOLAS I/2의 정의이다. 12명 기준은 여객선의 구분 기준이며, 여객이라는 사람의 정의가 아니다."
  },
  "29": {
    "terms": "• SMC: 선박안전관리증서 / 선내 원본 / 원칙적으로 5년 이내",
    "explanation": "ISM 13.8에 따라 최소 1회의 중간검증이 필요하다. 유효기간 5년이며 중간검증이 1회인 경우 제2·제3주년일 사이에 실시한다. DOC의 연차검증과 혼동하지 않는다."
  },
  "30": {
    "explanation": "익수자 쪽 전타 후 원침로에서 60도 벗어나면 반대 전타, 역침로에 도달하기 20도 전에 타 중앙으로 하여 역침로에 정침한다. 원항적으로 복귀하기 좋지만 사고지점에서 멀어지고 시간이 걸린다. 실제 각도·시간은 본선 조종성능도 고려한다."
  },
  "47": {
    "explanation": "도선사 승선은 take the pilot, 도선면제는 exempted from pilotage이다."
  },
  "48": {
    "explanation": "draft forward/ aft와 letting go를 구별한다. 숫자는 SMCP 원칙에 따라 한 자리씩 읽으며 타각 명령은 예외이다."
  },
  "50": {
    "explanation": "How much cable is out? / How much weight is on the cable?를 구별한다. up and down은 묘쇄가 수직인 상태이다."
  },
  "52": {
    "explanation": "give way는 피항, CPA는 최접근거리이다. 조건 문장의 less than 1.0 mile을 끝까지 말한다."
  },
  "55": {
    "explanation": "single up은 해당 계류삭을 한 줄씩 남기는 조작이다. head lines와 aft springs 등 지정된 로프를 생략하지 않는다."
  },
  "56": {
    "explanation": "Steady는 선회를 가능한 한 빨리 억제하라는 명령, Ease to five는 같은 쪽 타각을 5도로 줄이라는 명령이다."
  },
  "57": {
    "explanation": "under control은 화재가 통제되는 상태이며, extinguished(완전 소화)와 구별한다."
  },
  "58": {
    "explanation": "현문사다리와 도선사용 사다리의 조합은 in combination with the pilot ladder까지 말한다."
  },
  "59": {
    "explanation": "helicopter to pick up persons, identification signals, keep the wind on port/starboard bow를 구별한다."
  },
  "61": {
    "terms": "• 정적 복원력: 배수중량 × GZ인 복원모멘트\n• 동적 복원력: 배수중량 × GZ 곡선의 각도에 대한 적분",
    "explanation": "정적 복원력은 각도별 모멘트이다. 동적 복원력은 직립상태부터 해당 각도까지 기울이는 데 필요한 일로, 배수중량에 GZ 곡선 면적을 곱한다. 에너지 계산에서 각도는 라디안으로 적분한다."
  },
  "62": {
    "terms": "• 위성을 통한 외부 교신\n• 충전 가능한 비상배터리\n• 쉽게 식별하기 어려운 위치의 외부안테나",
    "explanation": "선박설비기준 제56조의6에 명시된 위성통신설비의 3요건을 답한다. 이 조항은 특정 상표, GPS 또는 24~48시간이라는 작동시간을 요구하지 않는다."
  },
  "63": {
    "explanation": "투묘법은 선박의 조종성능, 수심·저질·풍조류와 투묘장비 운용한계를 고려해 선택한다. 전진·후진 투묘 각각의 장단점을 말하며 선종만으로 방법을 단정하지 않는다."
  },
  "65": {
    "terms": "• MOB: 경보·구명부환·위치 표시·전담 경계·선장 호출·구조 준비",
    "explanation": "즉각적인 인명구조 조치를 병행한다. 현장 복귀법은 즉시 발견인지 지연 발견인지, 시계·선박 성능 등을 고려해 선택하며 Williamson turn만이 유일한 방법은 아니다."
  },
  "66": {
    "explanation": "황천 중 프로펠러 침수가 부족해지면 부하가 급감하여 회전수가 상승한다. 감속·침로 조정·적절한 트림으로 침수를 확보하고 제작자 운전한계를 지킨다."
  },
  "67": {
    "terms": "• 재전송 중지·지원 시 DSC 자체 취소·CH16 음성 취소·구조기관 통보·기록",
    "explanation": "DSC 자체 취소가 가능한 장비는 이를 사용하더라도 음성 취소통보를 생략하지 않는다. 특정 전원 조작을 모든 장비에 일률적으로 적용하지 말고 화면·제조자 지시를 따른다."
  },
  "68": {
    "terms": "• 선수 반발·선미 흡인 / 조기 감속·충분한 이안거리·회두 경향 보정",
    "explanation": "안벽으로 인한 원치 않는 회두 경향을 억제하도록 조기에 타를 사용한다. “안벽 반대쪽으로 무조건 전타”라는 뜻이 아니며, 속력·수심·타효와 주변 수역을 함께 고려한다."
  },
  "69": {
    "terms": "• 수선면 도심 / 위치는 선형·흘수에 따라 변동 / 그 직상 소량 적·양화는 1차 트림 변화 없음",
    "explanation": "부면심 위치는 복원성자료의 LCF로 확인한다. 기출에 제시된 보통선형의 범위는 대략적인 교육 예시이며 모든 선박에 적용되는 고정 설계기준이 아니다."
  },
  "70": {
    "terms": "• 탱크를 완전히 채우거나 비움 / 슬랙탱크 최소화 / 종방향 구획",
    "explanation": "직사각형 자유표면의 면적2차모멘트 i는 길이×폭³/12에 비례하며 자유표면모멘트에는 액체 밀도를 함께 고려한다. 넓은 자유표면의 폭을 줄이는 종방향 구획이 효과적이다. 액체의 점성이 높다는 이유만으로 자유표면 보정을 생략하지 않는다."
  },
  "71": {
    "terms": "• 정답 미확정 / 선회 단계·횡력·복원모멘트의 관계 추가 확인",
    "explanation": "기존 “약 30%”는 근거가 확인되지 않아 삭제한다. 공식 예시라는 이유만으로 역학 설명의 정확성을 확정하지 않는다."
  },
  "72": {
    "explanation": "수평면 회두의 pivot point와 수선면 도심인 부면심(LCF)은 다른 개념이다. 부면심은 미소 트림을 설명할 때 사용하며 회두 중심으로 고정하지 않는다."
  },
  "75": {
    "explanation": "작은 횡경사에서 GM이 양이면 복원, 0이면 중립, 음이면 직립 상태가 불안정하다. 음의 GM이 언제나 즉시 전복을 뜻하지는 않으며, 큰 각도에서는 전체 GZ 곡선과 침수각 등을 확인해야 한다."
  },
  "81": {
    "explanation": "우선 항해 안전을 확보하고 선장·회사에 보고한다. 장비 고장이 증서 유효성·감항성 등에 미치는 영향에 따라 기국·검사기관·항만당국 통보 등 적용 절차를 따른다. 당직자가 모든 고장을 직접 PSC에 보고한다고 단정하지 않는다."
  },
  "82": {
    "terms": "• 시진방위각법: UTC·위도·경도·천체 적위로 진방위 산출\n• 오차: 진방위 − 자이로방위, 각도차 정규화",
    "explanation": "시진방위각법은 관측 시각과 선위로 천체의 진방위를 계산한다. 일출·일몰 때 사용하는 출몰방위각법과 같지 않다. 예를 들어 진방위 001도, 자이로방위 359도이면 오차는 2도 East이다."
  },
  "86": {
    "explanation": "다른 레이더와의 비동기성 간섭 신호를 펄스 간의 일관성 등을 이용해 억제하는 기능이다. 다른 선박의 송신에 자선 레이더를 동기화하는 기능이 아니다. 과도한 IR은 약한 표적 탐지를 저하시킬 수 있으므로 필요한 수준으로 설정한다."
  },
  "87": {
    "explanation": "Safety contour는 안전수역과 불안전수역을 구분하는 기준이다. 흘수·필요 UKC·조석·squat·오차 등을 고려한 본선 기준을 적용한다. 선택한 등심선이 ENC에 없으면 다음 깊은 등심선을 쓰며, 흘수의 고정 배수로 일률 설정하지 않는다."
  },
  "88": {
    "explanation": "수록 축척보다 큰 축척으로 표시되는 상태임을 항해사가 알 수 있어야 한다. 확대가 해도의 정확도를 높이지 않으며, 자동 해도 선택 여부와 세부 표시는 장비·모드에 따라 다르다. “모든 장비가 2배일 때만 경고” 또는 “항상 자동으로 최적 해도로 전환”이라고 외우지 않는다."
  },
  "89": {
    "terms": "• 벡터: 객체·속성 데이터 / 래스터: 원해도의 격자 이미지\n• 공식 ENC와 일반 벡터 해도는 구별",
    "explanation": "S-57 ENC와 S-100 체계의 S-101 ENC를 구별한다. 적용 ECDIS 성능기준은 설치시기에 따라 달라진다. ENC가 없는 해역에서 허용되는 RCDS 운용은 적절한 최신 종이해도를 함께 사용하는 등 별도 요건이 있다."
  },
  "90": {
    "terms": "• 자기침로 MC = 컴퍼스침로 C + 자차 D\n• 진침로 T = 자기침로 MC + 편차 V",
    "explanation": "East는 더하고 West는 빼는 부호 규약에서 T=C+D+V이다. 반대로 진침로에서 조타할 컴퍼스침로를 구하려면 C=T-D-V로 계산하고 0~360도로 정리한다."
  },
  "91": {
    "terms": "• 독립 백업·안전한 인계·최신 해도·항로계획·항로감시",
    "explanation": "MSC.232(82) Appendix 6은 백업의 기능·신뢰성·전원 독립성 등을 정한다. 위치정보를 연속 확보해야 하며 필요한 센서 연결은 승인된 구성에 따른다. 모든 센서를 별도로 한 벌씩 설치한다는 단일 규칙으로 외우지 않는다."
  },
  "92": {
    "terms": "• Doppler effect / Ground tracking / Water tracking",
    "explanation": "주파수 차는 음파 빔 방향의 상대속력에 대응한다. 장비가 계산한 속력이 대지속력인지 대수속력인지 모드와 표시를 확인한다."
  },
  "95": {
    "terms": "• JMA ASAS 경보 범례 / 풍속 단위 kt",
    "explanation": "W·GW·SW·TW는 특정 발행기관의 일기도 범례와 함께 해석한다. SW는 태풍 이외의 저기압뿐 아니라 해당 풍속의 열대저기압에도 쓰이며, 태풍은 TW 표시를 구별한다."
  },
  "97": {
    "terms": "• 수심·조석·묘쇄공 높이 / 풍조류·저질 / 장비·선회 여유",
    "explanation": "내어줄 묘쇄 길이는 수심만의 고정 배수로 정하지 않는다. 본선의 승인 절차·장비 한계, 기상·저질과 다른 선박·장애물까지의 선회 여유를 함께 확인한다."
  },
  "98": {
    "terms": "• Emergency towing procedures / Emergency towing booklet / Emergency towing arrangements",
    "explanation": "절차서와 물리적 비상예인설비는 같은 의무가 아니다. 절차는 해당 SOLAS 적용선의 본선 장비로 수행할 수 있어야 하며, 최신 지침의 영어 문서·임무·연결방법을 확인한다."
  },
  "99": {
    "terms": "• Voyage Data Recorder: 항해자료기록장치 / Heading: 선수방위",
    "explanation": "MSC.333(90)는 2014.7.1 이후 설치 VDR의 기준이다. 오래된 VDR와 S-VDR에 최신 VDR의 전체 기록 목록을 그대로 의무화하지 않는다."
  },
  "100": {
    "terms": "• 외국항 간 / 국외 결원 후 본국항까지 / 항행 중 결원·보충 곤란",
    "explanation": "선박직원법 제12조의 일시적 승무기준 특례이다. 결원을 상시 방치할 권한이 아니며 소유자는 지체 없이 보충하고 결원 사실과 보충계획을 해양수산부장관에게 알려야 한다."
  },
  "101": {
    "terms": "• 0.03% 이상 0.08% 미만 최초: 6개월 업무정지\n• 재위반·사상사고·0.08% 이상·측정거부: 면허취소",
    "explanation": "선박직원법 제9조제2항의 해기사 면허 행정처분을 답한다. 해상교통안전법상의 운항금지·측정 및 형사처벌과 구별하며, 법이 정한 해양경찰청장의 요청 절차에 따른 처분이다."
  },
  "102": {
    "terms": "• 폐기물기록부 / 기름기록부 / 유해액체물질기록부",
    "explanation": "해양환경관리법 제30조에 따른 기록부 3종이다. 적용 선박·기록 작업은 하위 규정에 따라 구분하며, 이 국내법의 보존기간은 최종기재 후 3년이다. MARPOL의 개별 최소기간과 혼동하지 않는다."
  },
  "103": {
    "terms": "• IBWMC / BWMP / BWRB / BWMS / D-2",
    "explanation": "협약 예외·면제와 선박별 적용범위를 먼저 확인한다. 통상 400GT 이상 적용선의 검사·증서 요건과 모든 대상선의 관리·기록 요건을 구별한다. 고장 시 임의 배출·임의 D-1 전환 대신 승인 계획과 관계 당국의 비상조치를 따른다."
  },
  "104": {
    "terms": "• IBC Code 16.2.2–16.2.4 / Cargo information / Stowage plan",
    "explanation": "단순한 제품명이나 일반 MSDS만으로 모든 의무 정보가 충족되는지 판단하지 않는다. 화물별 위험성·비상조치와 운송·취급 절차가 선장에게 제공되어야 한다."
  },
  "105": {
    "terms": "• 중량: 배수량·DWT / 용적 기반 지수: GT·NT",
    "explanation": "배수량은 해당 상태의 실제 선박 중량이다. DWT는 만재배수량에서 경하배수량을 뺀 적재 가능한 중량이며 화물만의 중량은 아니다. GT·NT를 톤 단위의 실제 무게나 단순 세제곱미터 값과 동일시하지 않는다."
  },
  "106": {
    "terms": "• 중량 / 부력 / 하중 / 전단력 / 굽힘모멘트",
    "explanation": "선체 길이별 중량과 부력의 차가 순하중이며 이를 적분하여 전단력, 다시 적분하여 굽힘모멘트를 구한다. 양·음의 부호는 채택한 규약을 일관되게 사용한다."
  }
};
  const data = global.MD_DATA && global.MD_DATA.navi2;
  const concepts = global.MD_CONCEPTS && global.MD_CONCEPTS.navi2;
  if(!data || !Array.isArray(data.QUESTIONS) || !concepts) {
    throw new Error('navi2 reviewed content must load after data, concepts and audit metadata');
  }
  const byId = new Map(data.QUESTIONS.map(q => [Number(q.id), q]));
  for(const [id, fields] of Object.entries(questionUpdates)) {
    const q = byId.get(Number(id));
    if(!q) throw new Error('Missing reviewed navi2 question: '+id);
    for(const [key, value] of Object.entries(fields)) {
      if(key === 'audit') q.audit = Object.assign({}, q.audit || {}, value);
      else q[key] = value;
    }
  }
  for(const [id, fields] of Object.entries(conceptUpdates)) {
    concepts[id] = Object.assign({}, concepts[id] || {}, fields);
  }
  if(data.meta) {
    data.meta.version = '2.3-oral-reviewed-20260928';
    data.meta.auditDate = '2026-09-28';
    data.meta.auditScope = '75 official + 21 recall reviewed; fishing IDs 31–45 excluded; 9 questions pending';
    data.meta.auditBasis = '2023 KIMFT PDFs + applicable Korean laws and primary maritime sources; recall originals unavailable';
  }
})(window);
