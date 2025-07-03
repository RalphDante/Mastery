import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
// mammoth will be loaded from CDN
import { useState, useEffect } from 'react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function FileUpload({ onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState(null);

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
        return new Promise((resolve, reject) => {
            // Check if mammoth is available from CDN
            if (typeof window.mammoth === 'undefined') {
                // Load mammoth from CDN if not available
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.2/mammoth.browser.min.js';
                script.onload = () => {
                    processDOCX();
                };
                script.onerror = () => reject(new Error('Failed to load mammoth library'));
                document.head.appendChild(script);
            } else {
                processDOCX();
            }
            
            function processDOCX() {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const arrayBuffer = event.target.result;
                        const result = await window.mammoth.extractRawText({ arrayBuffer });
                        resolve(result.value);
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            }
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

    const startCamera = async () => {
        try {
            setStatus('Starting camera...');
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                } 
            });
            setStream(mediaStream);
            setShowCamera(true);
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
    };

    const capturePhoto = () => {
        const video = document.getElementById('camera-video');
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

    // Cleanup camera when component unmounts
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    const sendToAI = async (text) => {
        try {
            console.log('Text being sent to AI:', text.substring(0, 500) + '...'); // Debug log (first 500 chars)
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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
                            📸 Take Photo
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
                            id="camera-video"
                            ref={(video) => {
                                if (video && stream) {
                                    video.srcObject = stream;
                                    video.play();
                                }
                            }}
                            className="max-w-full max-h-96 rounded-lg border-2 border-gray-300"
                            autoPlay
                            playsInline
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
                            📸 Capture
                        </button>
                        
                        <button 
                            onClick={stopCamera}
                            className="btn btn-outline px-6 py-3"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                    
                    <div className="text-xs text-gray-500 text-center max-w-md">
                        Make sure your notes are well-lit and clearly visible for best OCR results
                    </div>
                </div>
            )}
        </div>
    );
}

export default FileUpload;