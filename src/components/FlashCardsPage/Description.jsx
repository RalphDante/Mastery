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
            {description ? <h3 style={{color: '#b3b3b3', marginTop: '0px'}}>Description: {description.Description}</h3> : <h2>Description: </h2>}
        </>
    )
}

export default ModuleDescription;