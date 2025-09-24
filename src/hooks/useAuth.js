// hooks/useAuth.js
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "../api/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Helper function to detect if user is on mobile
const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Auth service with all the business logic
export const authService = {
    // Function to create/update user profile in Firestore
    createUserProfileInFirestore: async (user) => {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        const now = new Date();
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        if (!userDoc.exists()) {
            console.log('📝 Creating new Firestore user profile...');
            await setDoc(userRef, {
                email: user.email,
                displayName: user.displayName || "New User",
                createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime) : now,
                lastActiveAt: now,
                lastStudyDate: null,
                // New
                level: 1,
                exp: 0,
                health: 100,
                mana: 100,
                currentPartyId: null,
                damageMultiplier: 1.0,
                autoAssignedAt: null,
                hasChosenAvatar: false,
                avatar: "warrior_01",
                prefersSolo: false,
                
                // Keep existing stats (but remove totalCards since we're using limits.currentCards now)
                stats: {
                    totalReviews: 0,
                    weeklyReviews: 0,
                    currentStreak: 0,
                    longestStreak: 0
                },
                
                // Add subscription info
                subscription: {
                    tier: "free", // Default to free tier
                    expiresAt: null
                },
                
                // Add new limits field with free tier defaults
                limits: {
                    // Current usage (starts at 0 for new users)
                    aiGenerationsUsed: 0,
                    currentCards: 0,
                    currentDecks: 0,
                    smartReviewDecks: 0,
                    currentFolders: 0,
                    
                    // Reset tracking
                    aiGenerationsResetAt: nextMonthStart, // Next month start
                    
                    // Tier-based maximums (free tier limits)
                    maxAiGenerations: 20,
                    maxCards: 100,
                    maxDecks: 5,
                    maxSmartReviewDecks: 2,
                    maxFolders: 10
                },
                
                // Add tutorials tracking
                tutorials: {
                    "create-deck": { 
                        completed: false, 
                        step: 1 
                    },
                    "smart-review": { 
                        completed: false, 
                        step: 1, 
                    },
                    "global-review": { 
                        completed: false, 
                        step: 1 
                    },
                    "deck-sharing": { 
                        completed: false, 
                        step: 1 
                    }
                }
            });
            console.log("✅ Firestore profile created for:", user.email);
        } else {
            console.log('🔄 Updating lastActiveAt for existing user:', user.email);
            await setDoc(userRef, { lastActiveAt: new Date() }, { merge: true });
        }
    },

    // Main sign-in function
    signIn: async (options = {}) => {
        const { onSuccess, onError, navigate } = options;
        
        try {
            console.log('🔐 Starting authentication flow...');
            
            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            
            try {
                console.log('🔄 Using popup authentication...');
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                console.log('✅ User signed in via popup:', user.displayName, user.email);
                
                await authService.createUserProfileInFirestore(user);
                
                if (onSuccess) onSuccess(user);
                // if (navigate) navigate('/');
                
            } catch (popupError) {
                console.log('❌ Popup failed, trying redirect as fallback...');
                
                if (popupError.code === 'auth/popup-blocked' || 
                    popupError.code === 'auth/popup-closed-by-user' ||
                    popupError.code === 'auth/web-storage-unsupported') {
                    
                    console.log('📱 Falling back to redirect...');
                    
                    try {
                        sessionStorage.setItem('signInIntent', 'true');
                        sessionStorage.setItem('signInTimestamp', Date.now().toString());
                    } catch (storageError) {
                        console.log('⚠️ Storage unavailable, continuing without backup');
                    }
                    
                    await signInWithRedirect(auth, provider);
                } else {
                    throw popupError;
                }
            }
            
        } catch (error) {
            console.error('❌ Error during sign-in:', error);
            
            try {
                sessionStorage.removeItem('signInIntent');
                sessionStorage.removeItem('signInTimestamp');
            } catch (e) {
                console.log('⚠️ Could not clear storage');
            }
            
            let errorMessage = 'Error signing in. Please try again.';
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Sign-in was cancelled. Please try again.';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'Pop-up was blocked. Please allow pop-ups for this site or try again.';
            } else if (error.code === 'auth/unauthorized-domain') {
                errorMessage = 'Domain not authorized. Please add your domain to Firebase Console.';
            } else if (error.code === 'auth/web-storage-unsupported') {
                errorMessage = 'Your browser has storage restrictions. Please enable cookies and try again.';
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            
            if (onError) onError(errorMessage);
            else alert(errorMessage);
        }
    },

    // Sign out function
    signOut: async (options = {}) => {
        const { onSuccess, onError, navigate } = options;
        
        try {
            await auth.signOut();
            console.log('✅ User signed out');
            if (onSuccess) onSuccess();
            if (navigate) navigate('/');
        } catch (error) {
            console.error('❌ Error signing out:', error);
            const errorMessage = 'Error signing out. Please try again.';
            if (onError) onError(errorMessage);
            else alert(errorMessage);
        }
    }
};

// Custom hook for auth state
export const useAuth = () => {
    const [authUser, setAuthUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log('🔥 Auth state changed:', user ? user.email : 'Not signed in');
            setAuthUser(user);
            setAuthLoading(false);
            setDebugInfo(`Auth: ${user ? user.email : 'Not signed in'} at ${new Date().toLocaleTimeString()}`);

            if (user) {
                await authService.createUserProfileInFirestore(user);
            }
        });

        return () => unsubscribe();
    }, []);

    // Check redirect result on component mount
    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                console.log('🔍 Checking redirect result...');
                const result = await getRedirectResult(auth);

                if (result) {
                    const user = result.user;
                    console.log('✅ User signed in via redirect:', user.email);
                    setDebugInfo(`Redirect success: ${user.email}`);
                    
                    await authService.createUserProfileInFirestore(user);
                    navigate('/');
                }
            } catch (error) {
                console.error('❌ Error getting redirect result:', error);
                setDebugInfo(`Redirect error: ${error.message}`);
                
                if (error.code === 'auth/unauthorized-domain') {
                    alert('Domain not authorized. Please add your domain to Firebase Console.');
                } else if (error.code === 'auth/operation-not-allowed') {
                    alert('Google sign-in not enabled. Please enable it in Firebase Console.');
                } else {
                    alert(`Error completing sign-in: ${error.message}`);
                }
            }
        };

        checkRedirectResult();
    }, [navigate]);

    // Return auth state and helper functions
    return {
        authUser,
        authLoading,
        debugInfo,
        // Convenience methods that include navigation
        signIn: (options = {}) => authService.signIn({ navigate, ...options }),
        signOut: (options = {}) => authService.signOut({ navigate, ...options }),
        // Raw service methods if you want more control
        authService
    };
};