// OptimizedWelcomeSection.js
import React from 'react';
import { useUserData, useCardsDue, useStudyStats } from '../../../hooks/useUserData';
import { useNavigate } from 'react-router-dom';

function WelcomeSection() {
  const { user, loading, error, userData } = useUserData();
  const { cardsDue, cardsReviewedToday } = useCardsDue();
  const { currentStreak, longestStreak } = useStudyStats();
  const navigate = useNavigate();

  const totalCards = cardsDue + cardsReviewedToday;
  const progressPercentage = totalCards > 0 ? (cardsReviewedToday / totalCards) * 100 : 0;

  const handleStartReview = () => {
    navigate('/flashcards');
  };

  // if (loading) {
  //   return (
  //     <section id="welcome-section">
  //       <div className="bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700">
  //         <div className="animate-pulse">
  //           <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
  //           <div className="h-4 bg-gray-700 rounded w-1/2 mb-8"></div>
  //           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  //             <div className="h-24 bg-gray-700 rounded"></div>
  //             <div className="h-24 bg-gray-700 rounded"></div>
  //             <div className="h-24 bg-gray-700 rounded"></div>
  //           </div>
  //         </div>
  //       </div>
  //     </section>
  //   );
  // }

  if (error) {
    return (
      <section id="welcome-section">
        <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-2xl">
          <p className="text-red-400">Error: {error.message}</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section id="welcome-section">
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
          <p className="text-slate-400">Please log in to view your progress.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="welcome-section">
      <div className="text-center md:text-left mb-8">
        <h1 className="text-4xl font-extrabold text-slate-100 mb-2">
          Welcome back, {userData?.displayName || user.displayName || 'Student'}!
        </h1>
        <p className="text-lg text-slate-400">Ready to master something new today?</p>
      </div>

      <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Cards Due */}
          <div className="text-center md:text-left">
            <p className="text-sm font-medium text-slate-400 mb-1">DUE FOR REVIEW</p>
            <h2 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 text-transparent bg-clip-text">
              {cardsDue}
            </h2>
            <div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mt-3">
                <div 
                  className="bg-violet-500 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 text-right mt-1">
                {cardsReviewedToday} / {totalCards} Reviewed
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-around text-center border-t md:border-t-0 md:border-l md:border-r border-gray-700 py-6 md:py-0">
            <div>
              <p className="text-sm font-medium text-slate-400">CURRENT STREAK</p>
              <p className="text-3xl font-bold text-slate-200">🔥 {currentStreak}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">LONGEST STREAK</p>
              <p className="text-3xl font-bold text-slate-200">🏆 {longestStreak}</p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <button 
              onClick={handleStartReview}
              disabled={cardsDue === 0}
              className={`w-full md:w-auto text-center px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg ${
                cardsDue === 0 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-500/30'
              }`}
            >
              {cardsDue === 0 ? 'No Cards Due' : 'Start Review'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


export default WelcomeSection;