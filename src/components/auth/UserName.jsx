import { useEffect,useState } from "react"
import { auth } from "../../api/firebase"
import { useAuthContext } from "../../contexts/AuthContext";

function UserName(){
    const {user} = useAuthContext();

        
   
   

    return(
        <>
            <h4 style={{margin: '0px'}}>{user ? user?.displayName: 'Guest'}</h4>
        </>
    )

}

export default UserName;