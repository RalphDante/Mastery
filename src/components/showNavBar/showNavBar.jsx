import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

function ShowNavBar({children}){


    const location = useLocation();
    const [showNavBar, setShowNavBar] = useState(false);

    useEffect(() => {
        // console.log("This is location", location)
        if(
            location.pathname === '/signup' || 
            location.pathname === "/createfile" || 
            location.pathname === '/signin' || 
            location.pathname === '/try-now' || 
            location.pathname === '/go-premium' || 
            location.pathname === '/newhome' || 
            location.pathname === '/newflashcardui' || 
            location.pathname === '/flashcards-demo' || 
            location.pathname.startsWith('/flashcards')
            ){
            setShowNavBar(false);
        } else {
            setShowNavBar(true);
        }
    }, [location]);

    return(
        <div className="sticky top-0 z-40">
            {showNavBar && children}
        </div>
    )
}

export default ShowNavBar;