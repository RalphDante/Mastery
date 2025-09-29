// contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../api/firebase'; // Adjust path as needed
import { assignUserToParty } from '../utils/partyUtils';


const AuthContext = createContext();

// Custom hook to use the auth context
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

    // Listen for authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                console.log('🔥 Auth state changed in AuthContext:', firebaseUser ? firebaseUser.email : 'Not signed in');
                // Fetch additional user profile data from Firestore
                await fetchUserProfile(firebaseUser.uid);
            } else {
                setUser(null);
                setUserProfile(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Fetch user profile from Firestore
    const fetchUserProfile = async (userId) => {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const profileData = userDoc.data();

                if(profileData.exp === null || profileData.exp === undefined){
                     const generateRandomUsername = () => {
                        const adjectives = ['Swift', 'Brave', 'Clever', 'Bright', 'Bold'];
                        const nouns = ['Scholar', 'Learner', 'Student', 'Warrior', 'Master'];
                        const num = Math.floor(Math.random() * 999) + 1;
                        return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${num}`;
                    };
                    
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

                    // Update the user document first
                    await updateDoc(userRef, newFields);
                    
                    // Then assign to party with the new data
                    const displayName = generateRandomUsername() || "New User";
                    const userData = {
                        level: newFields.level,
                        exp: newFields.exp,
                        health: newFields.health,
                        mana: newFields.mana,
                        avatar: newFields.avatar
                    };
                    
                    await assignUserToParty(userId, displayName, userData);
                    
                    // Re-fetch and set profile
                    const updatedDoc = await getDoc(userRef);
                    const updatedData = updatedDoc.data();
                    setUserProfile(updatedData);
                    setUser(prevUser => ({ ...prevUser, profile: updatedData }));
                } else if (!profileData.currentPartyId) {
                    const generateRandomUsername = () => {
                        const adjectives = ['Swift', 'Brave', 'Clever', 'Bright', 'Bold'];
                        const nouns = ['Scholar', 'Learner', 'Student', 'Warrior', 'Master'];
                        const num = Math.floor(Math.random() * 999) + 1;
                        return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${num}`;
                    };
                    const displayName = generateRandomUsername() || "New User";

                    const existingUserData = {
                        level: profileData.level,
                        exp: profileData.exp,
                        health: profileData.health,
                        mana: profileData.mana,
                        avatar: profileData.avatar
                    };
                    await assignUserToParty(userId, displayName, existingUserData);
                    // Re-fetch profile after party assignment
                    const updatedDoc = await getDoc(userRef);
                    const updatedData = updatedDoc.data();
                    setUserProfile(updatedData);
                    setUser(prevUser => ({ ...prevUser, profile: updatedData }));
                } else {
                    setUserProfile(profileData);
                    setUser(prevUser => ({ ...prevUser, profile: profileData }));
                }

                
            } else {
                // Create a default user profile if it doesn't exist
                const defaultProfile = {
                    email: auth.currentUser?.email,
                    createdAt: new Date(),
                    subscription: {
                        tier: 'free',
                        status: 'active'
                    },
                    limits: {
                        maxAiGenerations: 20, // Free tier limit
                        aiGenerationsUsed: 0,
                        aiGenerationsResetAt: getNextMonthDate()
                    }
                };
                
                await setDoc(userRef, defaultProfile);
                setUserProfile(defaultProfile);
                
                setUser(prevUser => ({
                    ...prevUser,
                    profile: defaultProfile
                }));
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    };

    // Helper function to get next month's date for limit reset
    const getNextMonthDate = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    };

    // Sign up function
    const signUp = async (email, password, displayName = null) => {
        setAuthLoading(true);
        try {
            const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
            
            // Update display name if provided
            if (displayName) {
                await updateProfile(newUser, { displayName });
            }
            
            // Create user profile in Firestore
            const userProfile = {
                email: newUser.email,
                displayName: displayName || null,
                createdAt: new Date(),
                subscription: {
                    tier: 'free',
                    status: 'active'
                },
                limits: {
                    maxAiGenerations: 20, // Free tier limit
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

    // Sign in function
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

    // Sign out function
    const logOut = async () => {
        setAuthLoading(true);
        try {
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
            return { success: true };
        } catch (error) {
            console.error('Error signing out:', error);
            return { success: false, error: error.message };
        } finally {
            setAuthLoading(false);
        }
    };

    // Reset password function
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

    // Refresh user profile (useful after subscription changes)
    const refreshUserProfile = async () => {
        if (user?.uid) {
            await fetchUserProfile(user.uid);
        }
    };

    // Check if user is premium
    const isPremium = () => {
        return userProfile?.subscription?.tier === 'premium' || userProfile?.subscription?.tier === 'pro';
    };

    // Get user's AI generation limits
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
        }
    }

    const getDeckLimits = () => {
        const limits = userProfile?.limits || {};
        const maxDecks = limits.maxDecks || 5;
        const currentUsage = limits.currentDecks || 0;

        return {
            maxDecks,
            canGenerate: maxDecks === -1 || currentUsage < maxDecks
        }
    }

    const getCardLimits = () => {
        const limits = userProfile?.limits || {};
        const maxCards = limits.maxCards || 100;
        const currentUsage = limits.currentCards || 0;

        return {
            maxCards,
            canGenerate: maxCards === -1 || currentUsage < maxCards,
            currentUsage
        }
    }

    const value = {
        // User state
        user,
        userProfile,
        loading,
        authLoading,
        
        // Auth methods
        // signUp,
        signIn,
        logOut,
        resetPassword,
        
        // Profile methods
        refreshUserProfile,
        fetchUserProfile,
        
        // Utility methods
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