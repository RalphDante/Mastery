import { getDatabase, ref, remove, set } from "firebase/database";
import { useLocation, useNavigate } from "react-router-dom";
import { app } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../../firebase";
import { onValue } from "firebase/database";

import 'bootstrap';


// FILE IMPORTS
import CreateFileInDisplayFilesBtn from "./CreateFileInDisplayFilesBtn";
import styles from './CreateFilePage.module.css';
import FolderDescription from "./FolderDescription";




function DisplayFiles({ folderUID }) {
    const [authUser, setAuthUser] = useState(null);
    const [folderContents, setFolderContents] = useState([]);
    const [description, setDescription] = useState("");

    const [currentFolderName, setCurrentFoldername] = useState("")
    const [newFolderName, setNewFoldername] = useState("");
    const [isEditing, setIsEditing] = useState(false);


    const location = useLocation();
    const { folderName } = location.state;
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user);
            } else {
                setAuthUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (authUser) {
            const db = getDatabase(app);
            const docRef = ref(db, `QuizletsFolders/${authUser.uid}/${folderName}`);

            const unsubscribe = onValue(docRef, (snapshot) => {
                const data = snapshot.val();

                if (data) {
                    const contents = Object.entries(data)
                        .filter(([key, value]) => !('Description' in value))
                        .map(([key]) => key);

                    setFolderContents(contents);

                    
                }
            });

            return () => unsubscribe();
        }
    }, [authUser, folderName]);

    const handleDeleteFolder = (folderName) => {
        if (authUser) {
            const confirmed = window.confirm("Are you sure you want to remove this folder?");
            if(confirmed){
                const db = getDatabase(app);
                const folderRef = ref(db, `QuizletsFolders/${authUser.uid}/${currentFolderName || folderName}`);

                remove(folderRef).then(() => {
                    console.log("Folder deleted");
                    navigate("/");
                }).catch((error) => {
                    console.error("Error deleting folder:", error);
                });
            } else {
                // If the user clicks "Cancel", do nothing
                console.log("Folder deletion canceled");
            }
            
        }
    };

    const handleEditFolder = () => {
        setNewFoldername(currentFolderName || folderName);
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!authUser || !newFolderName) return;

        const currentName = currentFolderName || folderName;
        const db = getDatabase(app);
        const oldFolderRef = ref(db, `QuizletsFolders/${authUser.uid}/${currentName}`);
        const newFolderRef = ref(db, `QuizletsFolders/${authUser.uid}/${newFolderName}`);

   

        const unsubscribeOldFolder = onValue(oldFolderRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const descriptionUID = Object.keys(data)[0];
                data[descriptionUID]['Description'] = description;
                if(newFolderName && newFolderName !== currentName){

                    set(newFolderRef, data).then(
                        () => {
                            remove(oldFolderRef)
                            
                            console.log(descriptionUID)
                        })
                        .then(() => console.log("Folder renamed successfully"))
                        .catch((error) => console.error("Error during folder operations:", error));
                } else {
                    set(oldFolderRef, data).then(()=>{
                        console.log("Description updated successfuly")
                    }).catch((err)=>{
                        console.error("Error updating description:", err)
                    })
                }
                
            }
        });

        setIsEditing(false);
        setCurrentFoldername(newFolderName)
        setNewFoldername("");
        return () => unsubscribeOldFolder();

    };

    
    
    const handleFileClick = (item, e) => {
        const newDirectory = `${currentFolderName ? currentFolderName : folderName}/${item}`;
        e.preventDefault();
        navigate(`/flashcards/${encodeURIComponent(newDirectory)}`);
    };

    const folderSpecification = ()=>{
        return currentFolderName || folderName
    }

    


    return (
        <div className={`${styles.displayFilesPage} max-w-fwidth`}>
            <div>
                {isEditing ? (
                    <div>
                        <h1>Edit Folder:</h1>
                        <input
                            className={styles.fileNameInput}
                            value={newFolderName || currentFolderName}
                            onChange={(e) => setNewFoldername(e.target.value)}
                            placeholder="Folder name"
                        />
                        <textarea
                            className={styles.fileNameInput}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                        <button className="btn text-white"style={{ backgroundColor: 'green' }} onClick={()=>handleSave()}>Save</button>
                        <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                        <button className="btn text-white"style={{ backgroundColor: '#ff5733' }} onClick={() => handleDeleteFolder(folderName)}>Delete Folder</button>
                    </div>
                ) : (
                    <div>
                        <h1>{currentFolderName ? currentFolderName : folderName}</h1>
                        <FolderDescription
                            folderName={folderSpecification()}
                            setDescription={setDescription}
                        />
                        <h3>Description: {description ? description: 'no description'}</h3>
                        <button className="btn btn-primary" onClick={handleEditFolder}>Edit folder</button>
                    </div>
                )}
            </div>
            <div className={`${styles.displayFilesContainer} justify-start`}>
                {folderContents.map((item, index) => (
                    <div
                        className={styles.card}
                        onClick={(e) => handleFileClick(item, e)}
                        key={index}
                    >
                        <div className={styles.card2}>
                            <a href="#" style={{ textDecoration: 'none' }}>
                                {item}
                            </a>
                        </div>
                    </div>
                ))}
                <CreateFileInDisplayFilesBtn />
            </div>
            
            
        </div>
    );
}

export default DisplayFiles;
