import {useState, useEffect} from 'react';
import { getFirestore, collection, addDoc, doc, setDoc, getDocs, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { app } from '../../api/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import DisplayFlashCards from './DisplayFlashCards';
import { onAuthStateChanged } from 'firebase/auth';
import {auth} from '../../api/firebase'
import styles from './CreateFilePage.module.css'
import CreateFlashCards from './CreateFlashCards';

function CreateDeck(){
    
    const [showFlashCardAmount, setShowFlashCardAmount] = useState(true);
    const [fileName, setFileName] = useState("");
    const [fileDescription, setFileDescription] = useState("");
    const [flashCards, setFlashCards] = useState([{question: "", answer: ""},{question: "", answer: ""},{question: "", answer: ""}]);
    const [authUser, setAuthUser] = useState(null);
    const [fileList, setFileList] = useState([]);
    const [folderId, setFolderId] = useState(null);

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

    // Get folder info from navigation state
    const location = useLocation();
    const { folderName, folderId: passedFolderId, isNewFolder, uid } = location.state || {};

    // Set folderId from navigation state
    useEffect(() => {
        if (passedFolderId) {
            setFolderId(passedFolderId);
        }
    }, [passedFolderId]);

    // Check for duplicate deck names in the current folder (only if folder already exists)
    useEffect(() => {
        if (!authUser || !folderId || isNewFolder) return;

        const decksRef = collection(db, 'decks');
        const q = query(
            decksRef, 
            where('ownerId', '==', authUser.uid),
            where('folderId', '==', folderId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const decks = [];
            snapshot.forEach((doc) => {
                decks.push({
                    id: doc.id,
                    name: doc.data().title,
                    ...doc.data()
                });
            });
            setFileList(decks);
        });

        return () => unsubscribe();
    }, [authUser, folderId, db, isNewFolder]);

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

    // Function to create a new folder
    const createNewFolder = async (folderName, userId) => {
        try {
            const folderRef = await addDoc(collection(db, 'folders'), {
                name: folderName,
                ownerId: userId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                subscriptionTier: "free", // Default value
                isPublic: false,
                deckCount: 0
            });
            return folderRef.id;
        } catch (error) {
            console.error("Error creating folder:", error);
            throw error;
        }
    };

    const saveData = async () => {
        const isEmpty = checkEmpty()
        if (isEmpty) {
            alert("There is an empty question or answer")
            return;
        }

        // Only check for duplicates if we're not creating a new folder
        if (!isNewFolder && fileList.some(file => file.name === fileName)) {
            alert(`You already have a file named ${fileName}. Please make another name.`);
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
            let actualFolderId = folderId;

            // If we need to create a new folder, do it first
            if (isNewFolder) {
                actualFolderId = await createNewFolder(folderName, authUser.uid);
            }

            // Create the deck document
            const deckRef = await addDoc(collection(db, 'decks'), {
                title: fileName,
                description: finalDescription,
                ownerId: authUser.uid,
                folderId: actualFolderId,
                isPublic: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                cardCount: flashCards.length,
                tags: [] // You can add tags functionality later
            });

            // Add cards to the deck's cards subcollection
            const cardsRef = collection(db, 'decks', deckRef.id, 'cards');
            const cardPromises = flashCards.map((flashCard, index) => {
                return addDoc(cardsRef, {
                    question: flashCard.question,
                    answer: flashCard.answer,
                    imageUrl: null, // Add image functionality later if needed
                    createdAt: serverTimestamp(),
                    order: index // Simple ordering for now
                });
            });

            await Promise.all(cardPromises);

            // Update folder's deckCount (you might want to use a Cloud Function for this)
            // For now, we'll skip this denormalized count update

            // Navigate to the deck view
            navigate(`/flashcards/${deckRef.id}`, {
                state: { 
                    deckId: deckRef.id,
                    folderId: actualFolderId,
                    folderName: folderName,
                    deckTitle: fileName
                }
            });

        } catch (error) {
            console.error("Error saving deck:", error);
            alert("Error saving deck. Please try again.");
            setShowFlashCardAmount(true);
        }
    }

    return(
        <div className={styles.createFilePage}>
            <h1>{folderName} {isNewFolder && "(New Folder)"}</h1>
            <h3>Name the file:</h3>

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
            placeholder='Enter Deck Description'
            onInput={autoResize}
            ></textarea>

            <h4 style={{marginBottom: '10px'}}>Your Juicy Flash Cards</h4>

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
                <button className={styles.saveBtn} onClick={saveData} >Save</button>
            </div>
        </div>
    )
};

export default CreateDeck;