import { getDatabase, ref } from "firebase/database";
import { useLocation, useNavigate } from "react-router-dom";
import { app } from "../../firebase"
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../../firebase";
import { onValue } from "firebase/database";
import CreateFileInDisplayFilesBtn from "./CreateFileInDisplayFilesBtn";


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

    const location = useLocation();
    const { folderName } = location.state

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
        <div>
            <h1>Currently in folder: {folderName}</h1>
            <h1>You are in the display files: {authUser ? authUser.uid : "No account"}</h1>
            <ul>
                {folderContents.map((item, index) => (
                    <li key={index}>
                        <a href="#" onClick={(e)=>{
                            const newDirectory = `${folderName}/${item}`;
                            e.preventDefault();
                            navigate("/flashcards", {state: {fileName: newDirectory}})//this might have the same directory so be careful
                            
                        }}>
                            
                            <h2>{item}</h2>
                        </a>
                    </li>
                ))}
            </ul>
            <CreateFileInDisplayFilesBtn/ >
        </div>
    );
}

export default DisplayFiles;