import React, { useState, useEffect, useCallback, useRef } from 'react';
import { runTransaction, doc } from 'firebase/firestore';
// import SimplePomodoroTimer from './Tracker';

function Timer({
  authUser, 
  db, 
  deckId = null, 
  onTimeUpdate = null,
}) {
  const unsavedSecondsRef = useRef(0);

  const [selectedDuration, setSelectedDuration] = useState(25); // minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Missing state

  const durations = [
    { label: '15 min', value: 15, damage: 30, xp: 25 },
    { label: '25 min', value: 25, damage: 50, xp: 40 },
    { label: '45 min', value: 45, damage: 90, xp: 75 },
    { label: '60 min', value: 60, damage: 120, xp: 100 }
  ];

  const saveStudyTime = useCallback(async (timeInSecondsToSave) => {
    if (!authUser || timeInSecondsToSave <= 0 || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const now = new Date();
      const dateKey = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format
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
  }, [authUser, db, deckId, onTimeUpdate, isSaving]); // Added isSaving to deps

  // Separate the save operation to avoid recreating saveStudyTime constantly
  const handleSaveTime = useCallback(async (timeToSave) => {
    if (!authUser || timeToSave <= 0 || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const now = new Date();
      const dateKey = now.toLocaleDateString('en-CA');
      const minutesStudied = timeToSave / 60;
      
      console.log(`Saving ${minutesStudied.toFixed(2)} minutes to Firebase`);
      
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', authUser.uid);
        const dailySessionRef = doc(db, 'users', authUser.uid, 'dailySessions', dateKey);
        
        const userDoc = await transaction.get(userRef);
        const dailySessionDoc = await transaction.get(dailySessionRef);
        
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
        
        if (dailySessionDoc.exists()) {
          const existingData = dailySessionDoc.data();
          transaction.update(dailySessionRef, {
            minutesStudied: (existingData.minutesStudied || 0) + minutesStudied,
            lastSessionAt: now,
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
  }, [authUser, db, onTimeUpdate, isSaving]);

  useEffect(() => {
    let interval = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prevTimeLeft => {
          const newTimeLeft = prevTimeLeft - 1;
          
          // Accumulate elapsed time
          unsavedSecondsRef.current += 1;

          // Every full minute → save
          if (unsavedSecondsRef.current >= 60) {
            handleSaveTime(unsavedSecondsRef.current);
            unsavedSecondsRef.current = 0; // reset
          }

          // Check if timer finished
          if (newTimeLeft <= 0) {
            // Session ended → save leftover time if any
            if (unsavedSecondsRef.current > 0) {
              handleSaveTime(unsavedSecondsRef.current);
              unsavedSecondsRef.current = 0;
            }
            setIsRunning(false);
            setIsSessionActive(false);
          }

          return newTimeLeft;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, timeLeft, handleSaveTime]); // Fixed dependencies

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    setIsRunning(true);
    setIsSessionActive(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    // Save any unsaved time before resetting
    if (unsavedSecondsRef.current > 0) {
      handleSaveTime(unsavedSecondsRef.current);
      unsavedSecondsRef.current = 0;
    }
    
    setIsRunning(false);
    setIsSessionActive(false);
    setTimeLeft(selectedDuration * 60);
  };

  const selectDuration = (duration) => {
    if (!isSessionActive) {
      setSelectedDuration(duration);
      setTimeLeft(duration * 60);
    }
  };
  
  const getCurrentRewards = () => {
    const current = durations.find(d => d.value === selectedDuration);
    return current || durations[1];
  };

  const progress = ((selectedDuration * 60 - timeLeft) / (selectedDuration * 60)) * 100;

  return (
    <div className="w-full h-full bg-slate-800 rounded-lg p-6 flex flex-col justify-between text-slate-100 relative">
      {!isSessionActive ? (
        /* Timer Setup */
        <>
          <div className="text-left">
            <h2 className="text-xl font-semibold mb-1 text-slate-100">⚔️ Study Timer</h2>
            <p className="text-slate-400 text-sm">Choose your battle session</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center space-y-4">
            {/* Duration Selection */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {durations.map((duration) => (
                <button
                  key={duration.value}
                  onClick={() => selectDuration(duration.value)}
                  className={`p-3 rounded-lg transition-all font-medium ${
                    selectedDuration === duration.value
                      ? 'bg-slate-700 text-slate-100 border border-slate-600'
                      : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {duration.label}
                </button>
              ))}
            </div>

            {/* Reward Preview */}
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Session rewards:</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-1">
                  <span className="text-green-400 font-medium">+{getCurrentRewards().xp}</span>
                  <span className="text-slate-400 text-xs">XP</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-red-400 font-medium">{getCurrentRewards().damage}</span>
                  <span className="text-slate-400 text-xs">DMG</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={startTimer}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Start Session
          </button>
        </>
      ) : (
        /* Active Timer */
        <>
          <div className="text-left">
            <h2 className="text-lg font-semibold mb-1 text-slate-100">Session Active</h2>
            <p className="text-slate-400 text-sm">Stay focused to maximize rewards</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center">
            {/* Timer Display */}
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-100">{formatTime(timeLeft)}</div>
                  <div className="text-slate-400 text-xs mt-1">{Math.round(progress)}%</div>
                </div>
              </div>
              {/* Progress ring */}
              <svg className="absolute inset-0 w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  stroke="transparent"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  stroke="#ef4444"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress / 100)}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
            </div>

            {/* Live Stats */}
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg w-full max-w-xs">
              <p className="text-sm text-slate-400 mb-2 text-center">Earning per minute:</p>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-1">
                  <span className="text-green-400 font-medium">+{Math.round(getCurrentRewards().xp / selectedDuration)}</span>
                  <span className="text-slate-400">XP</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-red-400 font-medium">{Math.round(getCurrentRewards().damage / selectedDuration)}</span>
                  <span className="text-slate-400">DMG</span>
                </div>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={isRunning ? pauseTimer : startTimer}
              className={`flex-1 font-medium py-3 rounded-lg transition-colors ${
                isRunning 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' 
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {isRunning ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={resetTimer}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-3 rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>
        </>
      )}

      {/* <SimplePomodoroTimer /> */}
    </div>
  );
}

export default Timer;