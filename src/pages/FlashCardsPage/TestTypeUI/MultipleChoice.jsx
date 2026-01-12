import React from 'react';

// Refactored MultipleChoice - accepts props from parent
export default function MultipleChoice({ 
  question,      // Question object from AI: { question, answer, choices, type }
  userAnswer,    // User's selected answer (or null)
  onAnswer,      // Callback: (selectedAnswer) => void
  isRevealed     // Whether to show correct/incorrect
}) {
  
  const handleAnswerClick = (choice) => {
    if (!isRevealed) {
      onAnswer(choice); // Tell parent what user selected
    }
  };

  const getButtonStyle = (choice) => {
    if (!isRevealed) {
      // Before revealing: highlight selected answer
      return userAnswer === choice
        ? 'bg-blue-600 border-blue-500'
        : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700';
    }
    
    // After revealing: show correct/incorrect
    if (choice === question.answer) {
      return 'bg-green-600/30 border-green-500';
    }
    
    if (choice === userAnswer && choice !== question.answer) {
      return 'bg-red-600/30 border-red-500';
    }
    
    return 'bg-slate-700/30 border-slate-600';
  };

  return (
    <div className="w-full">
      <div className="bg-slate-800/90 backdrop-blur rounded-2xl shadow-2xl border border-slate-700/50 p-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-medium text-slate-100 leading-relaxed">
            {question.question}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {question.choices.map((choice, index) => (
            <button
              key={index}
              onClick={() => handleAnswerClick(choice)}
              disabled={isRevealed}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${getButtonStyle(choice)} ${
                !isRevealed ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <span className="text-slate-100 font-medium break-words">{choice}</span>
            </button>
          ))}
        </div>

        {/* Show result feedback */}
        {isRevealed && (
          <div className={`p-4 rounded-xl ${
            userAnswer === question.answer 
              ? 'bg-green-600/20 border-2 border-green-600/30' 
              : 'bg-red-600/20 border-2 border-red-600/30'
          }`}>
            <div className={`font-medium ${
              userAnswer === question.answer ? 'text-green-400' : 'text-red-400'
            }`}>
              {userAnswer === question.answer ? '✓ Correct!' : '✕ Incorrect'}
            </div>
            {userAnswer !== question.answer && (
              <div className="text-slate-300 mt-2">
                Correct answer: <span className="font-medium text-green-400">{question.answer}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}