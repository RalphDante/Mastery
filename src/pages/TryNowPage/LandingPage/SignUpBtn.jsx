import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../../api/firebase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Assuming 'db' is initialized from your firebase.js
import { db } from "../../../api/firebase"; // Make sure you export 'db' from firebase.js
import { useAuthContext } from "../../../contexts/AuthContext";

// Helper function to detect if user is on mobile
const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

function SignUpBtn({signIn}) {
 
    const navigate = useNavigate();
    const {user} = useAuthContext();

    


    
    
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
            {user ? (
                <div className="flex items-center gap-4">
                    <button 
                        className="bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-2 rounded-full font-semibold hover:shadow-lg hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105 text-white"
                        onClick={handleSignOut}
                    >
                        Sign Out
                    </button>
                </div>
            ) : (
                <button 
                    className="bg-gradient-to-r from-violet-800 to-purple-900 px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300 transform hover:scale-105 text-white"
                    onClick={() => signIn()} // No need for an anonymous function here if handleSignIn directly called
                >
                    Sign In
                </button>
            )}
        </>
    );
}

export default SignUpBtn;