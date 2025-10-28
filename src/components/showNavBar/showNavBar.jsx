import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../api/firebase'; // Adjust path
import { useTutorials } from "../../contexts/TutorialContext";

function ShowNavBar({children}){
    const {isInTutorial} = useTutorials();
    const isCreateDeckNotCompleted = isInTutorial('create-deck')

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
            location.pathname === '/pricing' || 
            location.pathname === '/newhome' || 
            location.pathname === '/flashcards-demo' || 
            location.pathname.startsWith('/flashcards') ||
            location.pathname.startsWith('/create-deck') ||
            location.pathname.startsWith('/join')  || 
            location.pathname.startsWith('/edit-deck')

        ) {
            setShowNavBar(false);
        } else {
            setShowNavBar(true);
        }
    }, [location, authUser, authLoading]);

    return(
        <div className={`sticky top-0 ${isCreateDeckNotCompleted ? 'z-40' : 'z-30'} `}>
            {showNavBar && children}
        </div>
    )
}

export default ShowNavBar;