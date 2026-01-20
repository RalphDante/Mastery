// fileValidation.js

export  const validateFileBeforeProcessing = (file) => {
    const maxSize = 8 * 1024 * 1024; // 8MB limit
    
    if (file.size > maxSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(
            `📄 File too large (${sizeMB}MB)\n\n` +
            `For best results, please try:\n\n` +
            `✅ Split your PDF into smaller files (under 8MB)\n` +
            `✅ Export key pages as JPG images\n` +
            `✅ Use online PDF splitters (ilovepdf.com, smallpdf.com)\n` +
            `✅ Take photos of individual pages instead\n\n` +
            `Why? Large PDFs can take 30+ minutes to process and may crash your browser.`
        );
    }
};

export const getMaxFileSize = () => 8 * 1024 * 1024;