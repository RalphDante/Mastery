import { ref, getDatabase } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { auth, app } from "../../firebase";
import { onValue } from "firebase/database";
import { useState, useEffect } from "react";

function FolderDescription({folderName, setDescription}){

    const [authUser, setAuthUser] = useState(null)

    useEffect(()=>{
        const unsubscribe = onAuthStateChanged(auth, (user)=>{
            if(user){
                setAuthUser(user)
            } else {
                setAuthUser(null)
            }

            return ()=>unsubscribe();
        })
    },[])

    useEffect(()=>{
        if(authUser){
            const db = getDatabase(app)
    
            const folderRef = ref(db, `QuizletsFolders/${authUser.uid}/${folderName}`)
    
            const folderUnsubscribe = onValue(folderRef, (snapshot)=>{
                const data = snapshot.val()
                console.log(data)
                if(data){
                    const innerKeys = Object.keys(data);
                    const descriptionUID = innerKeys[0];
    
                    const secondFolderRef = ref(db, `QuizletsFolders/${authUser.uid}/${folderName}/${descriptionUID}`)
    
                    const descriptionUIDUnsubscribe = onValue(secondFolderRef, (snapshot)=>{
                        const data = snapshot.val()
                        if(data){
                            const description = data.Description;
                            setDescription(description)
                        }
                        
                    })
    
                    return ()=>descriptionUIDUnsubscribe();
                }
    
    
            })
    
            return ()=>folderUnsubscribe();
        }
    },[authUser])

    

    return null;
}

export default FolderDescription;