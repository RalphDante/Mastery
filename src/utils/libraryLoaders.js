// libraryLoaders.js

export const loadTesseract = () => {
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

export const loadMammoth = () => {
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

// Alternative: Load JSZip and XML parser for manual PPTX parsing
export const loadJSZip = () => {
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