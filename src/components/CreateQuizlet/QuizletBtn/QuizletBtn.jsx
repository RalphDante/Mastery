import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Btn.module.css';



function CreateBtn ({currentClient}){

    const navigate = useNavigate();
    const createNewQuizletFunction = () => {
        try{
            navigate('/createfolder', {state: {currentClient: currentClient}})
         } catch(error) {
            console.error(error)
        }
    }


    return(
        <button className={styles.button} onClick={createNewQuizletFunction}>Create</button>
    )
}

export default CreateBtn;