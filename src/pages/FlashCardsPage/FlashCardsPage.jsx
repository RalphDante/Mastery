import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import { app, auth } from '../../api/firebase';
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useCallback } from "react"; 
import { useParams } from "react-router-dom";

import FlashCardUI from "./FlashCardUI";
import ModuleDescription from "./Description";
import styles from './FlashCardsPage.module.css'

function FlashCardsPage() {
    const [redoDeck, setRedoDeck] = useState(false);
    const [studyMode, setStudyMode] = useState('cramming'); // 'cramming' or 'spaced'
    const location = useLocation();
    const { deckId } = useParams();
    
    // Get additional data from navigation state if available
    const { deckTitle, folderId, folderName } = location.state || {};

    const [authUser, setAuthUser] = useState(null);
    const db = getFirestore(app); // Changed from getDatabase to getFirestore
    
    const [knowAnswer, setKnowAnswer] = useState(0);
    const [dontKnowAnswer, setDontKnowAnswer] = useState(0);
    const [percent, setPercent] = useState(0);
    
    // Deck information from Firestore
    const [deckData, setDeckData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Communication with FlashCardUI
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
        });
        return () => unsubscribe();
    }, []);

    // Fetch deck data from Firestore
    useEffect(() => {
        const fetchDeckData = async () => {
            if (!deckId) {
                setLoading(false);
                return;
            }

            try {
                const deckRef = doc(db, 'decks', deckId);
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
                setLoading(false);
            }
        };

        fetchDeckData();
    }, [deckId, db]);

    const handleStudyModeToggle = () => {
        if (currentIndex > 0) {
            const confirmReset = window.confirm(
                "Changing study modes will reset your progress. Are you sure you want to continue?"
            );
            if (!confirmReset) return;
        }
        
        // Reset everything
        setCurrentIndex(0);
        setKnowAnswer(0);
        setDontKnowAnswer(0);
        setPercent(0);
        
        // Toggle the study mode
        setStudyMode(prevMode => prevMode === 'cramming' ? 'spaced' : 'cramming');
        
        // Set redoDeck to trigger reset in FlashCardUI
        setRedoDeck(true);
    };

    // Show loading state
    if (loading) {
        return (
            <div className={`${styles.flashCardsPageContainer}`}>
                <div className={`${styles.leftSideFlashCardsPageContainer}`}>
                    <h1 className="text-3xl font-bold text-white mb-2">Loading...</h1>
                </div>
            </div>
        );
    }

    // Get the display name for the deck
    const displayName = deckTitle || deckData?.title || "Unknown Deck";

    return (
        <>  
            <div className={`${styles.flashCardsPageContainer}`}>
                <div className={`${styles.leftSideFlashCardsPageContainer}`}>
                    {displayName ? (
                        <div className="mb-4">
                            <h1 className="text-3xl font-bold text-white mb-2 break-words">{displayName}</h1>
                            {deckData?.description && deckData.description !== "No Description" && (
                                <p className="text-gray-400 mb-4">{deckData.description}</p>
                            )}
                        </div>
                    ) : (
                        <h1 className="text-3xl font-bold text-white mb-2">No Deck Found</h1>
                    )}

                    {/* <ModuleDescription 
                        db={db}
                        deckId={deckId} // Changed from fileName to deckId
                        deckData={deckData} // Pass the deck data
                        authUser={authUser}
                    /> */}

                    <FlashCardUI 
                        knowAnswer={setKnowAnswer}
                        dontKnowAnswer={setDontKnowAnswer}
                        percent={setPercent}
                        redoDeck={redoDeck}
                        setRedoDeck={setRedoDeck}
                        studyMode={studyMode}
                        onStudyModeChange={handleStudyModeToggle}
                        currentIndex={currentIndex}
                        setCurrentIndex={setCurrentIndex}
                        deckId={deckId} // Pass deckId to FlashCardUI
                        db={db} // Pass Firestore instance
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
                            {deckData?.cardCount && (
                                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                                    <span className="text-gray-400">Total Cards:</span>
                                    <span className="font-bold text-lg text-blue-400">{deckData.cardCount}</span>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-4">
                            <div 
                                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>

                        {/* Study Mode Toggle */}
                        <div className="mt-8">
                            <h4 className="text-gray-300 mb-4 font-medium">📚 Current Mode</h4>
                            <div className="bg-gray-800 rounded-xl p-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                        studyMode === 'spaced' ? 'bg-emerald-500' : 'bg-violet-500'
                                    }`}></div>
                                    <span className="text-gray-300 font-medium">
                                        {studyMode === 'cramming' ? '⚡ Quick Study' : '🧠 Smart Review'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 mt-2">
                                    {studyMode === 'cramming' 
                                        ? 'Drill wrong answers until mastered' 
                                        : 'Scientifically spaced for long-term retention'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-6">
                            <h4 className="text-gray-300 mb-4 font-medium">⚡ Quick Actions</h4>
                            <div className="space-y-3">
                                <button 
                                    onClick={() => {setRedoDeck(true)}}
                                    className="w-full bg-violet-600 hover:bg-violet-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200"
                                >
                                    🔄 Redo Deck
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default FlashCardsPage;