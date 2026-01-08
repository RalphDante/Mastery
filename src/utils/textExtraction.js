// textExtraction.js

// Helper function to extract text from slide XML
export const extractTextFromSlideXML = (xmlString) => {
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
export const extractTextWithRegex = (xmlString) => {
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
export const decodeHtmlEntities = (text) => {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
};

