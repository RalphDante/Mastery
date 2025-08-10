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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../api/firebase'; // Adjust path as needed

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
                setUserProfile(profileData);
                
                // Merge Firebase Auth user with Firestore profile
                setUser(prevUser => ({
                    ...prevUser,
                    profile: profileData
                }));
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

    const value = {
        // User state
        user,
        userProfile,
        loading,
        authLoading,
        
        // Auth methods
        signUp,
        signIn,
        logOut,
        resetPassword,
        
        // Profile methods
        refreshUserProfile,
        fetchUserProfile,
        
        // Utility methods
        isPremium,
        getAILimits,
        getFolderLimits
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;