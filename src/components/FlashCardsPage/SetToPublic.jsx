import { useState, useEffect } from "react";
import { getDatabase } from "firebase/database";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

function SetToPublic(){

    const [authUser, setAuthUser] = useState(null);
    const [isPublic, setIsPublic] = useState(false);

    useEffect(()=>{
        const unsubscribe = onAuthStateChanged(auth, (user)=>{
            if(user){
                setAuthUser(user);
            } else {
                setAuthUser(null);
            }
        })
        return ()=>unsubscribe();


    },[])


    const handleOnClick = ()=>{
        if(authUser)
        if(!isPublic){
            setIsPublic(true)
            const db = getDatabase(auth);


        } else {
            setIsPublic(false)
        }
    }

    // useEffect(()=>{
        
    
    // },[isPublic])
    

    return (
        <>
            <button onClick={handleOnClick} className="btn btn-primary">{isPublic ? "Set to Private" : "Set to Public"}</button>
        </>
    )
}

export default SetToPublic;