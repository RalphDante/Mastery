import { getDatabase, ref, onValue } from "firebase/database";
import { useLocation } from "react-router-dom";
import { app, auth } from '../../firebase';
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useCallback } from "react"; 
import FlashCardUI from "./FlashCardUI";
import ModuleDescription from "./Description";
import styles from './FlashCardsPage.module.css'


function FlashCardsPage() {
    const location = useLocation();
    const { fileName } = location.state || {};



    const [authUser, setAuthUser] = useState(null);
    const db = getDatabase(app);

    
    const [knowAnswer, setKnowAnswer] = useState(0);
    const [dontKnowAnswer, setDontKnowAnswer] = useState(0);

 
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
        });
        return () => unsubscribe();
    }, []);

 
    

    return (
        <>  
            <div className={`${styles.flashCardsPageContainer}`}>
                <div className={`${styles.leftSideFlashCardsPageContainer}`}>
                    {/* <h1>Display Flash Cards</h1> */}
                    {fileName ? <h1 style={{marginBottom: '0px'}}>{fileName}</h1> : <h1>No file name</h1>}

                    <ModuleDescription 
                    db = {db}
                    fileName = {fileName}
                    authUser = {authUser}
                    />


                    {/* {authUser ? <h1>Welcome {authUser.email}</h1> : <h1>No user</h1>} */}
                    <FlashCardUI 
              
                        knowAnswer = {setKnowAnswer}
                        dontKnowAnswer={setDontKnowAnswer}
                
                    />

                </div>
                <div className={styles.rightSideFlashCardsPageContainer}>
                    {/* <h1>Right side</h1> */}
                    <h1>Correct: {knowAnswer}</h1>
                    <h1>Wrong: {dontKnowAnswer}</h1>
                </div>
            </div>
            
            
        </>
    );
}

export default FlashCardsPage;