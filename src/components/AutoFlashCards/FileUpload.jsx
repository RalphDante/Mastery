import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext'; // Add this import
import { generateAIContent } from '../../utils/subscriptionLimits/aiLimitsHelper'; // Add this import

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function FileUpload({ cameraIsOpen, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
    const navigate = useNavigate();
    const [topic, setTopic] = useState("");
    
    // Add auth context
    const { user } = useAuthContext();

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
                
                // Handle limit reached error specifically
                if (error.code === 'LIMIT_REACHED') {
                    const details = error.details;
                    alert(`You've reached your monthly limit of ${details.maxGenerations} AI generations. ${
                        details.tier === 'free' 
                            ? 'Upgrade to Pro for unlimited generations!' 
                            : `Your limit resets on ${details.resetDate?.toLocaleDateString()}.`
                    }`);
                } else {
                    alert(`Error processing file: ${error.message}`);
                }
            } finally {
                setLoading(false);
                setStatus('');
            }
        }
    });

    // [Keep all the existing file reading functions unchanged - readPDF, readDOCX, readPPTX, etc.]
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
                
                // Handle limit reached error specifically
                if (error.code === 'LIMIT_REACHED') {
                    const details = error.details;
                    alert(`You've reached your monthly limit of ${details.maxGenerations} AI generations. ${
                        details.tier === 'free' 
                            ? 'Upgrade to Pro for unlimited generations!' 
                            : `Your limit resets on ${details.resetDate?.toLocaleDateString()}.`
                    }`);
                } else {
                    alert(`Error processing photo: ${error.message}`);
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

    // Remove the old retryWithBackoff function as it's now handled in generateAIContent
    
    // Updated handleGenerateOnTopic function with AI limits
    const handleGenerateOnTopic = async () => {
        // Validate that a topic has been entered
        if (!topic.trim()) {
            alert('Please enter a topic first');
            return;
        }

        if (!user?.uid) {
            alert('Please log in to generate flashcards');
            return;
        }
    
        setLoading(true);
        setStatus('Generating flashcards for topic...');
    
        // Define the AI generation function
        const topicAIFunction = async (prompt) => {
            console.log('Generating flashcards for topic:', topic);
            
            // Check if API key is available
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('VITE_GEMINI_API_KEY environment variable is not set');
            }
    
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a flashcard generator. Create exactly 25 educational flashcards about "${topic}".
    
                            CRITICAL: Return ONLY a valid JSON array. No explanations, no markdown, no code blocks.
                            
                            Format: [{"question":"Your question here","answer":"Your answer here"}]
                            
                            Requirements:
                            - Questions should be clear, specific, and educational
                            - Answers should be concise but complete and accurate
                            - Use proper JSON escaping for quotes (use \\" for quotes inside strings)
                            - No line breaks within strings
                            - Exactly 25 flashcards
                            - Double quotes only, no single quotes
                            - Cover different aspects and difficulty levels of the topic
                            - Include definitions, examples, processes, and key concepts
                            - Make questions that would help someone learn about "${topic}"
                            
                            Topic: ${topic}`
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
            // Use the helper function to handle limits and generation
            const result = await generateAIContent(topic, user.uid, topicAIFunction);
            const flashCardsText = result.data;
            
            console.log('Raw AI response for topic:', flashCardsText);
            
            // Use the existing JSON extraction and cleaning logic
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
                    .replace(/\\(?!["\\/bfnrt])/g, '\\\\')
                    .replace(/\\\\_/g, '_')
                    .replace(/\\'/g, "'")
                    .replace(/\n/g, ' ')
                    .replace(/\r/g, ' ')
                    .replace(/\t/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                return jsonText;
            };
    
            const cleanJSON = extractAndCleanJSON(flashCardsText);
            console.log('Cleaned JSON for topic:', cleanJSON);
            
            // Try parsing with error handling
            let parsedFlashCards;
            try {
                parsedFlashCards = JSON.parse(cleanJSON);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                
                // Try to fix common JSON issues
                let fixedJSON = cleanJSON;
                fixedJSON = fixedJSON.replace(/,(\s*[}\]])/g, '$1');
                fixedJSON = fixedJSON.replace(/}(\s*){/g, '},$1{');
                fixedJSON = fixedJSON.replace(/,,+/g, ',');
                
                try {
                    parsedFlashCards = JSON.parse(fixedJSON);
                } catch (secondParseError) {
                    // Manual extraction as fallback
                    const flashcardMatches = cleanJSON.match(/{"question":\s*"[^"]*",\s*"answer":\s*"[^"]*"}/g);
                    if (flashcardMatches && flashcardMatches.length > 0) {
                        parsedFlashCards = flashcardMatches.map(match => {
                            try {
                                return JSON.parse(match);
                            } catch (e) {
                                return null;
                            }
                        }).filter(card => card !== null);
                    } else {
                        throw new Error('Could not extract flashcards from response');
                    }
                }
            }
    
            // Validate the result
            if (!Array.isArray(parsedFlashCards)) {
                throw new Error('AI response is not an array of flashcards');
            }
    
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
    
            const validFlashCards = parsedFlashCards.filter(validateFlashcard);
    
            if (validFlashCards.length === 0) {
                throw new Error('No valid flashcards were generated');
            }
    
            console.log(`Generated ${validFlashCards.length} valid flashcards for topic: ${topic}`);
            
            // Show usage info
            if (result.usage.remaining !== 'unlimited') {
                console.log(`AI generations remaining: ${result.usage.remaining}`);
            }
            
            // Clear the topic input after successful generation
            setTopic('');
            
            // Call the success callback with the generated flashcards
            onSuccess(validFlashCards);
    
        } catch (error) {
            console.error("Error generating flashcards for topic:", error);
            
            // Handle limit reached error specifically
            if (error.code === 'LIMIT_REACHED') {
                const details = error.details;
                alert(`You've reached your monthly limit of ${details.maxGenerations} AI generations. ${
                    details.tier === 'free' 
                        ? 'Upgrade to Pro for unlimited generations!' 
                        : `Your limit resets on ${details.resetDate?.toLocaleDateString()}.`
                }`);
            } else {
                alert(`Error generating flashcards for topic "${topic}": ${error.message}`);
            }
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    // Updated sendToAI function with AI limits
    const sendToAI = async (text) => {
        if (!user?.uid) {
            alert('Please log in to generate flashcards');
            return;
        }

        // Define the AI generation function
        const fileAIFunction = async (prompt) => {
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
            // Use the helper function to handle limits and generation
            const result = await generateAIContent(text, user.uid, fileAIFunction);
            const flashCardsText = result.data;
            
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
            
            // Show usage info
            if (result.usage.remaining !== 'unlimited') {
                console.log(`AI generations remaining: ${result.usage.remaining}`);
            }
            
            onSuccess(validFlashCards);
    
        } catch (error) {
            console.error("There was an error:", error);
            throw error; // Re-throw to be handled by the calling function
        }
    };

    return (
        <div className="w-full">
            {!showCamera ? (
                <div className="space-y-8">
                    {/* Main Topic Input - Made much more prominent */}
                    <div className="relative">
                        <textarea
                            id="topic-input"
                            className="w-full h-20 p-4 pr-14 bg-gray-700 bg-opacity-70 text-gray-100 rounded-lg focus:outline-none border border-gray-600 placeholder-gray-400 resize-none text-lg scrollbar-hide"
                            placeholder="Enter any topic you want to study... (e.g., World War II, Photosynthesis)"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            rows={2}
                        />
                        <button
                            type="submit"
                            className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                                topic.length === 0 ? 'opacity-30' : 'opacity-100 hover:bg-purple-700'
                            } bg-purple-600 text-white p-3 rounded-lg transition-all duration-200`}
                            aria-label="Generate"
                            onClick={handleGenerateOnTopic}
                            disabled={topic.length === 0}
                        >
                            <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="text-center" style={{ marginTop: '-0.1rem' }}>
                        <button 
                            onClick={() => navigate('/browse-decks')}
                            className="text-purple-400 hover:text-purple-300 text-sm font-medium inline-flex items-center gap-2 transition-colors duration-200"
                        >
                            💡 Need inspiration? →
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-gray-600"></div>
                        <span className="text-gray-400 text-sm font-medium">OR UPLOAD YOUR NOTES</span>
                        <div className="flex-1 h-px bg-gray-600"></div>
                    </div>

                    {/* Upload Options - More prominent */}
                    <div className="grid grid-cols-2 gap-4">
                        
                        
                        <button 
                            onClick={startCamera}
                            className={`${
                                loading ? 'btn-disabled cursor-not-allowed' : 'btn-primary hover:scale-105'
                            } h-14 px-6 py-4 rounded-lg flex items-center justify-center gap-3 text-lg font-medium transition-all duration-200`}
                            disabled={loading}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Take Photo
                        </button>

                        <button 
                            {...getRootProps()} 
                            className={`${
                                loading ? 'btn-disabled cursor-not-allowed' : 'btn-secondary hover:scale-105'
                            } h-14 px-6 py-4 rounded-lg flex items-center justify-center gap-3 text-lg font-medium transition-all duration-200`}
                            disabled={loading}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            {loading ? 'Processing...' : 'Upload File'}
                        </button>
                    </div>

                    <input {...getInputProps()} />
                    
                    {/* Status indicator */}
                    {status && (
                        <div className="bg-blue-500 bg-opacity-20 border border-blue-500 rounded-lg p-3">
                            <div className="text-sm text-blue-200 flex items-center gap-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                                <span className="font-medium">{status}</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Condensed file format info */}
                    <div className="bg-gray-800 bg-opacity-50 rounded-lg">
                        <div className="text-xs text-gray-400 text-center">
                            <div className="font-medium text-gray-300 mb-1">✨ Supported formats:</div>
                            <div>PDF, DOCX, PPTX, TXT, Images (PNG, JPG) • Auto OCR included</div>
                        </div>
                    </div>
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
    );
}

export default FileUpload;