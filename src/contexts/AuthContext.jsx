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
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../api/firebase';
import { assignUserToParty } from '../utils/partyUtils';

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
                setPartyMembers([]);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Fetch party profile and its members
    const fetchPartyProfile = useCallback(async (partyId) => {
        if (!partyId) {
            setPartyProfile(null);
            setPartyMembers([]);
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
                
                const members = membersSnapshot.docs.map(doc => ({
                    userId: doc.id,
                    ...doc.data()
                }));
                
                setPartyMembers(members);
                
                console.log('📦 Party Profile:', partyData);
                console.log('👥 Party Members:', members);
                console.log('✅ Party loaded:', partyData.title, 'with', members.length, 'members');
            } else {
                console.warn('⚠️ Party not found:', partyId);
                setPartyProfile(null);
                setPartyMembers([]);
            }
        } catch (error) {
            console.error('❌ Error fetching party profile:', error);
            setPartyProfile(null);
            setPartyMembers([]);
        }
    }, []);

    // Fetch party when userProfile updates and has a partyId
    useEffect(() => {
        if (userProfile?.currentPartyId) {
            console.log("Fetching users' party")
            fetchPartyProfile(userProfile.currentPartyId);
        } else {
            setPartyProfile(null);
            setPartyMembers([]);
        }
    }, [userProfile?.currentPartyId, fetchPartyProfile]);

    // Fetch user profile from Firestore
    const fetchUserProfile = async (userId) => {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const profileData = userDoc.data();

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
                    setUserProfile(profileData);
                    setUser(prev => ({ ...prev, profile: profileData }));
                }
            } else {
                // Create default profile for brand new users
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
                    
                    level: 1,
                    exp: 0,
                    health: 100,
                    mana: 100,
                    currentPartyId: null,
                    autoAssignedAt: null,
                    hasChosenAvatar: false,
                    avatar: "warrior_01",
                    prefersSolo: false,
                    
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
            setPartyMembers([]);
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

    const value = {
        user,
        userProfile,
        loading,
        authLoading,
        partyProfile,
        partyMembers,
        signIn,
        logOut,
        resetPassword,
        refreshUserProfile,
        fetchUserProfile,
        refreshPartyProfile,
        isPremium,
        getAILimits,
        getFolderLimits,
        getDeckLimits,
        getCardLimits
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;