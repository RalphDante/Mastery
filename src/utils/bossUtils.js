import { doc, updateDoc, getDocs, collection, query } from 'firebase/firestore';
import { db } from '../api/firebase';

const bosses = [
  { bossNumber: 1, name: "Study Slime", maxHealth: 500, damage: 15 },
  { bossNumber: 2, name: "Knowledge Goblin", maxHealth: 800, damage: 20 },
  { bossNumber: 3, name: "Wisdom Dragon", maxHealth: 1200, damage: 25 },
  { bossNumber: 4, name: "Ancient Scholar", maxHealth: 1500, damage: 30 }
];

export const checkAndApplyBossAttack = async (userId, partyId, userData, partyData) => {
  if (!userId || !partyId || !userData || !partyData) return;

  try {
    const currentBoss = partyData.currentBoss;
    
    // If boss isn't alive, no damage
    if (!currentBoss?.isAlive) {
      console.log('Boss is dead, no attack');
      return { damaged: false };
    }

    // NEW: Check if user has 24-hour immunity (new accounts)
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
    
    // Calculate days since last boss attack
    let daysSinceLastAttack;
    
    if (!lastBossAttackAt) {
      // First time after immunity expires
      daysSinceLastAttack = 1;
      console.log('First boss attack (immunity expired)');
    } else {
      const lastAttack = lastBossAttackAt.toDate ? lastBossAttackAt.toDate() : new Date(lastBossAttackAt);
      const millisSinceAttack = now - lastAttack;
      const hoursSinceAttack = millisSinceAttack / (1000 * 60 * 60);
      
      // Boss attacks every 24 hours
      if (hoursSinceAttack < 24) {
        console.log(`Boss attacked ${hoursSinceAttack.toFixed(1)} hours ago, skipping`);
        return { damaged: false };
      }
      
      // Calculate full days (24-hour periods)
      daysSinceLastAttack = Math.floor(hoursSinceAttack / 24);
    }

    const bossData = bosses[currentBoss.bossNumber - 1]; // Adjust for 0-based index
    if (!bossData) {
      console.error('Boss data not found for boss number:', currentBoss.bossNumber);
      return { damaged: false };
    }

    // Calculate total damage
    const totalDamage = bossData.damage * daysSinceLastAttack;
    
    // Calculate new health (can't go below 0)
    const currentHealth = userData.health || 100;
    const newHealth = Math.max(0, currentHealth - totalDamage);

    console.log(`💥 Boss Attack! ${userData.displayName} took ${totalDamage} damage (${daysSinceLastAttack} days × ${bossData.damage} dmg)`);
    console.log(`❤️ Health: ${currentHealth} → ${newHealth}`);

    // Update both user and party member
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

    if (newHealth === 0) {
      console.log('💀 User health reached 0!');
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
  membersSnapshot // NEW: Accept pre-fetched snapshot
) => {
  try {
    const partyData = partyDoc.data();
    const partyId = partyDoc.id;
    
    // Build rankings from pre-fetched members
    const rankings = [];
    
    membersSnapshot.forEach((memberDoc) => {
      const memberData = memberDoc.data();
      const damage = memberData.currentBossDamage || 0;
      const studyMinutes = memberData.currentBossStudyMinutes || 0;
      
      rankings.push({
        userId: memberDoc.id,
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

// Keep the old function name for backward compatibility, but it now requires the snapshot
export const handleBossDefeat = handleBossDefeatWithSnapshot;