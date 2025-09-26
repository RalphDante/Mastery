// TimerWithAutosave.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { runTransaction, doc, increment } from 'firebase/firestore';

import { calculateLevelUp, LEVEL_CONFIG } from '../../../utils/levelUtils';

function Timer({
  authUser,
  db,
  deckId = null,
  onTimeUpdate = null,
}) {
  const durations = [
    { label: '15 min', value: 15, damage: 30, xp: 25 },
    { label: '25 min', value: 25, damage: 50, xp: 40 },
    { label: '45 min', value: 45, damage: 90, xp: 75 },
    { label: '60 min', value: 60, damage: 120, xp: 100 },
  ];

  const [selectedDuration, setSelectedDuration] = useState(25);
  const [isRunning, setIsRunning] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); // total seconds elapsed for UI

  // --- Refs for stable timers and saving ---
  const sessionTimerRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const sessionSecondsRef = useRef(0); // accumulates total seconds for saving
  const lastSaveRef = useRef(0);
  const isSavingRef = useRef(false);

  // --- Save logic ---
  const saveStudyTime = useCallback(async (secondsToSave) => {
    if (!authUser || secondsToSave < 60 || isSavingRef.current) return; // ignore < 1 min

    const fullMinutes = Math.floor(secondsToSave / 60);
    if (fullMinutes <= 0) return;

    isSavingRef.current = true;
    try {
      const now = new Date();
      const dateKey = now.toLocaleDateString('en-CA');

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', authUser.uid);
        
        
        const dailySessionRef = doc(db, 'users', authUser.uid, 'dailySessions', dateKey);

        const userDoc = await transaction.get(userRef);
        const dailyDoc = await transaction.get(dailySessionRef);

        if (userDoc.exists()) {

          
          const currentData = userDoc.data();

          // Get party reference if user has one
          let partyDoc = null;
          if (userDoc.exists()) {
            const currentData = userDoc.data();
            if (currentData.currentPartyId) {
              const partyRef = doc(db, 'parties', currentData.currentPartyId);
              partyDoc = await transaction.get(partyRef);
            }
          }

          const currentExp = currentData.exp || 0;
          const currentLevel = currentData.level || 1;
          const newExp = currentExp + (fullMinutes * LEVEL_CONFIG.EXP_PER_MINUTE);
          const {newLevel, leveledUp, coinBonus} = calculateLevelUp(currentExp, newExp, currentLevel);

          // Calculate boss damage (10 damage per minute + level multiplier)
          const baseDamage = fullMinutes * 10;
          const levelMultiplier = 1 + (newLevel * 0.05); // 5% more damage per level
          const totalDamage = Math.floor(baseDamage * levelMultiplier);


          const updateData = {
            lastStudyDate: now,
            lastActiveAt: now,
            exp: newExp,
            level: newLevel
          };

          if (leveledUp) {
            updateData.coins = increment(coinBonus);
            // Could trigger UI notification here
          }

          transaction.update(userRef, updateData);

          // Deal damage to boss if user has party
          if (currentData.currentPartyId) {
            const partyRef = doc(db, 'parties', currentData.currentPartyId);
            
            if (partyDoc.exists()) {
              const partyData = partyDoc.data();
              const currentBoss = partyData.currentBoss;
              
              if (currentBoss && currentBoss.currentHealth > 0) {
                const newBossHealth = Math.max(0, currentBoss.currentHealth - totalDamage);
                
                transaction.update(partyRef, {
                  'currentBoss.currentHealth': newBossHealth,
                  'currentBoss.lastDamageAt': now,
                  'currentBoss.lastDamageBy': authUser.uid
                });

                // TODO: Handle boss defeated logic here
                if (newBossHealth === 0) {
                  // Boss defeated - spawn new boss, distribute rewards, etc.
                  console.log('Boss defeated!', currentBoss.name);
                }
              }
            }
          }

        } else {
          const newExp = fullMinutes * LEVEL_CONFIG.EXP_PER_MINUTE;
          const { newLevel } = calculateLevelUp(0, newExp, 1);
          
          transaction.set(userRef, {
            email: authUser.email,
            displayName: authUser.displayName || 'Anonymous',
            createdAt: now,
            lastActiveAt: now,
            lastStudyDate: now,
            exp: newExp,
            level: newLevel,
            coins: 0, // Add coins field
            stats: { totalReviews:0, weeklyReviews:0, currentStreak:0, longestStreak:0, totalDecks:0, totalCards:0 }
          });
        }

        if (dailyDoc.exists()) {
          const existingData = dailyDoc.data();
          transaction.update(dailySessionRef, {
            minutesStudied: (existingData.minutesStudied || 0) + fullMinutes,
            lastSessionAt: now,
          });
        } else {
          transaction.set(dailySessionRef, {
            date: now,
            firstSessionAt: now,
            lastSessionAt: now,
            minutesStudied: fullMinutes,
            accuracy: 0,
            cardsCorrect: 0,
            cardsReviewed: 0,
            crammingSessions: 0,
          });
        }
      });

      if (onTimeUpdate) onTimeUpdate(fullMinutes);
    } catch (err) {
      console.error('Error saving study time:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, [authUser, db, onTimeUpdate]);

  // --- Timer start / pause / reset ---
  const startTimer = () => {
    if (!authUser) return;
    setIsRunning(true);
    setIsSessionActive(true);

    // session timer increments every second
    if (!sessionTimerRef.current) {
      sessionTimerRef.current = setInterval(() => {
        sessionSecondsRef.current += 1;
        setTimeElapsed(prev => prev + 1);

        // Save only full minutes
        const secondsToSave = sessionSecondsRef.current - lastSaveRef.current;
        if (secondsToSave >= 60) {
          const fullMinutes = Math.floor(secondsToSave / 60);
          saveStudyTime(fullMinutes * 60);
          lastSaveRef.current += fullMinutes * 60;
        }
      }, 200);
    }

    // autosave every 60 seconds
    // if (!saveIntervalRef.current) {
    //   saveIntervalRef.current = setInterval(() => {
    //     const secondsToSave = sessionSecondsRef.current - lastSaveRef.current;
    //     if (secondsToSave > 0) {
    //       saveStudyTime(secondsToSave);
    //       lastSaveRef.current = sessionSecondsRef.current;
    //     }
    //   }, 60_000); // 60 seconds
    // }
  };

  const pauseTimer = () => {
    setIsRunning(false);
    if (sessionTimerRef.current) { clearInterval(sessionTimerRef.current); sessionTimerRef.current = null; }
    if (saveIntervalRef.current) { clearInterval(saveIntervalRef.current); saveIntervalRef.current = null; }

    // Save remaining unsaved seconds
    const remaining = sessionSecondsRef.current - lastSaveRef.current;
    if (remaining > 0) {
      saveStudyTime(remaining);
      lastSaveRef.current = sessionSecondsRef.current;
    }
  };

  const resetTimer = () => {
    pauseTimer();
    setIsSessionActive(false);
    setTimeElapsed(0);
    sessionSecondsRef.current = 0;
    lastSaveRef.current = 0;
  };

  const selectDuration = (duration) => {
    if (!isSessionActive) {
      setSelectedDuration(duration);
      setTimeElapsed(0);
      sessionSecondsRef.current = 0;
      lastSaveRef.current = 0;
    }
  };

  const getCurrentRewards = () => durations.find(d => d.value === selectedDuration) || durations[1];

  const progress = (timeElapsed / (selectedDuration * 60)) * 100;
  const timeLeft = Math.max(selectedDuration * 60 - timeElapsed, 0);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  };

  // --- Cleanup on unmount ---
  useEffect(() => () => resetTimer(), []);

  // --- Render ---
  return (
    <div className="w-full h-full bg-slate-800 rounded-lg p-6 flex flex-col justify-between text-slate-100 relative">
      {!isSessionActive ? (
        <>
          <div className="text-left">
            <h2 className="text-xl font-semibold mb-1">⚔️ Study Timer</h2>
            <p className="text-slate-400 text-sm">Choose your battle session</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center space-y-4">
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {durations.map(d => (
                <button key={d.value} onClick={() => selectDuration(d.value)}
                  className={`p-3 rounded-lg font-medium ${selectedDuration===d.value?'bg-slate-700 text-slate-100':'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}>
                  {d.label}
                </button>
              ))}
            </div>

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

          <button onClick={startTimer} className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3 rounded-lg">Start Session</button>
        </>
      ) : (
        <>
          <div className="text-left">
            <h2 className="text-lg font-semibold mb-1">Session Active</h2>
            <p className="text-slate-400 text-sm">Stay focused to maximize rewards</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold">{formatTime(timeLeft)}</div>
                  <div className="text-slate-400 text-xs mt-1">{Math.round(progress)}%</div>
                </div>
              </div>
              <svg className="absolute inset-0 w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" stroke="transparent" strokeWidth="4" fill="none"/>
                <circle cx="50" cy="50" r="46" stroke="#ef4444" strokeWidth="4" fill="none" strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*46}`} strokeDashoffset={`${2*Math.PI*46*(1-progress/100)}`}
                  className="transition-all duration-1000 ease-out"/>
              </svg>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg w-full max-w-xs">
              <p className="text-sm text-slate-400 mb-2 text-center">Earning per minute:</p>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-1">
                  <span className="text-green-400 font-medium">{Math.round(getCurrentRewards().xp/selectedDuration)}</span>
                  <span className="text-slate-400">XP</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-red-400 font-medium">{Math.round(getCurrentRewards().damage/selectedDuration)}</span>
                  <span className="text-slate-400">DMG</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button onClick={isRunning ? pauseTimer : startTimer}
              className={`flex-1 font-medium py-3 rounded-lg ${isRunning?'bg-slate-700 text-slate-200':'bg-green-600 text-white hover:bg-green-500'}`}>
              {isRunning?'Pause':'Resume'}
            </button>
            <button onClick={resetTimer} className="flex-1 bg-slate-700 text-slate-200 hover:bg-slate-600 py-3 rounded-lg">Reset</button>
          </div>
        </>
      )}
    </div>
  );
}

export default Timer;
