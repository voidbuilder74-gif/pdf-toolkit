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
        
        // Create the Blob
        mergedPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

        // Hide merge button, show download button
        mergeBtn.style.display = 'none';
        downloadBtn.style.display = 'block';
        
        // 🔥 THE FIX: ENABLE THE BUTTON!
        downloadBtn.disabled = false; 
        
        downloadBtn.textContent = "Download Merged PDF";
        document.getElementById('ad-banner').innerText = "🎉 Merge Complete! Click to save.";

    } catch (error) {
        alert("Error merging PDFs: " + error.message);
        mergeBtn.textContent = "Merge PDFs";
        mergeBtn.disabled = false;
    }
});

// 3. The Foolproof Download Logic (Window.Open)
downloadBtn.addEventListener('click', () => {
    if (!mergedPdfBlob) {
        alert("File not ready yet. Please wait a second and try again.");
        return;
    }

    // Create a URL for the Blob
    const url = URL.createObjectURL(mergedPdfBlob);
    
    // Open the PDF in a new tab. 
    // Chrome will show its native PDF viewer, where the user can tap the download icon.
    window.open(url, '_blank');

    // Reset the app for the next use
    setTimeout(() => {
        selectedFiles = [];
        fileInput.value = '';
        renderFileList();
        mergeBtn.style.display = 'block';
        mergeBtn.textContent = "Merge PDFs";
        mergeBtn.disabled = true;
        downloadBtn.style.display = 'none';
        mergedPdfBlob = null;
        document.getElementById('ad-banner').innerText = "Ad Space (Will appear here)";
    }, 2000);
});
