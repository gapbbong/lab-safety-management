import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';

async function extractInfo(pdfPath) {
    const loadingTask = pdfjsLib.getDocument(pdfPath);
    const pdfDocument = await loadingTask.promise;
    
    console.log(`\n=== Extracting from: ${pdfPath} ===`);
    
    const page = await pdfDocument.getPage(1);
    const textContent = await page.getTextContent();
    
    // Group by Y coordinate to see lines
    const lines = {};
    textContent.items.forEach(item => {
        const y = Math.round(item.transform[5]);
        if (!lines[y]) lines[y] = [];
        lines[y].push(item.str);
    });
    
    const sortedY = Object.keys(lines).sort((a, b) => b - a); // Top to bottom
    sortedY.forEach(y => {
        console.log(`[Y: ${y}] ${lines[y].join(' ')}`);
    });
}

extractInfo('26 실습실 안전점검표(게임콘텐츠과).pdf').catch(console.error);
