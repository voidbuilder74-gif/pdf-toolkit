const { PDFDocument } = PDFLib;

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const mergeBtn = document.getElementById('merge-btn');
const downloadBtn = document.getElementById('download-btn');

let selectedFiles = [];
let mergedPdfBlob = null;

// 1. Handle file selection (VoidMind Fixes: Duplicate check & Size limit)
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    
    const validPdfs = files.filter(f => {
        const isPdf = f.name.toLowerCase().endsWith('.pdf') || f.type.includes('pdf');
        if (!isPdf) return false;

        // VoidMind Fix: Check for duplicates
        const isDuplicate = selectedFiles.some(s => s.name === f.name && s.size === f.size);
        if (isDuplicate) {
            alert(`Skipped ${f.name}: File already added.`);
            return false;
        }

        // VoidMind Fix: Prevent huge files from crashing the phone
        if (f.size > 50 * 1024 * 1024) {
            alert(`Skipped ${f.name}: File is larger than 50MB.`);
            return false;
        }

        return true;
    });

    selectedFiles = [...selectedFiles, ...validPdfs];
    renderFileList();
});

function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = file.name;
        
        const removeBtn = document.createElement('span');
        removeBtn.textContent = '✕';
        removeBtn.setAttribute('aria-label', 'Remove file'); // VoidMind Fix: Accessibility
        removeBtn.style.cssText = 'color:#ff4757; cursor:pointer; font-weight:bold; padding: 0 10px;';
        
        removeBtn.addEventListener('click', () => {
            selectedFiles.splice(index, 1);
            renderFileList();
            
            // VoidMind Fix: Reset button states and clear memory if files drop below 2
            if (selectedFiles.length < 2) {
                downloadBtn.style.display = 'none';
                mergeBtn.style.display = 'block';
                mergeBtn.disabled = true;
                mergedPdfBlob = null; // Clear old blob
                document.getElementById('ad-banner').innerText = "Ad Space (Will appear here)";
            }
        });

        div.appendChild(nameSpan);
        div.appendChild(removeBtn);
        fileList.appendChild(div);
    });
    mergeBtn.disabled = selectedFiles.length < 2;
}

// 2. The Merge Logic
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
                console.warn(`Skipped ${file.name}: ${fileError.message}`);
            }
        }

        if (mergedPdf.getPageCount() === 0) {
            throw new Error("No valid PDF pages could be merged. Files might be password protected.");
        }

        const pdfBytes = await mergedPdf.save();
        mergedPdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

        mergeBtn.style.display = 'none';
        downloadBtn.style.display = 'block';
        downloadBtn.disabled = false; 
        
        downloadBtn.textContent = "Save / Share Merged PDF";
        document.getElementById('ad-banner').innerText = "🎉 Merge Complete! Click to save.";

    } catch (error) {
        alert("Error: " + error.message);
        mergeBtn.textContent = "Merge PDFs";
        mergeBtn.disabled = false;
    }
});

// 3. The Ultimate Native Download/Share Logic
downloadBtn.addEventListener('click', async () => {
    if (!mergedPdfBlob) {
        alert("File not ready yet. Please wait a second.");
        return;
    }

    const file = new File([mergedPdfBlob], `VoidTools_Merged_${Date.now()}.pdf`, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'Merged PDF',
                text: 'Here is your merged PDF from VoidTools'
            });
            resetApp(); 
        } catch (error) {
            console.log('Share was cancelled or failed', error);
        }
    } else {
        const url = URL.createObjectURL(mergedPdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        resetApp();
    }
});

// Helper function to reset the app
function resetApp() {
    setTimeout(() => {
        selectedFiles = [];
        fileInput.value = '';
        renderFileList();
        mergeBtn.style.display = 'block';
        mergeBtn.textContent = "Merge PDFs";
        mergeBtn.disabled = true;
        downloadBtn.style.display = 'none';
        mergedPdfBlob = null; // VoidMind Fix: Complete memory cleanup
        document.getElementById('ad-banner').innerText = "Ad Space (Will appear here)";
    }, 2000);
}
