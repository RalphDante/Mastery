import React, { useState } from 'react';

export default function NewFlashCardUI() {
  const [currentCard, setCurrentCard] = useState(1);
  const [totalCards] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const cards = ['asfa', 'test card 2', 'test card 3'];
  const answers = ['answer 1', 'answer 2', 'answer 3'];

  const updateStats = () => {
    const total = correctCount + wrongCount;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return { percentage, total };
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
    setCorrectCount(correctCount + 1);
    setTimeout(nextCard, 300);
  };

  const markWrong = () => {
    setWrongCount(wrongCount + 1);
    setTimeout(nextCard, 300);
  };

  const shuffleDeck = () => {
    // Shuffle animation would go here
    console.log('Shuffling deck...');
  };

  const redoDeck = () => {
    setCurrentCard(1);
    setCorrectCount(0);
    setWrongCount(0);
    setIsFlipped(false);
  };

  const { percentage } = updateStats();
  const progressWidth = (currentCard / totalCards) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-8">
          <div className="text-2xl font-bold text-purple-400">Mastery</div>
          <nav className="flex gap-8">
            <a href="#" className="text-white/80 hover:text-white transition-colors">Home</a>
            <a href="#" className="text-white/80 hover:text-white transition-colors">About</a>
            <a href="#" className="text-white/80 hover:text-white transition-colors">Contact Me</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-all hover:-translate-y-0.5">
            Create
          </button>
          <span className="text-white/80">COMANDANTE RALPH</span>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all">
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex p-8 gap-8 max-w-7xl mx-auto">
        {/* Flashcard Section */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Study Header */}
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-white/10 text-white/70 rounded-xl font-semibold transition-all hover:-translate-y-1">
              📝 Edit Deck
            </button>
            <button className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold transition-all hover:-translate-y-1">
              ⚡ Quick Study
            </button>
            <button className="px-6 py-3 bg-white/10 text-white/70 rounded-xl font-semibold transition-all hover:-translate-y-1">
              🧠 Smart Review
            </button>
          </div>

          {/* Progress Bar */}
          
          <div className="text-center text-white/70 text-sm mb-4">
            Card {currentCard} of {totalCards}
          </div>

          {/* Flashcard */}
          <div className="relative perspective-1000 h-96">
            <div 
              className="w-full h-full bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-3xl font-light backdrop-blur-md cursor-pointer transition-all hover:-translate-y-1 hover:shadow-2xl"
              onClick={flipCard}
            >
              <div>
                {isFlipped ? answers[currentCard - 1] : cards[currentCard - 1]}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4 p-6 bg-slate-900/60 rounded-2xl backdrop-blur-md">
            {/* Navigation */}
            <div className="flex gap-2">
              <button 
                className="group relative min-w-12 min-h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all hover:-translate-y-1 flex items-center justify-center text-white/80 hover:text-white"
                onClick={previousCard}
                disabled={currentCard === 1}
              >
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Previous Card
                </div>
                ←
              </button>
            </div>

            {/* Answer Buttons */}
            <div className="flex gap-2">
              <button 
                className="group relative px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                onClick={markWrong}
              >
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Mark as Incorrect
                </div>
                ✕ Incorrect
              </button>
              <button 
                className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                onClick={markCorrect}
              >
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Mark as Correct
                </div>
                ✓ Correct
              </button>
            </div>

            {/* Utilities */}
            <div className="flex gap-2">
              <button 
                className="group relative min-w-12 min-h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all hover:-translate-y-1 flex items-center justify-center text-white/80 hover:text-white"
                onClick={shuffleDeck}
              >
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Shuffle Deck
                </div>
                🔀
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-80 bg-slate-900/60 rounded-2xl p-6 backdrop-blur-md h-fit">
          <div className="text-2xl font-bold mb-4 text-purple-400">HUZZAH</div>
          <div className="text-white/60 mb-6">asdf</div>
          
          {/* Stats */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-white/70">Correct:</span>
              <span className="font-semibold text-lg text-green-400">{correctCount}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-white/70">Wrong:</span>
              <span className="font-semibold text-lg text-red-400">{wrongCount}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-white/70">Percentage:</span>
              <span className="font-semibold text-lg text-purple-400">{percentage}%</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-white/70">Total Cards:</span>
              <span className="font-semibold text-lg">{totalCards}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h3 className="mb-4 text-white/90 font-medium">Quick Actions</h3>
            <button 
              className="w-full p-4 mb-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-white hover:bg-purple-500/20 transition-all hover:-translate-y-1 flex items-center gap-2"
              onClick={redoDeck}
            >
              🔄 Redo Deck
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}