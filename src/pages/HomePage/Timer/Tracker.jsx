// SimplePomodoroTimer.jsx - Uses same minutesStudied approach
import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const SimplePomodoroTimer = ({ 
  authUser, 
  db, 
  currentPartyId = null,
  onTimeUpdate = null // Same callback as StudyTimeTracker
}) => {
  // Timer state
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState('focus');
  const [cycleCount, setCycleCount] = useState(0);
  
  // Time tracking (same pattern as StudyTimeTracker)
  const timerRef = useRef(null);
  const sessionStartRef = useRef(null);
  const completedMinutesRef = useRef(0); // Track completed study minutes
  const lastSaveTimeRef = useRef(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Config
  const FOCUS_TIME = 25;
  const SHORT_BREAK = 5;
  const LONG_BREAK = 15;
  const POMODOROS_UNTIL_LONG_BREAK = 4;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Same save logic as StudyTimeTracker
  const saveStudyTime = useCallback(async (minutesToSave) => {
    if (!authUser || minutesToSave <= 0 || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const dateKey = new Date().toLocaleDateString('en-CA');
      const dailySessionRef = doc(db, 'users', authUser.uid, 'dailySessions', dateKey);
      
      console.log(`Saving ${minutesToSave} pomodoro minutes to Firebase`);
      
      // Same update pattern as StudyTimeTracker
      await updateDoc(dailySessionRef, {
        minutesStudied: increment(minutesToSave),
        lastSessionAt: serverTimestamp()
      });
      
      // Update party damage if in a party
      if (currentPartyId) {
        await updatePartyDamage(minutesToSave);
      }
      
      if (onTimeUpdate) {
        onTimeUpdate(minutesToSave);
      }
      
      console.log(`Successfully saved ${minutesToSave} minutes`);
      
    } catch (error) {
      console.error('Error saving pomodoro time:', error);
    } finally {
      setIsSaving(false);
    }
  }, [authUser, db, currentPartyId, onTimeUpdate, isSaving]);

  // Update party damage (same as StudyTimeTracker could use)
  const updatePartyDamage = useCallback(async (minutes) => {
    if (!currentPartyId) return;
    
    const damage = minutes * 1.0; // Base damage per minute
    const memberRef = doc(db, 'parties', currentPartyId, 'members', authUser.uid);
    
    await updateDoc(memberRef, {
      currentBossDamage: increment(damage),
      currentBossStudyMinutes: increment(minutes),
      lastDamageAt: serverTimestamp(),
      todayTotalDamage: increment(damage),
      todayStudyMinutes: increment(minutes),
      lastStudyAt: serverTimestamp()
    });
  }, [currentPartyId, authUser, db]);

  // Start session
  const startSession = useCallback(() => {
    setIsRunning(true);
    sessionStartRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          completeSession(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Complete session
  const completeSession = useCallback(async (wasCompleted = false) => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    
    if (sessionType === 'focus' && wasCompleted) {
      // Only count completed focus sessions as study time
      const completedMinutes = sessionType === 'focus' ? FOCUS_TIME : 0;
      
      if (completedMinutes > 0) {
        completedMinutesRef.current += completedMinutes;
        
        // Save immediately on completion
        await saveStudyTime(completedMinutes);
        lastSaveTimeRef.current = completedMinutesRef.current;
        
        console.log(`Completed ${completedMinutes}-minute pomodoro session`);
      }
      
      // Move to next session type
      moveToNextSessionType();
    } else if (!wasCompleted) {
      // Session was stopped early - don't count the time
      resetToFocus();
    } else {
      // Break completed - move to next
      moveToNextSessionType();
    }
  }, [sessionType, saveStudyTime]);

  // Move to next session in cycle
  const moveToNextSessionType = useCallback(() => {
    if (sessionType === 'focus') {
      const newCycleCount = cycleCount + 1;
      setCycleCount(newCycleCount);
      
      if (newCycleCount % POMODOROS_UNTIL_LONG_BREAK === 0) {
        setSessionType('long_break');
        setTimeLeft(LONG_BREAK * 60);
      } else {
        setSessionType('short_break');
        setTimeLeft(SHORT_BREAK * 60);
      }
    } else {
      // Break over - back to focus
      setSessionType('focus');
      setTimeLeft(FOCUS_TIME * 60);
    }
  }, [sessionType, cycleCount]);

  // Reset to focus session
  const resetToFocus = useCallback(() => {
    setSessionType('focus');
    setTimeLeft(FOCUS_TIME * 60);
  }, []);

  // Manual controls
  const pauseSession = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
  };

  const resumeSession = () => {
    if (!isRunning) {
      startSession();
    }
  };

  const stopSession = () => {
    completeSession(false);
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    const duration = sessionType === 'focus' ? FOCUS_TIME : 
                    sessionType === 'short_break' ? SHORT_BREAK : LONG_BREAK;
    setTimeLeft(duration * 60);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="pomodoro-timer bg-gray-800 p-6 rounded-lg">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-4 text-white">
          {sessionType === 'focus' ? '🍅 Focus Session' : 
           sessionType === 'short_break' ? '☕ Short Break' : 
           '🛋️ Long Break'}
        </h3>
        
        <div className="text-6xl font-mono mb-6 text-white">
          {formatTime(timeLeft)}
        </div>
        
        <div className="flex justify-center gap-3 mb-4">
          {!isRunning ? (
            <button
              onClick={startSession}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Start
            </button>
          ) : (
            <button
              onClick={pauseSession}
              className="px-6 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Pause
            </button>
          )}
          
          {!isRunning && timeLeft < (sessionType === 'focus' ? FOCUS_TIME * 60 : 
                                     sessionType === 'short_break' ? SHORT_BREAK * 60 : LONG_BREAK * 60) && (
            <button
              onClick={resumeSession}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Resume
            </button>
          )}
          
          <button
            onClick={stopSession}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Stop
          </button>
          
          <button
            onClick={resetTimer}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Reset
          </button>
        </div>
        
        <div className="text-sm text-gray-300 space-y-1">
          <p>Pomodoro Cycle: {cycleCount}</p>
          <p>Completed Study Minutes: {completedMinutesRef.current}</p>
          {currentPartyId && <p>🎯 Fighting boss with party!</p>}
          {isSaving && <p className="text-blue-400">Saving progress...</p>}
        </div>
        
        {sessionType !== 'focus' && (
          <div className="mt-4 text-sm text-yellow-400">
            ℹ️ Only completed focus sessions count as study time
          </div>
        )}
      </div>
    </div>
  );
};

export default SimplePomodoroTimer;