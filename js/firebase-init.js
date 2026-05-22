const firebaseConfig = {
  apiKey: "AIzaSyAyKxpYya9hQl1daDQdJbqDkdIQ-2-0wDI",
  authDomain: "lab-safety-1feb5.firebaseapp.com",
  projectId: "lab-safety-1feb5",
  storageBucket: "lab-safety-1feb5.firebasestorage.app",
  messagingSenderId: "1088778569872",
  appId: "1:1088778569872:web:dfb67fcc17887c967db015",
  measurementId: "G-DNWKRYR19T"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 네트워크 연결 확인 및 시간 초과 방지를 위한 Helper
const DB_TIMEOUT_MS = 6000; // 6초 타임아웃
const runWithTimeout = (promise, errMsg) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(errMsg)), DB_TIMEOUT_MS))
    ]);
};

window.firebaseDB = {
    // 점검표 저장 (교사용)
    saveChecklist: async (data) => {
        try {
            const dateStr = `${data.info.month}_${data.info.day}`;
            // 고유 ID: 월_일_학과_실습실명
            const docId = `${dateStr}_${data.info.dept}_${data.info.room}`;
            
            await runWithTimeout(
                db.collection("checklists").doc(docId).set({
                    ...data,
                    dateStr: dateStr,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }),
                "서버 저장 시간 초과\n\n파이어베이스 서버와 통신할 수 없습니다. 학교 방화벽(교육청 망)에서 파이어베이스 연결(firestore.googleapis.com)을 차단했는지 확인해 주세요. 지속적으로 실패할 경우, 'PDF 인쇄' 버튼을 눌러 점검 내용을 백업한 후 관리자에게 문의 바랍니다."
            );
            console.log("Firebase 저장 성공!");
            return true;
        } catch (e) {
            console.error("Firebase 저장 에러: ", e);
            throw e;
        }
    },
    
    // 특정 날짜의 모든 제출 내역 불러오기 (관리자/부장님용)
    getChecklistsForDate: async (month, day) => {
        try {
            const dateStr = `${month}_${day}`;
            const snapshot = await runWithTimeout(
                db.collection("checklists")
                  .where("dateStr", "==", dateStr)
                  .get(),
                "데이터 불러오기 시간 초과\n\n파이어베이스 서버와 통신할 수 없습니다. 학교 방화벽이나 네트워크 연결을 확인해 주세요."
            );
            
            const results = [];
            snapshot.forEach(doc => {
                results.push(doc.data());
            });
            return results;
        } catch (e) {
            console.error("Firebase 불러오기 에러: ", e);
            throw e;
        }
    },

    // 특정 날짜의 모든 제출 내역 실시간 감시 (onSnapshot)
    subscribeToChecklistsForDate: (month, day, callback) => {
        try {
            const dateStr = `${month}_${day}`;
            return db.collection("checklists")
                     .where("dateStr", "==", dateStr)
                     .onSnapshot(snapshot => {
                         const results = [];
                         snapshot.forEach(doc => {
                             results.push(doc.data());
                         });
                         callback(results);
                     }, err => {
                         console.error("Firebase 실시간 감시 에러: ", err);
                     });
        } catch (e) {
            console.error("Firebase 실시간 감시 설정 에러: ", e);
            throw e;
        }
    },

    // 1. 특정 실습실 개별 부장 결재 저장
    saveAdminApproval: async (month, day, dept, room, signature) => {
        try {
            const docId = `${month}_${day}_${dept}_${room}`;
            await runWithTimeout(
                db.collection("checklists").doc(docId).update({
                    adminSignature: signature,
                    approvedAt: firebase.firestore.FieldValue.serverTimestamp()
                }),
                "결재 저장 시간 초과\n\n파이어베이스 서버와 통신할 수 없습니다. 학교 방화벽이나 네트워크 연결을 확인해 주세요."
            );
            console.log(`${room} 부장 결재 저장 성공!`);
            return true;
        } catch (e) {
            console.error("부장 결재 저장 에러: ", e);
            throw e;
        }
    },

    // 2. 특정 실습실 개별 부장 결재 취소
    deleteAdminApproval: async (month, day, dept, room) => {
        try {
            const docId = `${month}_${day}_${dept}_${room}`;
            await runWithTimeout(
                db.collection("checklists").doc(docId).update({
                    adminSignature: firebase.firestore.FieldValue.delete(),
                    approvedAt: firebase.firestore.FieldValue.delete()
                }),
                "결재 취소 시간 초과\n\n파이어베이스 서버와 통신할 수 없습니다. 학교 방화벽이나 네트워크 연결을 확인해 주세요."
            );
            console.log(`${room} 부장 결재 취소 성공!`);
            return true;
        } catch (e) {
            console.error("부장 결재 취소 에러: ", e);
            throw e;
        }
    },

    // 3. 부장 결재 일괄 저장 (Batch)
    saveAdminBulkApproval: async (month, day, submissions, signature) => {
        try {
            const batch = db.batch();
            submissions.forEach(sub => {
                const docId = `${month}_${day}_${sub.info.dept}_${sub.info.room}`;
                const ref = db.collection("checklists").doc(docId);
                batch.update(ref, {
                    adminSignature: signature,
                    approvedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            await runWithTimeout(
                batch.commit(),
                "일괄 결재 저장 시간 초과\n\n파이어베이스 서버와 통신할 수 없습니다. 학교 방화벽이나 네트워크 연결을 확인해 주세요."
            );
            console.log("부장 결재 일괄 저장 성공!");
            return true;
        } catch (e) {
            console.error("부장 결재 일괄 저장 에러: ", e);
            throw e;
        }
    },

    // 4. 부장 결재 일괄 취소 (Batch)
    deleteAdminBulkApproval: async (month, day, submissions) => {
        try {
            const batch = db.batch();
            submissions.forEach(sub => {
                const docId = `${month}_${day}_${sub.info.dept}_${sub.info.room}`;
                const ref = db.collection("checklists").doc(docId);
                batch.update(ref, {
                    adminSignature: firebase.firestore.FieldValue.delete(),
                    approvedAt: firebase.firestore.FieldValue.delete()
                });
            });
            await runWithTimeout(
                batch.commit(),
                "일괄 결재 취소 시간 초과\n\n파이어베이스 서버와 통신할 수 없습니다. 학교 방화벽이나 네트워크 연결을 확인해 주세요."
            );
            console.log("부장 결재 일괄 취소 성공!");
            return true;
        } catch (e) {
            console.error("부장 결재 일괄 취소 에러: ", e);
            throw e;
        }
    }
};
