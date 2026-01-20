import React from 'react';
import { useState, useEffect } from 'react';

export default function MultipleChoice({ 
  question,
  userAnswer,
  onAnswer,
  isRevealed,
  onReveal,
  onNext
}) {
  
  const [clickedChoice, setClickedChoice] = useState(null);

  // THIS IS CRITICAL - Reset when question changes
  useEffect(() => {
    setClickedChoice(null);
  }, [question.id]);

  const handleAnswerClick = (choice) => {
    if (!isRevealed && !clickedChoice) { // Prevent double-click
      setClickedChoice(choice);
      onAnswer(choice);
      
      setTimeout(() => {
        onReveal(choice);
        
        if (choice === question.answer && onNext) {
          setTimeout(() => {
            onNext();
          }, 800);
        }
      }, 100);
    }
  };

  const getButtonStyle = (choice) => {
    const isSelected = clickedChoice === choice || userAnswer === choice;
    
    if (isSelected && !isRevealed) {
      return choice === question.answer 
        ? 'bg-green-600/30 border-green-500' 
        : 'bg-red-600/30 border-red-500';
    }
    
    if (!isRevealed) {
      return 'bg-slate-700/50 border-slate-600 hover:bg-slate-700';
    }
    
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

        
      </div>
    </div>
  );
}