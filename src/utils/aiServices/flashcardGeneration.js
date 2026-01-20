// flashcardGeneration.js
import { generateAIContent } from '../subscriptionLimits/aiLimitsHelper'; // Add this import


const parseAndValidateAIResponse = (aiResponse) => {
    const extractAndCleanJSON = (text) => {
        let jsonText = text;
        
        // Remove markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1].trim();
        }
        
        // Find JSON object bounds
        const startIndex = jsonText.indexOf('{');
        const lastIndex = jsonText.lastIndexOf('}');
        
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

    const cleanJSON = extractAndCleanJSON(aiResponse);
    
    // Parse the response
    let parsedResponse;
    try {
        parsedResponse = JSON.parse(cleanJSON);
    } catch (parseError) {
        console.error('JSON parse error:', parseError);
        
        // Try to fix common JSON issues
        let fixedJSON = cleanJSON;
        fixedJSON = fixedJSON.replace(/,(\s*[}\]])/g, '$1');
        fixedJSON = fixedJSON.replace(/}(\s*){/g, '},$1{');
        fixedJSON = fixedJSON.replace(/,,+/g, ',');
        
        try {
            parsedResponse = JSON.parse(fixedJSON);
        } catch (secondParseError) {
            // Fallback: extract flashcards manually
            const flashcardMatches = cleanJSON.match(/{"question":\s*"[^"]*",\s*"answer":\s*"[^"]*"}/g);
            if (flashcardMatches && flashcardMatches.length > 0) {
                parsedResponse = {
                    deckName: `Flashcard Deck ${new Date().toLocaleDateString()}`,
                    flashcards: flashcardMatches.map(match => {
                        try {
                            return JSON.parse(match);
                        } catch (e) {
                            return null;
                        }
                    }).filter(card => card !== null)
                };
            } else {
                throw new Error('Could not extract flashcards from response');
            }
        }
    }

    // Validate the response structure
    if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
        throw new Error('AI response missing flashcards array');
    }

    // Validate individual flashcards
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

    const validFlashCards = parsedResponse.flashcards.filter(validateFlashcard);

    if (validFlashCards.length === 0) {
        throw new Error('No valid flashcards were generated');
    }

    // Get deck name or use fallback
    let deckName = parsedResponse.deckName || `Flashcard Deck ${new Date().toLocaleDateString()}`;
    
    // Clean up deck name
    deckName = deckName
        .replace(/^["']|["']$/g, '')
        .replace(/\n/g, ' ')
        .substring(0, 50)
        .trim();

    return {
        flashcards: validFlashCards,
        deckName: deckName
    };
};

const generateFlashcardsFromText = async (text, user, isTopicGeneration = false) => {
    if (!user?.uid) {
        throw new Error('User not authenticated');
    }

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('Groq API key not configured');
    }

    // Determine flashcard count and prompt based on type
    let flashcardCount;
    let promptText;

    if (isTopicGeneration) {
        flashcardCount = 25;
        promptText = `Create ${flashcardCount} educational flashcards about "${text}" AND a descriptive deck name.

                    CRITICAL: Return ONLY a valid JSON object with this EXACT format:
                    {
                    "deckName": "Short descriptive name (max 50 chars)",
                    "flashcards": [
                        {"question": "Your question here", "answer": "Your answer here"}
                    ]
                    }

                    REQUIREMENTS:
                    - deckName should be descriptive (e.g., "World War II: Key Events")
                    - Exactly ${flashcardCount} flashcards
                    - Questions should be clear, specific, and educational
                    - Answers should be concise but complete
                    - Use proper JSON escaping
                    - No line breaks within strings
                    - Double quotes only

                    Topic: ${text}`;
    } else {
        // File/image upload generation
        
        // Check if this is a CSV with specific row count request
        const csvMatch = text.match(/Total rows: (\d+)/);
        
        if (csvMatch && text.includes('CSV FILE - CONVERT TO FLASHCARDS')) {
            // CSV file - use exact row count
            flashcardCount = parseInt(csvMatch[1]);
            
            promptText = `You are converting a CSV file to flashcards.
    
                        CRITICAL RULES:
                        1. Create EXACTLY ${flashcardCount} flashcards - one for each row in the CSV
                        2. Do NOT generate extra flashcards or additional questions
                        3. Convert each row directly into a flashcard
                        4. If a row has 2 columns, use them as question/answer
                        5. If a row has more columns, intelligently create a question and answer from all the data
                        
                        Return ONLY a valid JSON object with this EXACT format:
                        {
                        "deckName": "Short descriptive name based on the CSV content (max 50 chars)",
                        "flashcards": [
                            {"question": "Your question here", "answer": "Your answer here"}
                        ]
                        }
                        
                        FORMATTING REQUIREMENTS:
                        - Return ONLY valid JSON (no explanations, no markdown, no code blocks)
                        - Use proper JSON escaping
                        - Exactly ${flashcardCount} flashcards
                        - Double quotes only
                        
                        CSV Data to convert:
                        ${text}`;
                            } else {
                                // Regular file - use existing logic
                                const estimateFlashcardCount = (textLength) => {
                                    if (textLength < 500) return 15;
                                    if (textLength < 1500) return 30;
                                    if (textLength < 3000) return 50;
                                    if (textLength < 5000) return 75;
                                    return 100;
                                };
                                
                                flashcardCount = estimateFlashcardCount(text.length);
                                
                                promptText = `You are an expert educational content creator. Create ${flashcardCount} high-quality flashcards AND a deck name from the provided text.
                        
                        CRITICAL: Return ONLY a valid JSON object with this EXACT format:
                        {
                        "deckName": "Short descriptive name (max 50 chars)",
                        "flashcards": [
                            {"question": "Your question here", "answer": "Your answer here"}
                        ]
                        }
                        
                        FLASHCARD QUALITY GUIDELINES:
                        - Questions should test understanding, not just memorization
                        - Use varied question types: definitions, examples, applications, comparisons, cause-and-effect
                        - Questions should be specific and unambiguous
                        - Answers should be concise but complete (1-3 sentences typically)
                        - Include both factual recall AND conceptual understanding questions
                        - For complex topics, break them into smaller, focused questions
                        - Use clear, direct language
                        - Avoid overly obvious or trivial questions
                        
                        DECK NAME GUIDELINES:
                        - Should summarize the main topic/subject
                        - Max 50 characters
                        - No quotes or special formatting
                        - Examples: "Cell Biology: Mitosis", "World War II Overview", "Python Functions & Loops"
                        
                        FORMATTING REQUIREMENTS:
                        - Return ONLY a valid JSON object (no explanations, no markdown, no code blocks)
                        - Use proper JSON escaping for quotes
                        - No line breaks within strings
                        - Exactly ${flashcardCount} flashcards
                        - Double quotes only
                        
                        Text to process: ${text}`;
        }
    }

    // Create AI function for generateAIContent helper using Groq
    const aiFunction = async () => {
        const response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile', // Fast and good at following instructions
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert educational content creator that produces high-quality flashcards in valid JSON format. You always return pure JSON without any markdown formatting or code blocks.'
                        },
                        {
                            role: 'user',
                            content: promptText
                        }
                    ],
                    temperature: 0.7, // Balanced creativity
                    max_tokens: 4000, // Enough for many flashcards
                    top_p: 0.9
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Groq API request failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response from Groq API');
        }
        
        return data.choices[0].message.content;
    };

    // Use the AI limits helper
    const result = await generateAIContent(text, user.uid, aiFunction);
    
    // Parse and validate the response
    const parsedData = parseAndValidateAIResponse(result.data);
    
    console.log(`Generated ${parsedData.flashcards.length} flashcards with deck name: "${parsedData.deckName}"`);
    
    if (result.usage.remaining !== 'unlimited') {
        console.log(`AI generations remaining: ${result.usage.remaining}`);
    }
    
    return parsedData;
};





export { generateFlashcardsFromText, parseAndValidateAIResponse };