const { PDFDocument } = PDFLib;

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const mergeBtn = document.getElementById('merge-btn');
const downloadBtn = document.getElementById('download-btn');

let selectedFiles = [];
let mergedPdfBlob = null;

// 1. Handle file selection (Fixed MIME type check)
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    // VoidMind Fix: Check file extension AND type to prevent Android bugs
    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type.includes('pdf'));
    selectedFiles = [...selectedFiles, ...pdfFiles];
    renderFileList();
});

// VoidMind Fix: Programmatic event listeners instead of inline onclick
function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = file.name;
        
        const removeBtn = document.createElement('span');
        removeBtn.textContent = '✕';
        removeBtn.style.cssText = 'color:#ff4757; cursor:pointer; font-weight:bold; padding: 0 10px;';
        removeBtn.addEventListener('click', () => {
            selectedFiles.splice(index, 1);
            renderFileList();
            if (selectedFiles.length < 2) {
                downloadBtn.style.display = 'none';
                mergeBtn.style.display = 'block';
                mergeBtn.disabled = true;
                document.getElementById('ad-banner').innerText = "Ad Space (Will appear here)";
            }
        });

        div.appendChild(nameSpan);
        div.appendChild(removeBtn);
        fileList.appendChild(div);
    });
    mergeBtn.disabled = selectedFiles.length < 2;
}

// 2. The Merge Logic (With VoidMind's Error Handling)
mergeBtn.addEventListener('click', async () => {
    try {
        mergeBtn.textContent = "Merging... Please wait";
        mergeBtn.disabled = true;

        const mergedPdf = await PDFDocument.create();

        for (const file of selectedFiles) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            } catch (fileError) {
                // Skip broken/password-protected files instead of crashing!
                console.warn(`Skipping ${file.name}: ${fileError.message}`);
            }
        }

        if (mergedPdf.getPageCount() === 0) {
            throw new Error("No valid PDF pages could be merged. Files might be password protected.");
        }

        const pdfBytes = await mergedPdf.save();
        mergedPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

        mergeBtn.style.display = 'none';
        downloadBtn.style.display = 'block';
        downloadBtn.disabled = false; // ENABLED!
        
        downloadBtn.textContent = "Download Merged PDF";
        document.getElementById('ad-banner').innerText = "🎉 Merge Complete! Click to save.";

    } catch (error) {
        alert("Error: " + error.message);
        mergeBtn.textContent = "Merge PDFs";
        mergeBtn.disabled = false;
    }
});

// 3. Download Logic (With Memory Cleanup)
downloadBtn.addEventListener('click', () => {
    if (!mergedPdfBlob) {
        alert("File not ready yet. Please wait a second.");
        return;
    }

    const url = URL.createObjectURL(mergedPdfBlob);
    
    // Open in new tab
    window.open(url, '_blank');

    // VoidMind Fix: Revoke URL after 5 seconds to clear phone memory
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    // Reset the app
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
