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

function SignUpBtn({signIn}) {
    const [authUser, setAuthUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState('');
    const navigate = useNavigate();

    

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
                    onClick={() => signIn()} // No need for an anonymous function here if handleSignIn directly called
                    disabled={authLoading}
                >
                    {authLoading ? 'Loading...' : 'Sign In'}
                </button>
            )}
        </>
    );
}

export default SignUpBtn;