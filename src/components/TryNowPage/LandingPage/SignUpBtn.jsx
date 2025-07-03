import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../../firebase";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Helper function to detect if user is on mobile
const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

function SignUpBtn(){


    const [authUser, setAuthUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('🔥 Auth state changed in SignUpBtn:', user ? user.email : 'Not signed in');
            setAuthUser(user);
            setAuthLoading(false);
            setDebugInfo(`Auth: ${user ? user.email : 'Not signed in'} at ${new Date().toLocaleTimeString()}`);
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
                    // You can add navigation logic here if needed
                    // navigate('/dashboard'); // Example
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
            
            // Don't proceed if auth is still loading
            if (authLoading) {
                console.log('⏳ Auth still loading, please wait...');
                alert('Authentication loading, please wait...');
                return;
            }
            
            // Check if user is already authenticated
            if (authUser) {
                console.log('✅ User already authenticated');
                alert('You are already signed in!');
                return;
            }

            const provider = new GoogleAuthProvider();
            
            // Add scopes and custom parameters
            provider.addScope('email');
            provider.addScope('profile');
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            
            console.log('🔐 Starting authentication flow...');
            setDebugInfo('Starting sign-in...');
            
            // Try popup first, then fallback to redirect
            try {
                console.log('🔄 Using popup authentication...');
                setDebugInfo('Using popup authentication...');
                
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                console.log('✅ User signed in via popup:', user.displayName, user.email);
                
                // Handle successful sign-in
                // alert(`Welcome, ${user.displayName || user.email}!`);
                // I can add navigation logic here
                navigate('/');
                
            } catch (popupError) {
                console.log('❌ Popup failed, trying redirect as fallback...');
                setDebugInfo('Popup failed, trying redirect...');
                
                // If popup fails, try redirect as fallback
                if (popupError.code === 'auth/popup-blocked' || 
                    popupError.code === 'auth/popup-closed-by-user' ||
                    popupError.code === 'auth/web-storage-unsupported') {
                    
                    console.log('📱 Falling back to redirect...');
                    
                    // Store intent in sessionStorage for after redirect
                    try {
                        sessionStorage.setItem('signInIntent', 'true');
                        sessionStorage.setItem('signInTimestamp', Date.now().toString());
                    } catch (storageError) {
                        console.log('⚠️ Storage unavailable, continuing without backup');
                    }
                    
                    await signInWithRedirect(auth, provider);
                } else {
                    throw popupError; // Re-throw if it's a different error
                }
            }
            
        } catch (error) {
            console.error('❌ Error during sign-in:', error);
            setDebugInfo(`Sign-in error: ${error.message}`);
            
            // Clear storage backup
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
                errorMessage = 'Your browser has storage restrictions. Please:\n1. Enable cookies\n2. Disable private/incognito mode\n3. Try a different browser';
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
            alert('Signed out successfully!');
        } catch (error) {
            console.error('❌ Error signing out:', error);
            alert('Error signing out. Please try again.');
        }
    };

    return (
        <>
            {/* Debug info - remove this in production */}
            {/* <div style={{fontSize: '12px', marginBottom: '10px', color: '#666'}}>
                Debug: {debugInfo}
                <br />
                User: {authUser ? authUser.email : 'Not signed in'}
            </div> */}
            
            {authUser ? (
                <div className="flex items-center gap-4">
                    {/* <span className="text-sm text-gray-600">
                        Welcome, {authUser.displayName || authUser.email}
                    </span> */}
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
                    onClick={()=>{
                        handleSignIn();
                    }}
                    disabled={authLoading}
                >
                    {authLoading ? 'Loading...' : 'Sign In'}
                </button>
            )}
        </>
    );
}

export default SignUpBtn;