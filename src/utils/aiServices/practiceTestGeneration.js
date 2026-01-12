// src/utils/aiServices/practiceTestGeneration.js - WITH AUTO-FIX

import { generateAIContent } from '../subscriptionLimits/aiLimitsHelper';

const env = import.meta.env.VITE_PADDLE_ENVIRONMENT || "sandbox";

const GROQ_API_KEY = env === "production" 
  ? import.meta.env.VITE_GROQ_API_KEY
  : import.meta.env.VITE_SANDBOX_GROQ_API_KEY


/**
 * Generates a practice test from flashcards using AI
 * @param {Array} flashcards - Array of flashcard objects with question/answer
 * @param {Object} config - { type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'mixed', count: number }
 * @param {Object} user - User object with uid
 * @returns {Promise<Object>} - { questions: [...] }
 */
export const generatePracticeTest = async (flashcards, config, user) => {
  if (!user?.uid) {
    throw new Error('User not authenticated');
  }

  if (!flashcards || flashcards.length === 0) {
    throw new Error('No flashcards available to generate test');
  }

  // Filter out image-based flashcards (AI can't process them)
  const textFlashcards = flashcards.filter(card => 
    card.question_type === 'text' && card.answer_type === 'text'
  );

  if (textFlashcards.length === 0) {
    throw new Error('No text-based flashcards available. Practice tests require text flashcards.');
  }

  if (config.count > textFlashcards.length) {
    throw new Error(`Cannot generate ${config.count} questions from only ${textFlashcards.length} text-based flashcards. Try reducing the count or adding more flashcards.`);
  }

  // ⭐ IMPROVED: Format flashcards with better structure
  const flashcardsText = formatFlashcardsForAI(textFlashcards);
  
  // Get appropriate prompt based on test type
  const promptText = getPromptForTestType(config, flashcardsText, textFlashcards.length);

  console.log(`📝 Formatting ${textFlashcards.length} flashcards for AI...`);
  console.log(`🎯 Generating ${config.count} ${config.type} questions...`);

  // Create AI function for Groq API
  const aiFunction = async () => {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at creating educational practice tests. You MUST base your questions DIRECTLY on the provided flashcards. You always return valid JSON without markdown formatting or code blocks.'
            },
            {
              role: 'user',
              content: promptText
            }
          ],
          temperature: 0.7, // ⭐ Lowered from 0.8 to stay closer to source material
          max_tokens: 2000,
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

  // Use AI limits helper (reuses your existing limit tracking)
  const result = await generateAIContent(flashcardsText, user.uid, aiFunction);
  
  // Parse and validate the AI response
  const parsedData = parseTestQuestionsResponse(result.data);
  
  // Attach original flashcard IDs and metadata
  const questionsWithIds = attachFlashcardIds(parsedData.questions, textFlashcards);
  
  console.log(`✅ Generated ${questionsWithIds.length} ${config.type} questions`);
  
  if (result.usage.remaining !== 'unlimited') {
    console.log(`AI generations remaining: ${result.usage.remaining}`);
  }
  
  return { 
    questions: questionsWithIds,
    testType: config.type,
    totalQuestions: questionsWithIds.length
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * ⭐ IMPROVED: Formats flashcards with numbered structure
 */
const formatFlashcardsForAI = (flashcards) => {
  return flashcards.map((card, idx) => {
    return `[FLASHCARD ${idx + 1}]
Question: ${card.question}
Answer: ${card.answer}`;
  }).join('\n\n');
};

/**
 * ⭐ IMPROVED: Returns the appropriate prompt based on test type
 */
const getPromptForTestType = (config, flashcardsText, totalCards) => {
  const baseRequirements = `
⚠️ CRITICAL REQUIREMENTS:
1. You MUST use the EXACT content from the flashcards provided below
2. DO NOT make up new questions - transform the flashcard content into test questions
3. Each test question should directly relate to one of the flashcards
4. The answers should match or be very close to the flashcard answers

FORMATTING:
- Use proper JSON formatting (double quotes only)
- No markdown, no code blocks, just pure JSON
- Return ONLY the JSON object, nothing else

QUALITY:
- Questions should test the same knowledge as the flashcards
- Make questions clear and unambiguous
- Ensure correct answers match the flashcard content
`;

  // MIXED MODE - AI picks best type for each question
  if (config.type === 'mixed') {
    return `You have ${totalCards} flashcards. Create ${config.count} practice test questions using a MIX of question types (multiple choice, true/false, and fill in the blank).

⭐ IMPORTANT: Each question MUST be based on one of the flashcards below. Use the flashcard's question and answer to create a test question.

Return ONLY this JSON format:
{
  "questions": [
    {
      "question": "Your question text here",
      "answer": "The correct answer",
      "type": "multiple_choice",
      "choices": ["Answer 1", "Answer 2", "Answer 3", "Answer 4"]
    }
  ]
}

REQUIREMENTS:
- Generate exactly ${config.count} questions
- Use a variety of types: "multiple_choice", "true_false", "fill_blank"
- Choose the question type that BEST tests each flashcard concept:
  * multiple_choice: Good for comparing options or testing distinctions
  * true_false: Good for testing statements and misconceptions
  * fill_blank: Good for testing key terms and definitions
- Aim for roughly equal distribution of types
- For multiple_choice: Provide 4 choices, randomize correct answer position
- For true_false: Create a statement based on the flashcard, answer must be "true" or "false"
- For fill_blank: Use "___" as the blank placeholder (or we'll add it automatically)
${baseRequirements}

FLASHCARDS TO USE:
${flashcardsText}

Remember: Each question MUST be based directly on one of the flashcards above!`;
  }
  
  // MULTIPLE CHOICE ONLY
  if (config.type === 'multiple_choice') {
    return `You have ${totalCards} flashcards. Create ${config.count} multiple choice questions.

⭐ IMPORTANT: Each question MUST be based on one of the flashcards below. Transform the flashcard into a multiple choice question.

Return ONLY this JSON format:
{
  "questions": [
    {
      "question": "Your question text here",
      "answer": "The correct answer",
      "type": "multiple_choice",
      "choices": ["Correct answer", "Wrong 1", "Wrong 2", "Wrong 3"]
    }
  ]
}

REQUIREMENTS:
- Generate exactly ${config.count} multiple choice questions
- Each question MUST be derived from one of the flashcards
- Each question must have exactly 4 choices
- The correct answer must appear in the choices array
- Randomize the position of the correct answer (don't always put it first)
- Make wrong answers (distractors) plausible but clearly incorrect
- Wrong answers should test common misconceptions
${baseRequirements}

FLASHCARDS TO USE:
${flashcardsText}

Example transformation:
Flashcard: "Q: What is the capital of France? A: Paris"
→ Test Question: "What is the capital of France?" 
   Choices: ["London", "Paris", "Berlin", "Rome"]
   Answer: "Paris"`;
  }
  
  // TRUE/FALSE ONLY
  if (config.type === 'true_false') {
    return `You have ${totalCards} flashcards. Create ${config.count} true/false questions.

⭐ IMPORTANT: Each question MUST be based on one of the flashcards below. Turn the flashcard into a true/false statement.

⚠️ CRITICAL: True/false questions MUST be STATEMENTS, not questions!
❌ WRONG: "Why is creating a budget important?" (This is a question)
❌ WRONG: "What is the capital of France?" (This is a question)
❌ WRONG: "How does photosynthesis work?" (This is a question)
✅ CORRECT: "Creating a budget helps manage finances effectively" (This is a statement)
✅ CORRECT: "Paris is the capital of France" (This is a statement)
✅ CORRECT: "Photosynthesis occurs in plant cells" (This is a statement)

Return ONLY this JSON format:
{
  "questions": [
    {
      "question": "Statement to evaluate as true or false",
      "answer": "true",
      "type": "true_false"
    }
  ]
}

REQUIREMENTS:
- Generate exactly ${config.count} true/false questions
- Each statement MUST be derived from one of the flashcards
- The "question" field MUST contain a STATEMENT, NOT a question
- NO question words allowed: Do NOT use "why", "what", "how", "when", "where", "who"
- Answer must be either "true" or "false" (lowercase)
- Create a mix of true and false statements (roughly 50/50 split)
- For TRUE statements: Convert flashcard information into a factual statement
- For FALSE statements: Create a statement that contradicts the flashcard
- Make statements clear and unambiguous
- Avoid trick questions or overly complex statements
${baseRequirements}

FLASHCARDS TO USE:
${flashcardsText}

Example transformations:
Flashcard: "Q: What is H2O? A: Water"
→ TRUE statement: "H2O is the chemical formula for water" (answer: "true")
→ FALSE statement: "H2O is the chemical formula for carbon dioxide" (answer: "false")

Flashcard: "Q: Why is exercise important? A: It improves health"
→ TRUE statement: "Exercise improves overall health" (answer: "true")
→ FALSE statement: "Exercise has no effect on health" (answer: "false")

Flashcard: "Q: When did WWII end? A: 1945"
→ TRUE statement: "World War II ended in 1945" (answer: "true")
→ FALSE statement: "World War II ended in 1939" (answer: "false")`;
  }
  
  // FILL IN THE BLANK ONLY
  if (config.type === 'fill_blank') {
    return `You have ${totalCards} flashcards. Create ${config.count} fill in the blank questions.

⭐ IMPORTANT: Each question MUST be based on one of the flashcards below. Turn the flashcard into a fill-in-the-blank question.

Return ONLY this JSON format:
{
  "questions": [
    {
      "question": "The ___ is the powerhouse of the cell",
      "answer": "mitochondria",
      "type": "fill_blank"
    }
  ]
}

REQUIREMENTS:
- Generate exactly ${config.count} fill in the blank questions
- Each question MUST be derived from one of the flashcards
- Ideally use "___" to indicate the blank, but if you forget we'll add it automatically
- Place the blank where the flashcard's answer would go
- The answer should be the flashcard's answer (or a close variation)
- Provide enough context in the question for the answer to be clear
${baseRequirements}

FLASHCARDS TO USE:
${flashcardsText}

Example transformation:
Flashcard: "Q: What is the powerhouse of the cell? A: Mitochondria"
→ Test Question: "The ___ is known as the powerhouse of the cell"
   Answer: "mitochondria"`;
  }
  
  throw new Error(`Unknown test type: ${config.type}`);
};

/**
 * Parses and validates the AI response
 * Returns cleaned question objects
 */
const parseTestQuestionsResponse = (aiResponse) => {
  // Extract and clean JSON (reuse pattern from flashcard generation)
  const extractAndCleanJSON = (text) => {
    let jsonText = text;
    
    // Remove markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }
    
    // Find JSON object boundaries
    const startIndex = jsonText.indexOf('{');
    const lastIndex = jsonText.lastIndexOf('}');
    
    if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
      jsonText = jsonText.substring(startIndex, lastIndex + 1);
    }
    
    // Clean up common JSON issues
    jsonText = jsonText
      .replace(/\\(?!["\\/bfnrt])/g, '\\\\')
      .replace(/\\\\_/g, '_')
      .replace(/\\'/g, "'")
      .trim();
    
    return jsonText;
  };

  const cleanJSON = extractAndCleanJSON(aiResponse);
  
  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(cleanJSON);
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Attempted to parse:', cleanJSON.substring(0, 200));
    throw new Error('Failed to parse AI response. Please try again.');
  }

  // Validate top-level structure
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('AI response missing valid questions array');
  }

  // Validate and filter individual questions
  const validQuestions = parsed.questions.filter(q => {
    // Check required fields
    if (!q.question || !q.answer || !q.type) {
      console.warn('❌ Question missing required fields:', q);
      return false;
    }
    
    // Validate by type
    if (q.type === 'multiple_choice') {
      if (!q.choices || !Array.isArray(q.choices) || q.choices.length !== 4) {
        console.warn('❌ Multiple choice missing valid choices:', q);
        return false;
      }
      // Check if correct answer is in choices
      if (!q.choices.includes(q.answer)) {
        console.warn('❌ Multiple choice answer not in choices:', q);
        return false;
      }
    }
    
    if (q.type === 'true_false') {
      if (q.answer !== 'true' && q.answer !== 'false') {
        console.warn('❌ True/false has invalid answer:', q);
        return false;
      }
      
      // Check if it's a question instead of a statement
      const questionWords = ['why', 'what', 'how', 'when', 'where', 'who', 'which', 'whose', 'whom'];
      const firstWord = q.question.trim().split(' ')[0].toLowerCase();
      const hasQuestionMark = q.question.includes('?');
      
      if (questionWords.includes(firstWord) || hasQuestionMark) {
        console.warn('❌ True/false is a question, not a statement:', q.question);
        return false;
      }
    }
    
    // ⭐ UPDATED: Auto-fix missing blanks instead of rejecting
    if (q.type === 'fill_blank') {
      if (!q.question.includes('___')) {
        console.warn('⚠️ Fill blank missing "___", auto-fixing:', q.question);
        // Auto-fix: Add blank at the end
        q.question = q.question.trim() + ' ___';
        console.log('✅ Fixed to:', q.question);
      }
    }
    
    return true;
  });

  if (validQuestions.length === 0) {
    throw new Error('No valid questions were generated. Please try again.');
  }

  console.log(`✅ Validated ${validQuestions.length} questions`);

  return { questions: validQuestions };
};

/**
 * ⭐ IMPROVED: Attaches flashcard IDs with better matching
 */
const attachFlashcardIds = (questions, flashcards) => {
  return questions.map((question, index) => {
    // Try to find matching source flashcard by content similarity
    const matchingCard = flashcards.find(card => {
      // Check if question contains keywords from flashcard question
      const questionLower = question.question.toLowerCase();
      const cardQuestionLower = card.question.toLowerCase();
      const cardAnswerLower = card.answer.toLowerCase();
      
      // Simple keyword matching
      const hasQuestionKeywords = cardQuestionLower.split(' ')
        .filter(word => word.length > 3) // Only significant words
        .some(word => questionLower.includes(word));
      
      const hasAnswerKeywords = cardAnswerLower.split(' ')
        .filter(word => word.length > 3)
        .some(word => questionLower.includes(word));
      
      return hasQuestionKeywords || hasAnswerKeywords;
    });
    
    // Build final question object with all metadata
    return {
      id: `q_${Date.now()}_${index}`, // Unique ID for React keys
      sourceCardId: matchingCard?.id || null, // Link back to original flashcard
      type: question.type,
      question: question.question,
      answer: question.answer,
      choices: question.choices || undefined, // Only for multiple choice
      
      // User response tracking
      userAnswer: null, // Will be filled when user answers
      isCorrect: null, // Will be calculated after user answers
      
      // Metadata
      points: 10,
      order: index + 1
    };
  });
};