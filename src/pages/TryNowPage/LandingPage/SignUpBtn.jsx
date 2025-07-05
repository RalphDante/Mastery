import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../../api/firebase";
import { doc, setDoc, getFirestore, getDoc } from "firebase/firestore"; // Import Firestore functions
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Assuming 'db' is initialized from your firebase.js
import { db } from "../../../api/firebase"; // Make sure you export 'db' from firebase.js

// Helper function to detect if user is on mobile
const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

function SignUpBtn() {
    const [authUser, setAuthUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState('');
    const navigate = useNavigate();

    // Function to create/update user profile in Firestore
    const createUserProfileInFirestore = async (user) => {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            console.log('📝 Creating new Firestore user profile...');
            await setDoc(userRef, {
                email: user.email,
                displayName: user.displayName || "New User",
                createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date(),
                lastActiveAt: new Date(),
                stats: {
                    totalReviews: 0,
                    weeklyReviews: 0,
                    currentStreak: 0,
                    longestStreak: 0,
                    totalDecks: 0,
                    totalCards: 0
                },
                subscription: {
                    tier: "free", // Default to free tier
                    expiresAt: null
                }
            });
            console.log("✅ Firestore profile created for:", user.email);
        } else {
            // Profile exists, just update last active time
            console.log('🔄 Updating lastActiveAt for existing user:', user.email);
            await setDoc(userRef, { lastActiveAt: new Date() }, { merge: true });
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log('🔥 Auth state changed in SignUpBtn:', user ? user.email : 'Not signed in');
            setAuthUser(user);
            setAuthLoading(false);
            setDebugInfo(`Auth: ${user ? user.email : 'Not signed in'} at ${new Date().toLocaleTimeString()}`);

            // If user is signed in, ensure their Firestore profile exists/is updated
            if (user) {
                await createUserProfileInFirestore(user);
            }
        });

        return () => unsubscribe();
    }, []);

    // Check redirect result on component mount
    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                console.log('🔍 Checking redirect result in SignUpBtn...');
                const result = await getRedirectResult(auth);

                if (result) {
                    const user = result.user;
                    console.log('✅ User signed in via redirect:', user.email);
                    setDebugInfo(`Redirect success: ${user.email}`);
                    
                    // --- IMPORTANT: Create/Update Firestore profile here after successful redirect ---
                    await createUserProfileInFirestore(user); 
                    
                    navigate('/'); // Example: navigate to home/dashboard
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
    }, []);
    
    const handleSignIn = async () => {
        try {
            console.log('🔐 Sign in clicked', { 
                authUser: authUser?.email, 
                isMobileDevice: isMobile(),
                authLoading 
            });
            
            if (authLoading) {
                console.log('⏳ Auth still loading, please wait...');
                alert('Authentication loading, please wait...');
                return;
            }
            
            if (authUser) {
                console.log('✅ User already authenticated');
                alert('You are already signed in!');
                return;
            }

            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            
            console.log('🔐 Starting authentication flow...');
            setDebugInfo('Starting sign-in...');
            
            try {
                console.log('🔄 Using popup authentication...');
                setDebugInfo('Using popup authentication...');
                
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                console.log('✅ User signed in via popup:', user.displayName, user.email);
                
                // --- IMPORTANT: Create/Update Firestore profile here after successful popup ---
                await createUserProfileInFirestore(user);

                navigate('/'); // Navigate after successful sign-in and profile creation
                
            } catch (popupError) {
                console.log('❌ Popup failed, trying redirect as fallback...');
                setDebugInfo('Popup failed, trying redirect...');
                
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
                    
                    await signInWithRedirect(auth, provider); // This will cause a page reload
                } else {
                    throw popupError; // Re-throw if it's a different error
                }
            }
            
        } catch (error) {
            console.error('❌ Error during sign-in:', error);
            setDebugInfo(`Sign-in error: ${error.message}`);
            
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
                errorMessage = 'Your browser has storage restrictions. Please:\\n1. Enable cookies\\n2. Disable private/incognito mode\\n3. Try a different browser';
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            
            alert(errorMessage);
        }
    };

    const handleSignOut = async () => {
        try {
            await auth.signOut();
            console.log('✅ User signed out');
            // No need to delete Firestore user document here, keep it for historical data
            alert('Signed out successfully!');
            navigate('/'); // Navigate to home or login page after sign out
        } catch (error) {
            console.error('❌ Error signing out:', error);
            alert('Error signing out. Please try again.');
        }
    };

    return (
        <>
            {/* ... rest of your JSX ... */}
            {authUser ? (
                <div className="flex items-center gap-4">
                    <button 
                        className="bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-2 rounded-full font-semibold hover:shadow-lg hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105 text-white"
                        onClick={handleSignOut}
                        disabled={authLoading}
                    >
                        Sign Out
                    </button>
                </div>
            ) : (
                <button 
                    className="bg-gradient-to-r from-violet-800 to-purple-900 px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300 transform hover:scale-105 text-white"
                    onClick={handleSignIn} // No need for an anonymous function here if handleSignIn directly called
                    disabled={authLoading}
                >
                    {authLoading ? 'Loading...' : 'Sign In'}
                </button>
            )}
        </>
    );
}

export default SignUpBtn;