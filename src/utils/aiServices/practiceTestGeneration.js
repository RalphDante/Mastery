// src/utils/aiServices/practiceTestGeneration.js

// OBJECT STRUCTURES

// MULTIPLE CHOICE
// {
//   id: "q_1704729600000_0",           // Unique ID
//   sourceCardId: "card_abc123",        // Original flashcard ID (if matched)
//   type: "multiple_choice",
//   question: "What is the powerhouse of the cell?",
//   answer: "Mitochondria",
//   choices: [
//     "Nucleus",
//     "Mitochondria",      // Correct answer in random position
//     "Ribosome",
//     "Golgi Apparatus"
//   ],
//   userAnswer: null,      // User's selected answer (filled after answering)
//   isCorrect: null,       // Boolean (calculated after answering)
//   points: 10,
//   order: 1
// }

// TRUE OR FALSE
// {
//   id: "q_1704729600000_2",
//   sourceCardId: "card_ghi789",
//   type: "fill_blank",
//   question: "The ___ is known as the powerhouse of the cell",
//   answer: "mitochondria",
//   userAnswer: null,      // User's typed answer
//   isCorrect: null,
//   points: 10,
//   order: 3
// }

// FILL IN THE BLANK
// {
//   id: "q_1704729600000_2",
//   sourceCardId: "card_ghi789",
//   type: "fill_blank",
//   question: "The ___ is known as the powerhouse of the cell",
//   answer: "mitochondria",
//   userAnswer: null,      // User's typed answer
//   isCorrect: null,
//   points: 10,
//   order: 3
// }

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

  if (config.count > flashcards.length) {
    throw new Error(`Cannot generate ${config.count} questions from only ${flashcards.length} flashcards`);
  }

  // Format flashcards for AI (handle text and image types)
  const flashcardsText = formatFlashcardsForAI(flashcards);
  
  // Get appropriate prompt based on test type
  const promptText = getPromptForTestType(config, flashcardsText);

  console.log(`Generating ${config.count} ${config.type} questions...`);

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
              content: 'You are an expert at creating educational practice tests. You always return valid JSON without markdown formatting or code blocks.'
            },
            {
              role: 'user',
              content: promptText
            }
          ],
          temperature: 0.8, // Higher for variety in questions
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
  const questionsWithIds = attachFlashcardIds(parsedData.questions, flashcards);
  
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
 * Formats flashcards into text for AI prompt
 * Handles both text and image content types
 */
const formatFlashcardsForAI = (flashcards) => {
  return flashcards.map((card, idx) => {
    let cardText = `Card ${idx + 1}:`;
    
    // Handle question (text or image)
    if (card.question_type === 'text') {
      cardText += `\nQ: ${card.question}`;
    } else if (card.question_type === 'image') {
      cardText += `\nQ: [Image-based question]`;
      // Note: AI can't see images, so we skip image questions
    }
    
    // Handle answer (text or image)
    if (card.answer_type === 'text') {
      cardText += `\nA: ${card.answer}`;
    } else if (card.answer_type === 'image') {
      cardText += `\nA: [Image-based answer]`;
      // Skip image answers for now
    }
    
    return cardText;
  }).join('\n\n');
};

/**
 * Returns the appropriate prompt based on test type
 */
const getPromptForTestType = (config, flashcardsText) => {
  const baseRequirements = `
FORMATTING:
- Use proper JSON formatting (double quotes only)
- No markdown, no code blocks, just pure JSON
- Return ONLY the JSON object, nothing else

QUALITY:
- Questions should test understanding, not just recall
- Make questions clear and unambiguous
- Ensure correct answers are actually correct
`;

  // MIXED MODE - AI picks best type for each question
  if (config.type === 'mixed') {
    return `Create ${config.count} practice test questions using a MIX of question types (multiple choice, true/false, and fill in the blank).

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
- Choose the question type that BEST tests each concept:
  * multiple_choice: Good for comparing options or testing distinctions
  * true_false: Good for testing statements and misconceptions
  * fill_blank: Good for testing key terms and definitions
- Aim for roughly equal distribution of types
- For multiple_choice: Provide 4 choices, randomize correct answer position
- For true_false: Create a statement, answer must be "true" or "false"
- For fill_blank: Use "___" as the blank placeholder
${baseRequirements}

Flashcards to base questions on:
${flashcardsText}`;
  }
  
  // MULTIPLE CHOICE ONLY
  if (config.type === 'multiple_choice') {
    return `Create ${config.count} multiple choice questions from these flashcards.

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
- Each question must have exactly 4 choices
- The correct answer must appear in the choices array
- Randomize the position of the correct answer (don't always put it first)
- Make wrong answers (distractors) plausible but clearly incorrect
- Wrong answers should test common misconceptions
${baseRequirements}

Flashcards:
${flashcardsText}`;
  }
  
  // TRUE/FALSE ONLY
  if (config.type === 'true_false') {
    return `Create ${config.count} true/false questions from these flashcards.

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
- Answer must be either "true" or "false" (lowercase)
- Create a mix of true and false statements (roughly 50/50 split)
- For false statements, test common misconceptions or incorrect facts
- Make statements clear and unambiguous
- Avoid trick questions or overly complex statements
${baseRequirements}

Flashcards:
${flashcardsText}`;
  }
  
  // FILL IN THE BLANK ONLY
  if (config.type === 'fill_blank') {
    return `Create ${config.count} fill in the blank questions from these flashcards.

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
- Use exactly three underscores "___" to indicate the blank
- Place the blank where a key term or concept should go
- Answer should be a single word or short phrase (2-3 words max)
- Provide enough context in the question for the answer to be clear
- Don't make blanks too easy or too obvious
${baseRequirements}

Flashcards:
${flashcardsText}`;
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
    }
    
    if (q.type === 'fill_blank') {
      if (!q.question.includes('___')) {
        console.warn('❌ Fill blank missing "___":', q);
        return false;
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
 * Attaches flashcard IDs and adds metadata to questions
 * Tries to match generated questions back to source flashcards
 */
const attachFlashcardIds = (questions, flashcards) => {
  return questions.map((question, index) => {
    // Try to find matching source flashcard by answer similarity
    const matchingCard = flashcards.find(card => {
      if (!card.answer || card.answer_type !== 'text') return false;
      
      const cardAnswer = card.answer.toLowerCase().trim();
      const questionAnswer = question.answer.toLowerCase().trim();
      
      return cardAnswer.includes(questionAnswer) || questionAnswer.includes(cardAnswer);
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