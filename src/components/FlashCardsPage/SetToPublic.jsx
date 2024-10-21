import { useState, useEffect } from "react";
import { getDatabase, ref, set, remove } from "firebase/database";
import { app, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useParams } from "react-router-dom";
import { onValue } from "firebase/database";
import UserName from "../auth/UserName";

function SetToPublic(){

    const [authUser, setAuthUser] = useState(null);
    const [isPublic, setIsPublic] = useState(false);

    const { fileName } = useParams()

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

    const flashCardFileName = (fullPath) => {
        let currentIndex = fullPath.length - 1;
        let fileName = "";
    
        // Create an array to store characters in the correct order
        let tempArray = [];
    
        // Loop backward until you find the slash
        while (fullPath[currentIndex] !== "/") {
            // Add characters to the array
            tempArray.unshift(fullPath[currentIndex]); 
            currentIndex--;
        }
    
        // Join the array to form the correct file name
        fileName = tempArray.join("");
    
        return fileName;
    };

    const flashCardFolderName = (fileName)=>{
        let currentIndex = 0;

        let folderName = "";

        while(fileName[currentIndex] !== "/"){
            folderName += fileName[currentIndex];
            currentIndex++;
        }
        return folderName;
    }

    
    let userName = "";

    if(authUser){
        const userEmail = authUser.email;
        let currentIndex = 0
        while(userEmail[currentIndex] !== "." && userEmail[currentIndex] !== "@"){
            userName += userEmail[currentIndex];
            currentIndex += 1;
    }
    }
        
    

    const handleOnClick = ()=>{

        if(!isPublic){
            

            if(authUser){

                const db = getDatabase(app);
                const folderRef = ref(db, `QuizletsFolders/${authUser.uid}/${fileName}`);

                const unsubscribe = onValue(folderRef, (snapshot)=>{
                    const data = snapshot.val();
                    if(data){
                        const theActualFileName = `${flashCardFileName(fileName)}_${flashCardFolderName(fileName)}`;
                        const fileID = `${theActualFileName}_${authUser.uid}`;
                        const publicRef = ref(db, `PublicFolder/${fileID}/${userName}`)
                        set(publicRef, data)
                        .then(()=>{
                            setIsPublic(true)

                        })
                        .catch((err)=>{
                            console.error('Error setting data:', err)
                        })
                    }
                })

                return ()=>unsubscribe;
    
            }
         
           

        } else {
            if(authUser){
                const folderName = flashCardFolderName(fileName);
                const db = getDatabase(app);
                const folderRef = ref(db, `PublicFolder/${authUser.uid}_${folderName}`);
                remove(folderRef).then(()=>{
                    console.log("Set to private");
                    setIsPublic(false);
                }
                ).catch((error)=>{
                    console.error("Unsuccessful set to private", error);
                })


            }

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