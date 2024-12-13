import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Btn.module.css';
import { useState } from 'react';
import { auth } from '../../../firebase';
import { onAuthStateChanged } from 'firebase/auth';



function CreateBtn ({currentClient}){
    
    const navigate = useNavigate();
    const [authUser, setAuthUser] = useState(null);
   
    useEffect(()=>{
        onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user)
            } else {
                setAuthUser(null)
            }
        });
    }, []);

    const createNewQuizletFunction = () => {
        try{
            if(authUser){
                navigate('/createfolder', {state: {currentClient: currentClient}})
            }else{
                navigate('/signup')
            }
            
         } catch(error) {
            console.error(error)
        }
    }


    return(
        <button className={styles.button} onClick={createNewQuizletFunction}>Create</button>
    )
}

export default CreateBtn;