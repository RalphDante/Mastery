import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext'; // Add this import
import LimitReachedModal from '../Modals/LimitReachedModal';
import { logFileUploadEvent, logError } from '../../utils/analytics';
import { generateFlashcardsFromText } from '../../utils/aiServices/flashCardGeneration';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;


function FileUpload({ cameraIsOpen, onSuccess, onError }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
    const navigate = useNavigate();
    const [topic, setTopic] = useState("");

    const [originalUploadedText, setOriginalUploadedText] = useState(null);
    
    // Add auth context
    const { user } = useAuthContext();

    const [showLimitModal, setShowLimitModal] = useState(false);


    // Track when component mounts (modal opened)
    useEffect(() => {
        if (user?.uid) {
            logFileUploadEvent.modalOpened(user.uid);
        }
    }, [user]);

    const loadTesseract = () => {
        return new Promise((resolve, reject) => {
            if (typeof window.Tesseract !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js';
            script.onload = () => {
                console.log('Tesseract.js loaded successfully');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load Tesseract.js'));
            };
            document.head.appendChild(script);
        });
    };

    const loadMammoth = () => {
        return new Promise((resolve, reject) => {
            if (typeof window.mammoth !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.2/mammoth.browser.min.js';
            script.onload = () => {
                console.log('Mammoth.js loaded successfully');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load Mammoth.js'));
            };
            document.head.appendChild(script);
        });
    };

    const validateFileBeforeProcessing = (file) => {
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
    const validateOCRQuality = (text, confidence) => {
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

    // Replace the existing performOCR function with this enhanced version
    const performOCR = async (imageFile) => {
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
                    // Restart camera for another attempt
                    setTimeout(() => {
                        startCamera();
                    }, 100);
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

    const { getRootProps, getInputProps } = useDropzone({
        multiple: true, // Enable multiple file selection
        maxSize: 8 * 1024 * 1024, // 8MB limit per file
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
        },
        onDropRejected: (rejectedFiles) => {
            // Handle rejected files - show info for each rejected file
            rejectedFiles.forEach(rejectedFile => {
                const file = rejectedFile.file;
                const error = rejectedFile.errors[0];
                
                // Log rejection
                logFileUploadEvent.fileRejected(
                    user?.uid,
                    file,
                    error.code,
                    error.message
                );

                if (rejectedFile.errors.find(e => e.code === 'file-too-large')) {
                    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                    alert(`File "${file.name}" is too large (${sizeMB}MB). Please use files under 8MB.`);
                }
            });
            
            if (rejectedFiles.length > 0) {
                alert('Some files were rejected. Please check file types and sizes.');
            }
        },
        onDrop: async (acceptedFiles) => {
            if (acceptedFiles.length === 0) return;

            // Log file drop
            if (acceptedFiles.length === 1) {
                logFileUploadEvent.fileDropped(user?.uid, acceptedFiles[0]);
            } else {
                logFileUploadEvent.multipleFilesDropped(user?.uid, acceptedFiles);
            }
            
            const startTime = Date.now();
            setLoading(true);
            setStatus('Processing files...');
            
            try {
                let allExtractedText = '';
                const imageFiles = [];
                const documentFiles = [];
                
                // Separate images from documents
                acceptedFiles.forEach(file => {
                    if (file.type.startsWith('image/')) {
                        imageFiles.push(file);
                    } else {
                        documentFiles.push(file);
                    }
                });
                
                // Process document files first (only allow one document file type at a time)
                if (documentFiles.length > 1) {
                    alert('Please upload only one document file (PDF, DOCX, PPTX, or TXT) at a time. You can upload multiple images together.');
                    return;
                }
                
                if (documentFiles.length === 1) {
                    const file = documentFiles[0];
                    const fileType = file.type;
                    
                    logFileUploadEvent.processingStarted(user?.uid, fileType)
                    setStatus(`Processing ${file.name}...`);
                    
                    try{
                        if (fileType === 'application/pdf') {
                            allExtractedText = await readPDF(file);
                        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                            allExtractedText = await readDOCX(file);
                        } else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                            allExtractedText = await readPPTX(file);
                        } else if (fileType === 'text/plain') {
                            allExtractedText = await readTextFile(file);
                        } else if (fileType === 'text/csv') {  // ADD THIS BLOCK
                            allExtractedText = await readCSV(file);
                        }

                        // Log processing completion
                        const processingTime = Date.now() - startTime;
                        logFileUploadEvent.processingCompleted(
                            user?.uid,
                            fileType,
                            processingTime,
                            allExtractedText.length
                        );
                    } catch (processingError){
                        logFileUploadEvent.uploadFailed(
                            user?.uid,
                            'PROCESSING_ERROR',
                            processingError.message,
                            fileType
                        );
                        throw processingError;
                    }
                   

                    
                }
                
                // Process multiple images with OCR
                if (imageFiles.length > 0) {
                    logFileUploadEvent.processingStarted(user?.uid, 'image/ocr');

                    // Limit the number of images to prevent overwhelming processing
                    const maxImages = 10;
                    if (imageFiles.length > maxImages) {
                        if (!confirm(`You've selected ${imageFiles.length} images. Processing more than ${maxImages} images may take a long time. Continue with first ${maxImages} images?`)) {
                            return;
                        }
                        imageFiles.splice(maxImages); // Keep only first 10 images
                    }
                    
                    setStatus(`Processing ${imageFiles.length} image(s) with OCR...`);
                    
                    // Process images sequentially to avoid overwhelming the browser
                    for (let i = 0; i < imageFiles.length; i++) {
                        const imageFile = imageFiles[i];
                        setStatus(`Processing image ${i + 1}/${imageFiles.length}: ${imageFile.name}`);
                        
                        try {
                            const imageText = await performOCR(imageFile);
                            if (imageText && imageText.trim()) {
                                allExtractedText += `\n\n--- Image ${i + 1} (${imageFile.name}) ---\n${imageText}`;
                            }
                        } catch (ocrError) {
                            console.error(`OCR failed for ${imageFile.name}:`, ocrError);
                            logFileUploadEvent.uploadFailed(
                                user?.uid,
                                'OCR_ERROR',
                                ocrError.message,
                                'image/ocr'
                            );
                            allExtractedText += `\n\n--- Image ${i + 1} (${imageFile.name}) ---\nOCR processing failed for this image.`;
                        }
                    }
                }
                
                console.log('Total extracted text length:', allExtractedText.length);
                console.log('Extracted text preview:', allExtractedText.substring(0, 300));
                
                if (allExtractedText.trim()) {
                    console.log('Final extracted text being sent to AI:', allExtractedText);
                    setStatus('Generating flashcards...');
                    await sendToAI(allExtractedText);
                } else {
                    throw new Error('No text could be extracted from the files');
                }
                
            } catch (error) {
                console.error('Error processing files:', error);
                
                // Handle limit reached error specifically
                if (error.code === 'LIMIT_REACHED') {
                    setShowLimitModal(true);
                    return;
                }

                if (onError) {
                    onError(error);
                    } else {
                    // Fallback if onError not provided
                    alert(error.message || 'Failed to process file. Please try again.');
                }
            } finally {
                setLoading(false);
                setStatus('');
            }
        }
    });

    // [Keep all the existing file reading functions unchanged - readPDF, readDOCX, readPPTX, etc.]
    const readPDF = async (file) => {
        // Validate file size first
        validateFileBeforeProcessing(file);
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const typedArray = new Uint8Array(event.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;
                    
                    // Warn about large PDFs
                    if (pdf.numPages > 20) {
                        const shouldContinue = confirm(
                            `🖼️ This PDF has ${pdf.numPages} pages.\n\n` +
                            `To keep processing fast, we'll only process the first 10 pages if OCR is needed.\n\n` +
                            `Continue?`
                        );
                        if (!shouldContinue) {
                            reject(new Error('Processing cancelled by user'));
                            return;
                        }
                    }
                    
                    let text = '';
                    let hasText = false;
                    
                    // First, try to extract text normally (only check first 5 pages for speed)
                    const pagesToCheck = Math.min(pdf.numPages, 5);
                    for (let i = 1; i <= pagesToCheck; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        const pageText = content.items.map((item) => item.str).join(" ");
                        text += `${pageText} `;
                        if (pageText.trim().length > 0) {
                            hasText = true;
                        }
                    }
                    
                    // If PDF has readable text, extract from all pages
                    if (hasText && text.trim().length > 100) {
                        setStatus('Extracting text from PDF...');
                        // Get text from remaining pages
                        for (let i = pagesToCheck + 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            const pageText = content.items.map((item) => item.str).join(" ");
                            text += `${pageText} `;
                        }
                    } else {
                        // If no text found, use limited OCR
                        setStatus('PDF appears to be image-based. Performing limited OCR...');
                        text = await performLimitedOCROnPDF(pdf);
                    }
                    
                    resolve(text);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const performLimitedOCROnPDF = async (pdf) => {
        const maxPages = Math.min(pdf.numPages, 10); // Limit to 10 pages
        let ocrText = '';
        
        setStatus(`Processing first ${maxPages} pages with OCR...`);
        
        for (let i = 1; i <= maxPages; i++) {
            try {
                setStatus(`Processing page ${i}/${maxPages}...`);
                
                const page = await pdf.getPage(i);
                // Reduced scale for faster processing
                const viewport = page.getViewport({ scale: 1.0 });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                // Convert to JPEG with compression for faster OCR
                const blob = await new Promise(resolve => 
                    canvas.toBlob(resolve, 'image/jpeg', 0.6)
                );
                
                const { data: { text } } = await window.Tesseract.recognize(
                    blob,
                    'eng',
                    {
                        logger: m => {
                            if (m.status === 'recognizing text' && m.progress > 0.5) {
                                setStatus(`Processing page ${i}/${maxPages} - ${Math.round(m.progress * 100)}%`);
                            }
                        },
                        // Faster OCR settings
                        tessedit_ocr_engine_mode: 1,
                        tessedit_pageseg_mode: 6,
                    }
                );
                
                ocrText += text.trim() + ' ';
                
            } catch (error) {
                console.error(`Error processing page ${i}:`, error);
                // Continue with other pages instead of failing completely
                continue;
            }
        }
        
        return ocrText;
    };

    const readDOCX = async (file) => {
        try {
            setStatus('Loading DOCX library...');
            await loadMammoth();
            
            setStatus('Reading DOCX file...');
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const arrayBuffer = event.target.result;
                        console.log('DOCX file size:', arrayBuffer.byteLength);
                        
                        const result = await window.mammoth.extractRawText({ arrayBuffer });
                        console.log('DOCX extraction result:', result);
                        
                        if (result.value && result.value.trim()) {
                            resolve(result.value);
                        } else {
                            reject(new Error('No text content found in DOCX file'));
                        }
                    } catch (error) {
                        console.error('DOCX processing error:', error);
                        reject(error);
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        } catch (error) {
            throw new Error(`DOCX processing failed: ${error.message}`);
        }
    };

    
    // Add this function to load the PPTX library
    const loadPptxGenJs = () => {
        return new Promise((resolve, reject) => {
            if (typeof window.PptxGenJS !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.min.js';
            script.onload = () => {
                console.log('PptxGenJS loaded successfully');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load PptxGenJS'));
            };
            document.head.appendChild(script);
        });
    };

    // Alternative: Load JSZip and XML parser for manual PPTX parsing
    const loadJSZip = () => {
        return new Promise((resolve, reject) => {
            if (typeof window.JSZip !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => {
                console.log('JSZip loaded successfully');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load JSZip'));
            };
            document.head.appendChild(script);
        });
    };

    // Replace your existing readPPTX function with this improved version
    const readPPTX = async (file) => {
        try {
            setStatus('Loading PPTX library...');
            await loadJSZip();
            
            setStatus('Reading PowerPoint file...');
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const arrayBuffer = event.target.result;
                        const zip = await window.JSZip.loadAsync(arrayBuffer);
                        
                        let extractedText = '';
                        
                        // Extract text from slides
                        const slideFiles = Object.keys(zip.files).filter(fileName => 
                            fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml')
                        );
                        
                        console.log('Found slide files:', slideFiles);
                        
                        for (const slideFile of slideFiles) {
                            const slideXml = await zip.files[slideFile].async('string');
                            const slideText = extractTextFromSlideXML(slideXml);
                            extractedText += slideText + '\n\n';
                        }
                        
                        // Also try to extract from slide layouts and masters if slides are empty
                        if (extractedText.trim().length < 50) {
                            const layoutFiles = Object.keys(zip.files).filter(fileName => 
                                fileName.startsWith('ppt/slideLayouts/') && fileName.endsWith('.xml')
                            );
                            
                            for (const layoutFile of layoutFiles) {
                                const layoutXml = await zip.files[layoutFile].async('string');
                                const layoutText = extractTextFromSlideXML(layoutXml);
                                extractedText += layoutText + '\n';
                            }
                        }
                        
                        console.log('PPTX extraction result length:', extractedText.length);
                        console.log('PPTX extraction preview:', extractedText.substring(0, 300));
                        
                        if (extractedText && extractedText.trim()) {
                            resolve(extractedText.trim());
                        } else {
                            reject(new Error('No readable text content found in PowerPoint file'));
                        }
                    } catch (error) {
                        console.error('PPTX processing error:', error);
                        reject(error);
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        } catch (error) {
            throw new Error(`PowerPoint processing failed: ${error.message}`);
        }
    };

    // Helper function to extract text from slide XML
    const extractTextFromSlideXML = (xmlString) => {
        try {
            // Create a temporary DOM element to parse XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            
            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                console.warn('XML parsing error:', parserError.textContent);
                return extractTextWithRegex(xmlString);
            }
            
            // Extract text from <a:t> elements (actual text content)
            const textElements = xmlDoc.querySelectorAll('t');
            let extractedText = '';
            
            textElements.forEach(element => {
                const text = element.textContent;
                if (text && text.trim()) {
                    extractedText += text.trim() + ' ';
                }
            });
            
            // If DOM parsing didn't work well, fall back to regex
            if (extractedText.trim().length < 10) {
                return extractTextWithRegex(xmlString);
            }
            
            return extractedText;
        } catch (error) {
            console.warn('DOM parsing failed, using regex fallback:', error);
            return extractTextWithRegex(xmlString);
        }
    };

    // Fallback regex-based text extraction
    const extractTextWithRegex = (xmlString) => {
        // Extract text between <a:t> tags
        const textMatches = xmlString.match(/<a:t[^>]*>(.*?)<\/a:t>/g);
        let extractedText = '';
        
        if (textMatches) {
            textMatches.forEach(match => {
                // Remove the XML tags and decode HTML entities
                const text = match.replace(/<[^>]+>/g, '');
                if (text && text.trim()) {
                    extractedText += decodeHtmlEntities(text.trim()) + ' ';
                }
            });
        }
        
        // Also try alternative text patterns
        if (extractedText.trim().length < 10) {
            const altMatches = xmlString.match(/>([\w\s\.,!?;:'"()-]{3,})</g);
            if (altMatches) {
                altMatches.forEach(match => {
                    const text = match.slice(1, -1); // Remove > and <
                    if (text && text.trim() && !text.includes('<') && !text.includes('xml')) {
                        extractedText += text.trim() + ' ';
                    }
                });
            }
        }
        
        return extractedText;
    };

    // Helper function to decode HTML entities
    const decodeHtmlEntities = (text) => {
        const textArea = document.createElement('textarea');
        textArea.innerHTML = text;
        return textArea.value;
    };

    // Alternative simpler approach if JSZip doesn't work
    const readPPTXSimple = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target.result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(uint8Array);
                    
                    // Look for text patterns in the PPTX structure
                    const textMatches = text.match(/>([^<>\x00-\x1f\x7f-\x9f]{10,})</g);
                    let extractedText = '';
                    
                    if (textMatches) {
                        const uniqueTexts = new Set();
                        textMatches.forEach(match => {
                            const cleanText = match.slice(1, -1).trim();
                            // Filter out XML tags, namespaces, and other non-content
                            if (cleanText && 
                                !cleanText.includes('xml') && 
                                !cleanText.includes('http') &&
                                !cleanText.includes('schemas') &&
                                !cleanText.includes('openxmlformats') &&
                                !cleanText.match(/^[A-Za-z]+:/) && // namespace prefixes
                                cleanText.length > 3 &&
                                /[a-zA-Z]/.test(cleanText)) { // contains letters
                                uniqueTexts.add(cleanText);
                            }
                        });
                        
                        extractedText = Array.from(uniqueTexts).join(' ');
                    }
                    
                    if (extractedText.trim()) {
                        resolve(extractedText);
                    } else {
                        reject(new Error('No readable text found in PowerPoint file'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const readTextFile = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    const readCSV = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const csvText = event.target.result;
                    
                    // Parse CSV
                    const lines = csvText.split('\n').filter(line => line.trim());
                    
                    if (lines.length === 0) {
                        reject(new Error('CSV file is empty'));
                        return;
                    }
                    
                    // Get headers
                    const headers = lines[0].split(',').map(h => 
                        h.trim().replace(/^"|"$/g, '')
                    );
                    
                    // Format for AI: Simple, direct conversion request
                    let formattedText = `CSV FILE - CONVERT TO FLASHCARDS\n\n`;
                    formattedText += `CRITICAL INSTRUCTION: Create EXACTLY ONE flashcard for each row below. Do NOT generate additional flashcards or expand on the content. Just convert what's provided.\n\n`;
                    formattedText += `Total rows: ${lines.length - 1}\n`;
                    formattedText += `Columns: ${headers.join(' | ')}\n\n`;
                    
                    // Include ALL rows (since user wants all their data as flashcards)
                    formattedText += `DATA TO CONVERT:\n\n`;
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                        if (values.some(v => v)) { // Skip completely empty rows
                            formattedText += `Row ${i}: ${values.join(' | ')}\n`;
                        }
                    }
                    
                    formattedText += `\n--- End of CSV data ---\n\n`;
                    formattedText += `Remember: Create EXACTLY ${lines.length - 1} flashcards, one per row.`;
                    
                    resolve(formattedText);
                } catch (error) {
                    reject(new Error(`CSV parsing failed: ${error.message}`));
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    const startCamera = async () => {
        try {
            setStatus('Starting camera...');
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 2560 },
                    height: { ideal: 1440 }
                } 
            });
            setStream(mediaStream);
            setShowCamera(true);
            cameraIsOpen(true);
            setStatus('');
        } catch (error) {
            console.error('Error accessing camera:', error);
            logError('camera_start_error', error, user?.uid);
            alert('Could not access camera. Please check permissions.');
            setStatus('');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowCamera(false);
        cameraIsOpen(false);
    };

    // Also update the capturePhoto function to handle retry requests properly
    const capturePhoto = () => {
        if (!videoRef.current) return;
        
        logFileUploadEvent.photoCaptured(user?.uid);

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        canvas.toBlob(async (blob) => {
            setLoading(true);
            setStatus('Processing photo...');
            stopCamera();
            
            try {
                const extractedText = await performOCR(blob);
                if (extractedText.trim()) {
                    setStatus('Generating flashcards...');
                    await sendToAI(extractedText);
                } else {
                    throw new Error('No text could be extracted from the photo');
                }
            } catch (error) {
                console.error('Error processing photo:', error);
                
                // Handle OCR retry requests (don't show error alert for these)
                if (error.message === 'OCR_RETRY_REQUESTED') {
                    // Camera will restart automatically, just reset loading state
                    setLoading(false);
                    setStatus('');
                    return;
                }
                
                // NEW: Propagate error to parent
                if (onError) {
                    onError(error);
                } else {
                logError('photo_capture_error', error, user?.uid);
                alert(error.message || 'Failed to process photo. Please try again.');
                }

            } finally {
                setLoading(false);
                setStatus('');
            }
        }, 'image/jpeg', 0.8);
    };

    // Set up video stream when camera is shown
    useEffect(() => {
        if (showCamera && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [showCamera, stream]);

    // Cleanup camera when component unmounts
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    
    // Updated handleGenerateOnTopic function with AI limits
    const handleGenerateOnTopic = async () => {
        if (!topic.trim()) {
            alert('Please enter a topic first');
            return;
        }

        if (!user?.uid) {
            alert('Please log in to generate flashcards');
            return;
        }

        logFileUploadEvent.topicGeneration(user?.uid, topic);
        const startTime = Date.now();

        setLoading(true);
        setStatus('Generating flashcards for topic...');

        try {
            const result = await generateFlashcardsFromText(topic, user, true);
            
            const generationTime = Date.now() - startTime;
            logFileUploadEvent.aiGenerationCompleted(
                user?.uid,
                'topic',
                result.flashcards.length,
                generationTime
            );
            // Call onSuccess with the results
            onSuccess({
                flashcards: result.flashcards,
                originalText: topic,
                deckName: result.deckName,
                generationType: 'topic' // NEW: add this
            });
            
        } catch (error) {
            console.error("Error generating flashcards for topic:", error);
            logFileUploadEvent.aiGenerationFailed(
                user?.uid,
                'topic',
                error.code || 'UNKNOWN',
                error.message
            );
            if (error.code === 'LIMIT_REACHED') {
                setShowLimitModal(true);
            } else if (onError) {
                // NEW: Propagate error to parent
                onError(error);
            } else {
                alert(error.message || 'Failed to generate flashcards. Please try again.');
            }
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    // Updated sendToAI function with AI limits
    const sendToAI = async (text) => {
        setOriginalUploadedText(text);
        const startTime = Date.now();
        
        try {
            logFileUploadEvent.aiGenerationStarted(user?.uid, 'file', text.length);
            const result = await generateFlashcardsFromText(text, user, false);
            
            const generationTime = Date.now() - startTime;
            logFileUploadEvent.aiGenerationCompleted(
                user?.uid,
                'file',
                result.flashcards.length,
                generationTime
            );

            // Call onSuccess with the results
             onSuccess({
                flashcards: result.flashcards,
                originalText: text,
                deckName: result.deckName,
                generationType: 'file' // NEW: add this
            });
            
        } catch (error) {
            console.error("Error in sendToAI:", error);
            
            logFileUploadEvent.aiGenerationFailed(
                user?.uid,
                'file',
                error.code || 'UNKNOWN',
                error.message
            );


            if (error.code === 'LIMIT_REACHED') {
                setShowLimitModal(true);
            } else {
                // NEW: Propagate error instead of just throwing
                if (onError) {
                onError(error);
                } else {
                throw error;
                }
            }
        }
    };

    return (
        <>
        
            {showLimitModal && (
                <LimitReachedModal 
                    limitType="ai"
                    onClose={() => setShowLimitModal(false)}
                />
            )}

            <div className="w-full">
                {!showCamera ? (
                <div className="space-y-4">

                    {/* <p className="text-white font-black text-center text-lg">
                    AI creates flashcards in <span className="text-yellow-300">15 seconds</span>
                    </p> */}

                  
                    <p className="text-purple-200 font-medium text-center text-sm">
                        <span className="text-yellow-300">Takes only 15 seconds</span>
                    </p>
                    {/* PRIMARY: Textbook scanning options - Make these prominent */}
                    <div>
                        {/* URGENCY */}

                        <div className="relative">
                            <div {...getRootProps()} className="dropzone-active">
                                <input {...getInputProps()} />
                                <div className="border-4 border-dashed border-purple-500 rounded-2xl p-10 
                                                bg-gradient-to-br from-purple-900/20 to-blue-900/20 
                                                hover:border-purple-400 transition-all cursor-pointer group">
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 mx-auto bg-purple-600 rounded-full flex items-center justify-center 
                                                    group-hover:scale-110 transition">
                                    <svg className="w-12 h-12 text-white" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                    </svg>
                                    </div>
                                    <p className="text-white font-black text-xl">DROP PDF, DOCX, OR CSV HERE</p>
                                    <p className="text-purple-300 text-sm">or click to browse • Max 8MB</p>
                                </div>
                            </div>
                        </div>
                        {/* 2. SCAN PAGES — SUBTLE */}
                        <div className="text-center">
                            <button 
                            onClick={startCamera}
                            className="text-purple-400 hover:text-purple-300 text-sm font-medium 
                                        underline underline-offset-4 transition-colors"
                            >
                            Or take a photo of your notes
                            </button>
                        </div>
                        {/* 3. TOPIC — TINY */}
                        <div className="flex flex-col my-2 text-center">
                            <span className="text-gray-500 text-xs">OR</span>
                            <div className="relative mt-2 w-full max-w-xs mx-auto">
                               <input 
                                    placeholder="Type a topic... (e.g., Parts of a cell)"
                                    className="w-full bg-slate-700 text-white px-3 py-2 pr-10 rounded-lg text-sm"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && topic.trim()) {
                                        handleGenerateOnTopic();
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleGenerateOnTopic}
                                    disabled={!topic.trim() || loading}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-all ${
                                        !topic.trim() || loading
                                            ? 'opacity-30 cursor-not-allowed'
                                            : 'bg-purple-600 hover:bg-purple-700 hover:scale-110'
                                    }`}
                                >
                                    <ArrowRight className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>
                    </div>
                        
                        
                    {/* <div className="grid grid-cols-2 gap-4 mb-4">
                        <button 
                            onClick={startCamera}
                            className={`${
                                loading ? 'btn-disabled cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 hover:scale-105'
                            } h-16 px-6 py-4 rounded-xl flex items-center justify-center gap-3 text-lg font-semibold text-white transition-all duration-200 shadow-lg`}
                            disabled={loading}
                        >
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Scan Pages
                        </button>

                        <button 
                            {...getRootProps()} 
                            className={`${
                                loading ? 'btn-disabled cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
                            } h-16 px-6 py-4 rounded-xl flex items-center justify-center gap-3 text-lg font-semibold text-white transition-all duration-200 shadow-lg`}
                            disabled={loading}
                        >
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            {loading ? 'Processing...' : 'Upload Files'}
                        </button>
                    </div> */}

                        <input {...getInputProps()} />
                        
                        {/* Textbook-specific guidance */}
                        {/* <div className="bg-blue-900 bg-opacity-30 rounded-lg p-4 border border-blue-700">
                            <div className="text-sm text-blue-200">
                                <div className="font-medium text-blue-100 mb-2">📚 Works best with:</div>
                                <div className="space-y-1">
                                    <div>• Printed textbook pages (clear, high contrast)</div>
                                    <div>• PDF chapters from digital textbooks</div>
                                    <div>• Study guides and course materials</div>
                                    <div>• Lecture slides (PowerPoint, PDF)</div>
                                </div>
                            </div>
                        </div> */}
                    </div>

                    {/* SECONDARY: Topic generation - Smaller, less prominent */}
                    {/* <div className="pt-4 border-t border-gray-600">
                        <div className="text-center mb-3">
                            <span className="text-gray-400 text-sm font-medium">OR CREATE FROM ANY TOPIC</span>
                        </div>
                        
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full h-12 p-4 pr-12 bg-gray-700 bg-opacity-50 text-gray-100 rounded-lg focus:outline-none border border-gray-600 placeholder-gray-400 text-base"
                                placeholder="e.g., Cellular Biology, European History..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                            />
                            <button
                                className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                                    topic.length === 0 ? 'opacity-30' : 'opacity-100 hover:bg-purple-700'
                                } bg-purple-600 text-white p-2 rounded-md transition-all duration-200`}
                                onClick={handleGenerateOnTopic}
                                disabled={topic.length === 0}
                            >
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                        
                       
                    </div> */}
                    
                    {/* Status indicator */}
                    {status && (
                        <div className="bg-blue-500 bg-opacity-20 border border-blue-500 rounded-lg p-3">
                            <div className="text-sm text-blue-200 flex items-center gap-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                                <span className="font-medium">{status}</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Technical specs - Condensed */}
                    {/* <div className="bg-gray-800 bg-opacity-30 rounded-lg p-3">
                        <div className="text-xs text-gray-400 text-center">
                            <div className="mb-1">PDF, DOCX, PPTX, Images • Max 8MB • Auto OCR</div>
                            <div className="text-xs text-gray-500">
                                PDF OCR processes up to 10 pages for optimal speed
                            </div>
                        </div>
                    </div> */}
                </div>
            ) : (
                /* Camera UI - Keep this mostly the same but with slight improvements */
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-full max-w-md">
                        <video
                            ref={videoRef}
                            className="w-full h-auto rounded-xl border-2 border-purple-500 shadow-lg"
                            autoPlay
                            playsInline
                            muted
                        />
                        
                        {/* Improved camera overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-4 left-4 right-4 text-white bg-black bg-opacity-70 p-3 rounded-lg text-sm text-center font-medium">
                                📝 Position your notes clearly in the frame
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={capturePhoto}
                            className="btn btn-primary px-8 py-4 text-lg font-semibold flex items-center gap-3 rounded-xl hover:scale-105 transition-all duration-200"
                            disabled={loading}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg> 
                            Capture Photo
                        </button>
                        
                        <button 
                            onClick={stopCamera}
                            className="btn btn-outline px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all duration-200"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
            
        </>
        
    );
}

export default FileUpload;