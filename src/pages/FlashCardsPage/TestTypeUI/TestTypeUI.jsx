// TestTypeUI.jsx - Handles ALL test question logic (mirrors FlashCardUI)

import { useState, useEffect } from 'react';
import MultipleChoice from './MultipleChoice.jsx';
import { FillInTheBlank } from './FillInTheBlank.jsx';
import { TrueOrFalse } from './TrueOrFalse.jsx';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useSessionTracking } from '../../../hooks/useSessionTracking.js';
import { db } from '../../../api/firebase.js';

function TestTypeUI({
  testQuestions,           // Array of test questions
  testAnswers,             // Object: { questionId: answer }
  setTestAnswers,          // Update answers
  currentTestIndex,        // Current question index
  setCurrentTestIndex,     // Navigate questions
  
  // Boss battle integration
  setKnowAnswer,           // Increment for correct answers
  setDontKnowAnswer,       // Increment for wrong answers
  setDeaths,               // Increment for wrong answers
  
  // Sound effects
  isMuted,
  
  // Completion callback
  onTestComplete
}) {
  const { user } = useAuthContext();
  const [isFinished, setIsFinished] = useState(false);
  
  // Session tracking hook (same as FlashCardUI)
  const { trackCardReview } = useSessionTracking(user, db, isFinished);
  
  const [revealedQuestions, setRevealedQuestions] = useState(new Set());
  
  // Sound refs
  const correctSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3");
  const wrongSound = new Audio("https://cdn.freesound.org/previews/156/156859_2538033-lq.mp3");
  
  correctSound.volume = 0.3;
  wrongSound.volume = 0.1;

  if (!testQuestions.length) {
    return <div className="text-white text-center">No test questions available</div>;
  }

  const currentQuestion = testQuestions[currentTestIndex];
  const userAnswer = testAnswers[currentQuestion.id];
  const isRevealed = revealedQuestions.has(currentQuestion.id);

  // ==========================================
  // HANDLE REVEAL - Check answer and update boss battle
  // ==========================================
  const handleReveal = (answerToCheck = userAnswer) => {
    console.log("handleReveal called", { answerToCheck, type: currentQuestion.type });
    
    // Check if we have a valid answer (including boolean false and empty string)
    if (answerToCheck === undefined || answerToCheck === null) {
      console.log("returning early - no answer");
      return;
    }

    // Check if correct
    let isCorrect = false;
    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') {
      // For MC and T/F, do direct comparison (handles strings and booleans)
      isCorrect = answerToCheck === currentQuestion.answer;
    } else if (currentQuestion.type === 'fill_blank') {
      // For fill in the blank, convert to string and compare
      const userAnswerStr = String(answerToCheck).toLowerCase().trim();
      const correctAnswerStr = String(currentQuestion.answer).toLowerCase().trim();
      isCorrect = userAnswerStr === correctAnswerStr;
    }

    console.log("Answer check:", { userAnswer: answerToCheck, correctAnswer: currentQuestion.answer, isCorrect });

    // Mark as revealed
    setRevealedQuestions(prev => new Set([...prev, currentQuestion.id]));

    // Play sound
    if (!isMuted) {
      if (isCorrect) {
        correctSound.play().catch(() => {});
      } else {
        wrongSound.play().catch(() => {});
      }
    }

    // Update boss battle stats
    if (isCorrect) {
      setKnowAnswer(prev => prev + 1);
    } else {
      setDontKnowAnswer(prev => prev + 1);
      setDeaths(prev => prev + 1);
    }

    // Track the card review (same as FlashCardUI)
    console.log('trackCardReview called');
    trackCardReview(isCorrect);
    console.log('trackCardReview finished');
  };

  // ==========================================
  // NAVIGATION
  // ==========================================
  const handleNext = () => {
    if (currentTestIndex < testQuestions.length - 1) {
      setCurrentTestIndex(prev => prev + 1);
    } else {
      // Test complete!
      setIsFinished(true);
      if (onTestComplete) {
        onTestComplete();
      }
    }
  };

  const handlePrevious = () => {
    if (currentTestIndex > 0) {
      setCurrentTestIndex(prev => prev - 1);
    }
  };

  // ==========================================
  // HANDLE ANSWER SELECTION
  // ==========================================
  const handleAnswerChange = (answer) => {
    setTestAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  };

  // ==========================================
  // RENDER CURRENT QUESTION
  // ==========================================
  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <MultipleChoice 
            question={currentQuestion}
            userAnswer={userAnswer}
            onAnswer={handleAnswerChange}
            isRevealed={isRevealed}
            onReveal={handleReveal}
            onNext={() => handleNext()}
          />
        );
      
      case 'true_false':
        return (
          <TrueOrFalse 
            question={currentQuestion}
            userAnswer={userAnswer}
            onAnswer={handleAnswerChange}
            isRevealed={isRevealed}
            onReveal={handleReveal}
            onNext={() => handleNext()}
          />
        );
      
      case 'fill_blank':
        return (
          <FillInTheBlank
            question={currentQuestion}
            userAnswer={userAnswer}
            onAnswer={handleAnswerChange}
            isRevealed={isRevealed}
            onReveal={() => handleReveal()}
            onNext={() => handleNext()}
          />
        );
      
      default:
        return <div className="text-red-400">Unknown question type: {currentQuestion.type}</div>;
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="space-y-4">
      {/* Question Component */}
      {renderQuestion()}

      {/* Action Buttons */}
      {!isRevealed ? (
        // REVEAL BUTTON (before answering)
        <button
          onClick={handleReveal}
          disabled={userAnswer === undefined || userAnswer === null}
          className="w-full py-4 bg-slate-700/50 hover:bg-slate-700 disabled:bg-slate-700/30 disabled:cursor-not-allowed text-slate-300 disabled:text-slate-500 rounded-xl transition-all duration-200 font-medium"
        >
          Tap to reveal answer
        </button>
      ) : (
        // NAVIGATION BUTTONS (after revealing)
        <div className="flex justify-between gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentTestIndex === 0}
            className="flex-1 px-4 py-4 bg-gray-700 rounded-xl hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            className="flex-1 px-4 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-all duration-200"
          >
            {currentTestIndex === testQuestions.length - 1 ? 'Finish Test' : 'Next Question'}
          </button>
        </div>
      )}
    </div>
  );
}

export default TestTypeUI;