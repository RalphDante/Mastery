// utils/streakUtils.js
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

/**
 * Calculates streak information based on last study date
 * @param {Date} lastStudyDate - The last date user studied
 * @param {number} currentStreak - Current streak count
 * @param {number} longestStreak - Longest streak ever
 * @returns {object} - Updated streak information
 */

const getLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calculateStreakUpdate = (lastStudyDate, currentStreak = 0, longestStreak = 0) => {

  const today = new Date();
  const todayDateKey = getLocalDateKey(new Date()) // Use same format as trackDailySession
  
  if (!lastStudyDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, longestStreak),
      lastStudyDate: new Date(), // Use current date/time
      studiedToday: true
    };
  }

  const lastStudyDateKey = getLocalDateKey(lastStudyDate);
  
  if (lastStudyDateKey === todayDateKey) {
    // Already studied today
    return {
      currentStreak,
      longestStreak,
      lastStudyDate: lastStudyDate,
      studiedToday: true
    };
  }
  
  // Calculate days difference using date strings
  const todayDate = new Date(todayDateKey);
  const lastDate = new Date(lastStudyDateKey);
  const daysDifference = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
  
  if (daysDifference === 1) {
    // Consecutive day - continue streak
    const newCurrentStreak = currentStreak + 1;
    return {
      currentStreak: newCurrentStreak,
      longestStreak: Math.max(newCurrentStreak, longestStreak),
      lastStudyDate: new Date(),
      studiedToday: true
    };
  } else {
    // Gap in days - reset streak
    return {
      currentStreak: 1,
      longestStreak: longestStreak,
      lastStudyDate: new Date(),
      studiedToday: true
    };
  }
};

/**
 * Updates user streak in Firestore after completing a card review
 * @param {object} db - Firestore database instance
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Updated streak data
 */
export const updateUserStreak = async (db, userId) => {
  const userDocRef = doc(db, 'users', userId);
  
  try {
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    const currentStats = userData.stats || {};
    const lastStudyDate = userData.lastStudyDate?.toDate() || null;
    
    const streakUpdate = calculateStreakUpdate(
      lastStudyDate,
      currentStats.currentStreak || 0,
      currentStats.longestStreak || 0
    );
    
    // Only update if this is the first study session today
    if (streakUpdate.studiedToday) {
      const updatedStats = {
        ...currentStats,
        currentStreak: streakUpdate.currentStreak,
        longestStreak: streakUpdate.longestStreak,
        totalReviews: (currentStats.totalReviews || 0) + 1,
        weeklyReviews: (currentStats.weeklyReviews || 0) + 1, // You might want to calculate this properly
      };
      
      await setDoc(userDocRef, {
        ...userData,
        stats: updatedStats,
        lastStudyDate: Timestamp.fromDate(streakUpdate.lastStudyDate),
        lastActiveAt: Timestamp.now()
      }, { merge: true });
      
      return {
        currentStreak: streakUpdate.currentStreak,
        longestStreak: streakUpdate.longestStreak,
        isNewStreak: streakUpdate.currentStreak > (currentStats.currentStreak || 0)
      };
    }
    
    return {
      currentStreak: streakUpdate.currentStreak,
      longestStreak: streakUpdate.longestStreak,
      isNewStreak: false
    };
    
  } catch (error) {
    console.error('Error updating user streak:', error);
    throw error;
  }
};

/**
 * Checks if user has studied today (useful for UI)
 * @param {Date} lastStudyDate - Last study date
 * @returns {boolean} - Whether user has studied today
 */
export const hasStudiedToday = (lastStudyDate) => {
  if (!lastStudyDate) return false;
  
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const lastStudyStart = new Date(
    lastStudyDate.getFullYear(), 
    lastStudyDate.getMonth(), 
    lastStudyDate.getDate()
  );
  
  return todayStart.getTime() === lastStudyStart.getTime();
};

// Enhanced version that tracks daily review sessions
// Enhanced version that tracks daily review sessions
export const trackDailySession = async (db, userId, sessionData, isCramming) => {
  const today = new Date();
  const dateKey = getLocalDateKey(today);
  
  const sessionDocRef = doc(db, 'users', userId, 'dailySessions', dateKey);
  
  try {
    const sessionDoc = await getDoc(sessionDocRef);
    const existingSession = sessionDoc.exists() ? sessionDoc.data() : null;
    
    if (!existingSession) {
      // First session of the day - update streak
      const streakUpdate = await updateUserStreak(db, userId); 
      
      // Create daily session record
      await setDoc(sessionDocRef, {
        date: Timestamp.fromDate(today),
        cardsReviewed: sessionData.cardsReviewed || 1,
        cardsCorrect: sessionData.cardsCorrect || 0,
        accuracy: sessionData.accuracy || 0,
        sessions: 1,
        firstSessionAt: Timestamp.now(),
        lastSessionAt: Timestamp.now(),
        crammingSessions: isCramming ? 1 : 0,
        spacedSessions: isCramming ? 0 : 1
      });
      
      return { ...streakUpdate, isFirstSessionToday: true };
    } else {
      // Additional session today - just update session data
      const newCardsReviewed = existingSession.cardsReviewed + (sessionData.cardsReviewed || 1);
      const newCardsCorrect = existingSession.cardsCorrect + (sessionData.cardsCorrect || 0);
      
      await setDoc(sessionDocRef, {
        ...existingSession,
        cardsReviewed: newCardsReviewed,
        cardsCorrect: newCardsCorrect,
        sessions: (existingSession.sessions || 1) + 1,
        lastSessionAt: Timestamp.now(),
        accuracy: newCardsReviewed > 0 ? newCardsCorrect / newCardsReviewed : 0,
        crammingSessions: isCramming ? 
          (existingSession.crammingSessions || 0) + 1 : 
          (existingSession.crammingSessions || 0),
        spacedSessions: isCramming ? 
          (existingSession.spacedSessions || 0) : 
          (existingSession.spacedSessions || 0) + 1
      });
      
      return { isFirstSessionToday: false };
    }
  } catch (error) {
    console.error('Error tracking daily session:', error);
    throw error;
  }
};


// Updated FlashCardUI integration code
export const updateFlashCardUIStreaks = async (db, userId, isCorrect, isCramming) => {
  try {
    const streakResult = await trackDailySession(db, userId, {
      cardsReviewed: 1,
      cardsCorrect: isCorrect ? 1 : 0,
      accuracy: isCorrect ? 1 : 0
    }, isCramming);
    
    if (streakResult.isFirstSessionToday && streakResult.isNewStreak) {
      // Show streak notification or update UI
      console.log(`🔥 New streak! ${streakResult.currentStreak} days`);
    }
    
    return streakResult;
  } catch (error) {
    console.error('Error updating streak in FlashCardUI:', error);
    return null;
  }
};