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
        
        printArea: document.getElementById('printArea')
    };

    let currentChecklistState = {};
    let currentInfo = {};
    let isAdminMode = true;
    let signatureDataUrl = null;
    let adminSignatureDataUrl = null;
    let isDrawing = false;
    let isAdminDrawing = false;

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

    // Deep linking logic
    function processUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const m = params.get('m');
        const d = params.get('d');
        const dept = params.get('dept');
        const room = params.get('room');

        if (m && d && dept && room) {
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
                if (roomExists) {
                    elements.roomSelect.value = room;
                    elements.teacherInput.value = roomExists.teacher;
                }
            }
            validateStep1();
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
    async function generateAdminLinks() {
        const m = elements.monthSelect.value;
        const d = elements.dayInput.value;
        const linksCard = document.getElementById('linksCard');
        const linksBody = document.getElementById('linksBody');
        
        linksBody.innerHTML = '<tr><td colspan="5" style="padding:1rem; text-align:center;">데이터를 불러오는 중입니다...</td></tr>';
        linksCard.classList.remove('hidden');

        let submittedData = [];
        try {
            if (window.firebaseDB) {
                submittedData = await window.firebaseDB.getChecklistsForDate(m, d);
            }
        } catch (e) {
            console.error('Firebase 로드 실패', e);
        }
        
        linksBody.innerHTML = '';
        const baseUrl = window.location.href.split('?')[0];
        
        Object.keys(safetyData.departments).forEach(deptName => {
            const dept = safetyData.departments[deptName];
            dept.rooms.forEach(room => {
                const params = new URLSearchParams({ m, d, dept: deptName, room: room.name });
                const finalUrl = `${baseUrl}?${params.toString()}`;
                
                const isSubmitted = submittedData.some(item => item.info && item.info.dept === deptName && item.info.room === room.name);
                const statusBadge = isSubmitted ? '<span style="color:green;font-weight:bold;">✅ 제출됨</span>' : '<span style="color:red;">❌ 미제출</span>';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="border: 1px solid var(--border-color); padding: 0.75rem; text-align:center;">${statusBadge}</td>
                    <td style="border: 1px solid var(--border-color); padding: 0.75rem;">${deptName}</td>
                    <td style="border: 1px solid var(--border-color); padding: 0.75rem;"><strong>${room.name}</strong></td>
                    <td style="border: 1px solid var(--border-color); padding: 0.75rem;">${room.teacher}</td>
                    <td style="border: 1px solid var(--border-color); padding: 0.75rem;">
                        <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="navigator.clipboard.writeText('${finalUrl}').then(() => {this.innerText='✅ 복사완료!'; setTimeout(()=>this.innerText='📋 복사하기',2000)})">📋 복사하기</button>
                    </td>
                `;
                linksBody.appendChild(tr);
            });
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
                currentChecklistState[itemId] = { status: null, notes: '' };
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="item-desc">${item}</td>
                    <td class="text-center"><input type="radio" name="${itemId}" value="양호"></td>
                    <td class="text-center"><input type="radio" name="${itemId}" value="불량"></td>
                    <td class="text-center"><input type="radio" name="${itemId}" value="해당없음"></td>
                    <td><input type="text" class="notes-input" data-id="${itemId}" placeholder="조치사항 입력" disabled></td>
                `;
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
        };
    }

    // Signature Pad Logic
    const canvas = document.getElementById('signaturePad');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const btnClearSignature = document.getElementById('btnClearSignature');
        
        // Remove white background so it's transparent
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        function getPointerPos(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }
        
        function startDrawing(e) {
            e.preventDefault();
            isDrawing = true;
            const pos = getPointerPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
        
        function draw(e) {
            if (!isDrawing) return;
            e.preventDefault();
            const pos = getPointerPos(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        function stopDrawing() {
            if (!isDrawing) return;
            isDrawing = false;
            ctx.closePath();
        }
        
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);
        
        btnClearSignature.addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            signatureDataUrl = null;
        });
    }

    // Admin Signature Pad Logic
    const adminCanvas = document.getElementById('adminSignaturePad');
    if (adminCanvas) {
        const actx = adminCanvas.getContext('2d');
        const btnClearAdminSignature = document.getElementById('btnClearAdminSignature');
        actx.clearRect(0, 0, adminCanvas.width, adminCanvas.height);
        
        function getAdminPointerPos(e) {
            const rect = adminCanvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        }
        
        function startAdminDrawing(e) {
            e.preventDefault();
            isAdminDrawing = true;
            const pos = getAdminPointerPos(e);
            actx.beginPath();
            actx.moveTo(pos.x, pos.y);
        }
        
        function drawAdmin(e) {
            if (!isAdminDrawing) return;
            e.preventDefault();
            const pos = getAdminPointerPos(e);
            actx.lineTo(pos.x, pos.y);
            actx.strokeStyle = '#0f172a';
            actx.lineWidth = 2;
            actx.lineCap = 'round';
            actx.stroke();
        }
        
        function stopAdminDrawing() {
            if (!isAdminDrawing) return;
            isAdminDrawing = false;
            actx.closePath();
            adminSignatureDataUrl = adminCanvas.toDataURL("image/png");
        }
        
        adminCanvas.addEventListener('mousedown', startAdminDrawing);
        adminCanvas.addEventListener('mousemove', drawAdmin);
        adminCanvas.addEventListener('mouseup', stopAdminDrawing);
        adminCanvas.addEventListener('mouseout', stopAdminDrawing);
        adminCanvas.addEventListener('touchstart', startAdminDrawing, { passive: false });
        adminCanvas.addEventListener('touchmove', drawAdmin, { passive: false });
        adminCanvas.addEventListener('touchend', stopAdminDrawing);
        
        btnClearAdminSignature.addEventListener('click', () => {
            actx.clearRect(0, 0, adminCanvas.width, adminCanvas.height);
            adminSignatureDataUrl = null;
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
        
        if (checked === total) {
            elements.btnSave.classList.add('ready');
            elements.btnSave.style.animation = 'pulse 1.5s infinite';
        } else {
            elements.btnSave.classList.remove('ready');
            elements.btnSave.style.animation = 'none';
        }
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

        if (canvas) {
            signatureDataUrl = canvas.toDataURL("image/png");
        }
        
        const finalData = getFinalData();
        if (signatureDataUrl) {
            finalData.signature = signatureDataUrl;
        }

        try {
            if (window.firebaseDB) {
                await window.firebaseDB.saveChecklist(finalData);
            }
        } catch (e) {
            alert('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
            return;
        }

        elements.stepChecklist.classList.add('hidden');
        elements.stepDone.classList.remove('hidden');
        elements.doneDesc.innerHTML = `<strong>${currentInfo.room}</strong> 점검 내역이 저장되었습니다.<br>일자: 2026년 ${currentInfo.month}월 ${currentInfo.day}일<br><br><span style="color:green;font-weight:bold;">✅ Firebase DB 저장 완료</span>`;

        // PDF 렌더링 (비동기)
        elements.printArea.innerHTML = '';
        await renderPrintLayout(finalData, false);
    });

    // JSON Export 삭제됨

    if (elements.btnExportPdfStep2) {
        elements.btnExportPdfStep2.addEventListener('click', async () => {
            if (canvas) {
                signatureDataUrl = canvas.toDataURL("image/png");
            }
            elements.printArea.innerHTML = '';
            await renderPrintLayout(getFinalData(), false);
            window.print();
        });
    }

    if (elements.btnBulkPrint) {
        elements.btnBulkPrint.addEventListener('click', async () => {
            if (!window.currentSubmittedData || window.currentSubmittedData.length === 0) {
                alert('제출된 점검표가 없습니다.');
                return;
            }
            if (!adminSignatureDataUrl) {
                if (!confirm('부장님 서명이 입력되지 않았습니다. 서명 없이 일괄 인쇄하시겠습니까?')) {
                    return;
                }
            }
            elements.printArea.innerHTML = '<p style="text-align:center;padding:30px;font-size:1rem;">🔄 전체 PDF 렌더링 중...</p>';
            
            const tempDiv = document.createElement('div');
            for (const data of window.currentSubmittedData) {
                await renderPrintLayout(data, true, tempDiv);
            }
            elements.printArea.innerHTML = '';
            elements.printArea.appendChild(tempDiv);
            window.print();
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
            ctx.font = `bold ${12 * SCALE}px 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif`;
            ctx.fillStyle = '#000';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const dateText = `2026년 ${String(data.info.month).padStart(2,'0')}월 ${String(data.info.day).padStart(2,'0')}일`;
            ctx.fillText(dateText, 382 * SCALE, (PDF_H - 706) * SCALE);

            // ── 체크 결과 오버레이 ─────────────────────
            // 25개 항목의 PDF Y좌표 (위→아래 순서)
            const ITEM_Y = [
                582, 552,                           // 안전계획 (2)
                534, 504, 485, 465, 446,            // 일반안전 (5)
                426, 406, 386,                      // 소방안전 (3)
                366, 346, 326,                      // 화공안전 (3)
                306, 286, 266, 247,                 // 가스안전 (4)
                227, 207,                           // 산업위생 (2)
                187, 167,                           // 기계안전 (2)
                147, 127,                           // 전기안전 (2)
                107, 87                             // 기자재   (2)
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

            if (adminSignatureDataUrl) {
                const adminSigImg = new Image();
                await new Promise((res, rej) => {
                    adminSigImg.onload = res;
                    adminSigImg.onerror = rej;
                    adminSigImg.src = adminSignatureDataUrl;
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
                        ${adminSignatureDataUrl ? `<img src="${adminSignatureDataUrl}" style="position:absolute;top:50%;right:5px;transform:translateY(-50%);height:40px;z-index:10;" />` : ''}
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
});
