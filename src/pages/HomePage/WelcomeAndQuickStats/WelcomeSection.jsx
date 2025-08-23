// OptimizedWelcomeSection.js
import React from 'react';
import { useUserData, useCardsDue, useStudyStats, getTimeUntilNextReview } from '../../../contexts/useUserData';
import { useNavigate } from 'react-router-dom';
import { useTutorials } from '../../../contexts/TutorialContext';
import ProBanner from './ProBanner';

function WelcomeSection() {
  const { isInTutorial, completeTutorial } = useTutorials();
  const isCreateDeckNotCompleted = isInTutorial('create-deck')
  const isGlobalReviewNotCompleted = isInTutorial('global-review')

  const { user, loading, error, userData } = useUserData();
  const { cardsDue, cardsReviewedToday, nextReviewTime } = useCardsDue();
  const { currentStreak, longestStreak } = useStudyStats();
  const navigate = useNavigate();

  const totalCards = cardsDue + cardsReviewedToday;
  const progressPercentage = totalCards > 0 ? (cardsReviewedToday / totalCards) * 100 : 0;

  const handleStartReview = () => {
    navigate('/flashcards');
  };

  const handleTutorialDismiss = () => {
    completeTutorial('global-review');
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
    <>
      <section id="welcome-section">
        <div className="text-center md:text-left mb-8">
          <h1 className="text-4xl font-extrabold text-slate-100 mb-2">
            Welcome back, {userData?.displayName || user.displayName || 'Student'}!
          </h1>
          <p className="text-lg text-slate-400">Ready to master something new today?</p>
        </div>


        {/* Tutorial Tooltip */}
        {isGlobalReviewNotCompleted && !isCreateDeckNotCompleted && (
          <div className="bg-violet-600 text-white p-4 rounded-xl mb-4 shadow-lg border border-violet-500">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">📊 Dashboard Overview</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Due for Review:</span> Cards ready to study using spaced repetition</p>
                  <p><span className="font-medium">Current Streak:</span> Days in a row you've studied</p>
                  <p><span className="font-medium">Progress Bar:</span> Shows today's review completion</p>
                </div>
              </div>
              <button 
                onClick={handleTutorialDismiss}
                className="ml-4 text-white hover:text-violet-200 text-xl font-bold leading-none"
                aria-label="Close tutorial"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className={`bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700 ${(isGlobalReviewNotCompleted && !isCreateDeckNotCompleted) ? 'z-50' : ''}`}>
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
              {cardsDue > 0 ? (
                <button 
                  onClick={handleStartReview}
                  className="w-full md:w-auto text-center px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg bg-violet-600 text-white hover:bg-violet-700 shadow-violet-500/30"
                >
                  Start Review
                </button>
              ) : (
                <div className="w-full md:w-auto text-center px-8 py-4 rounded-full bg-gray-600 text-gray-300">
                  <p className="font-medium">Next review in</p>
                  <p className="text-sm text-violet-400">
                    {getTimeUntilNextReview(nextReviewTime)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default WelcomeSection;