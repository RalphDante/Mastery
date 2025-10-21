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

export const leaveParty = async (userId, userDisplayName, userStats) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    
    if (!userData.currentPartyId) {
      throw new Error('Say leave current Party');
    }

    const currentPartyId = userData.currentPartyId;
    const partyRef = doc(db, 'parties', currentPartyId);
    const partyDoc = await getDoc(partyRef);

    if (!partyDoc.exists()) {
      throw new Error('Say leave current Party');
    }

    const partyData = partyDoc.data();

    // Check if user is alone in party (memberCount === 1)
    if (partyData.memberCount === 1) {
      console.log('User is alone in party, doing nothing');
      return { success: true, message: 'You are the only member' };
    }

    // User is NOT alone, proceed with leaving
    await runTransaction(db, async (transaction) => {
      
      // Common steps for both owner and non-owner:
      // 1. Remove user from members subcollection
      const memberRef = doc(db, 'parties', currentPartyId, 'members', userId);
      transaction.delete(memberRef);
      
      // 2. Decrement memberCount
      transaction.update(partyRef, {
        memberCount: partyData.memberCount - 1
      });

      // If user is the owner, assign new leader
      if (partyData.leaderId === userId) {
        console.log('User is owner, assigning new leader...');
        
        // Get all members except current user
        const membersRef = collection(db, 'parties', currentPartyId, 'members');
        const membersSnapshot = await getDocs(membersRef);
        
        const otherMembers = membersSnapshot.docs
          .filter(doc => doc.id !== userId)
          .map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (otherMembers.length > 0) {
          // Assign oldest member (by joinedAt) as new leader
          const newLeader = otherMembers.sort((a, b) => 
            a.joinedAt.toMillis() - b.joinedAt.toMillis()
          )[0];
          
          transaction.update(partyRef, {
            leaderId: newLeader.id,
            title: `${newLeader.displayName}'s Party`
          });
          
          console.log(`New leader assigned: ${newLeader.displayName}`);
        }
      }
      
      // 3. Clear user's currentPartyId
      transaction.update(userRef, {
        currentPartyId: null
      });
    });

    // 4. Create new party for user (outside transaction)
    console.log('Creating new party for user...');
    const newParty = await createNewParty(userId, userDisplayName, userStats);
    
    // 5. Update user with new party (set as public by default)
    await updateDoc(userRef, {
      currentPartyId: newParty.id
    });

    return { 
      success: true, 
      message: 'Successfully left party and joined new one',
      newPartyId: newParty.id 
    };

  } catch (error) {
    console.error('Error leaving party:', error);
    
    if (error.message === 'Say leave current Party') {
      throw new Error('You must be in a party to leave it');
    }
    
    throw error;
  }
};

export const leaveAndJoinParty = async (userId, oldPartyId, newPartyId, displayName, userStats) => {
  try {
    console.log(`Leaving party ${oldPartyId} and joining ${newPartyId}`);
    
    await runTransaction(db, async (transaction) => {
      // ✅ STEP 1: Do ALL reads first
      const oldPartyRef = doc(db, 'parties', oldPartyId);
      const oldPartyDoc = await transaction.get(oldPartyRef);
      
      const newPartyRef = doc(db, 'parties', newPartyId);
      const newPartyDoc = await transaction.get(newPartyRef);
      
      // Read members collection NOW (before any writes)
      const membersRef = collection(db, 'parties', oldPartyId, 'members');
      const membersSnapshot = await getDocs(membersRef);
      
      // Validate old party exists
      if (!oldPartyDoc.exists()) {
        throw new Error('Old party not found');
      }
      
      // Validate new party exists
      if (!newPartyDoc.exists()) {
        throw new Error('New party not found');
      }
      
      const oldPartyData = oldPartyDoc.data();
      const newPartyData = newPartyDoc.data();
      
      // Check if new party is full
      if (newPartyData.memberCount >= PARTY_CONFIG.MAX_MEMBERS) {
        throw new Error('New party is full');
      }
      
      // ✅ STEP 2: Now do ALL writes
      
      // Remove user from old party members
      const oldMemberRef = doc(db, 'parties', oldPartyId, 'members', userId);
      transaction.delete(oldMemberRef);
      
      // ✅ NEW: Check if user was the last member in old party
      const willBeEmpty = oldPartyData.memberCount === 1;
      
      if (willBeEmpty) {
        // Delete the entire old party if it becomes empty
        console.log('Old party will be empty, deleting it');
        transaction.delete(oldPartyRef);
      } else {
        // Decrement old party member count
        transaction.update(oldPartyRef, {
          memberCount: oldPartyData.memberCount - 1
        });
        
        // If user was the leader, assign new leader
        if (oldPartyData.leaderId === userId) {
          const otherMembers = membersSnapshot.docs
            .filter(doc => doc.id !== userId)
            .map(doc => ({ id: doc.id, ...doc.data() }));
          
          if (otherMembers.length > 0) {
            const newLeader = otherMembers.sort((a, b) => 
              a.joinedAt.toMillis() - b.joinedAt.toMillis()
            )[0];
            
            transaction.update(oldPartyRef, {
              leaderId: newLeader.id,
              title: `${newLeader.displayName}'s Party`
            });
            
            console.log(`New leader assigned: ${newLeader.displayName}`);
          }
        }
      }
      
      // Add user to new party
      transaction.update(newPartyRef, {
        memberCount: newPartyData.memberCount + 1
      });
      
      const newMemberRef = doc(db, 'parties', newPartyId, 'members', userId);
      transaction.set(newMemberRef, {
        displayName,
        joinedAt: new Date(),
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
      
      // Update user document
      const userRef = doc(db, 'users', userId);
      transaction.update(userRef, {
        currentPartyId: newPartyId,
        joinedViaInvite: true,
        joinedAt: new Date()
      });
    });
    
    console.log('Successfully switched parties');
    return { success: true };
    
  } catch (error) {
    console.error('Error switching parties:', error);
    throw error;
  }
};

export const togglePartyPrivacy = async (partyId, userId) => {
  try {
    const partyRef = doc(db, 'parties', partyId);
    const partyDoc = await getDoc(partyRef);
    
    if (!partyDoc.exists()) {
      throw new Error('Party not found');
    }
    
    const partyData = partyDoc.data();
    
    // Only the party leader can change privacy settings
    if (partyData.leaderId !== userId) {
      throw new Error('Only the party leader can change privacy settings');
    }
    
    // Toggle the privacy setting
    const newPrivacySetting = partyData.isPublic === false ? true : false;
    
    await updateDoc(partyRef, {
      isPublic: newPrivacySetting
    });
    
    console.log(`Party privacy changed to: ${newPrivacySetting ? 'Public' : 'Private'}`);
    
    return { 
      success: true, 
      isPublic: newPrivacySetting,
      message: `Party is now ${newPrivacySetting ? 'public' : 'private'}`
    };
    
  } catch (error) {
    console.error('Error toggling party privacy:', error);
    throw error;
  }
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