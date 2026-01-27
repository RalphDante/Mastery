// fileValidation.js

export const validateFileBeforeProcessing = (file, fileType) => {
    let maxSize;
    let fileTypeName;
    
    // Different limits for different file types
    if (fileType === 'application/pdf') {
        maxSize = 150 * 1024 * 1024; // 150MB for PDFs (page selection available)
        fileTypeName = 'PDF';
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        maxSize = 20 * 1024 * 1024; // 20MB for DOCX (full file processed)
        fileTypeName = 'DOCX';
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        maxSize = 30 * 1024 * 1024; // 30MB for PPTX (full file processed)
        fileTypeName = 'PPTX';
    } else if (fileType === 'text/csv') {
        maxSize = 10 * 1024 * 1024; // 10MB for CSV (every row processed)
        fileTypeName = 'CSV';
    } else if (fileType === 'text/plain') {
        maxSize = 5 * 1024 * 1024; // 5MB for TXT (full file processed)
        fileTypeName = 'TXT';
    } else if (fileType.startsWith('image/')) {
        maxSize = 10 * 1024 * 1024; // 10MB for images (OCR processed)
        fileTypeName = 'Image';
    } else {
        maxSize = 150 * 1024 * 1024; // Default fallback
        fileTypeName = 'File';
    }
    
    if (file.size > maxSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
        throw new Error(
            `📄 ${fileTypeName} file too large (${sizeMB}MB)\n\n` +
            `Maximum ${fileTypeName} size: ${maxSizeMB}MB\n\n` +
            `${fileType === 'application/pdf' 
                ? 'Tip: You can select specific pages from large PDFs after upload.'
                : 'For large files, consider splitting them into smaller sections.'
            }`
        );
    }
};

export const getMaxFileSize = () => 150 * 1024 * 1024; // 150MB

// Add these constants for consistency
export const MAX_PAGES_PER_PROCESSING = 10;
export const RECOMMENDED_PAGES = 5;