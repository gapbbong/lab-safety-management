const safetyData = {
    departments: {
        "IoT전기과": {
            head: "최지은",
            pdfFile: "26 실습실 안전점검표(IoT전기과).pdf",
            rooms: [
                { name: "IoT메이커실",         teacher: "최현정", pdfPage: 1 },
                { name: "인공지능실습실",       teacher: "김덕원", pdfPage: 2 },
                { name: "전기공사실",           teacher: "박창우", pdfPage: 3 },
                { name: "전기드림팩토리",       teacher: "정민주", pdfPage: 4 },
                { name: "전력전자실",           teacher: "박성환", pdfPage: 5 },
                { name: "지능형실습실",         teacher: "한현숙", pdfPage: 6 }
            ]
        },
        "게임콘텐츠과": {
            head: "최지은",
            pdfFile: "26 실습실 안전점검표(게임콘텐츠과).pdf",
            rooms: [
                { name: "코딩라운지(303호)",           teacher: "황철현", pdfPage: 1 },
                { name: "코드상상실(302호)",            teacher: "이상수", pdfPage: 2 },
                { name: "자동제어시스템운용실(501호)",  teacher: "이갑종", pdfPage: 3 },
                { name: "디자인메이커스페이스(203호)",  teacher: "최지은", pdfPage: 4 },
                { name: "비전그래픽스튜디오(201호)",    teacher: "김웅환", pdfPage: 5 },
                { name: "아이디어팩토리(202호)",        teacher: "김민경", pdfPage: 6 }
            ]
        }
    },

    checklist: [
        {
            category: "안전계획",
            items: [
                "실습실 안전관리 계획 (안전교육, 비상상황 대응, 비상연락망 등)",
                "학과별 실습실 관리자 인수인계서"
            ]
        },
        {
            category: "일반안전",
            items: [
                "게시물: 안전수칙, 안전보건표지, 위험표기, MSDS, 비상연락망 등",
                "개인보호구 구비·관리",
                "비품 구비 및 관리 대장",
                "실험실 정리 정돈 및 청소 상태",
                "기타 (실습실 조도, 학교방송 음량상태, 벽 곰팡이 등)"
            ]
        },
        {
            category: "소방안전",
            items: [
                "비상구 및 피난통로 장애물 적재 여부",
                "인화성 물질 대장(보유량 확인) 및 화기 근접 여부"
            ]
        },
        {
            category: "화공안전",
            items: [
                "시약병 보관상태 적정 여부 (낙하, 경고표시 등)",
                "폐액용기 대장 (보관량, 라벨 부착 등)",
                "세안기 및 샤워기 관리 상태"
            ]
        },
        {
            category: "가스안전",
            items: [
                "가스 용기 옥외보관 및 고정 상태",
                "가스 누설 여부 및 환기 상태",
                "충전기한 초과 여부",
                "가스감지기, 자동차단장치 상태"
            ]
        },
        {
            category: "산업위생",
            items: [
                "개인보호구, 구급약품 관리 상태",
                "급/배기 (흄후드) 작동 상태"
            ]
        },
        {
            category: "기계안전",
            items: [
                "위험기계·기구 정기 검사 실시 여부",
                "위험기계·기구 방호 장치 설치 여부"
            ]
        },
        {
            category: "전기안전",
            items: [
                "콘센트 및 전기배선 관리 상태",
                "미사용 실험기기 전원 OFF 여부"
            ]
        },
        {
            category: "기자재",
            items: [
                "실습실 기자재 준비사항",
                "실습실 기자재 이상유무"
            ]
        }
    ]
};

// Calculate total items
safetyData.totalItems = safetyData.checklist.reduce((acc, cat) => acc + cat.items.length, 0);
