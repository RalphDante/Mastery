import {useState} from 'react';
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { app } from '../../api/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import {auth} from '../../api/firebase'
import { useEffect } from 'react';

import styles from './CreateFilePage.module.css'
import CreateFlashCards from './CreateFlashCards';
import DisplayFlashCards from './DisplayFlashCards';

function CreateFile({deckId}){
    const [fileName, setFileName] = useState("");
    const [showFlashCardAmount, setShowFlashCardAmount] = useState(true);
    const [fileDescription, setFileDescription] = useState("");
    const [flashCards, setFlashCards] = useState([]);
    const [authUser, setAuthUser] = useState(null);
    const [flashCardsCount, setFlashCardsCount] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [existingDeckId, setExistingDeckId] = useState(null);

    const navigate = useNavigate(); 
    const db = getFirestore(app);

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

    // Load existing deck if deckId is provided (editing mode)
    useEffect(() => {
        if (deckId && authUser) {
            setIsEditing(true);
            setExistingDeckId(deckId);
            loadExistingDeck();
        }
    }, [deckId, authUser]);

    const loadExistingDeck = async () => {
        try {
            // Get deck metadata
            const deckRef = doc(db, 'decks', deckId);
            const deckDoc = await getDoc(deckRef);
            
            if (deckDoc.exists()) {
                const deckData = deckDoc.data();
                setFileName(deckData.title);
                setFileDescription(deckData.description || "");
                
                // Set up real-time listener for cards
                const cardsRef = collection(db, 'decks', deckId, 'cards');
                const unsubscribe = onSnapshot(cardsRef, (snapshot) => {
                    const cardsData = [];
                    snapshot.forEach((doc) => {
                        cardsData.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    // Sort by order if it exists
                    cardsData.sort((a, b) => (a.order || 0) - (b.order || 0));
                    setFlashCards(cardsData);
                });
                
                // Clean up listener on unmount
                return () => unsubscribe();
            }
        } catch (error) {
            console.error("Error loading existing deck:", error);
        }
    };

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
                return true;
            }
        }
        return false;
    }
   
    const saveData = async () => {
        const isEmpty = checkEmpty()
        if (isEmpty) {
            alert("There is an empty question or answer")
            return;
        }
        
        if(fileName === ""){
            alert("Please enter your File Name")
            return;
        } else if(flashCards.length < 3){
            alert("Please add at least 3 flashcards")
            return;
        } 

        const finalDescription = fileDescription === "" ? "No Description" : fileDescription;
        setShowFlashCardAmount(false);

        try {
            const uid = authUser.uid;
            let finalDeckId = existingDeckId;

            if (isEditing && existingDeckId) {
                // Update existing deck metadata
                const deckRef = doc(db, 'decks', existingDeckId);
                await setDoc(deckRef, {
                    title: fileName,
                    description: finalDescription,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
                
                // For editing, we need to handle cards more carefully
                // Delete all existing cards first, then add new ones
                const cardsRef = collection(db, 'decks', existingDeckId, 'cards');
                const existingCards = await getDocs(cardsRef);
                
                // Delete existing cards
                const deletePromises = existingCards.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
                
            } else {
                // Create new deck
                const deckRef = doc(collection(db, 'decks'));
                finalDeckId = deckRef.id;
                
                await setDoc(deckRef, {
                    name: fileName,
                    description: finalDescription,
                    ownerId: uid,
                    isPublic: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            // Add all flashcards to the cards subcollection
            const cardsRef = collection(db, 'decks', finalDeckId, 'cards');
            
            // Add cards with spaced repetition data
            const cardPromises = flashCards.map(async (flashcard, index) => {
                const cardData = {
                    question: flashcard.question,
                    answer: flashcard.answer,
                    order: index,
                    // SM-2 Algorithm initial values
                    easeFactor: 2.5,
                    interval: 1,
                    repetitions: 0,
                    dueDate: new Date().toISOString(), // Due today initially
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                return addDoc(cardsRef, cardData);
            });
            
            await Promise.all(cardPromises);
            
            console.log('Before navigation');
            navigate(`/flashcards/${finalDeckId}`);
            console.log('After navigation');

        } catch (error) {
            console.error("Error saving data:", error);
            alert("An error occurred while saving. Please try again.");
        } 
    }

    return(
        <div className={styles.createFilePage}>
            <input className={styles.fileNameInput} type="text" value={fileName}
            onChange={(e) => setFileName(e.target.value)} 
            placeholder='Enter Deck Name'
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

            <h4 style={{marginBottom: '10px'}}>Your Flash Cards</h4>

            <DisplayFlashCards 
            flashCards ={flashCards}
            onDelete = {deleteFlashCard}
            setFlashCards={setFlashCards}
            autoResize={autoResize}
            />

            <div style={{height: '1px', backgroundColor: 'rgb(135, 207, 235, 0.186)', width: '100%', marginBottom: '20px', marginTop: '20px'}}></div>
            
            {showFlashCardAmount ? <h1>Flashcards: {flashCards.length}</h1> : ""}

            <CreateFlashCards onAddFlashCard={addFlashCard} 
            autoResize={autoResize}/>

            <br></br>

            <div className={styles.saveBtnContainer}>
                <button className={styles.saveBtn} onClick={saveData} >
                    {isEditing ? 'Update' : 'Save'}
                </button>
            </div>
        </div>
    )
};

export default CreateFile;