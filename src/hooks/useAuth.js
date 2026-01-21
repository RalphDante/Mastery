// hooks/useAuth.js
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "../api/firebase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Auth service with all the business logic
export const authService = {

    // Main sign-in function
    signIn: async (options = {}) => {
        const { onSuccess, onError, navigate } = options;
        
        try {
            console.log('🔐 Starting authentication flow...');

            if (import.meta.env.VITE_PADDLE_ENVIRONMENT === 'sandbox') {
                console.log('🧪 Dev mode - using instant demo account');
                
                const { signInAnonymously } = await import('firebase/auth');
                const result = await signInAnonymously(auth);
                const user = result.user;
                
                console.log('✅ Demo user created:', user.uid);
                if (onSuccess) onSuccess(user);
                return;
            }
            
            
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
                
                // Let AuthProvider's onAuthStateChanged handle profile creation
                // and party assignment automatically
                
                if (onSuccess) onSuccess(user);
                
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
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                console.log('🔍 Checking redirect result...');
                const result = await getRedirectResult(auth);

                if (result) {
                    const user = result.user;
                    console.log('✅ User signed in via redirect:', user.email);
                    setDebugInfo(`Redirect success: ${user.email}`);
                    
                    // Let AuthProvider handle profile creation and party assignment
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

    return {
        authUser,
        authLoading,
        debugInfo,
        signIn: (options = {}) => authService.signIn({ navigate, ...options }),
        signOut: (options = {}) => authService.signOut({ navigate, ...options }),
        authService
    };
};