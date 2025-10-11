import { useState, useEffect, useRef } from 'react'; // Import useRef
import { getFirestore, collection, addDoc, doc, setDoc, getDocs, query, onSnapshot, serverTimestamp, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore'; // Import writeBatch
import { app } from '../../api/firebase';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import DisplayFlashCards from './DisplayFlashCards';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../api/firebase'
import styles from './CreateFilePage.module.css'
import CreateFlashCards from './CreateFlashCards';

import { useAuthContext } from '../../contexts/AuthContext';

// Tutorial
import { useTutorials } from '../../contexts/TutorialContext';
import { useDeckCache } from '../../contexts/DeckCacheContext';

function CreateDeck() {
    
    // Decks Context
    const {invalidateFolderDecks, invalidateCards} = useDeckCache();

    const { getCardLimits, isPremium, user } = useAuthContext();

    // Tutorial
    const { completeTutorial } = useTutorials();

    const [showFlashCardAmount, setShowFlashCardAmount] = useState(true);
    const [fileName, setFileName] = useState("");
    const [fileDescription, setFileDescription] = useState("");
    const [flashCards, setFlashCards] = useState([
        { question: "", answer: "", question_type: "text", answer_type: "text" },
        { question: "", answer: "", question_type: "text", answer_type: "text" },
        { question: "", answer: "", question_type: "text", answer_type: "text" }
    ]);
    const [fileList, setFileList] = useState([]);
    const [folderId, setFolderId] = useState(null);
    const [folderName, setFolderName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Use useRef to store the original cards loaded in edit mode.
    // This allows us to compare current edits against the initial state without re-rendering issues.
    const originalFlashCardsRef = useRef([]);

    const navigate = useNavigate();
    const db = getFirestore(app);
    const { deckId } = useParams();
    const isEditMode = Boolean(deckId);

    const autoResize = (e) => {
        setTimeout(() => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
        }, 0);
    };

   

    // Get folder info from navigation state (for create mode)
    const location = useLocation();
    const { folderName: passedFolderName, folderId: passedFolderId, isNewFolder } = location.state || {};

    // Set folderId from navigation state (create mode)
    useEffect(() => {
        
        if (passedFolderId && !isEditMode) {
            setFolderId(passedFolderId);
        }
        if (passedFolderName && !isEditMode) {
            setFolderName(passedFolderName);
        }
    }, [passedFolderId, passedFolderName, isEditMode]);

    // Load existing deck data in edit mode
    useEffect(() => {
        if(!user){
            alert("You need to be logged in!");
            navigate("/");
        }
        if (isEditMode && deckId && user) {
            loadExistingDeck(deckId);
        }
    }, [isEditMode, deckId, user]);

    const loadExistingDeck = async (deckId) => {
        setIsLoading(true);
        try {
            // Get deck document
            const deckRef = doc(db, 'decks', deckId);
            const deckSnap = await getDoc(deckRef);

            if (!deckSnap.exists()) {
                alert("Deck not found!");
                navigate('/');
                return;
            }

            const deckData = deckSnap.data();

            // Check if user owns this deck
            if (deckData.ownerId !== user.uid) {
                alert("You don't have permission to edit this deck!");
                navigate('/');
                return;
            }

            // Set deck info
            setFileName(deckData.title);
            setFileDescription(deckData.description === "No Description" ? "" : deckData.description);
            setFolderId(deckData.folderId);

            // Get folder name
            const folderRef = doc(db, 'folders', deckData.folderId);
            const folderSnap = await getDoc(folderRef);
            if (folderSnap.exists()) {
                setFolderName(folderSnap.data().name);
            }

            // Get cards from subcollection
            const cardsRef = collection(db, 'decks', deckId, 'cards');
            const cardsQuery = query(cardsRef);
            const cardsSnapshot = await getDocs(cardsQuery);

            const cards = [];
            cardsSnapshot.forEach((doc) => {
                cards.push({
                    id: doc.id, // Keep the Firestore document ID
                    question: doc.data().question,
                    answer: doc.data().answer,
                    question_type: doc.data().question_type || "text",
                    answer_type: doc.data().answer_type || "text",
                    order: doc.data().order || 0
                });
            });

            // Sort cards by order
            cards.sort((a, b) => a.order - b.order);

            if (cards.length > 0) {
                setFlashCards(cards);
                originalFlashCardsRef.current = cards; // Store original cards for comparison
            } else {
                // If a deck exists but has no cards, initialize with default empty cards
                setFlashCards([
                    { question: "", answer: "", question_type: "text", answer_type: "text" },
                    { question: "", answer: "", question_type: "text", answer_type: "text" },
                    { question: "", answer: "", question_type: "text", answer_type: "text" }
                ]);
                originalFlashCardsRef.current = []; // No original cards to track
            }

        } catch (error) {
            console.error("Error loading deck:", error);
            alert("Error loading deck. Please try again.");
            navigate('/');
        } finally {
            setIsLoading(false);
        }
    };

    

    const addFlashCard = (flashcard) => {
        // When adding a new card, it won't have an 'id' yet, Firestore will assign one
        setFlashCards([...flashCards, flashcard])
    };

    const deleteFlashCard = async (index) => {
        
        

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
                // deckCount: 1
            });
            return folderRef.id;
        } catch (error) {
            console.error("Error creating folder:", error);
            throw error;
        }
    };

    const updateExistingDeck = async () => {
        const batch = writeBatch(db); // Initialize a Firestore write batch

        try {
            // --- 1. Update Deck Metadata ---
            const deckRef = doc(db, 'decks', deckId);
            batch.update(deckRef, {
                title: fileName,
                description: fileDescription === "" ? "No Description" : fileDescription,
                updatedAt: serverTimestamp(),
                // cardCount: flashCards.length
            });

            // --- 2. Process Cards (Add, Update, Delete) ---
            const cardsCollectionRef = collection(db, 'decks', deckId, 'cards');

            // Create maps for efficient lookup
            const originalCardsMap = new Map(originalFlashCardsRef.current.map(card => [card.id, card]));
            const currentCardsMap = new Map(flashCards.filter(card => card.id).map(card => [card.id, card])); // Only existing cards from current state

            // Cards to Delete: Iterate over original cards to find those removed
            originalFlashCardsRef.current.forEach(originalCard => {
                if (!currentCardsMap.has(originalCard.id)) {
                    const cardToDeleteRef = doc(cardsCollectionRef, originalCard.id);
                    batch.delete(cardToDeleteRef);
                    // TODO: Consider deleting associated cardProgress for this user/card via Cloud Function
                    // If you delete card here, cardProgress will become orphaned.
                    // A Cloud Function triggered on card deletion is ideal for cleaning up associated progress.
                }
            });

            // Cards to Add/Update: Iterate over current flashCards state
            flashCards.forEach((currentCard, index) => {
                const cardDataToSave = {
                    question: currentCard.question,
                    answer: currentCard.answer,
                    question_type: currentCard.question_type || "text",
                    answer_type: currentCard.answer_type || "text",
                    order: index, // Update order based on current display order
                };

                if (currentCard.id) {
                    // Existing card: Check if it's updated, then update it
                    const originalCard = originalCardsMap.get(currentCard.id);
                    // Simple check if anything important changed. You might make this more robust.
                    const isCardModified = !originalCard ||
                        originalCard.question !== currentCard.question ||
                        originalCard.answer !== currentCard.answer ||
                        originalCard.question_type !== currentCard.question_type ||
                        originalCard.answer_type !== currentCard.answer_type ||
                        originalCard.order !== index; // Check order change as well

                    if (isCardModified) {
                        const cardToUpdateRef = doc(cardsCollectionRef, currentCard.id);
                        batch.update(cardToUpdateRef, {
                            ...cardDataToSave,
                            updatedAt: serverTimestamp() // Add an updatedAt for cards
                        });
                    }
                } else {
                    // New card: add it
                    const newCardRef = doc(cardsCollectionRef); // Let Firestore generate ID for new card
                    batch.set(newCardRef, { // Use set with generated ID
                        ...cardDataToSave,
                        createdAt: serverTimestamp()
                    });
                }
            });

            // Commit the batch operation
            await batch.commit();

            invalidateFolderDecks(folderId);
            invalidateCards(deckId);
            
            
            // Navigate back to deck view
            navigate(`/flashcards/${deckId}`, {
                state: {
                    deckId: deckId,
                    folderId: folderId,
                    folderName: folderName,
                    deckTitle: fileName
                }
            });

        } catch (error) {
            console.error("Error updating deck:", error);
            alert("Error updating deck. Please try again.");
            throw error;
        }
    };

    const createNewDeck = async () => {
        const batch = writeBatch(db);
        
        try {
            let actualFolderId = folderId;
    
            // If we need to create a new folder, do it first
            if (isNewFolder) {
                actualFolderId = await createNewFolder(folderName, user.uid);
            }
            // REMOVED: Manual folder deckCount increment - let Cloud Function handle it
    
            // Create the deck document
            const deckRef = doc(collection(db, 'decks'));
            batch.set(deckRef, {
                title: fileName,
                description: fileDescription === "" ? "No Description" : fileDescription,
                ownerId: user.uid,
                folderId: actualFolderId,
                isPublic: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                // cardCount: flashCards.length, // This is fine - it's initial data
                tags: []
            });
    
            // Add cards to the deck's cards subcollection
            const cardsRef = collection(db, 'decks', deckRef.id, 'cards');
            flashCards.forEach((flashCard, index) => {
                const newCardDocRef = doc(cardsRef);
                batch.set(newCardDocRef, {
                    question: flashCard.question,
                    answer: flashCard.answer,
                    question_type: flashCard.question_type || "text",
                    answer_type: flashCard.answer_type || "text",
                    createdAt: serverTimestamp(),
                    order: index
                });
            });
    
            await batch.commit();
            // Cloud Functions will automatically:
            // 1. Increment user's deck count and card count
            // 2. Increment folder's deck count
    
            completeTutorial('create-deck');

            invalidateFolderDecks(folderId);
    
            navigate(`/flashcards/${deckRef.id}`, {
                state: {
                    deckId: deckRef.id,
                    folderId: actualFolderId,
                    folderName: folderName,
                    deckTitle: fileName
                }
            });
    
        } catch (error) {
            console.error("Error creating deck:", error);
            alert("Error creating deck. Please try again.");
            throw error;
        }
    };

    
    const saveData = async () => {
        const isEmpty = checkEmpty()
        if (isEmpty) {
            alert("There is an empty question or answer")
            return;
        }

        // Only check for duplicates if we're not creating a new folder and not in edit mode
        if (!isNewFolder && !isEditMode && fileList.some(file => file.name === fileName)) {
            alert(`You already have a file named ${fileName}. Please make another name.`);
            return;
        }

        if (fileName === "") {
            alert("Please enter your File Name")
            return;
        } else if (flashCards.length < 3) {
            alert("Please add at least 3 flashcards")
            return;
        }

        // Card limit check
        const cardLimits = getCardLimits();
        
        if (cardLimits.maxCards !== -1) { // -1 means unlimited (premium users)
            const currentCardCount = cardLimits.currentUsage || 0;
            const newTotalCards = isEditMode 
                ? currentCardCount - originalFlashCardsRef.current.length + flashCards.length 
                : currentCardCount + flashCards.length;
            
            if (newTotalCards > cardLimits.maxCards) {
                const cardsOverLimit = newTotalCards - cardLimits.maxCards;
                
                if (isEditMode) {
                    // In edit mode, suggest removing cards or upgrading
                    const confirmMessage = `You're trying to create a deck with ${flashCards.length} cards, 
but you can only add ${cardLimits.maxCards - currentCardCount} more cards on your ${isPremium() ? 'current' : 'free'} plan.

Current usage: ${currentCardCount}/${cardLimits.maxCards} cards

Press OK to ${isPremium() ? 'contact support for higher limits' : 'upgrade to Pro'}, 
or Cancel to go back and remove ${cardsOverLimit} cards.`;

                    if (window.confirm(confirmMessage)) {
                    // OK → upgrade or support
                    if (isPremium()) {
                        window.location.href = "/contactme";
                    } else {
                        window.location.href = "/pricing";
                    }
                    } else {
                        // Cancel → just let them keep editing
                        return;
                    }
                } else {
                    // In create mode, suggest removing cards or upgrading
                    const confirmMessage = `You're trying to create a deck with ${flashCards.length} cards, 
but you can only add ${cardLimits.maxCards - currentCardCount} more cards on your ${isPremium() ? 'current' : 'free'} plan.

Current usage: ${currentCardCount}/${cardLimits.maxCards} cards

Press OK to ${isPremium() ? 'contact support for higher limits' : 'upgrade to Pro'}, 
or Cancel to go back and remove ${cardsOverLimit} cards.`;

                    if (window.confirm(confirmMessage)) {
                    // OK → upgrade or support
                    if (isPremium()) {
                        window.location.href = "/contact-me";
                    } else {
                        window.location.href = "/pricing";
                    }
                    } else {
                        // Cancel → just let them keep editing
                        return;
                    }
                }
            }
        }

        setShowFlashCardAmount(false);

        try {
            if (isEditMode) {
                await updateExistingDeck();
            } else {
                await createNewDeck();
            }
        } catch (error) {
            // Re-show amount if an error occurred, useful for user feedback
            setShowFlashCardAmount(true);
        }
    }

    // Show loading state
    if (isLoading) {
        return (
            <div className={styles.createFilePage}>
                <h1>Loading deck...</h1>
            </div>
        );
    }

    return (
        <div className={styles.createFilePage}>
            <h1>
                {isEditMode ? `Edit: ${fileName || 'Deck'}` : `${folderName} ${isNewFolder ? "(New Folder)" : ""}`}
            </h1>
            <h3>Name the file:</h3>

            <input className={`${styles.fileNameInput} bg-gray-800  rounded-2xl shadow-lg border border-gray-700`} type="text" value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder='Enter Deck Name'
            ></input>
            <br></br>
            <textarea className={`${styles.fileNameInput} bg-gray-800  rounded-2xl shadow-lg border border-gray-700`} type="text" value={fileDescription}
                onChange={(e) => {
                    setFileDescription(e.target.value)
                    autoResize(e)
                }}
                placeholder='Enter Deck Description'
                onInput={autoResize}
            ></textarea>

            <h4 style={{ marginBottom: '10px' }}>Your Flash Cards</h4>

            <DisplayFlashCards
                flashCards={flashCards}
                onDelete={deleteFlashCard}
                setFlashCards={setFlashCards}
                autoResize={autoResize}
            />

            <div style={{ height: '1px', backgroundColor: 'rgb(135, 207, 235, 0.186)', width: '100%', marginBottom: '20px', marginTop: '20px' }}></div>

            {showFlashCardAmount ? <h1>Flashcards: {flashCards.length}</h1> : ""}

            <CreateFlashCards onAddFlashCard={addFlashCard}
                autoResize={autoResize} />

            <br></br>

            <div className={styles.saveBtnContainer}>
                <button className={styles.saveBtn} onClick={saveData} >
                    {isEditMode ? 'Update' : 'Save'}
                </button>
            </div>
        </div>
    )
};

export default CreateDeck;