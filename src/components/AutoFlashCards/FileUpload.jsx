import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import { useState, useEffect, useRef } from 'react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function FileUpload({ cameraIsOpen, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);

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

    // OCR function using Tesseract.js
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
            
            if (text && text.trim().length > 10) {
                return text.trim();
            } else {
                return 'No readable text found in image. Please ensure the image is clear and well-lit.';
            }
            
        } catch (error) {
            console.error('Tesseract OCR error:', error);
            throw new Error(`OCR processing failed: ${error.message}`);
        }
    };

    const { getRootProps, getInputProps } = useDropzone({
        multiple: false,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], // Added DOCX
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'], // Added PPTX
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
        },
        onDrop: async (acceptedFiles) => {
            if (acceptedFiles.length === 0) return;
            
            setLoading(true);
            setStatus('Processing file...');
            
            const file = acceptedFiles[0];
            const fileType = file.type;
            
            console.log('File type:', fileType, 'File name:', file.name); // Debug log
            
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
                    throw new Error(`Unsupported file type: ${fileType}`);
                }
                
                console.log('Extracted text length:', extractedText.length);
                console.log('Extracted text preview:', extractedText.substring(0, 200));
                
                if (extractedText.trim()) {
                    console.log('Final extracted text being sent to AI:', extractedText); // Debug log
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

    const capturePhoto = () => {
        if (!videoRef.current) return;
        
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
                alert(`Error processing photo: ${error.message}`);
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

    const retryWithBackoff = async (fn, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    };

    const sendToAI = async (text) => {
        const makeAPICall = async () => {
            console.log('Text being sent to AI:', text.substring(0, 500) + '...');
            
            // Check if API key is available
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('VITE_GEMINI_API_KEY environment variable is not set');
            }
            
            const estimateFlashcardCount = (textLength) => {
                if (textLength < 500) return 15;
                if (textLength < 1500) return 30;
                if (textLength < 3000) return 50;
                if (textLength < 5000) return 75;
                return 100; // For very long texts
            };
            
            const flashcardCount = estimateFlashcardCount(text.length);

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a flashcard generator. Create exactly ${flashcardCount} flashcards from the provided text.
    
                            CRITICAL: Return ONLY a valid JSON array. No explanations, no markdown, no code blocks.
                            
                            Format: [{"question":"Your question here","answer":"Your answer here"}]
                            
                            Requirements:
                            - Questions should be clear and specific
                            - Answers should be concise but complete
                            - Use proper JSON escaping for quotes (use \\" for quotes inside strings)
                            - No line breaks within strings
                            - Exactly ${flashcardCount} flashcards
                            - Double quotes only, no single quotes
                            
                            Text to process: ${text}`
                        }]
                    }]
                })
            });
    
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
    
            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response from AI service');
            }
            
            return data.candidates[0].content.parts[0].text;
        };
    
        try {
            // Use retry with backoff for API calls
            const flashCardsText = await retryWithBackoff(makeAPICall);
            console.log('Raw AI response:', flashCardsText);
            
            // Improved JSON extraction and cleaning
            const extractAndCleanJSON = (text) => {
                let jsonText = text;
                
                // Remove markdown code blocks
                const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    jsonText = jsonMatch[1].trim();
                }
                
                // Find JSON array bounds
                const startIndex = jsonText.indexOf('[');
                const lastIndex = jsonText.lastIndexOf(']');
                
                if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
                    jsonText = jsonText.substring(startIndex, lastIndex + 1);
                }
                
                // Clean up common issues
                jsonText = jsonText
                    // Fix common escape sequence issues
                    .replace(/\\(?!["\\/bfnrt])/g, '\\\\') // Escape lone backslashes
                    .replace(/\\\\_/g, '_') // Fix underscore escapes
                    .replace(/\\'/g, "'") // Fix single quote escapes
                    .replace(/\n/g, ' ') // Replace newlines with spaces
                    .replace(/\r/g, ' ') // Replace carriage returns
                    .replace(/\t/g, ' ') // Replace tabs
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .trim();
                
                return jsonText;
            };
    
            const cleanJSON = extractAndCleanJSON(flashCardsText);
            console.log('Cleaned JSON:', cleanJSON);
            
            // Try parsing with better error handling
            let parsedFlashCards;
            try {
                parsedFlashCards = JSON.parse(cleanJSON);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Problematic JSON:', cleanJSON);
                
                // Try to fix common JSON issues and parse again
                let fixedJSON = cleanJSON;
                
                // Fix trailing commas
                fixedJSON = fixedJSON.replace(/,(\s*[}\]])/g, '$1');
                
                // Fix missing commas between objects - CORRECTED REGEX
                fixedJSON = fixedJSON.replace(/}(\s*){/g, '},$1{');
                
                // Fix missing commas between array elements
                fixedJSON = fixedJSON.replace(/}(\s*){/g, '},$1{');
                
                // Remove any double commas
                fixedJSON = fixedJSON.replace(/,,+/g, ',');
                
                try {
                    parsedFlashCards = JSON.parse(fixedJSON);
                    console.log('Successfully parsed after fixes');
                } catch (secondParseError) {
                    console.error('Second parse attempt failed:', secondParseError);
                    
                    // Last resort: try to extract individual flashcards manually
                    try {
                        const flashcardMatches = cleanJSON.match(/{"question":\s*"[^"]*",\s*"answer":\s*"[^"]*"}/g);
                        if (flashcardMatches && flashcardMatches.length > 0) {
                            parsedFlashCards = flashcardMatches.map(match => {
                                try {
                                    return JSON.parse(match);
                                } catch (e) {
                                    return null;
                                }
                            }).filter(card => card !== null);
                            console.log('Successfully extracted flashcards manually');
                        } else {
                            throw new Error('Could not extract flashcards from response');
                        }
                    } catch (manualParseError) {
                        // Create a fallback response
                        parsedFlashCards = [
                            {
                                question: "Please try again",
                                answer: "The AI response couldn't be parsed. Please upload your file again for better results."
                            }
                        ];
                        
                        console.error('Unable to parse AI response. Raw response:', flashCardsText);
                        alert(`JSON parsing failed. Raw response: ${flashCardsText.substring(0, 200)}...`);
                    }
                }
            }
    
            // Validate the result
            if (!Array.isArray(parsedFlashCards)) {
                throw new Error('AI response is not an array of flashcards');
            }
    
            // Enhanced validation function
            const validateFlashcard = (card) => {
                return card && 
                       typeof card === 'object' && 
                       card.question && 
                       card.answer &&
                       typeof card.question === 'string' &&
                       typeof card.answer === 'string' &&
                       card.question.trim().length > 0 &&
                       card.answer.trim().length > 0;
            };
    
            // Filter out invalid flashcards
            const validFlashCards = parsedFlashCards.filter(validateFlashcard);
    
            if (validFlashCards.length === 0) {
                throw new Error('No valid flashcards were generated');
            }
    
            console.log(`Generated ${validFlashCards.length} valid flashcards`);
            onSuccess(validFlashCards);
    
        } catch (error) {
            console.error("There was an error:", error);
            alert(`There was an error generating flashcards: ${error.message}`);
        }
    };

    return (
        <div className="w-full">
            {!showCamera ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-3">
                        <button 
                            {...getRootProps()} 
                            className={`btn ${loading ? 'btn-disabled' : 'btn-primary'} px-6 py-3`}
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Choose File'}
                        </button>
                        
                        <button 
                            onClick={startCamera}
                            className={`btn ${loading ? 'btn-disabled' : 'btn-secondary'} px-6 py-3 flex items-center gap-2`}
                            disabled={loading}
                        >
                            <span>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            </span>
                            Take Photo
                        </button>
                    </div>
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
                        📸 Or take a photo of your notes with the camera!
                        <br />
                        Will automatically perform OCR on image-based content using Tesseract.js
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <video
                            ref={videoRef}
                            className="w-full max-w-md h-auto rounded-lg border-2 border-gray-300"
                            autoPlay
                            playsInline
                            muted
                        />
                        
                        {/* Camera overlay for better UX */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-4 left-4 right-4 text-white bg-black bg-opacity-50 p-2 rounded text-sm text-center">
                                Position your notes clearly in the frame
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={capturePhoto}
                            className="btn btn-primary px-8 py-3 text-lg flex items-center gap-2"
                            disabled={loading}
                        >
                            <span>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg> 
                            </span> 
                            Capture
                        </button>
                        
                        <button 
                            onClick={stopCamera}
                            className="btn btn-outline px-6 py-3 bg-red-400"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FileUpload;