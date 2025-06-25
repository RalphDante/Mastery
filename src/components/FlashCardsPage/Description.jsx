import { useCallback, useState, useEffect } from "react";
import { onValue } from "firebase/database";
import { ref } from "firebase/database";

function ModuleDescription({db, fileName, authUser}){

    const [description, setDescription] = useState(null);
    const fetchDescription = useCallback(() => {
        if (authUser && fileName) {
            const fileDocRef = ref(db, `QuizletsFolders/${authUser.uid}/${fileName}`);
            const unsubscribe = onValue(fileDocRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const descriptionUID = Object.keys(data)[0];
                    const descriptionValue = ref(db, `QuizletsFolders/${authUser.uid}/${fileName}/${descriptionUID}`);
                    
                    const descriptionUnsubscribe = onValue(descriptionValue, (snapshot) => {
                        const descriptionData = snapshot.val();

                        setDescription(descriptionData);
                    }, (error) => {
                        console.error("Database read error:", error);
                    });

                    return () => descriptionUnsubscribe();
                }
            });
            
            return () => unsubscribe();
        }
    }, [authUser, fileName]); 

    useEffect(() => {
        const unsubscribe = fetchDescription();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [fetchDescription]); // This will re-run when authUser or fileName changes
    

    return(
        <>
            {description ? <p className="text-gray-400 text-sm mb-4">{`Description: ${description.Description}`}</p> : <p className="text-gray-400 text-sm mb-4">{`Description: No Description`}</p>}
                
              
        </>
    )
}

export default ModuleDescription;