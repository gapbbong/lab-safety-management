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

window.firebaseDB = {
    // 점검표 저장 (교사용)
    saveChecklist: async (data) => {
        try {
            const dateStr = `${data.info.month}_${data.info.day}`;
            // 고유 ID: 월_일_학과_실습실명
            const docId = `${dateStr}_${data.info.dept}_${data.info.room}`;
            
            await db.collection("checklists").doc(docId).set({
                ...data,
                dateStr: dateStr,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
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
            const snapshot = await db.collection("checklists")
                                     .where("dateStr", "==", dateStr)
                                     .get();
            
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
            await db.collection("checklists").doc(docId).update({
                adminSignature: signature,
                approvedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
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
            await db.collection("checklists").doc(docId).update({
                adminSignature: firebase.firestore.FieldValue.delete(),
                approvedAt: firebase.firestore.FieldValue.delete()
            });
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
            await batch.commit();
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
            await batch.commit();
            console.log("부장 결재 일괄 취소 성공!");
            return true;
        } catch (e) {
            console.error("부장 결재 일괄 취소 에러: ", e);
            throw e;
        }
    }
};
