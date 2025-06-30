import { useState, useEffect } from "react";
import { getDatabase, ref, set, remove } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { useParams } from "react-router-dom";
import { onValue } from "firebase/database";

function SetToPublic() {
    const [authUser, setAuthUser] = useState(null);
    const [isPublic, setIsPublic] = useState(false);
    const { fileName } = useParams();
    const [copied, setCopied] = useState("");

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


    const copyToClipBoard = () => {
        const replacedSpaces = copied.replaceAll(" ", "%20") //replaces the " " into "%20"
        navigator.clipboard.writeText(replacedSpaces).then(() => {
            alert("Copied! Go share it with your friends!")
            
            // setTimeout(() => setCopied(""), 2000); 
        })
        .catch((error) => {
            console.error('Failed to copy text: ', error);
        });
        

    }

    
    const checkIfPublic = (user) => {
        if (!user) return;

        const db = getDatabase(app);
        const theActualFileName = `${flashCardFileName(fileName)}_${flashCardFolderName(fileName)}`;
        const fileID = `${theActualFileName}_${user.uid}`;
        const userName = getUserName(user.email);
        const publicRef = ref(db, `PublicFolder/${fileID}/${userName}`);

        setCopied(`https://mastery-innovate.web.app/publicFlashCards/${fileID}`)

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
            <button onClick={handleOnClick} className={`btn  ${isPublic ? "bg-red-800" : " bg-green-700"}`}>
                {isPublic ? "Set to Private" : "Set to Public"}
            </button>
            {isPublic? <i class="fa-solid fa-link text-3xl hover:cursor-pointer" onClick={()=>{copyToClipBoard()}}></i> : ""}
        </>
    );
}

export default SetToPublic;