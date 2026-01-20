import React from 'react';

export const TrueOrFalse = ({ 
  question,      // Question object: { question, answer, type: "true_false" }
  userAnswer,    // User's selected answer (or null)
  onAnswer,      // Callback: (selectedAnswer) => void
  isRevealed,    // Whether to show correct/incorrect
  onReveal,      // Callback to reveal the answer
  onNext         // Callback to go to next question
}) => {
  
  const handleAnswerClick = (choice) => {
    if (!isRevealed) {
      onAnswer(choice); // Tell parent what user selected
      
      // Auto-reveal when answer is selected
      if (onReveal) {
        setTimeout(() => {
          onReveal(choice);
          
          // If correct, auto-advance after brief delay
          if (choice === question.answer && onNext) {
            setTimeout(() => {
              onNext();
            }, 800);
          }
        }, 100);
      }
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

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => handleAnswerClick('true')}
            disabled={isRevealed}
            className={`p-6 rounded-xl border-2 transition-all duration-200 ${getButtonStyle('true')} ${
              !isRevealed ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <span className="text-slate-100 font-medium text-xl">True</span>
          </button>
          
          <button
            onClick={() => handleAnswerClick('false')}
            disabled={isRevealed}
            className={`p-6 rounded-xl border-2 transition-all duration-200 ${getButtonStyle('false')} ${
              !isRevealed ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <span className="text-slate-100 font-medium text-xl">False</span>
          </button>
        </div>

        
      </div>
    </div>
  );
};