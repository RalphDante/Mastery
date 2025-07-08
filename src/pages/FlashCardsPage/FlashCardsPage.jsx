import { getFirestore, doc, getDoc, query, collection, where, orderBy, getDocs } from "firebase/firestore"; 
import { useLocation } from "react-router-dom";
import { app, auth } from '../../api/firebase';
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useCallback } from "react"; 
import { useParams } from "react-router-dom";

import FlashCardUI from "./FlashCardUI";
import ModuleDescription from "./Description"; // Still commented out
import styles from './FlashCardsPage.module.css'

function FlashCardsPage() {
    const [redoDeck, setRedoDeck] = useState(false);
    const [studyMode, setStudyMode] = useState('cramming'); // 'cramming' or 'spaced'
    const location = useLocation();
    // Rename deckId from useParams to paramDeckId to avoid confusion with global mode
    const { deckId: paramDeckId } = useParams(); 

    // Get additional data from navigation state if available
    const { deckTitle, folderId, folderName } = location.state || {};

    const [authUser, setAuthUser] = useState(null);
    const db = getFirestore(app); 
    
    // States for progress tracking, passed to FlashCardUI as setters
    const [knowAnswer, setKnowAnswer] = useState(0);
    const [dontKnowAnswer, setDontKnowAnswer] = useState(0);
    const [percent, setPercent] = useState(0);
    
    // Deck information from Firestore (metadata for current deck context)
    const [deckData, setDeckData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Communication with FlashCardUI for current card index
    const [currentIndex, setCurrentIndex] = useState(0);

    // Authentication state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
        });
        return () => unsubscribe();
    }, []);

    // --- Fetch deck metadata based on paramDeckId (if exists) and studyMode ---
    useEffect(() => {
        const fetchDeckMetadata = async () => {
            if (!authUser) {
                setLoading(false);
                return;
            }

            // If we are on a specific deck page (paramDeckId exists), fetch its metadata
            if (paramDeckId) {
                try {
                    const deckRef = doc(db, 'decks', paramDeckId);
                    const deckSnap = await getDoc(deckRef);
                    
                    if (deckSnap.exists()) {
                        setDeckData(deckSnap.data());
                    } else {
                        console.error("Deck not found");
                        setDeckData(null);
                    }
                } catch (error) {
                    console.error("Error fetching deck:", error);
                    setDeckData(null);
                } finally {
                    setLoading(false); // Done fetching deck metadata
                }
            } else if (studyMode === 'spaced') {
                // If no specific deckId and in 'spaced' mode, we are on a global review page.
                // No specific deck metadata to fetch here. FlashCardUI handles card fetching.
                setDeckData(null); 
                setLoading(false);
            } else {
                 setLoading(false); // Not in spaced mode and no deckId, nothing to load for metadata.
            }
        };

        fetchDeckMetadata();
    }, [paramDeckId, db, authUser, studyMode]); // Re-run if these dependencies change

    // This function will now be called by StudyModeSelector internally
    // and will only manage the local state for FlashCardsPage.
    const handleStudyModeToggle = async (newMode) => { // Added newMode parameter
        if (currentIndex > 0) {
            const confirmReset = window.confirm(
                "Changing study modes will reset your progress for the current session. Are you sure you want to continue?"
            );
            if (!confirmReset) return;
        }
        
        // Reset local session progress
        setCurrentIndex(0);
        setKnowAnswer(0);
        setDontKnowAnswer(0);
        setPercent(0);
        
        setStudyMode(newMode); // Use newMode from the selector
        setRedoDeck(true); // Trigger a re-fetch in FlashCardUI
    };

    // Show loading state for the page
    if (loading) {
        return (
            <div className={`${styles.flashCardsPageContainer}`}>
                <div className={`${styles.leftSideFlashCardsPageContainer}`}>
                    <h1 className="text-3xl font-bold text-white mb-2">Loading...</h1>
                </div>
            </div>
        );
    }

    // Determine the display name for the header
    const displayName = studyMode === 'spaced' && !paramDeckId 
                        ? "Global Smart Review" // For global spaced review
                        : deckTitle || deckData?.title || "Unknown Deck"; // For specific deck

    // Only show deck description if we're on a specific deck page OR it's cramming mode
    const showDescription = studyMode === 'cramming' || (studyMode === 'spaced' && paramDeckId);

    return (
        <>  
            <div className={`${styles.flashCardsPageContainer}`}>
                <div className={`${styles.leftSideFlashCardsPageContainer}`}>
                    <div className="mb-4">
                        <h1 className="text-3xl font-bold text-white mb-2 break-words">{displayName}</h1>
                        {showDescription && deckData?.description && deckData.description !== "No Description" && (
                            <p className="text-gray-400 mb-4">{deckData.description}</p>
                        )}
                    </div>

                    <FlashCardUI 
                        knowAnswer={setKnowAnswer}
                        dontKnowAnswer={setDontKnowAnswer}
                        percent={setPercent}
                        redoDeck={redoDeck}
                        setRedoDeck={setRedoDeck}
                        studyMode={studyMode}
                        onStudyModeChange={handleStudyModeToggle} // Pass the updated handler
                        currentIndex={currentIndex}
                        setCurrentIndex={setCurrentIndex}
                        deckId={paramDeckId} // Pass deckId from params (can be null for global review)
                        db={db} // Pass Firestore instance to FlashCardUI
                    />
                </div>
                
                <div className={styles.rightSideFlashCardsPageContainer}>
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 h-fit mt-4">
                        <h3 className="text-xl font-bold mb-6 text-white">📊 Study Progress</h3>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-gray-800">
                                <span className="text-gray-400">Correct:</span>
                                <span className="font-bold text-lg text-emerald-400">{knowAnswer}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-800">
                                <span className="text-gray-400">Wrong:</span>
                                <span className="font-bold text-lg text-red-400">{dontKnowAnswer}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-800">
                                <span className="text-gray-400">Percentage:</span>
                                <span className="font-bold text-lg text-violet-400">{percent}%</span>
                            </div>
                            {/* Only show total cards count for 'cramming' mode on a specific deck */}
                            {deckData?.cardCount && studyMode === 'cramming' && ( 
                                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                                    <span className="text-gray-400">Total Cards:</span>
                                    <span className="font-bold text-lg text-blue-400">{deckData.cardCount}</span>
                                </div>
                            )}
                            {/* In spaced mode, you might want to show "Cards due today: X" (would come from FlashCardUI state) */}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-4">
                            <div 
                                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-6">
                            <h4 className="text-gray-300 mb-4 font-medium">⚡ Quick Actions</h4>
                            <div className="space-y-3">
                                {/* "Redo Deck" button is primarily for 'cramming' mode to re-shuffle a single deck */}
                                {studyMode === 'cramming' && (
                                    <button 
                                        onClick={() => {setRedoDeck(true)}}
                                        className="w-full bg-violet-600 hover:bg-violet-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200"
                                    >
                                        🔄 Redo Deck
                                    </button>
                                )}
                                {/* Consider adding a dedicated button or navigation to "Review All Due Cards" if not on a specific deck page */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default FlashCardsPage;