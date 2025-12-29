// utils/boosterService.js
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../api/firebase';

export async function activateBooster(userId, booster, boosterIndex) {
  console.log('🔍 Activating booster:', { userId, boosterIndex, booster });
  
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.error('❌ User document does not exist');
      throw new Error('User data not found');
    }
    
    const userData = userSnap.data();
    console.log('📊 User data:', { 
      hasSavedBoosters: !!userData.savedBoosters,
      savedBoostersLength: userData.savedBoosters?.length,
      hasActiveBooster: !!userData.activeBooster 
    });

    // Check if there's already an active booster
    if (userData.activeBooster && userData.activeBooster.endsAt > Date.now()) {
      throw new Error('You already have an active booster!');
    }

    const savedBoosters = userData.savedBoosters || [];
    console.log('💾 Saved boosters:', savedBoosters);
    
    if (boosterIndex < 0 || boosterIndex >= savedBoosters.length) {
      console.error('❌ Invalid booster index:', { boosterIndex, length: savedBoosters.length });
      throw new Error(`Booster not found at index ${boosterIndex}`);
    }

    const boosterToActivate = savedBoosters[boosterIndex];
    console.log('🎯 Booster to activate:', boosterToActivate);

    if (!boosterToActivate) {
      throw new Error('Booster not found');
    }

    // Remove the booster from savedBoosters by rebuilding the array
    const newSavedBoosters = savedBoosters.filter((_, index) => index !== boosterIndex);
    console.log('📝 New saved boosters:', newSavedBoosters);

    // Set active booster
    const now = Date.now();
    const updateData = {
      activeBooster: {
        type: boosterToActivate.type,
        multiplier: boosterToActivate.multiplier,
        startedAt: now,
        endsAt: now + (boosterToActivate.duration * 60 * 1000)
      },
      savedBoosters: newSavedBoosters
    };
    
    console.log('⬆️ Updating with:', updateData);
    await updateDoc(userRef, updateData);

    console.log('✅ Booster activated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to activate booster:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export async function getActiveBooster(userId) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const activeBooster = userSnap.data()?.activeBooster;

  if (!activeBooster || activeBooster.endsAt <= Date.now()) {
    return null;
  }

  return activeBooster;
}

export async function clearExpiredBooster(userId) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    activeBooster: null
  });
}