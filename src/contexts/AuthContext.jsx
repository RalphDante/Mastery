// contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile
} from 'firebase/auth';
import { 
    doc, 
    getDoc, 
    setDoc,
    updateDoc, 
    collection, 
    getDocs,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../api/firebase';
import { assignUserToParty } from '../utils/partyUtils';
import { checkAndApplyBossAttack, checkAndSpawnNextBoss } from '../utils/bossUtils';

const AuthContext = createContext();

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);
    const [partyProfile, setPartyProfile] = useState(null);
    const [partyMembers, setPartyMembers] = useState([]);
    
    // NEW: Data from UserDataContext
    const [dailySessions, setDailySessions] = useState([]);

    // Listen for authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                console.log('🔥 Auth state changed in AuthContext:', firebaseUser.email);
                await fetchUserProfile(firebaseUser.uid);
            } else {
                console.log('not signed in');
                setUser(null);
                setUserProfile(null);
                setPartyProfile(null);
                setPartyMembers({});
                // Clear data
                setDailySessions([]);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    
   

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
                
                console.log('📦 Party Profile:', partyData);
                console.log('👥 Party Members:', membersObject);
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

    // Fetch party when userProfile updates and has a partyId
    useEffect(() => {
        if (userProfile?.currentPartyId) {
            console.log("Fetching users' party")
            fetchPartyProfile(userProfile.currentPartyId);
        } else {
            setPartyProfile(null);
            setPartyMembers({});
        }
    }, [userProfile?.currentPartyId, fetchPartyProfile]);

    useEffect(() => {
        const checkBossSystemOnLogin = async () => {
            if (user?.uid && userProfile?.currentPartyId && partyProfile) {
                try {
                    // STEP 1: Check if we need to spawn a new boss
                    console.log('🔍 Checking if boss needs to spawn...');
                    const spawnResult = await checkAndSpawnNextBoss(
                        userProfile.currentPartyId, 
                        partyProfile
                    );
                    
                    if (spawnResult.spawned) {
                        console.log(`🎉 New boss spawned: ${spawnResult.bossName}`);
                        // Refresh party data to get the new boss
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
                        console.log(`🛡️ New user is protected for ${attackResult.hoursRemaining.toFixed(1)} more hours`);
                    } else if (attackResult?.died) {
                        console.log('💀 Player died from boss attack!');
                        console.log('Death Penalty:', attackResult.deathPenalty);
                        
                        setUserProfile(prev => ({
                            ...prev,
                            health: attackResult.newHealth,
                            exp: attackResult.deathPenalty.expAfter,
                            lastBossAttackAt: new Date(),
                            lastDeathAt: new Date()
                        }));
                        
                        setPartyMembers(prev => ({
                            ...prev,
                            [user.uid]: {
                                ...prev[user.uid],
                                health: attackResult.newHealth,
                                exp: attackResult.deathPenalty.expAfter
                            }
                        }));
                    } else if (attackResult?.damaged) {
                        console.log(`💥 Boss dealt ${attackResult.totalDamage} damage! Health: ${attackResult.newHealth}`);
                        
                        setUserProfile(prev => ({
                            ...prev,
                            health: attackResult.newHealth,
                            lastBossAttackAt: new Date()
                        }));
                        
                        setPartyMembers(prev => ({
                            ...prev,
                            [user.uid]: {
                                ...prev[user.uid],
                                health: attackResult.newHealth
                            }
                        }));
                    }
                } catch (err) {
                    console.error('Boss system check failed:', err);
                }
            }
        };

        checkBossSystemOnLogin();
    }, [user?.uid, userProfile?.currentPartyId, partyProfile]);

    useEffect(() => {
        console.log('🔥 AuthProvider re-rendered!', {
            user: !!user,
            userProfile: !!userProfile,
            partyProfile: !!partyProfile,
        });
    });

    // Fetch user profile from Firestore
    const fetchUserProfile = async (userId) => {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                let profileData = userDoc.data();

                // 🆕 LAZY EXPIRATION CHECK - Only runs when user logs in
                const subscription = profileData.subscription || {};
                const now = new Date();
                
                // Check if pro subscription has expired
                if (subscription.tier === 'pro' && 
                    subscription.expiresAt && 
                    subscription.expiresAt.toDate() <= now &&
                    (subscription.status === 'active' || subscription.status === 'cancel_requested')) {
                    
                    console.log('⏰ Subscription expired on login, downgrading to free tier');
                    
                    // Downgrade to free tier
                    await updateDoc(userRef, {
                        'subscription.tier': 'free',
                        'subscription.status': 'expired',
                        'subscription.updatedAt': now,
                        
                        // Reset to free tier limits (grandfather existing content)
                        'limits.maxAiGenerations': 20,
                        'limits.maxCards': 100,
                        'limits.maxDecks': 5,
                        'limits.maxSmartReviewDecks': 2,
                        'limits.maxFolders': 10
                    });
                    
                    // Re-fetch the updated profile to get fresh data
                    const updatedDoc = await getDoc(userRef);
                    profileData = updatedDoc.data();
                    
                    console.log('✅ User downgraded to free tier');
                }

                // Check if user needs gamification fields (existing logic)
                if (profileData.exp === null || profileData.exp === undefined) {
                    const newFields = {
                        level: 1,
                        exp: 0,
                        health: 100,
                        mana: 100,
                        currentPartyId: null,
                        autoAssignedAt: null,
                        hasChosenAvatar: false,
                        avatar: "warrior_01",
                        prefersSolo: false,
                    };

                    await updateDoc(userRef, newFields);
                    
                    const displayName = generateRandomUsername();
                    const userData = {
                        level: newFields.level,
                        exp: newFields.exp,
                        health: newFields.health,
                        mana: newFields.mana,
                        avatar: newFields.avatar
                    };
                    
                    await assignUserToParty(userId, displayName, userData);
                    
                    const updatedDoc = await getDoc(userRef);
                    const updatedData = updatedDoc.data();
                    setUserProfile(updatedData);
                    setUser(prev => ({ ...prev, profile: updatedData }));
                } 
                else if (!profileData.currentPartyId) {
                    const displayName = generateRandomUsername();
                    const existingUserData = {
                        level: profileData.level,
                        exp: profileData.exp,
                        health: profileData.health,
                        mana: profileData.mana,
                        avatar: profileData.avatar
                    };
                    
                    await assignUserToParty(userId, displayName, existingUserData);
                    
                    const updatedDoc = await getDoc(userRef);
                    const updatedData = updatedDoc.data();
                    setUserProfile(updatedData);
                    setUser(prev => ({ ...prev, profile: updatedData }));
                } 
                else {
                    // Normal case - just set the profile
                    setUserProfile(profileData);
                    setUser(prev => ({ ...prev, profile: profileData }));
                }
            } else {
                // Create default profile for brand new users (existing logic)
                console.log('📝 Creating new user profile in AuthProvider');
                
                const now = new Date();
                const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                const autoGeneratedDisplayName = generateRandomUsername();
                
                const defaultProfile = {
                    email: auth.currentUser?.email,
                    displayName: autoGeneratedDisplayName || "New User",
                    createdAt: auth.currentUser?.metadata?.creationTime ? new Date(auth.currentUser.metadata.creationTime) : now,
                    lastActiveAt: now,
                    lastStudyDate: null,
                    lastNameChangeAt: null,
                    
                    level: 1,
                    exp: 0,
                    health: 100,
                    mana: 100,
                    currentPartyId: null,
                    autoAssignedAt: null,
                    hasChosenAvatar: false,
                    avatar: "warrior_01",
                    prefersSolo: false,
                    lastBossAttackAt: null,
                    
                    stats: {
                        totalReviews: 0,
                        weeklyReviews: 0,
                        currentStreak: 0,
                        longestStreak: 0
                    },
                    
                    subscription: {
                        tier: "free",
                        expiresAt: null
                    },
                    
                    limits: {
                        aiGenerationsUsed: 0,
                        currentCards: 0,
                        currentDecks: 0,
                        smartReviewDecks: 0,
                        currentFolders: 0,
                        aiGenerationsResetAt: nextMonthStart,
                        maxAiGenerations: 20,
                        maxCards: 100,
                        maxDecks: 5,
                        maxSmartReviewDecks: 2,
                        maxFolders: 10
                    },
                    
                    tutorials: {
                        "create-deck": { completed: false, step: 1 },
                        "smart-review": { completed: false, step: 1 },
                        "global-review": { completed: false, step: 1 },
                        "deck-sharing": { completed: false, step: 1 }
                    }
                };

                await setDoc(userRef, defaultProfile);
                
                const displayName = defaultProfile.displayName;
                const userData = {
                    level: defaultProfile.level,
                    exp: defaultProfile.exp,
                    health: defaultProfile.health,
                    mana: defaultProfile.mana,
                    avatar: defaultProfile.avatar
                };
                
                console.log('🎉 Assigning new user to party...');
                await assignUserToParty(userId, displayName, userData);
                
                const updatedDoc = await getDoc(userRef);
                const updatedData = updatedDoc.data();
                setUserProfile(updatedData);
                setUser(prev => ({ ...prev, profile: updatedData }));
                console.log('✅ New user profile created and assigned to party');
            }
        } catch (error) {
            console.error('❌ Error fetching user profile:', error);
        }
    };

    // NEW: Fetch daily sessions (from UserDataContext)
    const fetchDailySessions = useCallback(async (userId) => {
        if (!userId) return;

        try {
            const last7Days = [];
            const today = new Date();
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = getLocalDateString(date);
                const dayName = date.toLocaleDateString('en', { weekday: 'short' });
                
                const sessionDocRef = doc(db, 'users', userId, 'dailySessions', dateStr);
                const sessionDoc = await getDoc(sessionDocRef);
                
                let sessionData = { minutes: 0, spacedRep: 0, cramming: 0 };
                if (sessionDoc.exists()) {
                    const data = sessionDoc.data();
                    sessionData = {
                        minutes: data.minutesStudied || 0,
                        spacedRep: data.spacedSessions || 0,
                        cramming: data.crammingSessions || 0
                    };
                }
                
                last7Days.push({
                    day: dayName,
                    date: dateStr,
                    minutes: Math.round(sessionData.minutes),
                    spacedRep: sessionData.spacedRep,
                    cramming: sessionData.cramming,
                    isToday: i === 0
                });
            }
            
            setDailySessions(last7Days);
        } catch (error) {
            console.error('Error fetching daily sessions:', error);
        }
    }, []);

    const getLocalDateString = (date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const generateRandomUsername = () => {
        const adjectives = ['Swift', 'Brave', 'Clever', 'Bright', 'Bold'];
        const nouns = ['Scholar', 'Learner', 'Student', 'Warrior', 'Master'];
        const num = Math.floor(Math.random() * 999) + 1;
        return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${num}`;
    };

    const getNextMonthDate = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    };

    const signUp = async (email, password, displayName = null) => {
        setAuthLoading(true);
        try {
            const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
            
            if (displayName) {
                await updateProfile(newUser, { displayName });
            }
            
            const userProfile = {
                email: newUser.email,
                displayName: displayName || null,
                createdAt: new Date(),
                subscription: {
                    tier: 'free',
                    status: 'active'
                },
                limits: {
                    maxAiGenerations: 20,
                    aiGenerationsUsed: 0,
                    aiGenerationsResetAt: getNextMonthDate()
                }
            };
            
            await setDoc(doc(db, 'users', newUser.uid), userProfile);
            
            return { success: true, user: newUser };
        } catch (error) {
            console.error('Error signing up:', error);
            return { success: false, error: error.message };
        } finally {
            setAuthLoading(false);
        }
    };

    const signIn = async (email, password) => {
        setAuthLoading(true);
        try {
            const { user } = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user };
        } catch (error) {
            console.error('Error signing in:', error);
            return { success: false, error: error.message };
        } finally {
            setAuthLoading(false);
        }
    };

    const logOut = async () => {
        setAuthLoading(true);
        try {
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
            setPartyProfile(null);
            setPartyMembers({});
            setDailySessions([]);
            return { success: true };
        } catch (error) {
            console.error('Error signing out:', error);
            return { success: false, error: error.message };
        } finally {
            setAuthLoading(false);
        }
    };

    const resetPassword = async (email) => {
        setAuthLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error) {
            console.error('Error resetting password:', error);
            return { success: false, error: error.message };
        } finally {
            setAuthLoading(false);
        }
    };

    const refreshUserProfile = async () => {
        if (user?.uid) {
            await fetchUserProfile(user.uid);
        }
    };

    const refreshPartyProfile = async () => {
        if (userProfile?.currentPartyId) {
            await fetchPartyProfile(userProfile.currentPartyId);
        }
    };

    const isPremium = () => {
        return userProfile?.subscription?.tier === 'premium' || 
               userProfile?.subscription?.tier === 'pro';
    };

    const getAILimits = () => {
        const limits = userProfile?.limits || {};
        const maxGenerations = limits.maxAiGenerations || 20;
        const currentUsage = limits.aiGenerationsUsed || 0;
        const resetDate = limits.aiGenerationsResetAt;
        
        return {
            maxGenerations,
            currentUsage,
            remaining: maxGenerations === -1 ? 'unlimited' : Math.max(0, maxGenerations - currentUsage),
            resetDate: resetDate?.toDate ? resetDate.toDate() : resetDate,
            canGenerate: maxGenerations === -1 || currentUsage < maxGenerations
        };
    };

    const getFolderLimits = () => {
        const limits = userProfile?.limits || {};
        const maxFolders = limits.maxFolders || 10;
        const currentUsage = limits.currentFolders || 0;

        return {
            maxFolders,
            canGenerate: maxFolders === -1 || currentUsage < maxFolders
        };
    };

    const getDeckLimits = () => {
        const limits = userProfile?.limits || {};
        const maxDecks = limits.maxDecks || 5;
        const currentUsage = limits.currentDecks || 0;

        return {
            maxDecks,
            canGenerate: maxDecks === -1 || currentUsage < maxDecks
        };
    };

    const getCardLimits = () => {
        const limits = userProfile?.limits || {};
        const maxCards = limits.maxCards || 100;
        const currentUsage = limits.currentCards || 0;

        return {
            maxCards,
            canGenerate: maxCards === -1 || currentUsage < maxCards,
            currentUsage
        };
    };

   

    const todaySession = dailySessions.find(session => session.isToday) || 
        { minutes: 0, spacedRep: 0, cramming: 0 };

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
        setUserProfile(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                ...updates
            };
        });

        if (user?.uid) {
            setPartyMembers(prev => {
                if (!prev[user.uid]) return prev;
                return {
                    ...prev,
                    [user.uid]: {
                        ...prev[user.uid],
                        ...updates
                    }
                };
            });
        }
    }, [user?.uid]);

    const value = {
        // Auth state
        user,
        userProfile,
        loading,
        authLoading,
        
        // Party data
        partyProfile,
        partyMembers,
        
        // NEW: User data (from UserDataContext)
        dailySessions,
        
        // NEW: Computed values
        todaySession,
        
        // Auth functions
        signIn,
        logOut,
        resetPassword,
        refreshUserProfile,
        fetchUserProfile,
        refreshPartyProfile,
        
        // NEW: Utility functions
        refreshDailySessions: () => fetchDailySessions(user?.uid),
        
        // Limit functions
        isPremium,
        getAILimits,
        getFolderLimits,
        getDeckLimits,
        getCardLimits,
        
        // Boss system functions
        updateBossHealth,
        updateMemberDamage,
        updateLastBossResults,
        resetAllMembersBossDamage,
        updateUserProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// NEW: Specialized hooks (from UserDataContext)
export const useAuth = () => {
    const { user, loading, authLoading } = useAuthContext();
    return { user, loading: loading || authLoading };
};


export const useCardsDue = () => {
    const { cardsDue, cardsReviewedToday, nextReviewTime } = useAuthContext();
    return { cardsDue, cardsReviewedToday, nextReviewTime };
};

export const useStudyStats = () => {
    const { userProfile, dailySessions, todaySession } = useAuthContext();
    return {
        currentStreak: userProfile?.stats?.currentStreak || 0,
        longestStreak: userProfile?.stats?.longestStreak || 0,
        dailySessions,
        todaySession
    };
};

// NEW: Utility function (from UserDataContext)
export const getTimeUntilNextReview = (nextReviewTime) => {
    if (!nextReviewTime) return "No upcoming reviews";
    
    const now = new Date();
    const diffMs = nextReviewTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Ready now";
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
};

export default AuthContext;