import { useEffect,useState } from "react"
import { auth } from "../../firebase"
import { onAuthStateChanged } from "firebase/auth"

function UserName(){

    const [authUser, setAuthUser] = useState(null);

    useEffect(()=>{
        onAuthStateChanged(auth, (user)=>{
            if(user){
                setAuthUser(user)
            } else {
                setAuthUser(null)
            }
        })
    },[])

    let userName = "";

    if(authUser){
        const userEmail = authUser.email;
        let currentIndex = 0
        
    
        while(userEmail[currentIndex] !== "." && userEmail[currentIndex] !== "@"){
            userName += userEmail[currentIndex];
            currentIndex += 1;
        }
    }

   

    return(
        <>
            <h4 style={{margin: '0px'}}>{userName? userName: 'Sign up :)'}</h4>
        </>
    )

}

export default UserName;