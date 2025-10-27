// contexts/PartyContext.js - PARTY & BOSS LOGIC ONLY
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuthContext } from './AuthContext';
import { assignUserToParty } from '../utils/partyUtils';
import { checkAndApplyBossAttack, checkAndSpawnNextBoss } from '../utils/bossUtils';
import { useMemo } from 'react';


const PartyContext = createContext();

export const usePartyContext = () => {
    const context = useContext(PartyContext);
    if (!context) {
        throw new Error('usePartyContext must be used within a PartyProvider');
    }
    return context;
};

export const PartyProvider = ({ children }) => {
    const { user, userProfile, refreshUserProfile } = useAuthContext();
    const [partyProfile, setPartyProfile] = useState(null);
    const [partyMembers, setPartyMembers] = useState({});
    const [isInitialized, setIsInitialized] = useState(false);
    const initializingRef = React.useRef(false); // 🔒 Prevent double execution

    // Fetch party profile and its members
    const fetchPartyProfile = useCallback(async (partyId) => {
        if (!partyId) {
            setPartyProfile(null);
            setPartyMembers({});
            return;
        }

        try {
            const partyRef = doc(db, 'parties', partyId);
            const partyDoc = await getDoc(partyRef);

            if (partyDoc.exists()) {
                const partyData = partyDoc.data();
                setPartyProfile({ ...partyData });

                const membersRef = collection(db, 'parties', partyId, 'members');
                const membersSnapshot = await getDocs(membersRef);
                
                const membersObject = {};
                membersSnapshot.docs.forEach(doc => {
                    membersObject[doc.id] = doc.data();
                });
                
                setPartyMembers(membersObject);
                
                console.log('✅ Party loaded:', partyData.title, 'with', Object.keys(membersObject).length, 'members');
            } else {
                console.warn('⚠️ Party not found:', partyId);
                setPartyProfile(null);
                setPartyMembers({});
            }
        } catch (error) {
            console.error('❌ Error fetching party profile:', error);
            setPartyProfile(null);
            setPartyMembers({});
        }
    }, []);

    const generateRandomUsername = () => {
        const adjectives = ['Swift', 'Brave', 'Clever', 'Bright', 'Bold'];
        const nouns = ['Scholar', 'Learner', 'Student', 'Warrior', 'Master'];
        const num = Math.floor(Math.random() * 999) + 1;
        return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${num}`;
    };

    // Initialize party when user profile is available
    useEffect(() => {
        const initializeParty = async () => {
            if (!userProfile || isInitialized || initializingRef.current) return;

            initializingRef.current = true; // 🔒 Lock to prevent double execution

            const pendingPartyInvite = sessionStorage.getItem('pendingPartyInvite');
            const skipAutoAssign = sessionStorage.getItem('skipAutoAssign');
            
            if ((pendingPartyInvite || skipAutoAssign) && !userProfile.currentPartyId && user?.uid) {
                console.log('🎟️ User has pending invite, skipping auto-assignment');
                // Don't auto-assign! Let the JoinPage handle the party join
                setIsInitialized(true);
                return;
            }

            // Check if user needs to be assigned to a party
            if (!userProfile.currentPartyId && user?.uid) {
                console.log('👤 User has no party, assigning...');
                const displayName = userProfile.displayName || generateRandomUsername();
                const userData = {
                    level: userProfile.level,
                    exp: userProfile.exp,
                    health: userProfile.health,
                    mana: userProfile.mana,
                    avatar: userProfile.avatar
                };

                const assignmentResult = await assignUserToParty(user.uid, displayName, userData);
                
                // await assignUserToParty(user.uid, displayName, userData);
                
                // ✅ Refresh user profile to get the updated currentPartyId
                await refreshUserProfile();
                console.log('🔄 User profile refreshed, party assignment complete');

                // ✅ Directly fetch the party using the partyId from assignment
                if (assignmentResult) {
                    await fetchPartyProfile(assignmentResult);
                    console.log('🎉 Party data loaded after assignment');
                    setIsInitialized(true);
                }
                            
                // 🔓 Reset the ref so the effect can run again with the updated userProfile
                initializingRef.current = false;
                return;
            }

            // Fetch party if user has one
            if (userProfile.currentPartyId) {
                console.log("Fetching user's party");
                await fetchPartyProfile(userProfile.currentPartyId);
                setIsInitialized(true);
            }
        };

        initializeParty();
    }, [userProfile?.currentPartyId, user?.uid, isInitialized, fetchPartyProfile, refreshUserProfile]);

    // Boss system check - only runs ONCE on login
    useEffect(() => {
        const checkBossSystemOnLogin = async () => {
            if (!user?.uid || !userProfile?.currentPartyId || !partyProfile || !isInitialized) {
                return;
            }

            try {
                // STEP 1: Check if we need to spawn a new boss
                console.log('🔍 Checking if boss needs to spawn...');
                const spawnResult = await checkAndSpawnNextBoss(
                    userProfile.currentPartyId, 
                    partyProfile
                );
                
                if (spawnResult.spawned) {
                    console.log(`🎉 New boss spawned: ${spawnResult.bossName}`);
                    await fetchPartyProfile(userProfile.currentPartyId);
                } else if (spawnResult.hoursRemaining) {
                    console.log(`⏳ Next boss spawns in ${spawnResult.hoursRemaining.toFixed(1)} hours`);
                }

                // STEP 2: Apply boss attack if boss is alive
                const currentPartyData = spawnResult.spawned 
                    ? await (async () => {
                        const partyRef = doc(db, 'parties', userProfile.currentPartyId);
                        const freshPartyDoc = await getDoc(partyRef);
                        return freshPartyDoc.data();
                    })()
                    : partyProfile;

                const attackResult = await checkAndApplyBossAttack(
                    user.uid, 
                    userProfile.currentPartyId, 
                    userProfile, 
                    currentPartyData
                );
                
                if (attackResult?.newUserImmunity) {
                    console.log(`🛡️ New user protected for ${attackResult.hoursRemaining.toFixed(1)} more hours`);
                } else if (attackResult?.died) {
                    console.log('💀 Player died from boss attack!');
                } else if (attackResult?.damaged) {
                    console.log(`💥 Boss dealt ${attackResult.totalDamage} damage! Health: ${attackResult.newHealth}`);
                }
            } catch (err) {
                console.error('Boss system check failed:', err);
            }
        };

        checkBossSystemOnLogin();
    }, [isInitialized]); // Only run when party is initialized

    const refreshPartyProfile = useCallback(async () => {
        if (userProfile?.currentPartyId) {
            await fetchPartyProfile(userProfile.currentPartyId);
        }
    },[]);

    // Boss system setters
    const updateBossHealth = useCallback((newHealth) => {
        setPartyProfile(prev => {
            if (!prev?.currentBoss) return prev;
            
            return {
                ...prev,
                currentBoss: {
                    ...prev.currentBoss,
                    currentHealth: newHealth,
                    lastDamageAt: new Date()
                }
            };
        });
    }, []);

    const updateMemberDamage = useCallback((userId, newDamage) => {
        setPartyMembers(prev => {
            if (!prev[userId]) return prev;
            
            return {
                ...prev,
                [userId]: {
                    ...prev[userId],
                    currentBossDamage: newDamage,
                    lastDamageAt: new Date()
                }
            };
        });
    }, []);

    const updateLastBossResults = useCallback((lastBossResults, nextBossSpawnsAt) => {
        setPartyProfile(prev => {
            if (!prev) return prev;
            
            return {
                ...prev,
                lastBossResults: lastBossResults,
                nextBossSpawnsAt: nextBossSpawnsAt,
                currentBoss: {
                    ...prev.currentBoss,
                    isAlive: false,
                    defeatedAt: lastBossResults.defeatedAt
                }
            };
        });
    }, []);

    const resetAllMembersBossDamage = useCallback(() => {
        setPartyMembers(prev => {
            const updated = {};
            Object.keys(prev).forEach(userId => {
                updated[userId] = {
                    ...prev[userId],
                    currentBossDamage: 0,
                    currentBossStudyMinutes: 0
                };
            });
            return updated;
        });
    }, []);

    const updateUserProfile = useCallback((updates) => {
        // Update party member if user is in party
        if (user?.uid && partyMembers[user.uid]) {
            setPartyMembers(prev => ({
                ...prev,
                [user.uid]: {
                    ...prev[user.uid],
                    ...updates
                }
            }));
        }
    }, [user?.uid, partyMembers]);

    const value = useMemo(() => ({
    partyProfile,
    partyMembers,
    refreshPartyProfile,
    updateBossHealth,
    updateMemberDamage,
    updateLastBossResults,
    resetAllMembersBossDamage,
    updateUserProfile,
}), [
    partyProfile, 
    partyMembers, 
    refreshPartyProfile,
    updateBossHealth,
    updateMemberDamage,
    updateLastBossResults,
    resetAllMembersBossDamage,
    updateUserProfile
]);

    return (
        <PartyContext.Provider value={value}>
            {children}
        </PartyContext.Provider>
    );
};

export default PartyContext;