import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
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
        <div className="flex-row flex-column justify-center max-w-fwidth  mx-auto">
            <h1 className='my-2 text-xl min-l-500'>What others have made: </h1>
            <DisplayFilesFromOtherUser />
            
        </div>

    )
}

export default Mastery;