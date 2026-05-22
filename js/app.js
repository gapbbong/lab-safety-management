document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        deptSelect: document.getElementById('department'),
        roomSelect: document.getElementById('labRoom'),
        headInput: document.getElementById('deptHead'),
        teacherInput: document.getElementById('teacher'),
        monthSelect: document.getElementById('inspectionMonth'),
        dayInput: document.getElementById('inspectionDay'),
        btnStartCheck: document.getElementById('btnStartCheck'),
        btnStartText: document.getElementById('btnStartText'),

        
        stepInfo: document.getElementById('step-info'),
        stepChecklist: document.getElementById('step-checklist'),
        stepDone: document.getElementById('step-done'),
        
        checkInfo: document.getElementById('checkInfo'),
        checklistForm: document.getElementById('checklistForm'),
        progressFill: document.getElementById('progressFill'),
        progressText: document.getElementById('progressText'),
        
        btnBack: document.getElementById('btnBack'),
        btnSave: document.getElementById('btnSave'),
        btnExportPdfStep2: document.getElementById('btnExportPdfStep2'),
        btnCheckAllGood: document.getElementById('btnCheckAllGood'),
        
        btnRefreshStatus: document.getElementById('btnRefreshStatus'),
        btnBulkPrint: document.getElementById('btnBulkPrint'),
        
        doneDesc: document.getElementById('doneDesc'),
        btnNewCheck: document.getElementById('btnNewCheck'),
        btnPrintDone: document.getElementById('btnPrintDone'),
        
        printArea: document.getElementById('printArea'),

        // 미리보기 모달 엘리먼트 추가
        btnPreviewSignature: document.getElementById('btnPreviewSignature'),
        previewModal: document.getElementById('previewModal'),
        previewModalBody: document.getElementById('previewModalBody'),
        btnClosePreview: document.getElementById('btnClosePreview'),
        btnClosePreviewBottom: document.getElementById('btnClosePreviewBottom'),
        btnPrintFromPreview: document.getElementById('btnPrintFromPreview'),

        // 개별 결재 모달 엘리먼트 추가
        adminApprovalModal: document.getElementById('adminApprovalModal'),
        adminApprovalModalTitle: document.getElementById('adminApprovalModalTitle'),
        btnCloseAdminApproval: document.getElementById('btnCloseAdminApproval'),
        btnCloseAdminApprovalBottom: document.getElementById('btnCloseAdminApprovalBottom'),
        btnClearAdminIndivSignature: document.getElementById('btnClearAdminIndivSignature'),
        btnSaveAdminApproval: document.getElementById('btnSaveAdminApproval'),
        
        // 학과부장 대시보드 엘리먼트 추가
        deptheadDashboard: document.getElementById('deptheadDashboard'),
        deptheadWelcomeTitle: document.getElementById('deptheadWelcomeTitle'),
        deptheadSubTitle: document.getElementById('deptheadSubTitle'),
        statTotalRooms: document.getElementById('statTotalRooms'),
        statSubmittedRooms: document.getElementById('statSubmittedRooms'),
        statPendingRooms: document.getElementById('statPendingRooms'),
        statApprovedRooms: document.getElementById('statApprovedRooms'),
        linksCardTitle: document.getElementById('linksCardTitle'),
        deptheadApprovalCard: document.getElementById('deptheadApprovalCard'),
        deptheadBulkSignaturePad: document.getElementById('deptheadBulkSignaturePad'),
        deptheadBulkSavedOverlay: document.getElementById('deptheadBulkSavedOverlay'),
        btnDeptheadClearBulkSig: document.getElementById('btnDeptheadClearBulkSig'),
        btnDeptheadPreviewBulkSig: document.getElementById('btnDeptheadPreviewBulkSig'),
        btnDeptheadSaveApproval: document.getElementById('btnDeptheadSaveApproval'),
        btnDeptheadBulkPrint: document.getElementById('btnDeptheadBulkPrint'),
        btnDeptheadDeleteBulkSig: document.getElementById('btnDeptheadDeleteBulkSig')
    };

    let currentChecklistState = {};
    let currentInfo = {};
    let isAdminMode = true;
    let isDeptHeadMode = false; // 학과부장 전용 페이지 모드 여부
    let signatureDataUrl = null;

    // 부장 결재 관리 상태 변수
    let adminApprovalMode = 'bulk'; // 'bulk' 또는 'individual'
    let adminBulkSignatureDataUrl = null; // 일괄 결재 서명 이미지
    let currentApprovingLab = null; // 현재 개별 결재 팝업이 띄워진 실습실 정보 ({ dept, room })
    
    let checklistsUnsubscribe = null; // 실시간 Firestore 구독 해제 핸들
    let canvasHelper = null; // 교사 서명 패드 헬퍼 객체
    let adminIndivCanvasHelper = null; // 개별 결재 서명 패드 헬퍼 객체
    let deptheadBulkCanvasHelper = null; // 학과부장 일괄 서명 패드 헬퍼 객체

    // Step 1: Initialize Department Dropdown based on data.js
    function initDepartments() {
        elements.deptSelect.innerHTML = '<option value="">학과 선택</option>';
        Object.keys(safetyData.departments).forEach(deptName => {
            const option = document.createElement('option');
            option.value = deptName;
            option.textContent = deptName;
            elements.deptSelect.appendChild(option);
        });
    }

    initDepartments();
    if (elements.deptheadApprovalCard) {
        elements.deptheadApprovalCard.classList.add('hidden');
    }

    // Deep linking logic
    function processUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const m = params.get('m');
        const d = params.get('d');
        const dept = params.get('dept');
        const room = params.get('room');
        const role = params.get('role');

        if (role === 'depthead') {
            isDeptHeadMode = true;
            isAdminMode = true;
            if (m && d) {
                elements.monthSelect.value = m;
                elements.dayInput.value = d;
                
                adminApprovalMode = 'bulk';
                // 라디오 버튼 상태 강제 동기화
                const radio = document.querySelector('input[name="deptheadApprovalMode"][value="bulk"]');
                if (radio) radio.checked = true;

                // 뒤로가기 버튼 노출 및 처음으로 이동 기능 적용
                if (elements.btnBack) {
                    elements.btnBack.classList.remove('hidden');
                    elements.btnBack.title = '처음으로';
                    elements.btnBack.onclick = (e) => {
                        e.preventDefault();
                        window.location.href = window.location.pathname;
                    };
                }

                // 점검 정보 입력 화면의 카드만 숨기고, 부모인 stepInfo는 보여주도록 수정
                const cardInfo = document.querySelector('.card-info');
                if (cardInfo) cardInfo.classList.add('hidden');
                elements.stepInfo.classList.remove('hidden');
                
                updateDeptheadCardLayout();
                generateAdminLinks();
            }
        } else if (m && d && dept && room) {
            isAdminMode = false;
            elements.btnStartText.textContent = "점검 시작 ➔";
            elements.monthSelect.value = m;
            elements.dayInput.value = d;
            
            if (safetyData.departments[dept]) {
                elements.deptSelect.value = dept;
                
                // Manually populate rooms
                elements.roomSelect.innerHTML = '<option value="">실습실 선택</option>';
                elements.roomSelect.disabled = false;
                elements.headInput.value = safetyData.departments[dept].head;
                
                safetyData.departments[dept].rooms.forEach(r => {
                    const option = document.createElement('option');
                    option.value = r.name;
                    option.textContent = r.name;
                    elements.roomSelect.appendChild(option);
                });
                
                // Select room and teacher
                const roomExists = safetyData.departments[dept].rooms.find(r => r.name === room);
                let teacherName = "";
                if (roomExists) {
                    elements.roomSelect.value = room;
                    elements.teacherInput.value = roomExists.teacher;
                    teacherName = roomExists.teacher;
                }
                
                validateStep1();

                // 담당교사 여부 확인 팝업 노출
                setTimeout(() => {
                    const isConfirmed = confirm(`${teacherName} 선생님, ${room} 담당자가 맞습니까?`);
                    if (isConfirmed) {
                        // 확인 누르면 다음 페이지(점검표 입력 화면)로 바로 진행
                        currentInfo = {
                            month: m,
                            day: d,
                            dept: dept,
                            room: room,
                            head: safetyData.departments[dept].head,
                            teacher: teacherName,
                            date: `2026-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
                        };
                        
                        elements.checkInfo.textContent = `${currentInfo.dept} / ${currentInfo.room} / 담당: ${currentInfo.teacher}`;
                        renderChecklist();
                        updateProgress();
                        
                        elements.stepInfo.classList.add('hidden');
                        elements.stepChecklist.classList.remove('hidden');
                        if (elements.btnBack) {
                            elements.btnBack.classList.remove('hidden');
                            elements.btnBack.title = '처음으로';
                            elements.btnBack.onclick = (e) => {
                                e.preventDefault();
                                window.location.href = window.location.pathname;
                            };
                        }
                    } else {
                        // 취소하면 첫 화면으로 이동
                        window.location.href = window.location.pathname;
                    }
                }, 100);
            }
        }
    }

    processUrlParams();

    // Event: Department Selection Changed
    elements.deptSelect.addEventListener('change', (e) => {
        const dept = e.target.value;
        elements.roomSelect.innerHTML = '<option value="">실습실 선택</option>';
        elements.headInput.value = '';
        elements.teacherInput.value = '';
        
        if (dept && safetyData.departments[dept]) {
            elements.roomSelect.disabled = false;
            elements.headInput.value = safetyData.departments[dept].head;
            
            safetyData.departments[dept].rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.name;
                option.textContent = room.name;
                elements.roomSelect.appendChild(option);
            });
        } else {
            elements.roomSelect.disabled = true;
        }
        validateStep1();
    });

    // Event: Room Selection Changed
    elements.roomSelect.addEventListener('change', (e) => {
        const dept = elements.deptSelect.value;
        const roomName = e.target.value;
        if (dept && roomName) {
            const roomData = safetyData.departments[dept].rooms.find(r => r.name === roomName);
            if (roomData) {
                elements.teacherInput.value = roomData.teacher;
            }
        } else {
            elements.teacherInput.value = '';
        }
        validateStep1();
    });

    // Inputs Validation
    [elements.monthSelect, elements.dayInput].forEach(el => {
        el.addEventListener('input', validateStep1);
    });

    function validateStep1() {
        let isValid = false;
        if (isAdminMode) {
            isValid = elements.monthSelect.value && elements.dayInput.value;
        } else {
            isValid = elements.deptSelect.value && 
                      elements.roomSelect.value && 
                      elements.monthSelect.value && 
                      elements.dayInput.value;
        }
        elements.btnStartCheck.disabled = !isValid;
    }

    // Step 1 -> Step 2 or Generate Links
    elements.btnStartCheck.addEventListener('click', () => {
        if (isAdminMode) {
            generateAdminLinks();
            return;
        }
        
        currentInfo = {
            month: elements.monthSelect.value,
            day: elements.dayInput.value,
            dept: elements.deptSelect.value,
            room: elements.roomSelect.value,
            head: elements.headInput.value,
            teacher: elements.teacherInput.value,
            date: `2026-${elements.monthSelect.value.padStart(2, '0')}-${elements.dayInput.value.padStart(2, '0')}`
        };
        
        elements.checkInfo.textContent = `${currentInfo.dept} / ${currentInfo.room} / 담당: ${currentInfo.teacher}`;
        renderChecklist();
        updateProgress();
        
        elements.stepInfo.classList.add('hidden');
        elements.stepChecklist.classList.remove('hidden');
        if (elements.btnBack) elements.btnBack.classList.remove('hidden');
    });

    // Step 2 -> Step 1 (Back)
    if (elements.btnBack) {
        elements.btnBack.addEventListener('click', () => {
            elements.stepChecklist.classList.add('hidden');
            elements.stepInfo.classList.remove('hidden');
            elements.btnBack.classList.add('hidden');
        });
    }

    // Generate Links for Admin
    function generateAdminLinks() {
        const m = elements.monthSelect.value;
        const d = elements.dayInput.value;
        const linksCard = document.getElementById('linksCard');
        const linksBody = document.getElementById('linksBody');
        
        if (!m || !d) return;

        linksBody.innerHTML = '<tr><td colspan="5" style="padding:1rem; text-align:center;">데이터를 불러오는 중입니다...</td></tr>';
        linksCard.classList.remove('hidden');

        if (isDeptHeadMode) {
            const cardInfo = document.querySelector('.card-info');
            if (cardInfo) cardInfo.classList.add('hidden');
            if (elements.btnBack) {
                elements.btnBack.classList.remove('hidden');
                elements.btnBack.title = '처음으로';
                elements.btnBack.onclick = (e) => {
                    e.preventDefault();
                    window.location.href = window.location.pathname;
                };
            }
            updateDeptheadCardLayout();
        }

        // 기존 실시간 리스너 구독 해제
        if (checklistsUnsubscribe) {
            checklistsUnsubscribe();
            checklistsUnsubscribe = null;
        }

        try {
            if (!window.firebaseDB) {
                throw new Error("Firebase DB가 연결되지 않았습니다.");
            }
            // 실시간 리스너 구독 등록 (onSnapshot)
            checklistsUnsubscribe = window.firebaseDB.subscribeToChecklistsForDate(m, d, (submittedData) => {
                window.currentSubmittedData = submittedData;
                renderLinksTable(submittedData);
            });
        } catch (e) {
            console.error('Firebase 실시간 리스너 등록 실패', e);
            linksBody.innerHTML = `<tr><td colspan="5" style="padding:1rem; text-align:center; color:red;">제출 현황을 불러오지 못했습니다: ${e.message || e}</td></tr>`;
        }
    }

    // 학과부장 저장됨 오버레이 상태 업데이트
    function updateDeptheadSavedOverlayState() {
        if (!elements.deptheadBulkSavedOverlay) return;
        
        if (adminBulkSignatureDataUrl) {
            elements.deptheadBulkSavedOverlay.style.display = 'flex';
        } else {
            elements.deptheadBulkSavedOverlay.style.display = 'none';
        }
    }

    // 학과부장 결재 설정 카드 내부 레이아웃 제어
    function updateDeptheadCardLayout() {
        if (!isDeptHeadMode || !elements.deptheadApprovalCard) return;

        elements.deptheadApprovalCard.classList.remove('hidden');

        if (adminApprovalMode === 'bulk') {
            document.getElementById('deptheadBulkSignatureArea').style.display = 'flex';
            elements.btnDeptheadSaveApproval.style.display = 'inline-flex';
        } else {
            document.getElementById('deptheadBulkSignatureArea').style.display = 'none';
            elements.btnDeptheadSaveApproval.style.display = 'none';
        }
        
        updateDeptheadSavedOverlayState();
    }

    // 현황판 테이블 렌더링 함수
    function renderLinksTable(submittedData) {
        const m = elements.monthSelect.value;
        const d = elements.dayInput.value;
        const linksBody = document.getElementById('linksBody');
        const baseUrl = window.location.href.split('?')[0];

        // 일괄 서명 복구 판별
        const savedApproval = submittedData.find(item => item.adminSignature);
        if (savedApproval && adminApprovalMode === 'bulk') {
            adminBulkSignatureDataUrl = savedApproval.adminSignature;
        } else if (adminApprovalMode === 'bulk' && !savedApproval) {
            adminBulkSignatureDataUrl = null;
        }

        // 동기화된 일괄 결재 상태 카드의 Overlay 업데이트
        updateDeptheadSavedOverlayState();

        linksBody.innerHTML = '';

        // ── 전체 행 리스트 생성 (학과부장 포함) ───────────────────────
        let allRows = [];
        Object.keys(safetyData.departments).forEach(deptName => {
            const dept = safetyData.departments[deptName];
            dept.rooms.forEach(room => {
                allRows.push({
                    type: 'room',
                    teacher: room.teacher,
                    deptName: deptName,
                    roomName: room.name,
                    room: room
                });
            });
        });

        const deptNames = Object.keys(safetyData.departments);
        const deptHeadName = deptNames.length > 0 ? safetyData.departments[deptNames[0]].head : "최지은";

        // 학과부장 행 추가
        allRows.push({
            type: 'depthead',
            teacher: deptHeadName,
            deptName: '학과부장',
            roomName: '학과부장'
        });

        // 담당교사 이름순(가나다순) 정렬
        allRows.sort((a, b) => {
            return a.teacher.localeCompare(b.teacher, 'ko');
        });

        // ── 학과부장 대시보드 통계 업데이트 (학과부장 모드일 때만) ──────────────────
        if (isDeptHeadMode) {
            elements.deptheadDashboard.classList.remove('hidden');
            elements.linksCardTitle.textContent = "📋 학과부장 결재 목록";
            
            // 학과부장 본인을 제외한 실습실 개수
            const totalCount = allRows.filter(r => r.type === 'room').length;
            const submittedCount = submittedData.length;
            const pendingCount = totalCount - submittedCount;
            
            let approvedCount = 0;
            if (adminApprovalMode === 'bulk') {
                approvedCount = adminBulkSignatureDataUrl ? submittedCount : 0;
            } else {
                submittedData.forEach(sub => {
                    if (sub.adminSignature) approvedCount++;
                });
            }
            const approvalPendingCount = submittedCount - approvedCount;

            elements.statTotalRooms.textContent = totalCount;
            elements.statSubmittedRooms.textContent = submittedCount;
            elements.statPendingRooms.textContent = pendingCount;
            elements.statApprovedRooms.textContent = approvalPendingCount;
        } else {
            elements.deptheadDashboard.classList.add('hidden');
            elements.linksCardTitle.textContent = "📊 제출 현황판 및 교사별 링크";
        }

        // ── 각 행 렌더링 ───────────────────────
        allRows.forEach((row) => {
            if (row.type === 'depthead') {
                // 학과부장 행 렌더링
                let approvalBadge = '';
                if (adminApprovalMode === 'bulk') {
                    approvalBadge = adminBulkSignatureDataUrl 
                        ? '<span class="badge badge-success">✅ 일괄결재완료</span>' 
                        : '<span class="badge badge-warning">결재 대기</span>';
                } else {
                    const isAllApproved = submittedData.length > 0 && submittedData.every(item => item.adminSignature);
                    approvalBadge = isAllApproved
                        ? '<span class="badge badge-success">✅ 결재 완료</span>'
                        : '<span class="badge badge-warning">결재 대기</span>';
                }

                const headRowTr = document.createElement('tr');
                headRowTr.style.backgroundColor = '#f8fafc';
                
                const deptHeadUrl = `${baseUrl}?m=${m}&d=${d}&role=depthead`;

                // 링크 복사 셀에서 이모지(📋, 🔗) 제거 및 패딩/폰트 크기 줄임
                const deptHeadLinksCellHtml = `
                    <div style="display:flex; gap:0.2rem; justify-content:center;">
                        <button class="btn btn-primary" style="padding: 0.2rem 0.35rem !important; font-size: 0.75rem !important;" onclick="navigator.clipboard.writeText('${deptHeadUrl}').then(() => {this.innerText='완료'; setTimeout(()=>this.innerText='복사',1500)})">복사</button>
                        <a href="${deptHeadUrl}" target="_blank" class="btn btn-outline" style="padding: 0.2rem 0.35rem !important; font-size: 0.75rem !important; text-decoration:none; display:inline-flex; align-items:center; justify-content:center;">열기</a>
                    </div>
                `;

                headRowTr.innerHTML = `
                    <td><strong>${deptHeadName}</strong></td>
                    <td>${deptHeadLinksCellHtml}</td>
                    <td style="text-align:center;">${approvalBadge}</td>
                    <td><strong>학과부장</strong></td>
                    <td><strong>학과부장</strong></td>
                `;
                linksBody.appendChild(headRowTr);
            } else {
                // 실습실 행 렌더링
                const deptName = row.deptName;
                const room = row.room;
                const params = new URLSearchParams({ m, d, dept: deptName, room: room.name });
                const finalUrl = `${baseUrl}?${params.toString()}`;
                
                const matchedSubmission = submittedData.find(item => item.info && item.info.dept === deptName && item.info.room === room.name);
                const isSubmitted = !!matchedSubmission;

                // 제출여부 및 결재 버튼 통합 처리
                let statusCellHtml = '';
                if (!isSubmitted) {
                    statusCellHtml = '<span style="color:var(--danger-color);font-weight:bold;">❌ 미제출</span>';
                } else {
                    if (isDeptHeadMode) {
                        // 학과부장 전용 페이지: 결재 기능 제공
                        if (adminApprovalMode === 'bulk') {
                            const hasSig = matchedSubmission.adminSignature || adminBulkSignatureDataUrl;
                            statusCellHtml = hasSig 
                                ? '<span class="badge badge-success">✅ 일괄결재됨</span>' 
                                : '<div style="display:flex;flex-direction:column;align-items:center;gap:0.15rem;"><span style="color:var(--success-color);font-weight:bold;">✅ 제출됨</span><span class="badge badge-warning" style="font-size:0.7rem;padding:0.1rem 0.3rem;">결재 대기</span></div>';
                        } else {
                            // 개별결재 모드
                            const hasSig = matchedSubmission.adminSignature;
                            if (hasSig) {
                                statusCellHtml = `
                                    <div style="display:flex; flex-direction:column; align-items:center; gap:0.2rem;">
                                        <img src="${hasSig}" style="height:24px; border:1px solid #cbd5e1; border-radius:4px; background:white; padding:1px;" />
                                        <button class="btn btn-outline" type="button" style="padding: 0.1rem 0.3rem !important; font-size: 0.7rem !important; border-color: var(--danger-color); color: var(--danger-color);" onclick="window.deleteIndividualApproval('${deptName}', '${room.name}')">결재취소</button>
                                    </div>
                                `;
                            } else {
                                statusCellHtml = `
                                    <div style="display:flex; flex-direction:column; align-items:center; gap:0.2rem;">
                                        <span style="color:var(--success-color);font-weight:bold; font-size:0.75rem;">✅ 제출됨</span>
                                        <button class="btn btn-primary" type="button" style="padding: 0.15rem 0.35rem !important; font-size: 0.75rem !important;" onclick="window.openIndividualApprovalModal('${deptName}', '${room.name}')">✍️ 결재하기</button>
                                    </div>
                                `;
                            }
                        }
                    } else {
                        // 일반 관리자 페이지: 결재 버튼 없이 완료 상태만 노출
                        if (adminApprovalMode === 'bulk') {
                            const hasSig = matchedSubmission.adminSignature || adminBulkSignatureDataUrl;
                            statusCellHtml = hasSig 
                                ? '<span class="badge badge-success">✅ 일괄결재됨</span>' 
                                : '<span style="color:var(--success-color);font-weight:bold;">✅ 제출됨</span>';
                        } else {
                            const hasSig = matchedSubmission.adminSignature;
                            statusCellHtml = hasSig 
                                ? '<span class="badge badge-success">✅ 결재 완료</span>' 
                                : '<span style="color:var(--success-color);font-weight:bold;">✅ 제출됨</span>';
                        }
                    }
                }

                // 링크 복사 셀에서 이모지(📋, 🔗) 제거 및 패딩/폰트 크기 줄임
                const linksCellHtml = `
                    <div style="display:flex; gap:0.2rem; justify-content:center;">
                        <button class="btn btn-primary" style="padding: 0.2rem 0.35rem !important; font-size: 0.75rem !important;" onclick="navigator.clipboard.writeText('${finalUrl}').then(() => {this.innerText='완료'; setTimeout(()=>this.innerText='복사',1500)})">복사</button>
                        <button class="btn btn-outline" style="padding: 0.2rem 0.35rem !important; font-size: 0.75rem !important; display:inline-flex; align-items:center; justify-content:center;" onclick="window.loadChecklistInline('${deptName}', '${room.name}')">열기</button>
                        ${(window.isSuperAdmin && isSubmitted) ? `<button class="btn btn-danger" style="padding: 0.2rem 0.35rem !important; font-size: 0.75rem !important; background-color: var(--danger-color); color: white; border: none; border-radius: 4px;" onclick="window.deleteSubmission('${deptName}', '${room.name}')">삭제</button>` : ''}
                    </div>
                `;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.teacher}</td>
                    <td>${linksCellHtml}</td>
                    <td style="text-align:center; vertical-align:middle;">${statusCellHtml}</td>
                    <td>${deptName}</td>
                    <td><strong>${room.name}</strong></td>
                `;
                linksBody.appendChild(tr);
            }
        });

        window.currentSubmittedData = submittedData;
    }

    if (elements.btnRefreshStatus) {
        elements.btnRefreshStatus.addEventListener('click', generateAdminLinks);
    }

    // Render Checklist Form
    function renderChecklist() {
        elements.checklistForm.innerHTML = '';
        currentChecklistState = {};
        elements.btnSave.disabled = true;
        
        safetyData.checklist.forEach((category, catIndex) => {
            const catDiv = document.createElement('div');
            catDiv.className = 'category-group';
            
            const catTitle = document.createElement('h3');
            catTitle.textContent = category.category;
            catDiv.appendChild(catTitle);
            
            const table = document.createElement('table');
            table.className = 'checklist-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>점검사항</th>
                        <th width="70">양호</th>
                        <th width="70">불량</th>
                        <th width="70">해당없음</th>
                        <th width="200">조치사항 / 특기사항</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            
            const tbody = table.querySelector('tbody');
            
            category.items.forEach((item, itemIndex) => {
                const itemId = `item_${catIndex}_${itemIndex}`;
                const isNAOnly = (catIndex === 1 && itemIndex === 1) || (catIndex === 3 && itemIndex === 1);
                
                currentChecklistState[itemId] = { status: isNAOnly ? '해당없음' : null, notes: '' };
                
                const tr = document.createElement('tr');
                if (isNAOnly) {
                    tr.innerHTML = `
                        <td class="item-desc" style="color:#94a3b8;">${item}</td>
                        <td class="text-center"></td>
                        <td class="text-center"></td>
                        <td class="text-center"><span style="color:#94a3b8;font-weight:bold;">해당없음</span></td>
                        <td><input type="text" class="notes-input" data-id="${itemId}" placeholder="해당 항목 아님" disabled style="background-color:#f1f5f9;border:1px solid #e2e8f0;"></td>
                    `;
                } else {
                    tr.innerHTML = `
                        <td class="item-desc">${item}</td>
                        <td class="text-center"><input type="radio" name="${itemId}" value="양호"></td>
                        <td class="text-center"><input type="radio" name="${itemId}" value="불량"></td>
                        <td class="text-center"><input type="radio" name="${itemId}" value="해당없음"></td>
                        <td><input type="text" class="notes-input" data-id="${itemId}" placeholder="조치사항 입력" disabled></td>
                    `;
                }
                tbody.appendChild(tr);
            });
            
            catDiv.appendChild(table);
            elements.checklistForm.appendChild(catDiv);
        });

        // Add Listeners
        elements.checklistForm.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const itemId = e.target.name;
                const val = e.target.value;
                currentChecklistState[itemId].status = val;
                
                const noteInput = document.querySelector(`.notes-input[data-id="${itemId}"]`);
                if (val === '불량') {
                    noteInput.disabled = false;
                    noteInput.focus();
                } else {
                    noteInput.disabled = true;
                    noteInput.value = '';
                    currentChecklistState[itemId].notes = '';
                }
                updateProgress();
            });
        });

        elements.checklistForm.querySelectorAll('.notes-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const itemId = e.target.getAttribute('data-id');
                currentChecklistState[itemId].notes = e.target.value;
            });
        });
        
        // btnCheckAllGood logic should be bound after checklist is rendered
        elements.btnCheckAllGood.onclick = () => {
            elements.checklistForm.querySelectorAll('input[type="radio"][value="양호"]').forEach(radio => {
                if (!radio.checked) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change'));
                }
            });
            // 모두 양호 체크 후 자동으로 맨 아래(서명란)까지 스크롤
            setTimeout(() => {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }, 200);
        };
    }

    // 기존 데이터 복원 함수
    function fillChecklistForm(data) {
        if (!data || !data.results) return;
        
        // 결과 복원
        data.results.forEach((category, catIdx) => {
            category.items.forEach((item, itemIdx) => {
                const itemId = `item_${catIdx}_${itemIdx}`;
                const savedItem = category.items[itemIdx];
                if (savedItem && savedItem.status) {
                    currentChecklistState[itemId] = {
                        status: savedItem.status,
                        notes: savedItem.notes || ''
                    };
                    
                    // 라디오 버튼 상태 반영
                    const radio = document.querySelector(`input[name="${itemId}"][value="${savedItem.status}"]`);
                    if (radio) radio.checked = true;
                    
                    // 조치사항 입력 폼 활성화 및 텍스트 반영
                    const noteInput = document.querySelector(`.notes-input[data-id="${itemId}"]`);
                    if (noteInput) {
                        if (savedItem.status === '불량') {
                            noteInput.disabled = false;
                            noteInput.value = savedItem.notes || '';
                        } else {
                            noteInput.disabled = true;
                            noteInput.value = '';
                        }
                    }
                }
            });
        });
        
        // 서명 이미지 복구
        if (data.signature) {
            signatureDataUrl = data.signature;
            const sigCanvas = document.getElementById('signaturePad');
            if (sigCanvas) {
                const ctx = sigCanvas.getContext('2d');
                ctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    if (canvasHelper) {
                        canvasHelper.setSigned(true);
                    }
                    updateSaveButtonState();
                };
                img.src = data.signature;
            }
        } else {
            signatureDataUrl = null;
            if (canvasHelper) {
                canvasHelper.clear();
            }
        }
        
        updateProgress();
    }

    // 대시보드 인라인 뷰어 로드 함수
    window.loadChecklistInline = function(dept, room) {
        const m = elements.monthSelect.value;
        const d = elements.dayInput.value;
        if (!m || !d) {
            alert('점검 월과 일을 먼저 선택해주세요.');
            return;
        }

        const deptData = safetyData.departments[dept];
        if (!deptData) return;
        const roomData = deptData.rooms.find(r => r.name === room);
        const teacherName = roomData ? roomData.teacher : "";

        const isConfirmed = confirm(`${teacherName} 선생님, ${room} 담당자가 맞습니까?`);
        if (!isConfirmed) return;

        currentInfo = {
            month: m,
            day: d,
            dept: dept,
            room: room,
            head: deptData.head,
            teacher: teacherName,
            date: `2026-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        };

        elements.checkInfo.textContent = `${currentInfo.dept} / ${currentInfo.room} / 담당: ${currentInfo.teacher}`;
        
        // 체크리스트 폼 초기화 및 렌더링
        renderChecklist();
        
        // 기존 제출 정보 존재 여부 확인 후 복원 또는 새 데이터 기준 갱신
        const matchedSubmission = window.currentSubmittedData && window.currentSubmittedData.find(item => item.info && item.info.dept === dept && item.info.room === room);
        if (matchedSubmission) {
            fillChecklistForm(matchedSubmission);
        } else {
            updateProgress();
        }

        // 체크리스트 양식 활성화
        elements.stepChecklist.classList.remove('hidden');
        
        // 인라인 대시보드 모드인 경우 하단으로 부드럽게 스크롤
        if (isAdminMode) {
            if (elements.btnBack) {
                elements.btnBack.classList.remove('hidden');
                elements.btnBack.title = '처음으로';
                elements.btnBack.onclick = (e) => {
                    e.preventDefault();
                    elements.stepChecklist.classList.add('hidden');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
            }
            setTimeout(() => {
                elements.stepChecklist.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            elements.stepInfo.classList.add('hidden');
            if (elements.btnBack) {
                elements.btnBack.classList.remove('hidden');
                elements.btnBack.title = '처음으로';
                elements.btnBack.onclick = (e) => {
                    e.preventDefault();
                    window.location.href = window.location.pathname;
                };
            }
        }
    };

    // ── 서명 드로잉 패드 초기화 헬퍼 함수 ────────────────
    function initSignaturePad(canvasEl, clearBtnEl, onClear = null) {
        if (!canvasEl) return null;
        const ctx = canvasEl.getContext('2d');
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        
        let drawing = false;
        let isCanvasSigned = false; // 서명 여부 추적용 불리언 플래그
        const penWidth = 3 + Math.random() * 2; // 3~5 사이 랜덤 굵기 (페이지 로드 시 고정)
        
        function getPointerPos(e) {
            const rect = canvasEl.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }
        
        function startDrawing(e) {
            e.preventDefault();
            drawing = true;
            isCanvasSigned = true; // 드로잉이 시작되면 서명이 있는 것으로 설정
            const pos = getPointerPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
        
        function draw(e) {
            if (!drawing) return;
            e.preventDefault();
            const pos = getPointerPos(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = penWidth; // 페이지 로드 시 결정된 고정 굵기
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
        
        function stopDrawing() {
            if (!drawing) return;
            drawing = false;
            ctx.closePath();
        }
        
        canvasEl.addEventListener('mousedown', startDrawing);
        canvasEl.addEventListener('mousemove', draw);
        canvasEl.addEventListener('mouseup', stopDrawing);
        canvasEl.addEventListener('mouseout', stopDrawing);
        canvasEl.addEventListener('touchstart', startDrawing, { passive: false });
        canvasEl.addEventListener('touchmove', draw, { passive: false });
        canvasEl.addEventListener('touchend', stopDrawing);
        
        if (clearBtnEl) {
            clearBtnEl.addEventListener('click', () => {
                ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                isCanvasSigned = false;
                if (onClear) onClear();
            });
        }
        
        return {
            canvas: canvasEl,
            ctx: ctx,
            clear: () => {
                ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                isCanvasSigned = false;
            },
            isSigned: () => isCanvasSigned,
            setSigned: (val) => { isCanvasSigned = val; }
        };
    }

    // 캔버스 비어있는지 확인하는 헬퍼 함수
    function checkSignatureEmpty(canvasEl) {
        if (!canvasEl) return true;
        // 헬퍼 플래그가 있으면 플래그를 기반으로 판별
        if (canvasEl === canvas && canvasHelper) {
            return !canvasHelper.isSigned();
        }
        if (canvasEl === elements.deptheadBulkSignaturePad && deptheadBulkCanvasHelper) {
            return !deptheadBulkCanvasHelper.isSigned();
        }
        if (canvasEl === adminIndivCanvas && adminIndivCanvasHelper) {
            return !adminIndivCanvasHelper.isSigned();
        }
        // 폴백: 픽셀 스캐닝
        const ctx = canvasEl.getContext('2d');
        const buffer = new Uint32Array(ctx.getImageData(0, 0, canvasEl.width, canvasEl.height).data.buffer);
        return !buffer.some(color => color !== 0);
    }

    // 저장하기 버튼 상태 갱신 함수 (모든 항목 완료 + 서명 완료 시 활성화)
    function updateSaveButtonState() {
        const total = safetyData.totalItems;
        let checked = 0;
        Object.values(currentChecklistState).forEach(state => {
            if (state.status) checked++;
        });

        const isChecklistComplete = (checked === total);
        const hasSignature = !checkSignatureEmpty(canvas);

        elements.btnSave.disabled = !(isChecklistComplete && hasSignature);

        if (isChecklistComplete && hasSignature) {
            elements.btnSave.classList.add('ready');
            elements.btnSave.style.animation = 'pulse 1.5s infinite';
        } else {
            elements.btnSave.classList.remove('ready');
            elements.btnSave.style.animation = 'none';
        }
    }

    // 각 서명 패드 초기화
    const canvas = document.getElementById('signaturePad');
    if (canvas) {
        canvasHelper = initSignaturePad(canvas, document.getElementById('btnClearSignature'), () => {
            signatureDataUrl = null;
            updateSaveButtonState();
        });

        // 서명 드로잉 감지하여 저장 버튼 실시간 활성화/비활성화
        ['mouseup', 'touchend'].forEach(evt => {
            canvas.addEventListener(evt, () => {
                setTimeout(updateSaveButtonState, 50);
            });
        });
    }

    const adminIndivCanvas = document.getElementById('adminIndivSignaturePad');
    if (adminIndivCanvas) {
        adminIndivCanvasHelper = initSignaturePad(adminIndivCanvas, elements.btnClearAdminIndivSignature);
    }

    // 학과부장 일괄 결재 서명 패드 초기화
    if (elements.deptheadBulkSignaturePad) {
        deptheadBulkCanvasHelper = initSignaturePad(elements.deptheadBulkSignaturePad, elements.btnDeptheadClearBulkSig, () => {
            adminBulkSignatureDataUrl = null;
            updateDeptheadSavedOverlayState();
        });
    }

    // 학과부장 결재 모드 (라디오 버튼) 변경 바인딩
    const approvalModeRadios = document.querySelectorAll('input[name="deptheadApprovalMode"]');
    approvalModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            adminApprovalMode = e.target.value;
            updateDeptheadCardLayout();
            if (window.currentSubmittedData) {
                renderLinksTable(window.currentSubmittedData);
            }
        });
    });

    // 학과부장 결재 저장하기
    if (elements.btnDeptheadSaveApproval) {
        elements.btnDeptheadSaveApproval.addEventListener('click', async () => {
            const m = elements.monthSelect.value;
            const d = elements.dayInput.value;
            if (!m || !d) {
                alert('점검 월과 일을 먼저 선택해주세요.');
                return;
            }

            const isEmpty = checkSignatureEmpty(elements.deptheadBulkSignaturePad);
            if (isEmpty) {
                alert('서명 패드에 서명을 그려주세요.');
                return;
            }

            const signature = elements.deptheadBulkSignaturePad.toDataURL("image/png");
            const submissions = window.currentSubmittedData || [];
            
            if (submissions.length === 0) {
                alert('제출된 실습실 점검표가 없어 일괄 결재를 적용할 수 없습니다.');
                return;
            }

            try {
                if (!window.firebaseDB) {
                    throw new Error("Firebase DB가 연결되지 않았습니다.");
                }
                await window.firebaseDB.saveAdminBulkApproval(m, d, submissions, signature);
                adminBulkSignatureDataUrl = signature;
                alert('모든 제출된 실습실에 일괄 결재가 적용되었습니다.');
                updateDeptheadSavedOverlayState();
                generateAdminLinks();
            } catch (err) {
                console.error("일괄 결재 저장 에러:", err);
                alert('일괄 결재 저장 중 에러가 발생했습니다: ' + (err.message || err));
            }
        });
    }

    // 학과부장 일괄 결재 취소
    if (elements.btnDeptheadDeleteBulkSig) {
        elements.btnDeptheadDeleteBulkSig.addEventListener('click', async () => {
            if (!confirm('저장된 일괄 결재 서명을 취소하시겠습니까?')) return;
            const m = elements.monthSelect.value;
            const d = elements.dayInput.value;
            if (!m || !d) return;

            const submissions = window.currentSubmittedData || [];
            try {
                if (!window.firebaseDB) {
                    throw new Error("Firebase DB가 연결되지 않았습니다.");
                }
                await window.firebaseDB.deleteAdminBulkApproval(m, d, submissions);
                adminBulkSignatureDataUrl = null;
                if (deptheadBulkCanvasHelper) {
                    deptheadBulkCanvasHelper.clear();
                }
                alert('일괄 결재 서명이 취소되었습니다.');
                updateDeptheadSavedOverlayState();
                generateAdminLinks();
            } catch (err) {
                console.error("일괄 결재 취소 에러:", err);
                alert('일괄 결재 취소 중 에러가 발생했습니다: ' + (err.message || err));
            }
        });
    }

    // 학과부장 일괄 결재 미리보기
    if (elements.btnDeptheadPreviewBulkSig) {
        elements.btnDeptheadPreviewBulkSig.addEventListener('click', async () => {
            const submissions = window.currentSubmittedData || [];

            const isEmpty = checkSignatureEmpty(elements.deptheadBulkSignaturePad);
            if (isEmpty && !adminBulkSignatureDataUrl) {
                alert('서명 패드에 서명을 그린 후 미리보기를 진행해주세요.');
                return;
            }

            const tempSig = adminBulkSignatureDataUrl || elements.deptheadBulkSignaturePad.toDataURL("image/png");

            elements.previewModalBody.innerHTML = '<p style="text-align:center;padding:30px;font-size:1rem;">🔄 12개 실습실 미리보기 생성 중...</p>';
            elements.previewModal.classList.remove('hidden');

            try {
                elements.previewModalBody.innerHTML = '';
                const tempDiv = document.createElement('div');
                
                const m = elements.monthSelect.value || "3";
                const d = elements.dayInput.value || "1";
                
                let allRooms = [];
                Object.keys(safetyData.departments).forEach(deptName => {
                    const dept = safetyData.departments[deptName];
                    dept.rooms.forEach(room => {
                        const matched = submissions.find(s => s.info && s.info.dept === deptName && s.info.room === room.name);
                        if (matched) {
                            allRooms.push(matched);
                        } else {
                            allRooms.push({
                                info: { month: m, day: d, dept: deptName, room: room.name, head: dept.head, teacher: room.teacher, date: `2026-${m.padStart(2, '0')}-${d.padStart(2, '0')}` },
                                results: []
                            });
                        }
                    });
                });
                
                // 모든 실습실에 일괄 서명을 대입하여 렌더링
                for (const sub of allRooms) {
                    const clonedSub = { ...sub };
                    clonedSub.adminSignature = tempSig;
                    await renderPrintLayout(clonedSub, true, tempDiv);
                }
                
                elements.previewModalBody.appendChild(tempDiv);
            } catch (err) {
                console.error("일괄 결재 미리보기 렌더링 실패:", err);
                elements.previewModalBody.innerHTML = '<p style="text-align:center;padding:30px;color:red;">미리보기를 불러오지 못했습니다.</p>';
            }
        });
    }


    // 학과부장 일괄 인쇄 버튼
    if (elements.btnDeptheadBulkPrint) {
        elements.btnDeptheadBulkPrint.addEventListener('click', () => {
            if (elements.btnBulkPrint) {
                elements.btnBulkPrint.click();
            }
        });
    }

    // Update Progress
    function updateProgress() {
        const total = safetyData.totalItems;
        let checked = 0;
        
        Object.values(currentChecklistState).forEach(state => {
            if (state.status) checked++;
        });
        
        const percent = (checked / total) * 100;
        elements.progressFill.style.width = `${percent}%`;
        elements.progressText.textContent = `${checked} / ${total} 항목 완료`;
        
        updateSaveButtonState();
    }

    // Save logic
    function getFinalData() {
        const results = [];
        let itemIndex = 0;
        safetyData.checklist.forEach((category, catIdx) => {
            const catResults = { category: category.category, items: [] };
            category.items.forEach((item, itmIdx) => {
                const id = `item_${catIdx}_${itmIdx}`;
                catResults.items.push({
                    text: item,
                    status: currentChecklistState[id].status || '미체크',
                    notes: currentChecklistState[id].notes
                });
            });
            results.push(catResults);
        });

        return {
            info: currentInfo,
            results: results,
            timestamp: new Date().toISOString()
        };
    }

    elements.btnSave.addEventListener('click', async () => {
        const checkedCount = Object.values(currentChecklistState).filter(s => s.status).length;
        if (checkedCount < safetyData.totalItems) {
            if (!confirm(`아직 ${safetyData.totalItems - checkedCount}개의 항목이 점검되지 않았습니다. 그래도 저장하시겠습니까?`)) {
                return;
            }
        }

        const originalBtnText = elements.btnSave.innerHTML;
        elements.btnSave.disabled = true;
        elements.btnSave.innerHTML = '⏳ 저장 중...';

        if (canvas) {
            signatureDataUrl = canvas.toDataURL("image/png");
        }
        
        const finalData = getFinalData();
        if (signatureDataUrl) {
            finalData.signature = signatureDataUrl;
        }

        try {
            if (!window.firebaseDB) {
                throw new Error("Firebase DB가 연결되지 않았습니다. 인터넷이나 방화벽 상태를 확인해주세요.");
            }
            await window.firebaseDB.saveChecklist(finalData);
            elements.btnSave.innerHTML = '✅ 저장됨';
            
            // 현황판에 바로 반영하기 위해 현황 갱신 (onSnapshot이 켜져 있으므로 데이터 갱신 시 자동 반영됨)
            if (isAdminMode) {
                // 1.5초 후 폼 접고 대시보드로 돌아가기
                setTimeout(() => {
                    elements.stepChecklist.classList.add('hidden');
                    elements.btnSave.innerHTML = '💾 저장하기';
                    updateSaveButtonState();
                    
                    // 원래 현황판 위치로 부드럽게 스크롤 복귀
                    const linksCard = document.getElementById('linksCard');
                    if (linksCard) {
                        linksCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 1500);
            } else {
                elements.doneDesc.textContent = `${currentInfo.dept} ${currentInfo.room} 안전점검표가 Firebase DB에 성공적으로 저장되었습니다.`;
                setTimeout(() => {
                    elements.stepChecklist.classList.add('hidden');
                    elements.stepDone.classList.remove('hidden');
                    elements.btnSave.innerHTML = '💾 저장하기';
                    updateSaveButtonState();
                }, 1000);
            }
        } catch (e) {
            alert('저장 중 오류가 발생했습니다: ' + (e.message || e));
            elements.btnSave.disabled = false;
            elements.btnSave.innerHTML = originalBtnText;
            return;
        }
    });

    // JSON Export 삭제됨

    if (elements.btnExportPdfStep2) {
        elements.btnExportPdfStep2.addEventListener('click', async () => {
            if (canvas) {
                signatureDataUrl = canvas.toDataURL("image/png");
            }
            elements.printArea.innerHTML = '';
            await renderPrintLayout(getFinalData(), false, elements.printArea);
            window.print();
        });
    }

    if (elements.btnBulkPrint) {
        elements.btnBulkPrint.addEventListener('click', async () => {
            const m = elements.monthSelect.value || "3";
            const d = elements.dayInput.value || "1";
            const submissions = window.currentSubmittedData || [];
            
            let allRooms = [];
            Object.keys(safetyData.departments).forEach(deptName => {
                const dept = safetyData.departments[deptName];
                dept.rooms.forEach(room => {
                    const matched = submissions.find(s => s.info && s.info.dept === deptName && s.info.room === room.name);
                    if (matched) {
                        allRooms.push(matched);
                    } else {
                        allRooms.push({
                            info: { month: m, day: d, dept: deptName, room: room.name, head: dept.head, teacher: room.teacher, date: `2026-${m.padStart(2, '0')}-${d.padStart(2, '0')}` },
                            results: []
                        });
                    }
                });
            });

            if (allRooms.length === 0) {
                alert('인쇄할 데이터가 없습니다.');
                return;
            }
            
            let hasMissingSignature = false;
            let confirmMsg = '';

            if (adminApprovalMode === 'bulk') {
                if (!adminBulkSignatureDataUrl) {
                    hasMissingSignature = true;
                    confirmMsg = '일괄 결재 서명이 저장되지 않았습니다.\n부장 결재 서명 없이 일괄 인쇄하시겠습니까?';
                }
            } else {
                // 개별 결재 모드일 때, 모든 12개 실습실 중 부장 서명이 하나라도 누락되었는지 체크
                const incomplete = allRooms.some(doc => !doc.adminSignature);
                if (incomplete) {
                    hasMissingSignature = true;
                    confirmMsg = '부장 결재가 완료되지 않은 실습실이 있습니다.\n일부 결재 서명 없이 일괄 인쇄하시겠습니까?';
                }
            }

            if (hasMissingSignature) {
                if (!confirm(confirmMsg)) {
                    return;
                }
            }

            elements.printArea.innerHTML = '<p style="text-align:center;padding:30px;font-size:1rem;">🔄 전체 PDF 렌더링 중...</p>';
            
            try {
                const tempDiv = document.createElement('div');
                for (const data of allRooms) {
                    const clonedSub = { ...data };
                    if (adminApprovalMode === 'bulk' && adminBulkSignatureDataUrl) {
                        clonedSub.adminSignature = adminBulkSignatureDataUrl;
                    }
                    await renderPrintLayout(clonedSub, true, tempDiv);
                }
                elements.printArea.innerHTML = '';
                elements.printArea.appendChild(tempDiv);
                window.print();
            } catch (err) {
                console.error("일괄 인쇄 렌더링 에러:", err);
                alert('일괄 인쇄를 위한 PDF 렌더링 중 에러가 발생했습니다.');
            }
        });
    }

    // New Check
    elements.btnNewCheck.addEventListener('click', () => {
        elements.stepDone.classList.add('hidden');
        elements.stepInfo.classList.remove('hidden');
        elements.roomSelect.value = '';
        elements.teacherInput.value = '';
        validateStep1();
    });

    // Print Logic
    elements.btnPrintDone.addEventListener('click', () => {
        window.print();
    });

    // 🔍 교사용 미리보기 모달 제어
    if (elements.btnPreviewSignature) {
        elements.btnPreviewSignature.addEventListener('click', async () => {
            if (canvas) {
                signatureDataUrl = canvas.toDataURL("image/png");
            }
            elements.previewModalBody.innerHTML = '<p style="text-align:center;padding:30px;font-size:1rem;">🔄 미리보기 생성 중...</p>';
            elements.previewModal.classList.remove('hidden');
            
            try {
                await renderPrintLayout(getFinalData(), false, elements.previewModalBody);
            } catch (err) {
                console.error("미리보기 렌더링 실패:", err);
                elements.previewModalBody.innerHTML = '<p style="text-align:center;padding:30px;color:red;">미리보기를 불러오지 못했습니다.</p>';
            }
        });
    }

    function closePreviewModal() {
        elements.previewModal.classList.add('hidden');
        elements.previewModalBody.innerHTML = '';
    }

    if (elements.btnClosePreview) elements.btnClosePreview.addEventListener('click', closePreviewModal);
    if (elements.btnClosePreviewBottom) elements.btnClosePreviewBottom.addEventListener('click', closePreviewModal);
    if (elements.btnPrintFromPreview) {
        elements.btnPrintFromPreview.addEventListener('click', () => {
            window.print();
        });
    }

    // 🛡️ 학과부장 모드 일괄/개별 서명 선택 프롬프트 (글로벌 바인딩)
    window.openDeptHeadModePrompt = function() {
        const isBulk = confirm("모든 실습실에 동일한 서명을 일괄 적용하시겠습니까?\n\n[확인] 모든 실습실 일괄 서명 적용\n[취소] 실습실별 개별 서명 적용");
        adminApprovalMode = isBulk ? 'bulk' : 'individual';
        generateAdminLinks();
    };

    // ✍️ 개별 결재 모달 열기 (글로벌 바인딩)
    window.openIndividualApprovalModal = function(dept, room) {
        currentApprovingLab = { dept, room };
        elements.adminApprovalModalTitle.textContent = `${room} 결재`;
        
        const indivCanvas = document.getElementById('adminIndivSignaturePad');
        if (indivCanvas) {
            const ctx = indivCanvas.getContext('2d');
            ctx.clearRect(0, 0, indivCanvas.width, indivCanvas.height);
        }
        
        elements.adminApprovalModal.classList.remove('hidden');
    };

    function closeAdminApprovalModal() {
        elements.adminApprovalModal.classList.add('hidden');
        currentApprovingLab = null;
    }

    if (elements.btnCloseAdminApproval) elements.btnCloseAdminApproval.addEventListener('click', closeAdminApprovalModal);
    if (elements.btnCloseAdminApprovalBottom) elements.btnCloseAdminApprovalBottom.addEventListener('click', closeAdminApprovalModal);

    // 💾 개별 결재 저장
    if (elements.btnSaveAdminApproval) {
        elements.btnSaveAdminApproval.addEventListener('click', async () => {
            if (!currentApprovingLab) return;
            const m = elements.monthSelect.value;
            const d = elements.dayInput.value;
            
            const indivCanvas = document.getElementById('adminIndivSignaturePad');
            let indivSig = null;
            if (indivCanvas) {
                const ctx = indivCanvas.getContext('2d');
                const buffer = new Uint32Array(ctx.getImageData(0, 0, indivCanvas.width, indivCanvas.height).data.buffer);
                const hasSignature = buffer.some(color => color !== 0);
                
                if (!hasSignature) {
                    alert('서명 패드에 서명을 그려주세요.');
                    return;
                }
                
                indivSig = indivCanvas.toDataURL("image/png");
            }

            try {
                if (!window.firebaseDB) {
                    throw new Error("Firebase DB가 연결되지 않았습니다.");
                }
                await window.firebaseDB.saveAdminApproval(m, d, currentApprovingLab.dept, currentApprovingLab.room, indivSig);
                alert(`${currentApprovingLab.room} 결재가 완료되었습니다.`);
                closeAdminApprovalModal();
                generateAdminLinks();
            } catch (err) {
                console.error("개별 결재 저장 에러:", err);
                alert('결재 저장 중 에러가 발생했습니다: ' + (err.message || err));
            }
        });
    }

    // ❌ 개별 결재 취소 (글로벌 바인딩)
    window.deleteIndividualApproval = async function(dept, room) {
        if (!confirm(`${room}의 부장 결재를 취소하시겠습니까?`)) return;
        const m = elements.monthSelect.value;
        const d = elements.dayInput.value;

        try {
            if (!window.firebaseDB) {
                throw new Error("Firebase DB가 연결되지 않았습니다.");
            }
            await window.firebaseDB.deleteAdminApproval(m, d, dept, room);
            alert(`${room} 결재가 취소되었습니다.`);
            generateAdminLinks();
        } catch (err) {
            console.error("개별 결재 취소 에러:", err);
            alert('결재 취소 중 에러가 발생했습니다: ' + (err.message || err));
        }
    };

    // ─────────────────────────────────────────────
    // PDF Canvas 오버레이 방식 출력
    // ─────────────────────────────────────────────
    async function renderPrintLayout(dataOverride, isBulk = false, targetContainer = null) {
        const data = dataOverride || getFinalData();
        const deptData = safetyData.departments[data.info.dept];

        const container = targetContainer || elements.printArea;

        // PDF 정보가 없으면 HTML 방식으로 폴백
        if (!deptData || !deptData.pdfFile) {
            renderHtmlPrintLayout(data, container, isBulk);
            return;
        }
        const roomData = deptData.rooms.find(r => r.name === data.info.room);
        if (!roomData || !roomData.pdfPage) {
            renderHtmlPrintLayout(data, container, isBulk);
            return;
        }

        if (!isBulk) {
            container.innerHTML = '<p style="text-align:center;padding:30px;font-size:1rem;">🔄 PDF 렌더링 중...</p>';
        }

        try {
            // PDF.js 초기화
            const pdfjsLib = window.pdfjsLib;
            if (!pdfjsLib) throw new Error('PDF.js 미로드');
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            // PDF 로드 (한글 파일명 인코딩)
            const pdfUrl = encodeURIComponent(deptData.pdfFile).replace(/%2F/g, '/');
            const pdf = await pdfjsLib.getDocument('./' + pdfUrl).promise;
            const page = await pdf.getPage(roomData.pdfPage);

            // 2배 스케일로 렌더 (인쇄 품질 확보)
            const SCALE = 2;
            const viewport = page.getViewport({ scale: SCALE });
            const PDF_H = 841; // 원본 PDF 높이(pt)

            const cvs = document.createElement('canvas');
            cvs.width  = viewport.width;
            cvs.height = viewport.height;
            const ctx = cvs.getContext('2d');

            await page.render({ canvasContext: ctx, viewport }).promise;

            // ── 날짜 오버레이 ──────────────────────────
            // PDF: 점검일자 셀 오른쪽 (X≈382, Y≈702) -> 706으로 올려서 위치 조정
            ctx.font = `lighter ${11 * SCALE}px 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif`;
            ctx.fillStyle = '#000';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const dateText = `2026년 ${String(data.info.month).padStart(2,'0')}월 ${String(data.info.day).padStart(2,'0')}일`;
            ctx.fillText(dateText, 382 * SCALE, (PDF_H - 706) * SCALE);

            // ── 체크 결과 오버레이 ─────────────────────
            // 15개 항목의 PDF Y좌표 (위→아래 순서)
            // 해당없음 행(소화기, 화공안전 3, 가스안전 4, 기계안전 2)은 건너뜀
            const ITEM_Y = [
                582, 556,                           // 안전계획 (2) - ①두줄 그대로, ②한줄 +4
                534, 508, 489, 469, 450,            // 일반안전 (5) - ①두줄 그대로, ②~⑤한줄 +4
                410, 390,                           // 소방안전 (2) - 한줄 +4
                231, 211,                           // 산업위생 (2) - 한줄 +4
                151, 131,                           // 전기안전 (2) - 한줄 +4
                111, 91                             // 기자재   (2) - 한줄 +4
            ];
            // 체크 열 중심 X좌표 (PDF pt 단위)
            const COL_X = { '양호': 345, '불량': 378, '해당없음': 411 };

            const flatResults = [];
            data.results.forEach(cat => cat.items.forEach(item => flatResults.push(item)));

            ctx.font = `${26 * SCALE}px Arial, sans-serif`; // 2배 크기로 조정
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#000';

            flatResults.forEach((item, i) => {
                if (!item.status || ITEM_Y[i] === undefined) return;
                const colX = COL_X[item.status];
                if (!colX) return;
                ctx.fillText('○', colX * SCALE, (PDF_H - ITEM_Y[i]) * SCALE);
            });

            // ── 서명 오버레이 (확인자 + 담당교사 두 곳) ──
            const teacherSig = data.signature || signatureDataUrl;
            if (teacherSig) {
                const sigImg = new Image();
                await new Promise((res, rej) => {
                    sigImg.onload = res;
                    sigImg.onerror = rej;
                    sigImg.src = teacherSig;
                });

                const SIG_W = 58 * SCALE;
                const SIG_H = 16 * SCALE;
                const SIG_X = 505 * SCALE; // (인) 위치로 이동

                // 담당교사         : PDF Y≈662
                ctx.drawImage(sigImg, SIG_X, (PDF_H - 662 - 9) * SCALE, SIG_W, SIG_H);
            }

            // 부장 서명 분기 적용 (일괄 모드 vs 개별 모드)
            let currentAdminSig = data.adminSignature || null;
            if (!currentAdminSig && adminApprovalMode === 'bulk') {
                currentAdminSig = adminBulkSignatureDataUrl;
            }

            if (currentAdminSig) {
                const adminSigImg = new Image();
                await new Promise((res, rej) => {
                    adminSigImg.onload = res;
                    adminSigImg.onerror = rej;
                    adminSigImg.src = currentAdminSig;
                });
                const SIG_W = 58 * SCALE;
                const SIG_H = 16 * SCALE;
                const SIG_X = 505 * SCALE; 
                // 확인자(학과부장) : PDF Y≈683
                ctx.drawImage(adminSigImg, SIG_X, (PDF_H - 683 - 9) * SCALE, SIG_W, SIG_H);
            }

            // 캔버스 → img 태그로 변환 후 printArea에 삽입
            const imgSrc = cvs.toDataURL('image/png', 0.95);
            
            if (!isBulk) container.innerHTML = '';
            const imgEl = document.createElement('img');
            imgEl.src = imgSrc;
            imgEl.style.width = '100%';
            imgEl.style.display = 'block';
            imgEl.style.margin = '0';
            imgEl.style.padding = '0';
            if (isBulk) imgEl.style.pageBreakAfter = 'always';
            
            container.appendChild(imgEl);

        } catch (err) {
            console.error('PDF 렌더링 실패, HTML 방식으로 전환:', err);
            renderHtmlPrintLayout(data, container, isBulk);
        }
    }

    // HTML 방식 폴백 출력 (PDF 로드 실패 시)
    function renderHtmlPrintLayout(data, container, isBulk) {
        const teacherSig = data.signature || signatureDataUrl;
        let currentAdminSig = data.adminSignature || null;
        if (!currentAdminSig && adminApprovalMode === 'bulk') {
            currentAdminSig = adminBulkSignatureDataUrl;
        }
        const html = `
            <div class="print-header">
                <h1>2026학년도 직업계고 실습실별 안전점검표</h1>
            </div>
            <table class="print-info-table">
                <tr>
                    <th>학 교 명</th><td>경성전자고</td>
                    <th>점검일자</th><td>2026년 ${data.info.month}월 ${data.info.day}일</td>
                </tr>
                <tr>
                    <th>학 과 명</th><td>${data.info.dept}</td>
                    <th style="position:relative;">확 인 자</th>
                    <td style="position:relative;">
                        학과부장 ${data.info.head}
                        ${currentAdminSig ? `<img src="${currentAdminSig}" style="position:absolute;top:50%;right:5px;transform:translateY(-50%);height:40px;z-index:10;" />` : ''}
                        <span style="float:right">(인)</span>
                    </td>
                </tr>
                <tr>
                    <th>실습실명</th><td>${data.info.room}</td>
                    <th style="position:relative;">담당교사</th>
                    <td style="position:relative;">
                        ${data.info.teacher}
                        ${teacherSig ? `<img src="${teacherSig}" style="position:absolute;top:50%;right:5px;transform:translateY(-50%);height:40px;z-index:10;" />` : ''}
                        <span style="float:right">(인)</span>
                    </td>
                </tr>
            </table>
            <table class="print-checklist-table">
                <thead>
                    <tr>
                        <th width="12%">분야</th>
                        <th width="43%">안전점검 항목</th>
                        <th width="7%">양호</th>
                        <th width="7%">불량</th>
                        <th width="10%">해당<br>없음</th>
                        <th width="21%">현장조치 / 특기사항</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.results.map(cat =>
                        cat.items.map((item, idx) => `
                            <tr>
                                ${idx === 0 ? `<td rowspan="${cat.items.length}" class="cat-cell">${cat.category}</td>` : ''}
                                <td class="text-left">${item.text}</td>
                                <td class="text-center">${item.status === '양호'    ? '○' : ''}</td>
                                <td class="text-center">${item.status === '불량'    ? '○' : ''}</td>
                                <td class="text-center">${item.status === '해당없음' ? '○' : ''}</td>
                                <td class="text-left">${item.notes || ''}</td>
                            </tr>
                        `).join('')
                    ).join('')}
                </tbody>
            </table>
            <div class="print-footer">※ 해당없는 경우 "-" 표시, 학교별 실습실별 작성 후 자체 보관</div>
        </div>
        `;
        
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        if (isBulk) wrapper.style.pageBreakAfter = 'always';
        
        if (!isBulk) container.innerHTML = '';
        container.appendChild(wrapper);
    }

    // 🗑️ 제출 삭제 (슈퍼 관리자용)
    window.deleteSubmission = async function(dept, room) {
        if (!confirm(`${room}의 제출 내역을 완전히 삭제하시겠습니까?\n복구할 수 없습니다.`)) return;
        const m = elements.monthSelect.value;
        const d = elements.dayInput.value;

        try {
            if (!window.firebaseDB) {
                throw new Error("Firebase DB가 연결되지 않았습니다.");
            }
            await window.firebaseDB.deleteChecklist(m, d, dept, room);
            alert(`${room} 제출 내역이 삭제되었습니다.`);
            generateAdminLinks();
        } catch (err) {
            console.error("제출 내역 삭제 에러:", err);
            alert('삭제 중 에러가 발생했습니다: ' + (err.message || err));
        }
    };

    // 🛡️ 슈퍼 관리자 권한 획득 히든 트리거 (단축키 및 클릭)
    document.addEventListener('keydown', (e) => {
        // Ctrl + Shift + X 단축키
        if (e.ctrlKey && e.shiftKey && (e.key === 'x' || e.key === 'X')) {
            promptSuperAdmin();
        }
    });

    let shieldClickCount = 0;
    let shieldClickTimer = null;
    const headerIcon = document.querySelector('.header-icon');
    if (headerIcon) {
        headerIcon.style.cursor = 'pointer';
        headerIcon.addEventListener('click', () => {
            shieldClickCount++;
            if (shieldClickTimer) clearTimeout(shieldClickTimer);
            shieldClickTimer = setTimeout(() => { shieldClickCount = 0; }, 1000);
            
            if (shieldClickCount >= 3) {
                shieldClickCount = 0;
                promptSuperAdmin();
            }
        });
    }

    function promptSuperAdmin() {
        if (window.isSuperAdmin) {
            alert('이미 슈퍼 관리자 권한이 활성화되어 있습니다.');
            return;
        }
        const pwd = prompt('슈퍼 관리자 권한 획득을 위한 비밀번호를 입력하세요.');
        if (pwd === '1008') {
            window.isSuperAdmin = true;
            alert('슈퍼 관리자 권한이 활성화되었습니다. 제출된 항목 옆에 삭제 버튼이 표시됩니다.');
            if (document.getElementById('linksCard') && !document.getElementById('linksCard').classList.contains('hidden')) {
                generateAdminLinks();
            }
        } else if (pwd !== null) {
            alert('비밀번호가 일치하지 않습니다.');
        }
    }
});
