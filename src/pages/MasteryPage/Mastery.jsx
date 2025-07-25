import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../api/firebase";
import { useEffect, useState } from "react";
import DisplayFilesFromOtherUser from "../MasteryPage/DisplayFilesByOtherUsers.jsx";

function Mastery(){

    const [authUser, setAuthUser] = useState(null)

    useEffect(()=>{
        const unsubscribe = onAuthStateChanged(auth, (user)=>{
            if(user){
                setAuthUser(user)
            } else {
                setAuthUser(null)
            }
        })

        return ()=>unsubscribe();
    },[])

    return (
        <div className="mx-8 w-auto">
            <h1 className='my-2 text-xl'>Make Flashcards with AI</h1>
            <DisplayFilesFromOtherUser />
            
        </div>

    )
}

export default Mastery;