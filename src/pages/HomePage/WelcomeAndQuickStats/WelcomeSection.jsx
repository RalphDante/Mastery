import React, { useState, useEffect } from 'react';
import { db, auth } from '../../../api/firebase'; // Adjust import path as needed
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';

function WelcomeSection() {
  const [user, loading, error] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [cardsDue, setCardsDue] = useState(0);
  const [reviewProgress, setReviewProgress] = useState({ reviewed: 0, total: 0 });
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setDataLoading(true);
      setDataError(null);
      
      // Fetch user profile data
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userInfo = userDoc.data();
        setUserData(userInfo);
        
        // Fetch cards due for review
        await fetchCardsDue();
      } else {
        setDataError("User profile not found");
      }
    } catch (err) {
      setDataError("Failed to fetch user data");
      console.error("Error fetching user data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchCardsDue = async () => {
    try {
      const now = new Date();
      console.log('Fetching cards due for user:', user.uid);
      
      // Query cardProgress collection for cards due for review
      const cardProgressRef = collection(db, 'cardProgress');
      const cardProgressQuery = query(
        cardProgressRef,
        where('userId', '==', user.uid) // Fixed: Remove 'users/' prefix
      );
      
      const cardProgressSnapshot = await getDocs(cardProgressQuery);
      console.log('Total card progress documents:', cardProgressSnapshot.docs.length);
      
      const allCards = cardProgressSnapshot.docs;
      const dueCards = allCards.filter(doc => {
        const cardData = doc.data();
        console.log('Card data:', cardData); // Debug log
        
        // Check if nextReviewDate exists and is valid
        if (!cardData.nextReviewDate) {
          console.log('No nextReviewDate for card:', doc.id);
          return false;
        }
        
        try {
          const nextReviewDate = cardData.nextReviewDate.toDate();
          const isDue = nextReviewDate <= now;
          console.log(`Card ${doc.id}: nextReview=${nextReviewDate}, isDue=${isDue}`);
          return isDue;
        } catch (error) {
          console.error('Error processing nextReviewDate for card:', doc.id, error);
          return false;
        }
      });
      
      console.log('Cards due for review:', dueCards.length);
      setCardsDue(dueCards.length);
      
      // Calculate review progress for today
      // For now, setting reviewed to 0 - you'll need to implement logic to track today's reviews
      const reviewedToday = 0; // TODO: Implement logic to count today's completed reviews
      setReviewProgress({
        reviewed: reviewedToday,
        total: dueCards.length
      });
      
    } catch (err) {
      console.error("Error fetching cards due:", err);
      setCardsDue(0);
    }
  };
  
  

  const calculateProgressPercentage = () => {
    if (reviewProgress.total === 0) return 0;
    return (reviewProgress.reviewed / reviewProgress.total) * 100;
  };

  const handleStartReview = () => {
    // Navigate to review page - implement your routing logic here
    navigate('/flashcards');
    console.log("Starting review session...");
  };

  if (loading || dataLoading) {
    return (
      <section id="welcome-section">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-24 bg-gray-700 rounded"></div>
              <div className="h-24 bg-gray-700 rounded"></div>
              <div className="h-24 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || dataError) {
    return (
      <section id="welcome-section">
        <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-2xl">
          <p className="text-red-400">Error: {error?.message || dataError}</p>
          <button 
            onClick={fetchUserData}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
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
                  style={{ width: `${calculateProgressPercentage()}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 text-right mt-1">
                {reviewProgress.reviewed} / {reviewProgress.total} Reviewed
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-around text-center border-t md:border-t-0 md:border-l md:border-r border-gray-700 py-6 md:py-0">
            <div>
              <p className="text-sm font-medium text-slate-400">CURRENT STREAK</p>
              <p className="text-3xl font-bold text-slate-200">
                🔥 {userData?.stats?.currentStreak || 0}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">LONGEST STREAK</p>
              <p className="text-3xl font-bold text-slate-200">
                🏆 {userData?.stats?.longestStreak || 0}
              </p>
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

      {/* Additional Stats Row */}
      {/* <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <p className="text-sm text-slate-400">Total Reviews</p>
          <p className="text-2xl font-bold text-slate-200">{userData?.stats?.totalReviews || 0}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <p className="text-sm text-slate-400">Weekly Reviews</p>
          <p className="text-2xl font-bold text-slate-200">{userData?.stats?.weeklyReviews || 0}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <p className="text-sm text-slate-400">Total Decks</p>
          <p className="text-2xl font-bold text-slate-200">{userData?.stats?.totalDecks || 0}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <p className="text-sm text-slate-400">Total Cards</p>
          <p className="text-2xl font-bold text-slate-200">{userData?.stats?.totalCards || 0}</p>
        </div>
      </div> */}
    </section>
  );
}

export default WelcomeSection;