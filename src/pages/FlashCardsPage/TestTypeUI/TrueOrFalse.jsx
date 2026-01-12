import { useState } from "react";

export const TrueOrFalse = ({ 
  question,      // Question object: { question, answer: "true" | "false", type: "true_false" }
  userAnswer,    // User's selected answer (true/false or null)
  onAnswer,      // Callback: (selectedValue) => void
  isRevealed     // Whether to show correct/incorrect
}) => {

  const handleAnswerClick = (value) => {
    if (!isRevealed) {
      onAnswer(value === 'true' ? 'true' : 'false'); // Ensure string format
    }
  };

  const getButtonStyle = (value) => {
    const valueStr = value ? 'true' : 'false';
    
    if (!isRevealed) {
      return userAnswer === valueStr
        ? 'bg-blue-600 border-blue-500'
        : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700';
    }
    
    // After revealing
    if (valueStr === question.answer) {
      return 'bg-green-600/30 border-green-500';
    }
    
    if (valueStr === userAnswer && valueStr !== question.answer) {
      return 'bg-red-600/30 border-red-500';
    }
    
    return 'bg-slate-700/30 border-slate-600';
  };

  return (
    <div className="w-full max-w-2xl">
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
            className={`p-6 rounded-xl border-2 transition-all duration-200 ${getButtonStyle(true)} ${
              !isRevealed ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <span className="text-slate-100 font-medium text-xl">True</span>
          </button>
          <button
            onClick={() => handleAnswerClick('false')}
            disabled={isRevealed}
            className={`p-6 rounded-xl border-2 transition-all duration-200 ${getButtonStyle(false)} ${
              !isRevealed ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <span className="text-slate-100 font-medium text-xl">False</span>
          </button>
        </div>

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
                Correct answer: <span className="font-medium text-green-400">
                  {question.answer === 'true' ? 'True' : 'False'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}