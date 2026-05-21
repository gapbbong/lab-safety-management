import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';

async function extractInfo(pdfPath) {
    const loadingTask = pdfjsLib.getDocument(pdfPath);
    const pdfDocument = await loadingTask.promise;
    
    console.log(`\n=== Extracting from: ${pdfPath} ===`);
    
    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join('');
        
        // Use a simpler approach since spacing might be weird
        // We know the labels: "학과명", "확인자", "학과부장", "실습실명", "담당교사"
        
        const text = pageText.replace(/\s+/g, ''); // Remove all spaces for easier matching
        
        const match = text.match(/학과명(.*?)확인자학과부장(.*?)\(인\)실습실명(.*?)담당교사(.*?)\(인\)/);
        
        if (match) {
            console.log(`Page ${i}: 학과=${match[1]}, 부장=${match[2]}, 실습실=${match[3]}, 담당=${match[4]}`);
        } else {
             // Let's try an alternative match if "학과부장" is not there
             const altMatch = text.match(/학과명(.*?)확인자(.*?)\(인\)실습실명(.*?)담당교사(.*?)\(인\)/);
             if (altMatch) {
                 console.log(`Page ${i} (Alt): 학과=${altMatch[1]}, 부장=${altMatch[2]}, 실습실=${altMatch[3]}, 담당=${altMatch[4]}`);
             }
        }
    }
}

async function run() {
    await extractInfo('2026 실습실 안전점검표(전기과).pdf');
    await extractInfo('26 실습실 안전점검표(게임콘텐츠과).pdf');
}

run().catch(console.error);
