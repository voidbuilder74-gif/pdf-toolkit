const { PDFDocument } = PDFLib;

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const mergeBtn = document.getElementById('merge-btn');
const downloadBtn = document.getElementById('download-btn');

let selectedFiles = [];
let mergedPdfBlob = null;

// 1. Handle file selection
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    selectedFiles = [...selectedFiles, ...pdfFiles];
    renderFileList();
});

function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `<span>${file.name}</span> <span style="color:#ff4757; cursor:pointer; font-weight:bold; padding: 0 10px;" onclick="removeFile(${index})">✕</span>`;
        fileList.appendChild(div);
    });
    mergeBtn.disabled = selectedFiles.length < 2;
}

window.removeFile = function(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
    if (selectedFiles.length < 2) {
        downloadBtn.style.display = 'none';
        mergeBtn.style.display = 'block';
        mergeBtn.disabled = true;
        document.getElementById('ad-banner').innerText = "Ad Space (Will appear here)";
    }
};

// 2. The Merge Logic
mergeBtn.addEventListener('click', async () => {
    try {
        mergeBtn.textContent = "Merging... Please wait";
        mergeBtn.disabled = true;

        const mergedPdf = await PDFDocument.create();

        for (const file of selectedFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const pdfBytes = await mergedPdf.save();
        
        // Convert to Blob
        mergedPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

        mergeBtn.style.display = 'none';
        downloadBtn.style.display = 'block';
        downloadBtn.textContent = "Save / Share Merged PDF";
        
        document.getElementById('ad-banner').innerText = "🎉 Merge Complete! Click to save.";

    } catch (error) {
        alert("Error merging PDFs: " + error.message);
        mergeBtn.textContent = "Merge PDFs";
        mergeBtn.disabled = false;
    }
});

// 3. The Bulletproof Save/Share Logic
downloadBtn.addEventListener('click', async () => {
    if (!mergedPdfBlob) {
        alert("File not ready yet. Please wait a second and try again.");
        return;
    }

    // Try Native Share first (Needs HTTPS, but we try anyway)
    if (navigator.canShare && navigator.canShare({ files: [mergedPdfBlob] })) {
        try {
            const file = new File([mergedPdfBlob], `VoidTools_Merged.pdf`, { type: 'application/pdf' });
            await navigator.share({
                files: [file],
                title: 'Merged PDF',
                text: 'Here is your merged PDF from VoidTools'
            });
            return; // Exit if successful
        } catch (error) {
            console.log('Share failed, falling back to download.', error);
        }
    }

    // Fallback: Force anchor tag download (Bypasses the Chrome localhost block)
    try {
        const url = URL.createObjectURL(mergedPdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VoidTools_Merged_${Date.now()}.pdf`;
        
        // Add it to the screen so Chrome sees a physical click
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert("If the file didn't download, you are testing on HTTP. It will work perfectly on HTTPS!");
    } catch (err) {
        alert("Download failed: " + err.message);
    }
});
