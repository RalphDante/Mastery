// utils/streakUtils.js
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

/**
 * Calculates streak information based on last study date
 * @param {Date} lastStudyDate - The last date user studied
 * @param {number} currentStreak - Current streak count
 * @param {number} longestStreak - Longest streak ever
 * @returns {object} - Updated streak information
 */

export const getLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekKey = (date) => {
  const year = date.getFullYear();
  // Get week number (simple version)
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

export const checkAndResetWeeklyFreeze = (lastFreezeWeek) => {
  const currentWeek = getWeekKey(new Date());
  
  if (lastFreezeWeek !== currentWeek) {
    return {
      freezesAvailable: 1,
      lastFreezeWeek: currentWeek
    };
  }
  
  return null; // No reset needed
};

export const isStreakAtRisk = (lastStudyDate) => {
  if (!lastStudyDate) return false;
  
  const today = new Date();
  const todayDateKey = getLocalDateKey(today);
  const lastStudyDateKey = getLocalDateKey(lastStudyDate);
  
  // If they studied today, streak is safe
  if (todayDateKey === lastStudyDateKey) return false;
  
  // Calculate days since last study
  const todayDate = new Date(todayDateKey);
  const lastDate = new Date(lastStudyDateKey);
  const daysDifference = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
  
  // Streak is only at risk if there's a gap of 2+ days (missed a day)
  // daysDifference === 1 means consecutive days (yesterday → today), which is fine
  return daysDifference >= 2;
};



export const calculateStreakUpdate = (lastStudyDate, currentStreak = 0, longestStreak = 0, hasActiveStreakFreeze = false) => {
  const today = new Date();
  const todayDateKey = getLocalDateKey(new Date())
  
  if (!lastStudyDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, longestStreak),
      lastStudyDate: new Date(),
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
    // Gap in days
    
    // If freeze is available, use it and continue streak
    if (hasActiveStreakFreeze && daysDifference >= 2) {
      const newCurrentStreak = currentStreak + 1;
      return {
        currentStreak: newCurrentStreak,
        longestStreak: Math.max(newCurrentStreak, longestStreak),
        lastStudyDate: new Date(),
        studiedToday: true,
        freezeUsed: true
      };
    }
    
    // Otherwise reset streak
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
    const weeklyReset = checkAndResetWeeklyFreeze(currentStats.lastFreezeWeek);
    const isPro = userData.subscription?.tier === 'pro';

    if (weeklyReset && isPro) {
      currentStats.freezesAvailable = 1;
      currentStats.lastFreezeWeek = weeklyReset.lastFreezeWeek;
    }

    const hasActiveStreakFreeze = (currentStats.freezesAvailable || 0) > 0;

    
    const streakUpdate = calculateStreakUpdate(
      lastStudyDate,
      currentStats.currentStreak || 0,
      currentStats.longestStreak || 0,
      hasActiveStreakFreeze
    );
    
    // Only update if this is the first study session today
    if (streakUpdate.studiedToday) {
      const updatedStats = {
        ...currentStats,
        currentStreak: streakUpdate.currentStreak,
        longestStreak: streakUpdate.longestStreak,
        // totalReviews: (currentStats.totalReviews || 0) + 1,
        // weeklyReviews: (currentStats.weeklyReviews || 0) + 1, // You might want to calculate this properly
      };

      // ✅ If freeze was used, decrement it
      if (streakUpdate.freezeUsed) {
        updatedStats.freezesAvailable = Math.max(0, (currentStats.freezesAvailable || 0) - 1);
      }
      
      await setDoc(userDocRef, {
        ...userData,
        stats: updatedStats,
        lastStudyDate: Timestamp.fromDate(streakUpdate.lastStudyDate),
        lastActiveAt: Timestamp.now()
      }, { merge: true });
      
      return {
        currentStreak: streakUpdate.currentStreak,
        longestStreak: streakUpdate.longestStreak,
        isNewStreak: streakUpdate.currentStreak > (currentStats.currentStreak || 0),
        streakChanged: streakUpdate.currentStreak !== (currentStats.currentStreak || 0),
        freezeUsed: streakUpdate.freezeUsed || false
      };
    }
    
    return {
      currentStreak: streakUpdate.currentStreak,
      longestStreak: streakUpdate.longestStreak,
      isNewStreak: streakUpdate.currentStreak > (currentStats.currentStreak || 0),
      streakChanged: false
    };
    
  } catch (error) {
    console.error('Error updating user streak:', error);
    throw error;
  }
};

/**
 * Updates streak in both user profile AND party member (if in a party)
 */
export const updateUserAndPartyStreak = async (db, userId, currentPartyId = null) => {
  const streakResult = await updateUserStreak(db, userId);
  
  // If user is in a party and streak changed (increased OR reset), update their member document
  if (currentPartyId && streakResult.streakChanged) {
    try {
      const memberRef = doc(db, 'parties', currentPartyId, 'members', userId);
      await updateDoc(memberRef, {
        streak: streakResult.currentStreak,
        longestStreak: streakResult.longestStreak
      });
    } catch (error) {
      console.error('Error updating party member streak:', error);
      // Don't throw - party update failure shouldn't break streak update
    }
  }
  
  return streakResult;
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
        sessions: 1,
        firstSessionAt: Timestamp.now(),
        lastSessionAt: Timestamp.now(),
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