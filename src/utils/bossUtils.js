function getNextBossSpawnTime(lastDeathTime) {
  const SCHEDULED_SPAWNS = ["06:00", "12:00", "18:00", "00:00"]; // UTC hours
  const MIN_COOLDOWN_HOURS = 4; // Minimum time between bosses
  
  const earliestNextSpawn = lastDeathTime + (MIN_COOLDOWN_HOURS * 60 * 60 * 1000);
  
  // Find next scheduled spawn after the cooldown period
  const nextScheduledSpawn = getNextScheduledTime(SCHEDULED_SPAWNS, earliestNextSpawn);
  
  return nextScheduledSpawn;
}

function getNextScheduledTime(scheduledHours, afterTimestamp) {
  const afterDate = new Date(afterTimestamp);
  const currentDay = new Date(afterDate);
  
  // Check remaining spawns today
  for (const hourString of scheduledHours) {
    const [hour] = hourString.split(':').map(Number);
    const spawnTime = new Date(currentDay);
    spawnTime.setUTCHours(hour, 0, 0, 0);
    
    if (spawnTime.getTime() > afterTimestamp) {
      return spawnTime.getTime();
    }
  }
  
  // No more spawns today, get first spawn tomorrow
  const tomorrow = new Date(currentDay);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(parseInt(scheduledHours[0].split(':')[0]), 0, 0, 0);
  
  return tomorrow.getTime();
}


export const handleBossDefeat = async (transaction, partyRef, currentBoss, defeatTime) => {
  // Save defeat results
  // const lastBossResults = createDefeatResults(currentBoss, defeatTime);
  
  // Calculate next spawn time
  const nextSpawnTime = getNextBossSpawnTime(defeatTime.getTime());

  // Update party with defeat info
  transaction.update(partyRef, {
    'currentBoss.isAlive': false,
    'currentBoss.defeatedAt': defeatTime,
    'nextBossSpawnsAt': new Date(nextSpawnTime),
    // 'lastBossResults': lastBossResults
  });
  
  // Queue member reset (don't do it in transaction)
  // setTimeout(() => resetAllMemberDamage(partyRef.id), 1000);
};

// export const resetAllMemberDamage = async (partyId) => {
//   // Use batch writes to reset all members' currentBossDamage
//   const batch = writeBatch(db);
//   // ... batch operations
//   await batch.commit();
// };

