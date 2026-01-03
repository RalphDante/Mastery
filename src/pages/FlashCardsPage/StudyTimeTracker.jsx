// StudyTimeTracker.jsx - Fixed Autosave
import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { getLocalDateKey } from '../../utils/streakUtils';

const StudyTimeTracker = ({ 
  authUser, 
  db, 
  deckId = null, 
  isFinished,
  onTimeUpdate = null,
  showDisplay = true,
  finalTime
}) => {
  const [displayTime, setDisplayTime] = useState(0); // Total session time in seconds
  const [isActivelyStudying, setIsActivelyStudying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Timer refs
  const sessionTimerRef = useRef(null);      // Main session timer
  const activityTimerRef = useRef(null);     // Activity detection timer
  const saveIntervalRef = useRef(null);      // Periodic save interval (changed from timeout)
  
  // Time tracking
  const totalSessionSecondsRef = useRef(0);  // Accumulates total time for saving
  const activitySecondsRef = useRef(0);      // Tracks seconds since last activity
  const lastSaveTimeRef = useRef(0);         // Track when we last saved
  
  // Configuration
  const IDLE_TIMEOUT = 5 * 60; // 5 minutes in seconds
  const SAVE_INTERVAL = 30 * 1000; // Save every 30 seconds

  // --- Utility Function ---
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Timer Management ---
  
  
  // Start both timers
  const startTimers = useCallback(() => {
    if (!authUser || isFinished) return;
    
    setIsActivelyStudying(true);
    
    // Start session timer (increments every second)
    if (!sessionTimerRef.current) {
      sessionTimerRef.current = setInterval(() => {
        totalSessionSecondsRef.current += 1;
        setDisplayTime(prev => prev + 1);
      }, 1000);
    }
    
    // Start activity timer (increments every second, resets on activity)
    if (!activityTimerRef.current) {
      activityTimerRef.current = setInterval(() => {
        activitySecondsRef.current += 1;
        
        // Check if user has been idle for too long
        if (activitySecondsRef.current >= IDLE_TIMEOUT)  {
          pauseTimers();
        }
      }, 1000);
    }
    
    // Start periodic save interval
    if (!saveIntervalRef.current) {
      saveIntervalRef.current = setInterval(async () => {
        const timeToSave = totalSessionSecondsRef.current - lastSaveTimeRef.current;
        if (timeToSave > 0 && !isSaving) {
          console.log(`Autosaving ${timeToSave} seconds of study time`);
          await saveStudyTime(timeToSave);
          lastSaveTimeRef.current = totalSessionSecondsRef.current;
        }
      }, SAVE_INTERVAL);
    }
  }, [authUser, isFinished]);
  
  // Pause both timers (user went idle)
  const pauseTimers = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (activityTimerRef.current) {
      clearInterval(activityTimerRef.current);
      activityTimerRef.current = null;
    }
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
    
    setIsActivelyStudying(false);
    
    // Save any remaining unsaved time when pausing
    const timeToSave = totalSessionSecondsRef.current - lastSaveTimeRef.current;
    if (timeToSave > 0) {
      console.log(`Saving ${timeToSave} seconds on pause`);
      saveStudyTime(timeToSave);
      lastSaveTimeRef.current = totalSessionSecondsRef.current;
    }
  }, []);
  
  // Stop and cleanup all timers
  const stopAllTimers = useCallback(async () => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (activityTimerRef.current) {
      clearInterval(activityTimerRef.current);
      activityTimerRef.current = null;
    }
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
    
    setIsActivelyStudying(false);
    
    // Final save when stopping
    const timeToSave = totalSessionSecondsRef.current - lastSaveTimeRef.current;
    if (authUser && timeToSave > 0) {
      console.log(`Final save of ${timeToSave} seconds`);
      await saveStudyTime(timeToSave);
      lastSaveTimeRef.current = totalSessionSecondsRef.current;
    }
    
    setDisplayTime(0);
    totalSessionSecondsRef.current = 0;
    lastSaveTimeRef.current = 0;
  }, [authUser]);

  // --- Activity Detection ---
  
  // Reset activity timer when user does something
  const resetActivityTimer = useCallback(() => {
    // Don't reset activity timer if session is finished
    if (isFinished) return;
    
    activitySecondsRef.current = 0; // Reset activity counter
    
    // If timers are paused but user is active, resume them
    if (authUser && !isActivelyStudying) {
      startTimers();
    }
  }, [authUser, isActivelyStudying, isFinished, startTimers]);

  // --- Firebase Save Logic ---
  
  const saveStudyTime = useCallback(async (timeInSecondsToSave) => {
    if (!authUser || timeInSecondsToSave <= 0 || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const now = new Date();
      const dateKey = getLocalDateKey(now); // YYYY-MM-DD format
      const minutesStudied = timeInSecondsToSave / 60; // Include fractional minutes
      
      console.log(`Saving ${minutesStudied.toFixed(2)} minutes to Firebase`);
      
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', authUser.uid);
        const dailySessionRef = doc(db, 'users', authUser.uid, 'dailySessions', dateKey);
        
        // --- PHASE 1: ALL READS FIRST ---
        const userDoc = await transaction.get(userRef);
        const dailySessionDoc = await transaction.get(dailySessionRef);
        
        // --- PHASE 2: ALL WRITES AFTER READS ---
        // 1. Update/create user document
        if (userDoc.exists()) {
          transaction.update(userRef, {
            lastStudyDate: now,
            lastActiveAt: now
          });
        } else {
          transaction.set(userRef, {
            email: authUser.email,
            displayName: authUser.displayName || 'Anonymous',
            createdAt: now,
            lastActiveAt: now,
            lastStudyDate: now,
            stats: {
              totalReviews: 0,
              weeklyReviews: 0,
              currentStreak: 0,
              longestStreak: 0,
              totalDecks: 0,
              totalCards: 0
            }
          });
        }
        
        // 2. Update/create daily session document
        if (dailySessionDoc.exists()) {
          const existingData = dailySessionDoc.data();
          transaction.update(dailySessionRef, {
            minutesStudied: (existingData.minutesStudied || 0) + minutesStudied,
            lastSessionAt: now,
            // ...(deckId && { spacedSessions: (existingData.spacedSessions || 0) + 1 })
          });
        } else {
          transaction.set(dailySessionRef, {
            date: now,
            firstSessionAt: now,
            lastSessionAt: now,
            minutesStudied: minutesStudied,
            accuracy: 0,
            cardsCorrect: 0,
            cardsReviewed: 0,
            crammingSessions: 0,
            // spacedSessions: deckId ? 1 : 0
          });
        }
      });
      
      console.log(`Successfully saved ${minutesStudied.toFixed(2)} minutes`);
      
      if (onTimeUpdate) {
        onTimeUpdate(minutesStudied);
      }
      
    } catch (error) {
      console.error('Error saving study time:', error);
    } finally {
      setIsSaving(false);
    }
  }, [authUser, db, deckId, onTimeUpdate]);

  // --- Effects ---

  // Stop timers when we are finished
  useEffect(()=>{
    if(isFinished){
      const lastAcceptedTime = `${formatTime(displayTime)}`
      finalTime(lastAcceptedTime);
      stopAllTimers();
    }
  },[isFinished, stopAllTimers])

  // Start timers when component mounts and user is authenticated
  useEffect(() => {
    if (authUser && !isFinished){
      startTimers();
    }
    
    return () => {
      stopAllTimers();
    };
  }, [authUser, startTimers, stopAllTimers]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetActivityTimer, { passive: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetActivityTimer);
      });
    };
  }, [resetActivityTimer]);

  // --- Render ---
  if (!showDisplay) return null;

  return (
    <div className={`study-time-tracker`}>
      <div className="flex items-center gap-2 text-sm text-white/70">
        {isFinished ? (
          <>
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <span>Finished - Timer Stopped: {formatTime(displayTime)}</span>
          </>
        ) : (
          <>
            <div className={`w-2 h-2 rounded-full ${isActivelyStudying ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
            <span>Study Time: {formatTime(displayTime)}</span>
            {!isActivelyStudying && displayTime > 0 && (
              <span className="text-xs text-yellow-400">(Paused)</span>
            )}
          </>
        )}
        {isSaving && (
          <span className="text-xs text-blue-400">Saving...</span>
        )}
      </div>
    </div>
  );
};

export default StudyTimeTracker;