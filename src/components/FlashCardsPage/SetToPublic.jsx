import { useState, useEffect } from "react";
import { getDatabase, ref } from "firebase/database";
import { app, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useParams } from "react-router-dom";

function SetToPublic(){

    const [authUser, setAuthUser] = useState(null);
    const [isPublic, setIsPublic] = useState(false);

    const { fileName} = useParams()

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
            const db = getDatabase(app);
            const folderRef = ref(db, `QuizletsFolders`);


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