import { getDatabase, ref, remove } from "firebase/database";
import { useLocation, useNavigate } from "react-router-dom";
import { app } from "../../firebase"
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../../firebase";
import { onValue } from "firebase/database";
import CreateFileInDisplayFilesBtn from "./CreateFileInDisplayFilesBtn";

import styles from './CreateFilePage.module.css'


function DisplayFiles({folderUID}) {
    const [authUser, setAuthUser] = useState(null);
    const [folderContents, setFolderContents] = useState([]);
    const navigate = useNavigate()

    

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user)
            } else {
                setAuthUser(null);
            }
        });

        return () => unsubscribe();
    }, []);



    const handleDeleteFolder = (folderName) => {
        if(authUser){
            const db = getDatabase(app)
            const folderRef = ref(db, `QuizletsFolders/${authUser.uid}/${folderName}`)

            remove(folderRef).then(()=>{
                console.log("Folder deleted")
            }).catch((error)=>{
                console.log(error)

            })
            
            navigate("/home")
        }
        
    }



    

    const location = useLocation();
    const { folderName } = location.state


    const handleFileClick = (item, e) => {
        const newDirectory = `${folderName}/${item}`
        e.preventDefault();
        navigate("/flashcards", {state: {fileName: newDirectory}})
    }


    useEffect(() => {
        if (authUser) {
            const db = getDatabase(app);
            const docRef = ref(db, `QuizletsFolders/${authUser.uid}/${folderName}`);

            const unsubscribe = onValue(docRef, (snapshot) => {
                const data = snapshot.val();

                if (data) {
                    const contents = Object.entries(data).filter(([key, value]) => {
                        // Exclude entries that only have a Description
                        return !('Description' in value);
                    }).map(([key, value]) => key);

                    setFolderContents(contents);
                    console.log("Folder contents:", contents);
                }
            });

            return () => unsubscribe();
        }
    }, [authUser, folderName]);

    return (
        <div className={styles.displayFilesPage}>
            <h1>Currently in folder: {folderName}</h1>
            {/* <h1>You are in the display files: {authUser ? authUser.uid : "No account"}</h1> */}

            <div className={styles.displayFilesContainer}>
                {folderContents.map((item, index) => (

                    <div className={styles.card} onClick={(e)=>handleFileClick(item, e)}>
                        <div className={styles.card2} key={index}>
                            <a href="#" style={{textDecoration: 'none'}}> 
                                {item}
                            </a>
                        </div>
                    </div>

                    ))}

                
            </div>
            <CreateFileInDisplayFilesBtn/ >
            <button onClick={()=>handleDeleteFolder(folderName)}>Delete Folder</button>
                
        </div>
    );
}

export default DisplayFiles;