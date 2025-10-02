import { doc, updateDoc, getDocs, collection, query, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../api/firebase';
import { PLAYER_CONFIG, getTotalExpForLevel, getExpProgressForCurrentLevel } from './playerStatsUtils';

const bosses = [
  { bossNumber: 1, name: "Amnesiac Ooze", maxHealth: 500, damage: 15 },
  { bossNumber: 2, name: "Conundrum Crawler", maxHealth: 800, damage: 20 },
  { bossNumber: 3, name: "Mnemonic Dragon", maxHealth: 1200, damage: 25 },
  { bossNumber: 4, name: "Ancient Scholar", maxHealth: 1500, damage: 30 }
];

/**
 * Check if it's time to spawn the next boss and spawn it
 * Call this on user login after fetching party data
*/
export const checkAndSpawnNextBoss = async (partyId, partyData) => {
  if (!partyId || !partyData) return { spawned: false };

  try {
    const currentBoss = partyData.currentBoss;
    const nextBossSpawnsAt = partyData.nextBossSpawnsAt;

    // Check if boss is dead and there's a scheduled spawn time
    if (!currentBoss?.isAlive && nextBossSpawnsAt) {
      const now = new Date();
      const spawnTime = nextBossSpawnsAt.toDate ? nextBossSpawnsAt.toDate() : new Date(nextBossSpawnsAt);

      // Check if it's past the spawn time
      if (now >= spawnTime) {
        console.log('⏰ Spawn time reached! Spawning next boss...');

        // Calculate next boss number (rotate through 1-4)
        const nextBossNumber = (currentBoss.bossNumber % 4) + 1;
        const nextBossData = bosses[nextBossNumber - 1];

        if (!nextBossData) {
          console.error('Boss data not found for boss number:', nextBossNumber);
          return { spawned: false };
        }

        // Spawn the new boss
        const partyRef = doc(db, 'parties', partyId);
        await updateDoc(partyRef, {
          'currentBoss': {
            bossNumber: nextBossNumber,
            name: nextBossData.name,
            maxHealth: nextBossData.maxHealth,
            currentHealth: nextBossData.maxHealth,
            createdAt: serverTimestamp(),
            isAlive: true,
            lastDamageAt: null
          },
          'nextBossSpawnsAt': null // Clear the spawn timer
        });

        console.log(`🎮 Boss spawned! ${nextBossData.name} (Boss #${nextBossNumber})`);
        console.log(`💪 Health: ${nextBossData.maxHealth} | Damage: ${nextBossData.damage}`);

        return {
          spawned: true,
          bossNumber: nextBossNumber,
          bossName: nextBossData.name,
          bossData: nextBossData
        };
      } else {
        // Not time yet
        const timeUntilSpawn = spawnTime - now;
        const hoursUntilSpawn = timeUntilSpawn / (1000 * 60 * 60);
        
        console.log(`⏳ Next boss spawns in ${hoursUntilSpawn.toFixed(1)} hours`);
        return { 
          spawned: false, 
          waitTime: timeUntilSpawn,
          hoursRemaining: hoursUntilSpawn 
        };
      }
    }

    // Boss is already alive or no spawn scheduled
    return { spawned: false, reason: 'boss_already_alive_or_no_spawn_scheduled' };

  } catch (error) {
    console.error('Error checking/spawning boss:', error);
    throw error;
  }
};


const handlePlayerDeath = async (userId, partyId, userData, deathCause = 'boss') => {
  try {
    const currentExp = userData.exp || 0;
    const currentLevel = userData.level || 1;
    const currentMana = userData.mana || 0;

    const EXP_LOSS_PERCENTAGE = 1; // 75% of current level progress
    const { current: progressExp } = getExpProgressForCurrentLevel(currentExp, currentLevel);
    const expToLose = Math.floor(progressExp * EXP_LOSS_PERCENTAGE);
    const expForCurrentLevel = getTotalExpForLevel(currentLevel);
    const newExp = Math.max(expForCurrentLevel, currentExp - expToLose);

    const now = new Date();
    const userRef = doc(db, 'users', userId);
    
    const updateData = {
      health: PLAYER_CONFIG.BASE_HEALTH,
      mana: currentMana,
      exp: newExp,
      lastDeathAt: now,
      reviveCount: increment(1),
      lastDeathCause: deathCause
    };

    await updateDoc(userRef, updateData);

    if (partyId) {
      const memberRef = doc(db, 'parties', partyId, 'members', userId);
      await updateDoc(memberRef, {
        health: PLAYER_CONFIG.BASE_HEALTH,
        mana: currentMana,
        exp: newExp,
        level: currentLevel
      });
    }

    console.log('💀 Player Death:', {
      cause: deathCause,
      expLost: expToLose,
      healthRestored: PLAYER_CONFIG.BASE_HEALTH,
      progressLost: `${EXP_LOSS_PERCENTAGE * 100}%`
    });

    return {
      expLost: expToLose,
      expBefore: currentExp,
      expAfter: newExp,
      healthRestored: PLAYER_CONFIG.BASE_HEALTH,
      levelStayed: currentLevel,
      manaKept: currentMana,
    };
  } catch (error) {
    console.error('❌ Error handling player death:', error);
    throw error;
  }
};

export const checkAndApplyBossAttack = async (userId, partyId, userData, partyData) => {
  if (!userId || !partyId || !userData || !partyData) return;

  try {
    const currentBoss = partyData.currentBoss;
    
    if (!currentBoss?.isAlive) {
      console.log('Boss is dead, no attack');
      return { damaged: false };
    }

    // Check 24-hour immunity for new accounts
    const accountCreatedAt = userData.createdAt;
    if (accountCreatedAt) {
      const accountAge = accountCreatedAt.toDate ? accountCreatedAt.toDate() : new Date(accountCreatedAt);
      const hoursSinceCreation = (new Date() - accountAge) / (1000 * 60 * 60);
      
      if (hoursSinceCreation < 24) {
        console.log(`🛡️ New user immunity: ${(24 - hoursSinceCreation).toFixed(1)} hours remaining`);
        return { damaged: false, newUserImmunity: true, hoursRemaining: 24 - hoursSinceCreation };
      }
    }

    const lastBossAttackAt = userData.lastBossAttackAt;
    const now = new Date();
    let daysSinceLastAttack;
    
    if (!lastBossAttackAt) {
      daysSinceLastAttack = 1;
      console.log('First boss attack (immunity expired)');
    } else {
      const lastAttack = lastBossAttackAt.toDate ? lastBossAttackAt.toDate() : new Date(lastBossAttackAt);
      const millisSinceAttack = now - lastAttack;
      const hoursSinceAttack = millisSinceAttack / (1000 * 60 * 60);
      
      if (hoursSinceAttack < 24) {
        console.log(`Boss attacked ${hoursSinceAttack.toFixed(1)} hours ago, skipping`);
        return { damaged: false };
      }
      
      daysSinceLastAttack = Math.floor(hoursSinceAttack / 24);
    }

    // const bosses = [
    //   { bossNumber: 1, name: "Study Slime", maxHealth: 500, damage: 15 },
    //   { bossNumber: 2, name: "Knowledge Goblin", maxHealth: 800, damage: 20 },
    //   { bossNumber: 3, name: "Wisdom Dragon", maxHealth: 1200, damage: 25 },
    //   { bossNumber: 4, name: "Ancient Scholar", maxHealth: 1500, damage: 30 }
    // ];

    const bossData = bosses[currentBoss.bossNumber - 1];
    if (!bossData) {
      console.error('Boss data not found for boss number:', currentBoss.bossNumber);
      return { damaged: false };
    }

    const totalDamage = bossData.damage * daysSinceLastAttack;
    const currentHealth = userData.health || 100;
    const newHealth = Math.max(0, currentHealth - totalDamage);

    console.log(`💥 Boss Attack! ${userData.displayName} took ${totalDamage} damage (${daysSinceLastAttack} days × ${bossData.damage} dmg)`);
    console.log(`❤️ Health: ${currentHealth} → ${newHealth}`);

    const userRef = doc(db, 'users', userId);
    const memberRef = doc(db, 'parties', partyId, 'members', userId);

    await Promise.all([
      updateDoc(userRef, {
        health: newHealth,
        lastBossAttackAt: now
      }),
      updateDoc(memberRef, {
        health: newHealth
      })
    ]);

    console.log('✅ Boss attack applied successfully');

    // ⚠️ NEW: Check if player died and handle death penalty
    if (newHealth === 0) {
      console.log('💀 User health reached 0!');
      const deathPenalty = await handlePlayerDeath(userId, partyId, userData, 'boss');
      
      return { 
        damaged: true, 
        totalDamage, 
        newHealth: PLAYER_CONFIG.BASE_HEALTH, // They got revived with full health
        daysMissed: daysSinceLastAttack,
        died: true,
        deathPenalty
      };
    }

    return { damaged: true, totalDamage, newHealth, daysMissed: daysSinceLastAttack };

  } catch (error) {
    console.error('❌ Error in boss attack:', error);
    throw error;
  }
};

function getNextBossSpawnTime(lastDeathTime) {
  const SCHEDULED_SPAWNS = ["06:00", "12:00", "18:00", "00:00"];
  const MIN_COOLDOWN_HOURS = 4;
  
  const earliestNextSpawn = lastDeathTime + (MIN_COOLDOWN_HOURS * 60 * 60 * 1000);
  const nextScheduledSpawn = getNextScheduledTime(SCHEDULED_SPAWNS, earliestNextSpawn);
  
  return nextScheduledSpawn;
}

function getNextScheduledTime(scheduledHours, afterTimestamp) {
  const afterDate = new Date(afterTimestamp);
  const currentDay = new Date(afterDate);
  
  for (const hourString of scheduledHours) {
    const [hour] = hourString.split(':').map(Number);
    const spawnTime = new Date(currentDay);
    spawnTime.setUTCHours(hour, 0, 0, 0);
    
    if (spawnTime.getTime() > afterTimestamp) {
      return spawnTime.getTime();
    }
  }
  
  const tomorrow = new Date(currentDay);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(parseInt(scheduledHours[0].split(':')[0]), 0, 0, 0);
  
  return tomorrow.getTime();
}

function calculateFightDuration(bossCreatedAt, defeatedAt) {
  const durationMs = defeatedAt.getTime() - bossCreatedAt.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Handles boss defeat within a Firestore transaction
 * Must be called with member docs already fetched in the transaction
 */

export const handleBossDefeatWithSnapshot = async (
  transaction, 
  partyRef, 
  partyDoc, 
  currentBoss, 
  defeatTime,
  membersSnapshot,
  currentUserId = null, // NEW: ID of user who dealt killing blow
  currentUserDamage = null, // NEW: Their updated damage
  currentUserStudyMinutes = null // NEW: Their updated study minutes
) => {
  try {
    const partyData = partyDoc.data();
    const partyId = partyDoc.id;
    
    // Build rankings from pre-fetched members
    const rankings = [];
    
    membersSnapshot.forEach((memberDoc) => {
      const memberData = memberDoc.data();
      const memberId = memberDoc.id;
      
      // Use updated values for current user, old values for others
      let damage, studyMinutes;
      
      if (memberId === currentUserId && currentUserDamage !== null) {
        damage = currentUserDamage;
        studyMinutes = currentUserStudyMinutes;
      } else {
        damage = memberData.currentBossDamage || 0;
        studyMinutes = memberData.currentBossStudyMinutes || 0;
      }
      
      rankings.push({
        userId: memberId,
        displayName: memberData.displayName || 'Anonymous',
        damage: damage,
        studyMinutes: studyMinutes
      });
    });
    
    // Sort rankings by damage (descending)
    rankings.sort((a, b) => b.damage - a.damage);
    
    // Calculate fight duration
    const fightDuration = calculateFightDuration(
      currentBoss.createdAt.toDate ? currentBoss.createdAt.toDate() : new Date(currentBoss.createdAt),
      defeatTime
    );
    
    // Calculate next boss spawn time
    const nextSpawnTime = getNextBossSpawnTime(defeatTime.getTime());
    
    // Update party with defeat data
    transaction.update(partyRef, {
      'currentBoss.isAlive': false,
      'currentBoss.defeatedAt': defeatTime,
      'nextBossSpawnsAt': new Date(nextSpawnTime),
      'lastBossResults': {
        defeatedAt: defeatTime,
        bossNumber: currentBoss.bossNumber,
        fightDuration: fightDuration,
        rankings: rankings
      }
    });
    
    // Reset all members' current boss damage
    membersSnapshot.forEach((memberDoc) => {
      const memberRef = doc(db, 'parties', partyId, 'members', memberDoc.id);
      transaction.update(memberRef, {
        currentBossDamage: 0,
        currentBossStudyMinutes: 0
      });
    });
    
    console.log(`🎉 Boss defeated! MVP: ${rankings[0]?.displayName} with ${rankings[0]?.damage} damage`);
    
  } catch (error) {
    console.error('Error in handleBossDefeat:', error);
    throw error;
  }
};

export const handleBossDefeat = handleBossDefeatWithSnapshot;