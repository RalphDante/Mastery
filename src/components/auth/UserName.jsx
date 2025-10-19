import { useEffect,useState } from "react"
import { auth } from "../../api/firebase"
import { useAuthContext } from "../../contexts/AuthContext";

function UserName(){
    const {userProfile} = useAuthContext();

        
   
   

    return(
        <>
            <h4 style={{margin: '0px'}}>{userProfile ? userProfile?.displayName: 'Guest'}</h4>
        </>
    )

}

export default UserName;