import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

function ShowNavBar({children}){


    const location = useLocation();
    const [showNavBar, setShowNavBar] = useState(false);

    useEffect(() => {
        // console.log("This is location", location)
        if(location.pathname === '/' || location.pathname === '/signup' || location.pathname === "/createfile"){
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