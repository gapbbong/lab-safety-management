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
    }
};
