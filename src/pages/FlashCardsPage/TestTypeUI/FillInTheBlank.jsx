import { useState } from "react";
import { ChevronLeft } from "lucide-react";

export const FillInTheBlank = () => {
    const [answer, setAnswer] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
  
    const questions = [
      {
        question: "The capital of France is ________.",
        correctAnswer: "Paris",
        acceptedAnswers: ["paris", "París"]
      },
      {
        question: "The chemical symbol for water is ________.",
        correctAnswer: "H2O",
        acceptedAnswers: ["h2o", "H₂O"]
      },
      {
        question: "The largest planet in our solar system is ________.",
        correctAnswer: "Jupiter",
        acceptedAnswers: ["jupiter"]
      }
    ];
  
    const currentQ = questions[currentQuestion];
  
    const handleReveal = () => {
      if (answer.trim()) {
        setShowResult(true);
      }
    };
  
    const isCorrect = () => {
      const normalizedAnswer = answer.trim().toLowerCase();
      return [currentQ.correctAnswer.toLowerCase(), ...currentQ.acceptedAnswers].includes(normalizedAnswer);
    };
  
    const handleNext = () => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setAnswer('');
        setShowResult(false);
      } else {
        setCurrentQuestion(0);
        setAnswer('');
        setShowResult(false);
      }
    };
  
    return (
        <div className="w-full max-w-2xl">
          <div className="bg-slate-800/90 backdrop-blur rounded-2xl shadow-2xl border border-slate-700/50 p-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-medium text-slate-100 leading-relaxed">
                {currentQ.question}
              </h2>
            </div>
  
            <div className="mb-8">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={showResult}
                placeholder="Type your answer here..."
                className="w-full p-4 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all duration-200 disabled:bg-slate-700/30 disabled:cursor-not-allowed"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !showResult && answer.trim()) {
                    handleReveal();
                  }
                }}
              />
              {showResult && (
                <div className={`mt-4 p-4 rounded-xl ${isCorrect() ? 'bg-green-600/20 border-2 border-green-600/30' : 'bg-red-600/20 border-2 border-red-600/30'}`}>
                  <div className={`font-medium ${isCorrect() ? 'text-green-400' : 'text-red-400'}`}>
                    {isCorrect() ? '✓ Correct!' : '✕ Incorrect'}
                  </div>
                  {!isCorrect() && (
                    <div className="text-slate-300 mt-2">
                      Correct answer: <span className="font-medium text-green-400">{currentQ.correctAnswer}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
  
            {!showResult ? (
              <button
                onClick={handleReveal}
                disabled={!answer.trim()}
                className="w-full py-4 bg-slate-700/50 hover:bg-slate-700 disabled:bg-slate-700/30 disabled:cursor-not-allowed text-slate-300 disabled:text-slate-500 rounded-xl transition-all duration-200 font-medium"
              >
                Tap to reveal answer
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleNext}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium"
                >
                  Next Question
                </button>
              </div>
            )}
          </div>
  
     
        </div>
    );
  }