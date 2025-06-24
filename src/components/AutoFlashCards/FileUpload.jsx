import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { useState } from 'react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function FileUpload({ onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const { getRootProps, getInputProps } = useDropzone({
        multiple: false,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'application/msword': ['.doc'],
            'application/vnd.ms-powerpoint': ['.ppt'],
            'text/plain': ['.txt'],
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
        },
        onDrop: async (acceptedFiles) => {
            if (acceptedFiles.length === 0) return;
            
            setLoading(true);
            setStatus('Processing file...');
            
            const file = acceptedFiles[0];
            const fileType = file.type;
            
            try {
                let extractedText = '';
                
                if (fileType === 'application/pdf') {
                    extractedText = await readPDF(file);
                } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    extractedText = await readDOCX(file);
                } else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                    extractedText = await readPPTX(file);
                } else if (fileType === 'text/plain') {
                    extractedText = await readTextFile(file);
                } else if (fileType.startsWith('image/')) {
                    extractedText = await performOCR(file);
                } else {
                    throw new Error('Unsupported file type');
                }
                
                if (extractedText.trim()) {
                    setStatus('Generating flashcards...');
                    await sendToAI(extractedText);
                } else {
                    throw new Error('No text could be extracted from the file');
                }
                
            } catch (error) {
                console.error('Error processing file:', error);
                alert(`Error processing file: ${error.message}`);
            } finally {
                setLoading(false);
                setStatus('');
            }
        }
    });

    const readPDF = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const typedArray = new Uint8Array(event.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;
                    
                    let text = '';
                    let hasText = false;
                    
                    // First, try to extract text normally
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        const pageText = content.items.map((item) => item.str).join(" ");
                        text += `${pageText} `;
                        if (pageText.trim().length > 0) {
                            hasText = true;
                        }
                    }
                    
                    // If no text found, try OCR on PDF pages
                    if (!hasText || text.trim().length < 50) {
                        setStatus('PDF appears to be image-based. Performing OCR...');
                        text = await performOCROnPDF(pdf);
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

    const performOCROnPDF = async (pdf) => {
        // Convert PDF pages to images and perform OCR
        let ocrText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Convert canvas to blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const pageText = await performOCR(blob);
            ocrText += `${pageText} `;
        }
        
        return ocrText;
    };

    const readDOCX = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target.result;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    resolve(result.value);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const readPPTX = async (file) => {
        // PowerPoint files are more complex - this is a simplified approach
        // For full PowerPoint support, you'd need a more specialized library
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    // This is a basic approach - you might want to use a specialized PPTX library
                    const text = new TextDecoder().decode(event.target.result);
                    // Extract readable text (this is very basic)
                    const cleanText = text.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ');
                    resolve(cleanText);
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

    const performOCR = async (imageFile) => {
        // Using Google Vision API for OCR
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const base64Image = event.target.result.split(',')[1];
                    
                    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=AIzaSyBzq2AFwxW3rAvIR6M81MAMrj9JvaA5eg8`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            requests: [{
                                image: {
                                    content: base64Image
                                },
                                features: [{
                                    type: 'TEXT_DETECTION',
                                    maxResults: 1
                                }]
                            }]
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.responses && data.responses[0] && data.responses[0].textAnnotations) {
                        const extractedText = data.responses[0].textAnnotations[0].description;
                        resolve(extractedText);
                    } else {
                        resolve('No text found in image');
                    }
                } catch (error) {
                    console.error('OCR Error:', error);
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });
    };

    const sendToAI = async (text) => {
        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBzq2AFwxW3rAvIR6M81MAMrj9JvaA5eg8', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Generate 25 flashcards from this text. 
                            Format as JSON: [{"question":"...", "answer":"..."}]
                            
                            Text: ${text}`
                        }]
                    }]
                })
            });

            const data = await response.json();
            const flashCardsText = data.candidates[0].content.parts[0].text;
            
            // Extract JSON from markdown code blocks
            const extractJSON = (text) => {
                const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    return jsonMatch[1].trim();
                }
                
                const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
                if (codeMatch) {
                    return codeMatch[1].trim();
                }
                
                const arrayMatch = text.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    return arrayMatch[0];
                }
                
                return text.trim();
            };

            const cleanJSON = extractJSON(flashCardsText);
            console.log('Cleaned JSON:', cleanJSON);
            
            const parsedFlashCards = JSON.parse(cleanJSON);
            console.log('Parsed flashcards:', parsedFlashCards);

            if (parsedFlashCards && parsedFlashCards.length > 0) {
                onSuccess(parsedFlashCards);
            }

        } catch (error) {
            console.error("There was an error:", error);
            alert("There was an error generating flashcards");
        }
    };

    return (
        <div className="w-full">
            <div className="flex flex-col items-center gap-4">
                <button 
                    {...getRootProps()} 
                    className={`btn ${loading ? 'btn-disabled' : 'btn-primary'} px-6 py-3`}
                    disabled={loading}
                >
                    {loading ? 'Processing...' : 'Choose File'}
                </button>
                <input {...getInputProps()} />
                
                {status && (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        {status}
                    </div>
                )}
                
                <div className="text-xs text-gray-500 text-center max-w-md">
                    Supports: PDF (with OCR), DOCX, PPTX, TXT, and Images (PNG, JPG, etc.)
                    <br />
                    Will automatically perform OCR on image-based content
                </div>
            </div>
        </div>
    );
}

export default FileUpload;