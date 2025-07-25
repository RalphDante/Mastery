import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../api/firebase'; // Adjust path

function ShowNavBar({children}){

    const location = useLocation();
    const [showNavBar, setShowNavBar] = useState(false);
    const [authUser, setAuthUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (authLoading) return; // Wait for auth to load

        // Special case for root path - show navbar only if user is authenticated
        if (location.pathname === '/') {
            setShowNavBar(!!authUser);
        } else if (
            location.pathname === '/signup' || 
            location.pathname === "/createfile" || 
            location.pathname === '/signin' || 
            location.pathname === '/try-now' || 
            location.pathname === '/go-premium' || 
            location.pathname === '/newhome' || 
            location.pathname === '/newflashcardui' || 
            location.pathname === '/flashcards-demo' || 
            location.pathname.startsWith('/flashcards')
        ) {
            setShowNavBar(false);
        } else {
            setShowNavBar(true);
        }
    }, [location, authUser, authLoading]);

    return(
        <div className="sticky top-0 z-40">
            {showNavBar && children}
        </div>
    )
}

export default ShowNavBar;