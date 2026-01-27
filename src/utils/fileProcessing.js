// fileProcessing.js

import * as pdfjsLib from 'pdfjs-dist';
import { loadMammoth, loadJSZip, loadTesseract } from "./libraryLoaders";
import { validateFileBeforeProcessing } from "./fileValidation";
import { performLimitedOCROnPDF } from "./ocrProcessing";
import { extractTextFromSlideXML } from "./textExtraction";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const readPDF = async (file, setStatus, selectedPages = null) => {
    validateFileBeforeProcessing(file, file.type);
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const typedArray = new Uint8Array(event.target.result);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                
                // Use selected pages or default to first 10
                const pagesToProcess = selectedPages || 
                    Array.from({ length: Math.min(pdf.numPages, 10) }, (_, i) => i + 1);
                
                let text = '';
                let hasText = false;
                
                // Check first few pages for text
                const pagesToCheck = Math.min(5, pagesToProcess.length);
                for (let i = 0; i < pagesToCheck; i++) {
                    const pageNum = pagesToProcess[i];
                    const page = await pdf.getPage(pageNum);
                    const content = await page.getTextContent();
                    const pageText = content.items.map((item) => item.str).join(" ");
                    text += `${pageText} `;
                    if (pageText.trim().length > 0) {
                        hasText = true;
                    }
                }
                
                // Process remaining pages
                if (hasText && text.trim().length > 100) {
                    setStatus(`Extracting text from ${pagesToProcess.length} pages...`);
                    for (let i = pagesToCheck; i < pagesToProcess.length; i++) {
                        setStatus(`Processing page ${pagesToProcess[i]}/${pdf.numPages}...`);
                        const page = await pdf.getPage(pagesToProcess[i]);
                        const content = await page.getTextContent();
                        const pageText = content.items.map((item) => item.str).join(" ");
                        text += `${pageText} `;
                    }
                } else {
                    // Use OCR for image-based PDFs
                    setStatus('PDF appears to be image-based. Performing OCR...');

                    await loadTesseract();

                    text = await performLimitedOCROnPDF(pdf, setStatus, pagesToProcess);
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

export const readDOCX = async (file, setStatus) => {
    validateFileBeforeProcessing(file, file.type);
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


export const readPPTX = async (file, setStatus) => {
    validateFileBeforeProcessing(file, file.type);
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


export const readCSV = async (file) => {
    validateFileBeforeProcessing(file, file.type);
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

export const readTextFile = async (file) => {
    validateFileBeforeProcessing(file, file.type);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};