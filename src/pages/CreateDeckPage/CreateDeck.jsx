// CreateDeck.jsx - Optimized to use cached data from navigation state

import { useState, useEffect, useRef } from 'react';
import { getFirestore, collection, addDoc, doc, setDoc, getDocs, query, onSnapshot, serverTimestamp, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { app, db } from '../../api/firebase';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import DisplayFlashCards from './DisplayFlashCards';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../api/firebase'
import styles from './CreateFilePage.module.css'
import CreateFlashCards from './CreateFlashCards';

import { useAuthContext } from '../../contexts/AuthContext';
import { useTutorials } from '../../contexts/TutorialContext';
import { useDeckCache } from '../../contexts/DeckCacheContext';
import { ArrowLeft } from 'lucide-react';
import LimitReachedModal from '../../components/Modals/LimitReachedModal';
import { awardWithXP } from '../../utils/giveAwardUtils';
import { usePartyContext } from '../../contexts/PartyContext';

function CreateDeck() {
    const { invalidateFolderDecks, invalidateCards, invalidateDeckMetadata } = useDeckCache();
    const { getCardLimits, isPremium, user, userProfile } = useAuthContext();
    const { advanceStep, isTutorialAtStep } = useTutorials();
    const isFirstTime = isTutorialAtStep('create-deck', 1)

    const {updateUserProfile} = usePartyContext();

    const [showLimit, setShowLimit] = useState(false)

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

    const originalFlashCardsRef = useRef([]);

    const navigate = useNavigate();
    const location = useLocation();
    const { deckId } = useParams();
    const isEditMode = Boolean(deckId);

    // Get data from navigation state (could be from cache or new deck)
    const { 
        deckData: passedDeckData, 
        flashCards: passedFlashCards, 
        fromCache,
        folderName: passedFolderName, 
        folderId: passedFolderId, 
        isNewFolder 
    } = location.state || {};

    const autoResize = (e) => {
        setTimeout(() => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
        }, 0);
    };

    // Set folderId from navigation state (create mode)
    useEffect(() => {
        if (passedFolderId && !isEditMode) {
            setFolderId(passedFolderId);
        }
        if (passedFolderName && !isEditMode) {
            setFolderName(passedFolderName);
        }
    }, [passedFolderId, passedFolderName, isEditMode]);

    // Load deck data in edit mode
    useEffect(() => {
        if (!user) {
            alert("You need to be logged in!");
            navigate("/");
            return;
        }

        if (isEditMode && deckId) {
            // Check if we have cached data from navigation
            if (fromCache && passedDeckData && passedFlashCards) {
                console.log('✅ Using cached data from FlashCardsPage - no fetch needed!');
                loadFromCachedData(passedDeckData, passedFlashCards);
            } else {
                console.log('🔍 No cached data - fetching from Firestore...');
                loadExistingDeck(deckId);
            }
        }
    }, [isEditMode, deckId, user, fromCache]);


    // Limit Section
    const handleLimitClose = () => {
        setShowLimit(false);
    }

    const handleUpgrade = () => {
        console.log("Opening Checkout")
    }

    // NEW: Load from cached data passed via navigation
    const loadFromCachedData = (deckData, cards) => {
        // Set deck info
        setFileName(deckData.title);
        setFileDescription(deckData.description === "No Description" ? "" : deckData.description);
        setFolderId(deckData.folderId);

        // You might need to fetch folder name if not included
        if (deckData.folderName) {
            setFolderName(deckData.folderName);
        } else {
            fetchFolderName(deckData.folderId);
        }

        // Set cards
        if (cards && cards.length > 0) {
            setFlashCards(cards);
            originalFlashCardsRef.current = cards;
        } else {
            setFlashCards([
                { question: "", answer: "", question_type: "text", answer_type: "text" },
                { question: "", answer: "", question_type: "text", answer_type: "text" },
                { question: "", answer: "", question_type: "text", answer_type: "text" }
            ]);
            originalFlashCardsRef.current = [];
        }
    };

    // Helper to fetch folder name if not in cached data
    const fetchFolderName = async (folderId) => {
        try {
            const folderRef = doc(db, 'folders', folderId);
            const folderSnap = await getDoc(folderRef);
            if (folderSnap.exists()) {
                setFolderName(folderSnap.data().name);
            }
        } catch (error) {
            console.error("Error fetching folder name:", error);
        }
    };

    // EXISTING: Fallback fetch from Firestore if no cached data
    const loadExistingDeck = async (deckId) => {
        setIsLoading(true);
        try {
            const deckRef = doc(db, 'decks', deckId);
            const deckSnap = await getDoc(deckRef);

            if (!deckSnap.exists()) {
                alert("Deck not found!");
                navigate('/');
                return;
            }

            const deckData = deckSnap.data();

            if (deckData.ownerId !== user.uid) {
                alert("You don't have permission to edit this deck!");
                navigate('/');
                return;
            }

            setFileName(deckData.title);
            setFileDescription(deckData.description === "No Description" ? "" : deckData.description);
            setFolderId(deckData.folderId);

            const folderRef = doc(db, 'folders', deckData.folderId);
            const folderSnap = await getDoc(folderRef);
            if (folderSnap.exists()) {
                setFolderName(folderSnap.data().name);
            }

            const cardsRef = collection(db, 'decks', deckId, 'cards');
            const cardsQuery = query(cardsRef);
            const cardsSnapshot = await getDocs(cardsQuery);

            const cards = [];
            cardsSnapshot.forEach((doc) => {
                cards.push({
                    id: doc.id,
                    question: doc.data().question,
                    answer: doc.data().answer,
                    question_type: doc.data().question_type || "text",
                    answer_type: doc.data().answer_type || "text",
                    order: doc.data().order || 0
                });
            });

            cards.sort((a, b) => a.order - b.order);

            if (cards.length > 0) {
                setFlashCards(cards);
                originalFlashCardsRef.current = cards;
            } else {
                setFlashCards([
                    { question: "", answer: "", question_type: "text", answer_type: "text" },
                    { question: "", answer: "", question_type: "text", answer_type: "text" },
                    { question: "", answer: "", question_type: "text", answer_type: "text" }
                ]);
                originalFlashCardsRef.current = [];
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

    const createNewFolder = async (folderName, userId) => {
        try {
            const folderRef = await addDoc(collection(db, 'folders'), {
                name: folderName,
                ownerId: userId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                subscriptionTier: "free",
                isPublic: false,
            });
            return folderRef.id;
        } catch (error) {
            console.error("Error creating folder:", error);
            throw error;
        }
    };

    const updateExistingDeck = async () => {
        const batch = writeBatch(db);

        try {
            const deckRef = doc(db, 'decks', deckId);
            batch.update(deckRef, {
                title: fileName,
                description: fileDescription === "" ? "No Description" : fileDescription,
                updatedAt: serverTimestamp(),
            });

            const cardsCollectionRef = collection(db, 'decks', deckId, 'cards');
            const originalCardsMap = new Map(originalFlashCardsRef.current.map(card => [card.id, card]));
            const currentCardsMap = new Map(flashCards.filter(card => card.id).map(card => [card.id, card]));

            originalFlashCardsRef.current.forEach(originalCard => {
                if (!currentCardsMap.has(originalCard.id)) {
                    const cardToDeleteRef = doc(cardsCollectionRef, originalCard.id);
                    batch.delete(cardToDeleteRef);
                }
            });

            flashCards.forEach((currentCard, index) => {
                const cardDataToSave = {
                    question: currentCard.question,
                    answer: currentCard.answer,
                    question_type: currentCard.question_type || "text",
                    answer_type: currentCard.answer_type || "text",
                    order: index,
                };

                if (currentCard.id) {
                    const originalCard = originalCardsMap.get(currentCard.id);
                    const isCardModified = !originalCard ||
                        originalCard.question !== currentCard.question ||
                        originalCard.answer !== currentCard.answer ||
                        originalCard.question_type !== currentCard.question_type ||
                        originalCard.answer_type !== currentCard.answer_type ||
                        originalCard.order !== index;

                    if (isCardModified) {
                        const cardToUpdateRef = doc(cardsCollectionRef, currentCard.id);
                        batch.update(cardToUpdateRef, {
                            ...cardDataToSave,
                            updatedAt: serverTimestamp()
                        });
                    }
                } else {
                    const newCardRef = doc(cardsCollectionRef);
                    batch.set(newCardRef, {
                        ...cardDataToSave,
                        createdAt: serverTimestamp()
                    });
                }
            });

            await batch.commit();

            invalidateFolderDecks(folderId);
            invalidateDeckMetadata(deckId);
            invalidateCards(deckId);

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

            if (isNewFolder) {
                actualFolderId = await createNewFolder(folderName, user.uid);
            }

            const deckRef = doc(collection(db, 'decks'));
            batch.set(deckRef, {
                title: fileName,
                description: fileDescription === "" ? "No Description" : fileDescription,
                ownerId: user.uid,
                folderId: actualFolderId,
                isPublic: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                tags: []
            });

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
            invalidateFolderDecks(folderId);

            const isUserFirstDeck = isFirstTime;

            if(isUserFirstDeck){
                await awardWithXP(user.uid, 100, updateUserProfile, userProfile);
            }

            navigate(`/flashcards/${deckRef.id}`, {
                state: {
                    deckId: deckRef.id,
                    folderId: actualFolderId,
                    folderName: folderName,
                    deckTitle: fileName,
                    showFirstDeckCelebration: isUserFirstDeck,

                }
            });


            if(isUserFirstDeck){
                advanceStep('create-deck')
            }


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

        const cardLimits = getCardLimits();

        if (cardLimits.maxCards !== -1) {
            const currentCardCount = cardLimits.currentUsage || 0;
            const newTotalCards = isEditMode
                ? currentCardCount - originalFlashCardsRef.current.length + flashCards.length
                : currentCardCount + flashCards.length;

            if (newTotalCards > cardLimits.maxCards) {

                setShowLimit(true);
                return;
//                 const cardsOverLimit = newTotalCards - cardLimits.maxCards;

//                 const confirmMessage = `You're trying to create a deck with ${flashCards.length} cards, 
// but you can only add ${cardLimits.maxCards - currentCardCount} more cards on your ${isPremium() ? 'current' : 'free'} plan.

// Current usage: ${currentCardCount}/${cardLimits.maxCards} cards

// Press OK to ${isPremium() ? 'contact support for higher limits' : 'upgrade to Pro'}, 
// or Cancel to go back and remove ${cardsOverLimit} cards.`;

               

                // if (window.confirm(confirmMessage)) {
                //     if (isPremium()) {
                //         window.location.href = "/contact-me";
                //     } else {
                //         window.location.href = "/pricing";
                //     }
                // } else {
                //     return;
                // }
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
            setShowFlashCardAmount(true);
        }
    }

    if (isLoading) {
        return (
            <div className={styles.createFilePage}>
                <h1>Loading deck...</h1>
            </div>
        );
    }

    return (
        <>
        {showLimit && 
            <LimitReachedModal 
                limitType={"cards"}
                onClose={setShowLimit}
            />        
        }
        <div className={styles.createFilePage}>
            {/* HEADER */}
            <div className="flex justify-end mb-1">
                <button
                    onClick={() => navigate('/')}
                    className="gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-all duration-200 shadow-md text-sm sm:text-base"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                
              
            </div>
            <h1>
                {isEditMode ? `Edit: ${fileName || 'Deck'}` : `${folderName} ${isNewFolder ? "(New Folder)" : ""}`}
            </h1>
            <h3>Name the file:</h3>

            <input className={`${styles.fileNameInput} bg-gray-800 rounded-2xl shadow-lg border border-gray-700`} type="text" value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder='Enter Deck Name'
            ></input>
            <br></br>
            <textarea className={`${styles.fileNameInput} bg-gray-800 rounded-2xl shadow-lg border border-gray-700`} type="text" value={fileDescription}
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
        </>
    )
};

export default CreateDeck;