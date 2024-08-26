import {useState} from 'react'; //might need to import 'React' as well
import { getDatabase, ref, set, push} from 'firebase/database';
import { app } from '../../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import DisplayFlashCards from './DisplayFlashCards';
import { onAuthStateChanged } from 'firebase/auth';
import {auth} from '../../firebase'
import styles from './CreateFilePage.module.css'
import { useEffect } from 'react';

import CreateFlashCards from './CreateFlashCards';

function CreateFile(){

    const [fileName, setFileName] = useState("");
    const [fileDescription, setFileDescription] = useState("");
    const [flashCards, setFlashCards] = useState([{question: "", answer: ""},{question: "", answer: ""},{question: "", answer: ""}]);
    const [authUser, setAuthUser] = useState(null);


    

    const navigate = useNavigate(); 

    const autoResize = (e) => {
        setTimeout(() => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
        }, 0);
    };


    useEffect(()=>{
        onAuthStateChanged(auth, (user) =>{
            if(user){
                setAuthUser(user);
            } else {
                setAuthUser(null);
            }
        })

    },[]);

    const location = useLocation();
    const { folderName } = location.state;

    const addFlashCard = (flashcard) => {
        setFlashCards([...flashCards, flashcard])
    };


   


    const deleteFlashCard = (index)=>{
        const newFlashCard = flashCards.filter((element, idx) => idx !== index);
        setFlashCards(newFlashCard)
    }
    

    const checkEmpty = () => {
        for (const flashCard of flashCards) {
            if (flashCard.question.trim() === "" || flashCard.answer.trim() === "") {
                return true; // Return true if any flashcard is empty
            }
        }
        return false; // Return false if no flashcards are empty
    }
    
   

    const saveData = () => {
    const isEmpty = checkEmpty()
    if (isEmpty) {
        alert("There is an empty question or answer")
        return;
    }
    
    if(fileName === "" || fileDescription === ""){
        alert("Please enter your File Name and its Description")
        return;
    } else if(flashCards.length < 3){
        alert("Please add at least 3 flashcards")
        return;
    }
    
    const uid = authUser.uid
    const db = getDatabase(app);
    const newFileRef = ref(db, `QuizletsFolders/${uid}/${folderName}/${fileName}`);
    const newDocRef = push(newFileRef);

    set(newDocRef, {
        Description: fileDescription,
        Flashcards: flashCards
    }).then(()=>{
        navigate(`/flashcards/${encodeURIComponent(`${folderName}/${fileName}`)}`);
        // alert("Saved Successfuly")
    }
    )
    

    }

    return(
        <div className={styles.createFilePage}>
            <h1>{folderName}</h1>
            <h3>Name the file:</h3>

            <input className={styles.fileNameInput} type="text" value={fileName}
            onChange={(e) => setFileName(e.target.value)} 
            placeholder='Enter File Name'
            ></input>
            <br></br>
            <textarea className={styles.fileNameInput} type="text" value={fileDescription}
            onChange={(e)=>{
                setFileDescription(e.target.value)
                autoResize(e)
            }}
            placeholder='Enter File Description'
            onInput={autoResize}
            ></textarea>

            <h4 style={{marginBottom: '10px'}}>Your Juicy Flash Cards</h4>




            {/* <br></br> */}


            {/* FLASHCARDS */}

            <DisplayFlashCards 
            flashCards ={flashCards}
            onDelete = {deleteFlashCard}
            setFlashCards={setFlashCards}
            autoResize={autoResize}
            />

            <div style={{height: '1px', backgroundColor: 'rgb(135, 207, 235, 0.186)', width: '100%', marginBottom: '20px', marginTop: '20px'}}></div>


            <CreateFlashCards onAddFlashCard={addFlashCard} 
            autoResize={autoResize}/>

            <br></br>

            <div className={styles.saveBtnContainer}>
                <button className={styles.saveBtn} onClick={saveData} >Save</button>

            </div>



        </div>
    )
};

export default CreateFile;