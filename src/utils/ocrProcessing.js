// ocrProcessing.js
import { loadTesseract } from "./libraryLoaders";
import { logError, logFileUploadEvent } from "./analytics";

export const validateOCRQuality = (text, confidence) => {
    // Check text length (too short indicates poor OCR)
    if (text.trim().length < 50) {
        return {
            isValid: false,
            reason: 'insufficient_text',
            message: 'Not enough readable text detected'
        };
    }

    // Check for too many single characters or fragments
    const words = text.trim().split(/\s+/);
    const singleCharWords = words.filter(word => word.length === 1).length;
    const singleCharRatio = singleCharWords / words.length;
    
    if (singleCharRatio > 0.4) { // More than 40% single characters
        return {
            isValid: false,
            reason: 'fragmented_text',
            message: 'Text appears fragmented or unclear'
        };
    }

    // Check for too many non-alphabetic characters
    const alphaChars = text.replace(/[^a-zA-Z]/g, '').length;
    const totalChars = text.replace(/\s/g, '').length;
    const alphaRatio = alphaChars / totalChars;
    
    if (alphaRatio < 0.6) { // Less than 60% alphabetic characters
        return {
            isValid: false,
            reason: 'low_text_quality',
            message: 'Image may contain mostly symbols or unclear text'
        };
    }

    // Check confidence if available
    if (confidence && confidence < 60) {
        return {
            isValid: false,
            reason: 'low_confidence',
            message: 'OCR confidence is too low'
        };
    }

    // Check for common OCR artifacts that indicate poor quality
    const ocrArtifacts = /[|}{><°~`]/g;
    const artifactCount = (text.match(ocrArtifacts) || []).length;
    const artifactRatio = artifactCount / text.length;
    
    if (artifactRatio > 0.05) { // More than 5% artifacts
        return {
            isValid: false,
            reason: 'ocr_artifacts',
            message: 'Image quality appears poor'
        };
    }

    return {
        isValid: true,
        message: 'Text quality looks good'
    };
};


export const performOCR = async (imageFile, setStatus, user) => {
    try {
        console.log('Starting Tesseract OCR for:', imageFile.name || 'captured image');
        
        // Ensure Tesseract is loaded
        setStatus('Loading OCR library...');
        await loadTesseract();
        
        setStatus('Initializing OCR...');
        
        console.log('Starting Tesseract recognition...');
        setStatus('Reading text from image...');
        
        const { data: { text, confidence } } = await window.Tesseract.recognize(
            imageFile,
            'eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                        setStatus(`Processing text... ${Math.round(m.progress * 100)}%`);
                    }
                }
            }
        );
        
        console.log('OCR completed with confidence:', confidence);
        console.log('Extracted text preview:', text.substring(0, 200) + '...');
        
        // Validate OCR quality
        const qualityCheck = validateOCRQuality(text, confidence);
        
        if (!qualityCheck.isValid) {

            // Log OCR quality issue
            logFileUploadEvent.ocrQualityIssue(
                user?.uid,
                qualityCheck.reason,
                confidence
            );

            // Show helpful alert for poor OCR quality
            const retryMessage = `📷 Photo Quality Issue\n\n` +
                `${qualityCheck.message}\n\n` +
                `💡 For better results:\n\n` +
                `✅ Ensure good lighting (avoid shadows)\n` +
                `✅ Hold phone steady and focus clearly\n` +
                `✅ Get closer to the text\n` +
                `✅ Make sure text fills most of the frame\n` +
                `✅ Avoid glare from glossy pages\n` +
                `✅ Try portrait orientation for better text capture\n\n` +
                `Would you like to try taking another photo?`;
            
            const shouldRetry = confirm(retryMessage);
            
            if (shouldRetry) {
                throw new Error('OCR_RETRY_REQUESTED');
            } else {
                throw new Error('Poor image quality detected. Please try again with better lighting and focus.');
            }
        }
        
        if (text && text.trim().length > 10) {
            return text.trim();
        } else {
            throw new Error('No readable text found in image. Please ensure the image is clear and well-lit.');
        }
        
    } catch (error) {
        console.error('Tesseract OCR error:', error);
        logError('ocr_error', error, user?.uid);
        // Don't show alert for retry requests (user already saw the quality alert)
        if (error.message === 'OCR_RETRY_REQUESTED') {
            throw error;
        }
        
        throw new Error(`OCR processing failed: ${error.message}`);
    }
};

export const performLimitedOCROnPDF = async (pdf, setStatus, selectedPages = null) => {
    // If selectedPages is provided as an array, use it; otherwise default to first 10 pages
    const pagesToProcess = selectedPages || 
        Array.from({ length: Math.min(pdf.numPages, 10) }, (_, i) => i + 1);
    
    let ocrText = '';
    
    console.log('📄 Starting OCR on pages:', pagesToProcess); // DEBUG
    
    setStatus(`Processing ${pagesToProcess.length} pages with OCR...`);
    
    // Loop through the page numbers in the array
    for (let i = 0; i < pagesToProcess.length; i++) {
        const pageNum = pagesToProcess[i];
        
        try {
            setStatus(`Processing page ${pageNum} (${i + 1}/${pagesToProcess.length})...`);
            console.log(`🔍 OCR processing page ${pageNum}...`); // DEBUG
            
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            console.log(`✅ Page ${pageNum} rendered to canvas`); // DEBUG
            
            const blob = await new Promise(resolve => 
                canvas.toBlob(resolve, 'image/jpeg', 0.6)
            );
            
            console.log(`📷 Page ${pageNum} converted to blob, starting OCR...`); // DEBUG
            
            const { data: { text } } = await window.Tesseract.recognize(
                blob,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text' && m.progress > 0.5) {
                            setStatus(`Processing page ${pageNum} - ${Math.round(m.progress * 100)}%`);
                        }
                    },
                    tessedit_ocr_engine_mode: 1,
                    tessedit_pageseg_mode: 6,
                }
            );
            
            console.log(`✅ Page ${pageNum} OCR complete. Text length: ${text.length}`); // DEBUG
            console.log(`Preview: ${text.substring(0, 100)}...`); // DEBUG
            
            ocrText += text.trim() + ' ';
            
        } catch (error) {
            console.error(`❌ Error processing page ${pageNum}:`, error);
            continue;
        }
    }
    
    console.log(`📊 Total OCR text length: ${ocrText.length}`); // DEBUG
    console.log(`Final preview: ${ocrText.substring(0, 200)}...`); // DEBUG
    
    return ocrText;
};