import React, {useState, useEffect} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getDatabase, ref, set, push} from 'firebase/database'
import { app } from '../../firebase';
import AuthDetails from '../auth/AuthDetails'
import { onAuthStateChanged } from 'firebase/auth';
import {auth} from '../../firebase'



function CreateFolder (){

    const navigate = useNavigate();
    const location = useLocation();

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




    const [folderName, setFolderName] = useState("");
    const [folderDescription, setFolderDescription] = useState("");
    

    const saveData = () => {
        if (folderName === "" || folderDescription === "") {
            alert("Please enter your Folder Name and Folder Description");
            return;
        }
        if(authUser){
            const uid = authUser.uid
            const db = getDatabase(app);
            const newFolderRef = ref(db, `QuizletsFolders/${uid}/${folderName}`);
            const newDocRef = push(newFolderRef);

            set(newDocRef, {
                Description: folderDescription
            }).then(()=>{
                alert("Saved successfuly")
                navigate('/createfile', {state: {folderName: folderName}});
            })
            } else {
                alert("User not Authenticated")
            }
        
    }

    return(
        <div>
            <h1>Create a Folder</h1>
            <h1>Signed in as {authUser ? authUser.email : 'Loading...'}</h1>
            
            <input type="text" value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder='Folder name'
            ></input>
            <input type="text" value={folderDescription}
            onChange={(e)=>{setFolderDescription(e.target.value)}}
            placeholder='Description'
            ></input>
            <button onClick={saveData}>Save</button>
        </div>

    )

}

export default CreateFolder;