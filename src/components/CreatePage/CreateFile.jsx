import {useState} from 'react'; //might need to import 'React' as well
import { getDatabase, ref, set, push} from 'firebase/database';
import { app } from '../../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import DisplayFlashCards from './DisplayFlashCards';
import { onAuthStateChanged } from 'firebase/auth';
import {auth} from '../../firebase'
import styles from './CreateFilePage.module.css'

import CreateFlashCards from './CreateFlashCards';

function CreateFile(){

    const [fileName, setFileName] = useState("");
    const [fileDescription, setFileDescription] = useState("");
    const [flashCards, setFlashCards] = useState([]);
    const [authUser, setAuthUser] = useState(null);


    useState(()=>{
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


    const updateFlashCard = (index, updatedFlashCard) => {
        const newFlashCard = flashCards.map((fc, idx)=>
        index === idx ? updatedFlashCard : fc
        );

        setFlashCards(newFlashCard);
    }


    const deleteFlashCard = (index)=>{
        const newFlashCard = flashCards.filter((element, idx) => idx !== index);
        setFlashCards(newFlashCard)
    }
    
   

    const saveData = () => {
    
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
    }).then(
        alert("Saved Successfuly")
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
            <input className={styles.fileNameInput} type="text" value={fileDescription}
            onChange={(e)=>setFileDescription(e.target.value)}
            placeholder='Enter File Description'
            ></input>

            <h4 style={{marginBottom: '4px'}}>Your Juicy Flash Cards</h4>

            <div style={{height: '1px', backgroundColor: 'rgb(135, 207, 235, 0.186)', width: '100%', margin: '0'}}></div>


            <br></br>


            {/* FLASHCARDS */}

            <DisplayFlashCards 
            flashCards ={flashCards}
            onDelete = {deleteFlashCard}
            setFlashCards={setFlashCards}
            />

            <CreateFlashCards onAddFlashCard={addFlashCard}/>

            <br></br>

            

            <button onClick={saveData}>Save</button>


        </div>
    )
};

export default CreateFile;