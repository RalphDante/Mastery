import { useState, useEffect } from "react";
import { getDatabase, ref, set, remove } from "firebase/database";
import { app, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useParams } from "react-router-dom";
import { onValue } from "firebase/database";
import UserName from "../auth/UserName";

function SetToPublic() {
    const [authUser, setAuthUser] = useState(null);
    const [isPublic, setIsPublic] = useState(false);
    const { fileName } = useParams();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user);
                // Check if the file is public when component mounts
                checkIfPublic(user);
            } else {
                setAuthUser(null);
            }
        });
        return () => unsubscribe();
    }, [fileName]);

    const flashCardFileName = (fullPath) => {
        let currentIndex = fullPath.length - 1;
        let tempArray = [];
        
        while (fullPath[currentIndex] !== "/") {
            tempArray.unshift(fullPath[currentIndex]); 
            currentIndex--;
        }
        
        return tempArray.join("");
    };

    const flashCardFolderName = (fileName) => {
        let currentIndex = 0;
        let folderName = "";

        while (fileName[currentIndex] !== "/") {
            folderName += fileName[currentIndex];
            currentIndex++;
        }
        return folderName;
    };

    const getUserName = (userEmail) => {
        let userName = "";
        let currentIndex = 0;
        while (userEmail[currentIndex] !== "." && userEmail[currentIndex] !== "@") {
            userName += userEmail[currentIndex];
            currentIndex += 1;
        }
        return userName;
    };

    // New function to check if file is already public
    const checkIfPublic = (user) => {
        if (!user) return;

        const db = getDatabase(app);
        const theActualFileName = `${flashCardFileName(fileName)}_${flashCardFolderName(fileName)}`;
        const fileID = `${theActualFileName}_${user.uid}`;
        const userName = getUserName(user.email);
        const publicRef = ref(db, `PublicFolder/${fileID}/${userName}`);

        onValue(publicRef, (snapshot) => {
            setIsPublic(snapshot.exists());
        });
    };

    const handleOnClick = () => {
        if (!authUser) return;

        const db = getDatabase(app);
        const theActualFileName = `${flashCardFileName(fileName)}_${flashCardFolderName(fileName)}`;
        const fileID = `${theActualFileName}_${authUser.uid}`;
        const userName = getUserName(authUser.email);
        const publicRef = ref(db, `PublicFolder/${fileID}/${userName}`);

        if (!isPublic) {
            // Setting to public
            const folderRef = ref(db, `QuizletsFolders/${authUser.uid}/${fileName}`);
            
            onValue(folderRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    set(publicRef, data)
                        .then(() => {
                            setIsPublic(true);
                            console.log("Successfully set to public");
                        })
                        .catch((err) => {
                            console.error('Error setting data:', err);
                        });
                }
            }, { onlyOnce: true }); // Only read once
        } else {
            // Setting to private
            remove(publicRef)
                .then(() => {
                    console.log("Successfully set to private");
                    setIsPublic(false);
                })
                .catch((error) => {
                    console.error("Unsuccessful set to private", error);
                });
        }
    };

    return (
        <>
            <button onClick={handleOnClick} className="btn btn-primary">
                {isPublic ? "Set to Private" : "Set to Public"}
            </button>
            {isPublic? <i class="fa-solid fa-link text-3xl"></i> : ""}
        </>
    );
}

export default SetToPublic;