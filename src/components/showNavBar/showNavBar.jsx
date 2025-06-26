import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

function ShowNavBar({children}){


    const location = useLocation();
    const [showNavBar, setShowNavBar] = useState(false);

    useEffect(() => {
        // console.log("This is location", location)
        if(location.pathname === '/signup' || location.pathname === "/createfile" || location.pathname === '/signin' || location.pathname === '/try-now'){
            setShowNavBar(false);
        } else {
            setShowNavBar(true);
        }
    }, [location]);

    return(
        <div>
            {showNavBar && children}
        </div>
    )
}

export default ShowNavBar;