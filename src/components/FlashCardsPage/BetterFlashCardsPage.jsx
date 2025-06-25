import React, { useState } from 'react';

const FlashcardApp = () => {
  const [currentCard, setCurrentCard] = useState(1);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const totalCards = 3;
  
  const cards = [
    { 
      question: "What is the fundamental principle of thermodynamics?", 
      answer: "Energy cannot be created or destroyed, only transformed from one form to another." 
    },
    { 
      question: "Define mechanical advantage in simple machines.", 
      answer: "The ratio of output force to input force, indicating how much a machine multiplies force." 
    },
    { 
      question: "What is the difference between stress and strain?", 
      answer: "Stress is force per unit area, while strain is the deformation per unit length." 
    }
  ];

  const updateProgress = () => {
    const total = correctAnswers + wrongAnswers;
    return total > 0 ? Math.round((correctAnswers / total) * 100) : 0;
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const nextCard = () => {
    if (currentCard < totalCards) {
      setCurrentCard(currentCard + 1);
      setIsFlipped(false);
    }
  };

  const previousCard = () => {
    if (currentCard > 1) {
      setCurrentCard(currentCard - 1);
      setIsFlipped(false);
    }
  };

  const markCorrect = () => {
    setCorrectAnswers(correctAnswers + 1);
    setTimeout(nextCard, 500);
  };

  const markWrong = () => {
    setWrongAnswers(wrongAnswers + 1);
    setTimeout(nextCard, 500);
  };

  const resetProgress = () => {
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setCurrentCard(1);
    setIsFlipped(false);
  };

  const shuffleCards = () => {
    alert('Cards shuffled!');
  };

  const studyMode = () => {
    alert('Entering focused study mode...');
  };

  const currentCardData = cards[currentCard - 1];
  const percentage = updateProgress();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="flex flex-col md:flex-row justify-between items-center p-4 md:p-6 bg-gray-900 border-b border-gray-800">
        <div className="text-2xl font-bold text-violet-400 mb-4 md:mb-0">
          Mastery
        </div>
        
        <ul className="flex flex-col md:flex-row gap-4 md:gap-8 text-center md:text-left mb-4 md:mb-0">
          <li>
            <a href="#" className="text-gray-300 hover:text-violet-400 transition-colors duration-200 relative group">
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-violet-500 transition-all duration-200 group-hover:w-full"></span>
            </a>
          </li>
          <li>
            <a href="#" className="text-gray-300 hover:text-violet-400 transition-colors duration-200 relative group">
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-violet-500 transition-all duration-200 group-hover:w-full"></span>
            </a>
          </li>
          <li>
            <a href="#" className="text-gray-300 hover:text-violet-400 transition-colors duration-200 relative group">
              Contact Me
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-violet-500 transition-all duration-200 group-hover:w-full"></span>
            </a>
          </li>
        </ul>
        
        <div className="flex gap-4 items-center">
          <button className="bg-violet-600 hover:bg-violet-700 px-6 py-2 rounded-lg font-medium transition-colors duration-200">
            Create
          </button>
          <span className="text-gray-300 font-medium">ralphgwapo</span>
        </div>
      </nav>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 md:p-8 max-w-7xl mx-auto">
        {/* Flashcard Section */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Card Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">
                AEF/AEF 2
              </h1>
              <p className="text-gray-400 text-sm mb-4">
                Advanced Engineering Fundamentals - Practice Set 2
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                  ✏️ Edit Flash Card
                </button>
                <button className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                  🌐 Set to Public
                </button>
              </div>
            </div>
          </div>

          {/* Flashcard */}
          <div 
            className="bg-gray-900 border border-gray-800 rounded-2xl p-8 md:p-12 min-h-96 flex items-center justify-center text-center cursor-pointer hover:bg-gray-800 hover:border-violet-600 transition-all duration-300 group"
            onClick={flipCard}
          >
            <div className="text-xl md:text-2xl font-medium text-white leading-relaxed max-w-2xl group-hover:text-violet-100 transition-colors duration-300">
              {!isFlipped 
                ? "Click to reveal the question" 
                : isFlipped && currentCardData 
                  ? currentCardData.question 
                  : currentCardData?.answer
              }
            </div>
          </div>

          {/* Card Controls */}
          <div className="flex justify-center gap-4">
            <button 
              onClick={previousCard}
              disabled={currentCard === 1}
              className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700 text-white hover:bg-violet-600 hover:border-violet-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900 disabled:hover:border-gray-700 flex items-center justify-center"
              title="Previous"
            >
              ←
            </button>
            <button 
              onClick={markWrong}
              className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700 text-white hover:bg-red-600 hover:border-red-500 transition-all duration-200 flex items-center justify-center"
              title="Mark Wrong"
            >
              ✗
            </button>
            <button 
              onClick={markCorrect}
              className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700 text-white hover:bg-emerald-600 hover:border-emerald-500 transition-all duration-200 flex items-center justify-center"
              title="Mark Correct"
            >
              ✓
            </button>
            <button 
              onClick={shuffleCards}
              className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700 text-white hover:bg-violet-600 hover:border-violet-500 transition-all duration-200 flex items-center justify-center"
              title="Shuffle"
            >
              🔄
            </button>
            <button 
              onClick={nextCard}
              disabled={currentCard === totalCards}
              className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700 text-white hover:bg-violet-600 hover:border-violet-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900 disabled:hover:border-gray-700 flex items-center justify-center"
              title="Next"
            >
              →
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="text-center text-gray-400">
            <span className="text-lg font-medium">{currentCard}/{totalCards}</span>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 h-fit">
          <h3 className="text-xl font-bold mb-6 text-white">📊 Study Progress</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-800">
              <span className="text-gray-400">Correct:</span>
              <span className="font-bold text-lg text-emerald-400">{correctAnswers}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-800">
              <span className="text-gray-400">Wrong:</span>
              <span className="font-bold text-lg text-red-400">{wrongAnswers}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-800">
              <span className="text-gray-400">Percentage:</span>
              <span className="font-bold text-lg text-violet-400">{percentage}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-4">
            <div 
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h4 className="text-gray-300 mb-4 font-medium">⚡ Quick Actions</h4>
            <div className="space-y-3">
              <button 
                onClick={resetProgress}
                className="w-full bg-violet-600 hover:bg-violet-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                🔄 Reset Progress
              </button>
              <button 
                onClick={studyMode}
                className="w-full bg-emerald-600 hover:bg-emerald-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                📚 Study Mode
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardApp;