// utils/partyUtils.js
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc, 
  arrayUnion, 
  runTransaction,
  getDoc, 
  limit
} from 'firebase/firestore';
import { db } from '../api/firebase';

export const PARTY_CONFIG = {
  MAX_MEMBERS: 6,
  DEFAULT_BOSS: {
    name: "Study Slime",
    maxHealth: 500,
    currentHealth: 500,
    isAlive: true,
    bossNumber: 1,
    lastDamageAt: null
  }
};

export const findAvailableParty = async () => {
  try {
    const partiesRef = collection(db, 'parties');
    const q = query(
      partiesRef, 
      where('memberCount', '<', PARTY_CONFIG.MAX_MEMBERS),
      where('isActive', '==', true),
      limit(10) // Get more results to filter in-memory
    );
    
    const querySnapshot = await getDocs(q);
    
    // Filter in-memory for isPublic (handles null/undefined legacy parties)
    const availableParty = querySnapshot.docs.find(doc => {
      const data = doc.data();
      // Treat null/undefined as true (legacy parties were effectively public)
      return data.isPublic !== false;
    });
    
    if (availableParty) {
      return { id: availableParty.id, ...availableParty.data() };
    }
    
    return null;
  } catch (error) {
    console.error('Error finding available party:', error);
    return null;
  }
};

export const createNewParty = async (leaderId, leaderDisplayName, userStats = {}) => {
  try {
    const partyId = `party_${Date.now()}_${leaderId.slice(-6)}`;
    const now = new Date();
    
    await runTransaction(db, async (transaction) => {
      const partyData = {
        title: `${leaderDisplayName}'s Party`,
        id: partyId,
        leaderId,
        memberCount: 1,
        createdAt: now,
        isActive: true,
        isPublic: true,  // ← ADD THIS
        currentBoss: {
          ...PARTY_CONFIG.DEFAULT_BOSS,
          createdAt: now
        }
      };
      
      const partyRef = doc(db, 'parties', partyId);
      transaction.set(partyRef, partyData);
      
      const memberRef = doc(db, 'parties', partyId, 'members', leaderId);
      transaction.set(memberRef, {
        displayName: leaderDisplayName,
        joinedAt: now,
        currentBossDamage: 0,
        currentBossStudyMinutes: 0,
        lastDamageAt: null,
        lastStudyAt: null,
        level: userStats.level,
        exp: userStats.exp,
        health: userStats.health,
        mana: userStats.mana,
        avatar: userStats.avatar
      });
    });
        
    return { id: partyId };
  } catch (error) {
    console.error('Error creating new party:', error);
    throw error;
  }
};

export const addUserToParty = async (partyId, userId, displayName, userStats = {}) => { // Add displayName param
  try {
    await runTransaction(db, async (transaction) => {
      const partyRef = doc(db, 'parties', partyId);
      const partyDoc = await transaction.get(partyRef);
      
      if (partyDoc.exists()) {
        const partyData = partyDoc.data();
        
        if (partyData.memberCount >= PARTY_CONFIG.MAX_MEMBERS) {
          throw new Error('Party is full');
        }
        
        // Update party document
        transaction.update(partyRef, {
          memberCount: partyData.memberCount + 1
        });
        
        // Create member subcollection document
        const memberRef = doc(db, 'parties', partyId, 'members', userId);
        transaction.set(memberRef, {
          displayName,
          joinedAt: new Date(),
          currentBossDamage: 0,
          currentBossStudyMinutes: 0,
          lastDamageAt: null,
          lastStudyAt: null,
          // Denormalized data
          level: userStats.level,
          exp: userStats.exp,
          health: userStats.health,
          mana: userStats.mana,
          avatar: userStats.avatar
        });
      }
    });
  } catch (error) {
    console.error('Error adding user to party:', error);
    throw error;
  }
};

export const assignUserToParty = async (userId, displayName, userStats = {}) => {
  try {
    // First, try to find an available party
    let party = await findAvailableParty();
    
    if (!party) {
      // No available party, create a new one
      party = await createNewParty(userId, displayName, userStats);
    } else {
      // Add user to existing party
      await addUserToParty(party.id, userId, displayName, userStats);
    }
    
    // Update user document with party info and game fields
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      currentPartyId: party.id,
      autoAssignedAt: new Date(),
      displayName: displayName
    });
    
    return party.id;
  } catch (error) {
    console.error('Error assigning user to party:', error);
    throw error;
  }
};

export const joinPartyByInvite = async (partyId, userId, displayName, userStats) => {
  const party = await getUserParty(partyId);
  
  if (!party) throw new Error('Party not found');
  if (!party.isActive) throw new Error('Party is no longer active');
  if (party.memberCount >= PARTY_CONFIG.MAX_MEMBERS) {
    throw new Error('Party is full');
  }
  
  // Add user to party
  await addUserToParty(partyId, userId, displayName, userStats);
  
  // Update user document
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    currentPartyId: partyId,
    joinedViaInvite: true,
    joinedAt: new Date()
  });
  
  return party;
};

export const getUserParty = async (partyId) => {
  try {
    const partyRef = doc(db, 'parties', partyId);
    const partyDoc = await getDoc(partyRef);
    
    if (partyDoc.exists()) {
      return { id: partyDoc.id, ...partyDoc.data() };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user party:', error);
    return null;
  }
};