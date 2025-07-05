import React, {useState, useEffect} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getDatabase, ref, set, push, onValue} from 'firebase/database'
import { app } from '../../api/firebase';
import AuthDetails from '../../components/auth/AuthDetails'
import { onAuthStateChanged } from 'firebase/auth';
import {auth} from '../../api/firebase'

import styles from "./CreateFilePage.module.css"




function CreateFolder (){

    const navigate = useNavigate();


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

    const [folderList, setFolderList] = useState([]);
    
    

    useEffect(() => {
        if (!authUser) return;
    
        const uid = authUser.uid;
        const db = getDatabase(app);
        const folderRef = ref(db, `QuizletsFolders/${uid}`);
    
        const unsubscribe = onValue(folderRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const firstInnerKey = Object.keys(data).map(key => ({
                    name: key,
                    ...data[key]
                }));
                setFolderList(firstInnerKey);
            }
        });
    
        return () => unsubscribe();
    }, [authUser]);

    


    const saveData = () => {
        if (folderName === "" || folderDescription === "") {
            alert("Please enter your Folder Name and Folder Description");
            return;
        }

        // if there already exists a folder name then we alert that there is already a folder name like that, please use a different folder name to avoid confusion

        
        if (folderList.some(folder => folder.name === folderName)) {
            alert(`You already have a folder named ${folderName}. Please make another name.`);
            return;
        }


        if(authUser){
            const uid = authUser.uid;
            const db = getDatabase(app);
            const newFolderRef = ref(db, `QuizletsFolders/${uid}/${folderName}`);
            const newDocRef = push(newFolderRef);

            set(newDocRef, {
                Description: folderDescription
            }).then(()=>{
                // alert("Saved successfuly")
                navigate('/createfile', {state: {folderName: folderName}});
            })
            } else {
                alert("User not Authenticated")
            }
        
    }

    return(
        <div className={styles.CreateFolderContainer}>
            <h1>Create a Folder</h1>
            {/* <h1>Signed in as {authUser ? authUser.email : 'Loading...'}</h1> */}
            
            <input type="text" value={folderName} className={styles.fileNameInput}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder='Folder name'
            ></input>
            <input type="text" value={folderDescription} className={styles.fileNameInput}
            onChange={(e)=>{setFolderDescription(e.target.value)}}
            placeholder='Description'
            ></input>
           
                <button className={styles.saveBtn} onClick={saveData} >Save</button>
        </div>

    )

}

export default CreateFolder;