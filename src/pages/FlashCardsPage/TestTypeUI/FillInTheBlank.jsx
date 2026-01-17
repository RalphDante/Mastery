import { useState, useEffect } from "react";

export const FillInTheBlank = ({ 
  question,      // Question object: { question, answer, type: "fill_blank" }
  userAnswer,    // User's current typed answer (or null)
  onAnswer,      // Callback: (typedAnswer) => void 
  isRevealed,    // Whether to show correct/incorrect
  onReveal,      // Callback to reveal the answer
  onNext         // Callback to go to next question
}) => {
  const [localAnswer, setLocalAnswer] = useState(userAnswer || '');

  // Sync with parent's userAnswer if it changes
  useEffect(() => {
    if (userAnswer !== undefined && userAnswer !== null) {
      setLocalAnswer(userAnswer);
    }
  }, [userAnswer]);

  // Clear input when question changes
  useEffect(() => {
    setLocalAnswer(userAnswer || '');
  }, [question.id, userAnswer]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setLocalAnswer(value);
    onAnswer(value); // Update parent immediately as user types
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (!isRevealed) {
        // First Enter press: reveal the answer
        if (onReveal) {
          onReveal();
        }
        // If correct, automatically go to next after a brief delay
        if (isCorrect() && onNext) {
          setTimeout(() => {
            onNext();
          }, 800);
        }
      } else if (isCorrect() && onNext) {
        // If already revealed and correct, go to next immediately
        onNext();
      }
    }
  };

  const isCorrect = () => {
    if (!localAnswer || !question.answer) return false;
    const normalized = localAnswer.trim().toLowerCase();
    const correctNormalized = question.answer.trim().toLowerCase();
    return normalized === correctNormalized;
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-slate-800/90 backdrop-blur rounded-2xl shadow-2xl border border-slate-700/50 p-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-medium text-slate-100 leading-relaxed">
            {question.question}
          </h2>
        </div>

        <div className="mb-8">
          <input
            type="text"
            value={localAnswer}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={false}
            placeholder="Type your answer here..."
            className="w-full p-4 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all duration-200"
          />
          
          {isRevealed && (
            <div className={`mt-4 p-4 rounded-xl ${
              isCorrect() 
                ? 'bg-green-600/20 border-2 border-green-600/30' 
                : 'bg-red-600/20 border-2 border-red-600/30'
            }`}>
              <div className={`font-medium ${isCorrect() ? 'text-green-400' : 'text-red-400'}`}>
                {isCorrect() ? '✓ Correct!' : '✕ Incorrect'}
              </div>
              {!isCorrect() && (
                <div className="text-slate-300 mt-2">
                  Correct answer: <span className="font-medium text-green-400">{question.answer}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}