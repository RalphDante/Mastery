import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { useEffect, useState } from "react";

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
        <div className="flex flex-column justify-center max-w-fwidth bg-red-500 mx-auto">
            <h1 className='my-2 text-xl min-l-500'>What others have made, yes</h1>
            
        </div>

    )
}

export default Mastery;