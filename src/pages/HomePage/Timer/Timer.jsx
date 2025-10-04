// TimerWithAutosave.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { runTransaction, doc, increment, collection, query, getDocs } from 'firebase/firestore';

import { calculateLevelUp, PLAYER_CONFIG } from '../../../utils/playerStatsUtils';
import { handleBossDefeat } from '../../../utils/bossUtils';

import { useAuthContext } from '../../../contexts/AuthContext';


function Timer({
  authUser,
  db,
  deckId = null,
  onTimeUpdate = null,
}) {
  const {updateBossHealth, updateMemberDamage, updateLastBossResults, resetAllMembersBossDamage, updateUserProfile} = useAuthContext();
  

  const durations = [
    // { label: '1 min', value: 1, damage: 10, xp: 10, mana: 3, health: 1 },

    { label: '15 min', value: 15, damage: 150, xp: 150, mana: 45, health: 15 },
    { label: '25 min', value: 25, damage: 250, xp: 250, mana: 75, health: 25  },
    { label: '45 min', value: 45, damage: 450, xp: 450, mana: 135, health: 45  },
    { label: '60 min', value: 60, damage: 600, xp: 600, mana: 180, health: 60  },
  ];


  const [selectedDuration, setSelectedDuration] = useState(25);
  const [isRunning, setIsRunning] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  // Refs for stable timers and saving
  const sessionTimerRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const sessionSecondsRef = useRef(0);
  const lastSaveRef = useRef(0);
  const isSavingRef = useRef(false);
  const audioRef = useRef(null);

  // Initialize alarm sound
  useEffect(() => {
    // Using a free alarm sound from freesound.org via CDN
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Save logic (unchanged)
  const saveStudyTime = useCallback(async (secondsToSave) => {
    if (!authUser || secondsToSave < 60 || isSavingRef.current) return;

    const fullMinutes = Math.floor(secondsToSave / 60);
    if (fullMinutes <= 0) return;

    isSavingRef.current = true;

    let newBossHealth = null;
    let newMemberDamage = null;
    let newExp, newLevel, newHealth, newMana;
    let now;

    try {
      now = new Date();
      const dateKey = now.toLocaleDateString('en-CA');

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', authUser.uid);
        const dailySessionRef = doc(db, 'users', authUser.uid, 'dailySessions', dateKey);

        const userDoc = await transaction.get(userRef);
        const dailyDoc = await transaction.get(dailySessionRef);

        if (userDoc.exists()) {
          const currentData = userDoc.data();

          let partyDoc = null;
          let memberRef = null;
          let memberDoc = null;
          let partyRef = null;
          let allMembersSnapshot = null;
          
          if (currentData.currentPartyId) {
            partyRef = doc(db, 'parties', currentData.currentPartyId);
            partyDoc = await transaction.get(partyRef);
            
            memberRef = doc(db, 'parties', currentData.currentPartyId, 'members', authUser.uid);
            memberDoc = await transaction.get(memberRef);
            
            const membersRef = collection(db, 'parties', currentData.currentPartyId, 'members');
            allMembersSnapshot = await getDocs(membersRef);
          }

          const currentExp = currentData.exp || 0;
          const currentLevel = currentData.level || 1;
          const currentHealth = currentData.health || 0;
          const currentMana = currentData.mana || 0;

          newExp = currentExp + (fullMinutes * PLAYER_CONFIG.EXP_PER_MINUTE);
          newHealth = Math.min(
            PLAYER_CONFIG.BASE_HEALTH, 
            currentHealth + (fullMinutes * PLAYER_CONFIG.HEALTH_PER_MINUTE)
          );

          newMana = Math.min(
            PLAYER_CONFIG.BASE_MANA, 
            currentMana + (fullMinutes * PLAYER_CONFIG.MANA_PER_MINUTE)
          );

          const {newLevel: calculatedLevel, leveledUp, coinBonus} = calculateLevelUp(currentExp, newExp, currentLevel);
          newLevel = calculatedLevel;

          const baseDamage = fullMinutes * 10;
          const levelMultiplier = 1 + (newLevel * 0.05);
          const totalDamage = Math.floor(baseDamage * levelMultiplier);

          const updateData = {
            lastStudyDate: now,
            lastActiveAt: now,
            exp: newExp,
            level: newLevel,
            health: newHealth,
            mana: newMana,
          };

          if (leveledUp) {
            updateData.coins = increment(coinBonus);
          }

          transaction.update(userRef, updateData);

          if (currentData.currentPartyId && partyDoc && partyDoc.exists()) {
            const partyData = partyDoc.data();
            const currentBoss = partyData.currentBoss;
            
            if (currentBoss) {
              const isBossAlive = currentBoss.isAlive !== false && currentBoss.currentHealth > 0;
              
              const memberData = memberDoc?.exists() ? memberDoc.data() : null;
              newMemberDamage = (memberData?.currentBossDamage || 0) + totalDamage;
              const newMemberStudyMinutes = (memberData?.currentBossStudyMinutes || 0) + fullMinutes;
              
              if (isBossAlive) {
                newBossHealth = Math.max(0, currentBoss.currentHealth - totalDamage);
                
                transaction.update(partyRef, {
                  'currentBoss.currentHealth': newBossHealth,
                  'currentBoss.lastDamageAt': now,
                });

                if (memberDoc && memberDoc.exists()) {
                  transaction.update(memberRef, {
                    currentBossDamage: newMemberDamage,
                    currentBossStudyMinutes: newMemberStudyMinutes,
                    lastDamageAt: now,
                    lastStudyAt: now,
                    exp: newExp,
                    level: newLevel,
                    health: newHealth,
                    mana: newMana
                  });
                } else {
                  transaction.set(memberRef, {
                    displayName: currentData.displayName || 'Anonymous',
                    joinedAt: now,
                    currentBossDamage: newMemberDamage,
                    currentBossStudyMinutes: newMemberStudyMinutes,
                    lastDamageAt: now,
                    lastStudyAt: now,
                    exp: newExp,        
                    level: newLevel,    
                    health: newHealth,  
                    mana: newMana
                  });
                }

                if (newBossHealth <= 0) {
                  console.log('Boss defeated!', currentBoss.name);
                  await handleBossDefeat(
                    transaction, 
                    partyRef, 
                    partyDoc, 
                    currentBoss, 
                    now,
                    allMembersSnapshot,
                    authUser.uid,
                    newMemberDamage,
                    newMemberStudyMinutes,
                    updateLastBossResults,
                    resetAllMembersBossDamage
                  );
                }
              } else {
                if (memberDoc && memberDoc.exists()) {
                  transaction.update(memberRef, {
                    lastStudyAt: now,
                    exp: newExp,
                    level: newLevel,
                    health: newHealth,
                    mana: newMana
                  });
                } else {
                  transaction.set(memberRef, {
                    displayName: currentData.displayName || 'Anonymous',
                    joinedAt: now,
                    lastStudyAt: now,
                    exp: newExp,        
                    level: newLevel,    
                    health: newHealth,  
                    mana: newMana
                  });
                }
              }
            }
          }

        } else {
          newExp = fullMinutes * PLAYER_CONFIG.EXP_PER_MINUTE;
          const { newLevel: calculatedNewLevel } = calculateLevelUp(0, newExp, 1);
          newLevel = calculatedNewLevel;
          
          transaction.set(userRef, {
            email: authUser.email,
            displayName: authUser.displayName || 'Anonymous',
            createdAt: now,
            lastActiveAt: now,
            lastStudyDate: now,
            exp: newExp,
            level: newLevel,
            coins: 0,
            stats: { totalReviews:0, weeklyReviews:0, currentStreak:0, longestStreak:0, totalDecks:0, totalCards:0 },
            health: PLAYER_CONFIG.BASE_HEALTH,      
            mana: PLAYER_CONFIG.BASE_MANA, 
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

      if (newBossHealth !== null) {
        updateBossHealth(newBossHealth);
      }
      if (newMemberDamage !== null) {
        updateMemberDamage(authUser.uid, newMemberDamage);
      }

      updateUserProfile({
        exp: newExp,
        level: newLevel,
        health: newHealth,
        mana: newMana,
        lastStudyDate: now,
        lastActiveAt: now
      });

      
      if (onTimeUpdate) onTimeUpdate(fullMinutes);
    } catch (err) {
      console.error('Error saving study time:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, [authUser, db, onTimeUpdate, updateBossHealth, updateMemberDamage, updateUserProfile, updateLastBossResults, resetAllMembersBossDamage]);

  // Handle timer completion
  const handleCompletion = useCallback(() => {
    console.log('Timer completed!');
    
    // Stop the timer
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
    
    setIsRunning(false);
    
    // Play alarm sound
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
    
    // Save any remaining time
    const remaining = sessionSecondsRef.current - lastSaveRef.current;
    if (remaining > 0) {
      saveStudyTime(remaining);
      lastSaveRef.current = sessionSecondsRef.current;
    }
    
    // Show completion screen
    setShowCompletion(true);
  }, [saveStudyTime]);

  // Timer start / pause / reset
  const startTimer = () => {
    if (!authUser) return;
    setIsRunning(true);
    setIsSessionActive(true);
    setShowCompletion(false);

    if (!sessionTimerRef.current) {
      sessionTimerRef.current = setInterval(() => {
        sessionSecondsRef.current += 1;
        setTimeElapsed(prev => {
          const newElapsed = prev + 1;
          
          // Check if timer is complete
          if (newElapsed >= selectedDuration * 60) {
            handleCompletion();
            return selectedDuration * 60; // Cap at max duration
          }
          
          return newElapsed;
        });

        // Save only full minutes
        const secondsToSave = sessionSecondsRef.current - lastSaveRef.current;
        if (secondsToSave >= 60) {
          const fullMinutes = Math.floor(secondsToSave / 60);
          saveStudyTime(fullMinutes * 60);
          lastSaveRef.current += fullMinutes * 60;
        }
      }, 500);
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
    if (sessionTimerRef.current) { 
      clearInterval(sessionTimerRef.current); 
      sessionTimerRef.current = null; 
    }
    if (saveIntervalRef.current) { 
      clearInterval(saveIntervalRef.current); 
      saveIntervalRef.current = null; 
    }

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
    setShowCompletion(false);
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

  const progress = Math.min((timeElapsed / (selectedDuration * 60)) * 100, 100);
  const timeLeft = Math.max(selectedDuration * 60 - timeElapsed, 0);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  };

  // Cleanup on unmount
  useEffect(() => () => resetTimer(), []);

  // Render
  return (
    <div className="w-full h-full max-h-[450px] bg-slate-800 rounded-lg p-6 flex flex-col justify-between text-slate-100 relative">
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
      ) : showCompletion ? (
        <>
          <div className="text-center flex-1 flex flex-col justify-center items-center space-y-4">
            <div className="text-6xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold text-green-400">Session Complete!</h2>
            <p className="text-slate-300">Great work on your {selectedDuration} minute session</p>
            
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg w-full max-w-xs">
              <p className="text-sm text-slate-400 mb-3">Rewards Earned:</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Experience</span>
                  <span className="text-green-400 font-bold">+{getCurrentRewards().xp} XP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Boss Damage</span>
                  <span className="text-red-400 font-bold">{getCurrentRewards().damage} DMG</span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={resetTimer} className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-3 rounded-lg">
            Start New Session
          </button>
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
                  <span className="text-yellow-500 font-medium">{Math.round(getCurrentRewards().xp/selectedDuration)}</span>
                  <span className="text-slate-400">XP</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-blue-500 font-medium">{Math.round(getCurrentRewards().mana/selectedDuration)}</span>
                  <span className="text-slate-400">MANA</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-green-400 font-medium">{Math.round(getCurrentRewards().health/selectedDuration)}</span>
                  <span className="text-slate-400">HP</span>
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