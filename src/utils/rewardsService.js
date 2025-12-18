import { doc, setDoc, arrayUnion, increment, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../api/firebase';

/**
 * Applies session rewards to the user's Firestore document
 * Safely handles users without existing reward fields
 * @param {string} userId - The user's Firebase Auth ID
 * @param {Object} rewards - Rewards object from getSessionRewards()
 * @returns {Promise<void>}
 */
export async function applyRewardsToUser(userId, rewards) {
  const userRef = doc(db, 'users', userId);
  
  // Build the update object
  const updates = {};
  
  // 1. Add bonus XP
  if (rewards.bonusXP > 0) {
    updates.exp = increment(rewards.bonusXP);
  }
  
  // 2. Unlock cosmetics (titles and avatars)
  const newTitles = rewards.cosmetics
    .filter(c => c.type === 'title')
    .map(c => c.id);
  
  const newAvatars = rewards.cosmetics
    .filter(c => c.type === 'avatar')
    .map(c => c.id);
  
  if (newTitles.length > 0) {
    updates.unlockedTitles = arrayUnion(...newTitles);
  }
  
  if (newAvatars.length > 0) {
    updates.unlockedAvatars = arrayUnion(...newAvatars);
  }
  
  // 3. Save boosters to inventory
  if (rewards.boosters.length > 0) {
    const boostersToSave = rewards.boosters.map(b => ({
      ...b,
      savedAt: Timestamp.now(),
      // Convert expiresIn (hours) to actual expiration timestamp
      expiresAt: Timestamp.fromMillis(
        Date.now() + (b.expiresIn * 60 * 60 * 1000)
      )
    }));
    
    updates.savedBoosters = arrayUnion(...boostersToSave);
  }
  
  // Apply all updates with merge: true to create fields if they don't exist
  try {
    await setDoc(userRef, updates, { merge: true });
    console.log('✅ Rewards applied successfully:', updates);
  } catch (error) {
    console.error('❌ Error applying rewards:', error);
    throw error;
  }
}

/**
 * Activates a booster from the user's saved boosters
 * @param {string} userId - The user's Firebase Auth ID
 * @param {Object} booster - The booster to activate
 * @returns {Promise<void>}
 */
export async function activateBooster(userId, booster) {
  const userRef = doc(db, 'users', userId);
  
  const activeBooster = {
    type: booster.type,
    multiplier: booster.multiplier,
    duration: booster.duration,
    activatedAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(
      Date.now() + (booster.duration * 60 * 1000)
    )
  };
  
  try {
    // Note: You'll need to handle removing from savedBoosters separately
    // This requires reading the document first, then updating
    await updateDoc(userRef, {
      activeBoosters: arrayUnion(activeBooster)
    });
    
    console.log('✅ Booster activated:', activeBooster);
  } catch (error) {
    console.error('❌ Error activating booster:', error);
    throw error;
  }
}

/**
 * Checks for expired boosters and removes them
 * @param {string} userId - The user's Firebase Auth ID
 * @returns {Promise<void>}
 */
export async function cleanupExpiredBoosters(userId) {
  // This would require reading the user doc first,
  // filtering out expired boosters, then updating
  // Consider implementing this as a Cloud Function
  // that runs periodically or on user login
}