import { ArrowLeft, Globe, RotateCcw} from 'lucide-react';

import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"; 
import { useLocation, useNavigate } from "react-router-dom";
import { app, auth } from '../../api/firebase';
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useCallback } from "react"; 
import { useParams } from "react-router-dom";

import { Timestamp } from "firebase/firestore";


import FlashCardUI from "./FlashCardUI";
import ModuleDescription from "./Description"; // Still commented out
import styles from './FlashCardsPage.module.css'
import { useAuthContext } from '../../contexts/AuthContext';

function FlashCardsPage() {
    const {user} = useAuthContext();

    // Public Deck data
    const [publicDeckData, setPublicDeckData] = useState(null)
    const [deckOwnerData, setDeckOwnerData] = useState(null)

    const navigate = useNavigate();
    const [redoDeck, setRedoDeck] = useState(false);
    const [studyMode, setStudyMode] = useState('cramming'); // 'cramming' or 'spaced'
    const [autoSwitchedToSpaced, setAutoSwitchedToSpaced] = useState(false); // Track if we auto-switched
    const location = useLocation();
    // Rename deckId from useParams to paramDeckId to avoid confusion with global mode
    const { deckId: paramDeckId } = useParams(); 

    // Get additional data from navigation state if available
    const { deckTitle, folderId, folderName } = location.state || {};

    const db = getFirestore(app); 
    
    // States for progress tracking, passed to FlashCardUI as setters
    const [knowAnswer, setKnowAnswer] = useState(0);
    const [dontKnowAnswer, setDontKnowAnswer] = useState(0);
    const [percent, setPercent] = useState(0);
    
    // Deck information from Firestore (metadata for current deck context)
    const [deckData, setDeckData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dueCardsCount, setDueCardsCount] = useState(0); // Track due cards count

    // Communication with FlashCardUI for current card index
    const [currentIndex, setCurrentIndex] = useState(0);

    // Effect to calculate percentage when knowAnswer or dontKnowAnswer changes
    useEffect(() => {
        const totalAttempted = knowAnswer + dontKnowAnswer;
        if (totalAttempted > 0) {
            setPercent(Math.floor((knowAnswer / totalAttempted) * 100));
        } else {
            setPercent(0); // If no cards attempted, percentage is 0
        }
    }, [knowAnswer, dontKnowAnswer]); // Dependencies: recalculate when these values change

    

    // --- Fetch deck metadata based on paramDeckId (if exists) and studyMode ---
    useEffect(() => {
        const fetchDeckMetadata = async () => {
            if (!user) {
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
    }, [paramDeckId, db, user]); // Re-run if these dependencies change

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
        setPercent(0); // Ensure percent is reset here too
        
        // Mark that user manually changed modes (disable auto-switching for this session)
        setAutoSwitchedToSpaced(true);
        
        setStudyMode(newMode); // Use newMode from the selector
        setRedoDeck(true); // Trigger a re-fetch in FlashCardUI
    };

    const handleSetToPublic = async () => {
        if (!publicDeckData || !user) return;

        try{
            const deckRef = doc(db, 'decks', publicDeckData.id)

            const userDoc = await getDoc(doc(db, "users", user.uid));
            const firestoreDisplayName = userDoc.exists() ? userDoc.data().displayName : user.displayName;

            // Only set copies: 0 if it doesn't exist yet
            const updateData = {
                isPublic: true,
                publishedAt: serverTimestamp(),
                ownerDisplayName: firestoreDisplayName
            };
            if (publicDeckData.copies === undefined) {
                updateData.copies = 0;
            }

            await updateDoc(deckRef, updateData);
                
            // Update local state to reflect the change
            setPublicDeckData(prev => ({
                ...prev,
                isPublic: true,
                publishedAt: new Date() // For immediate UI update
            }));
        
            console.log("Deck set to public successfully!");
        } catch(error){
            console.log("error: ", error)
        }

    }

    const handleSetToPrivate = async () => {
        if (!publicDeckData || !user) return;

        try{
            const deckRef = doc(db, 'decks', publicDeckData.id)

            await updateDoc(deckRef, {
                isPublic: false,
            });
            
            // Update local state to reflect the change
            setPublicDeckData(prev => ({
                ...prev,
                isPublic: false,
            }));
        
            console.log("Deck set to private successfully!");
        } catch(error){
            console.log("error: ", error)
        }
    }

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
                        : (publicDeckData?.title ? publicDeckData?.title : null) || "Unknown Deck"; // For specific deck
                        
    const isPublicDeck = publicDeckData?.title && publicDeckData?.ownerId !== user?.uid;

    // Only show deck description if we're on a specific deck page OR it's cramming mode
    const showDescription = studyMode === 'cramming' || (studyMode === 'spaced' && paramDeckId);

    return (
        <>  
            
            <div className={`${styles.flashCardsPageContainer} max-w-7xl px-4 mt-8`}>
                
           
                <div className={`${styles.leftSideFlashCardsPageContainer} `}>


                    <FlashCardUI 
                        knowAnswer={setKnowAnswer}
                        dontKnowAnswer={setDontKnowAnswer}
                        // percent is no longer passed as a setter to FlashCardUI as FlashCardsPage calculates it
                        redoDeck={redoDeck}
                        setRedoDeck={setRedoDeck}
                        studyMode={studyMode}
                        onStudyModeChange={handleStudyModeToggle} // Pass the updated handler
                        currentIndex={currentIndex}
                        setCurrentIndex={setCurrentIndex}
                        deckId={paramDeckId} // Pass deckId from params (can be null for global review)
                        db={db} // Pass Firestore instance to FlashCardUI
                        publicDeckData={setPublicDeckData}
                        deckOwnerData={setDeckOwnerData}
                    />
                </div>
                
                <div className={`${styles.rightSideFlashCardsPageContainer} mt-9 md:mt-0`}>
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 h-fit">
                        {/* Show notification if auto-switched to spaced mode */}

                        {autoSwitchedToSpaced && studyMode === 'spaced' && dueCardsCount > 0 && (
                            <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-3 mb-4">
                                <p className="text-blue-200 text-sm">
                                    🎯 Automatically switched to spaced repetition - {dueCardsCount} cards due for review!
                                </p>
                            </div>
                        )}
                        <div className="text-2xl font-bold mb-1 text-purple-400 flex items-center gap-2">
                            {isPublicDeck && <Globe className="w-6 h-6" />}
                            {displayName}
                        </div>

                        {!publicDeckData && showDescription && deckData?.description && deckData.description !== "No Description" && (
                            <p className="text-gray-400 mb-4">{deckData.description}</p> 
                        )}

                        {deckOwnerData && (
                            <p className="text-white/70 text-sm">
                                Created by: {deckOwnerData.displayName}
                            </p>
                        )}
                        
                        <div className="space-y-4">
                            {/* Only show total cards count for 'cramming' mode on a specific deck */}
                            {deckData?.cardCount && studyMode === 'cramming' && ( 
                                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                                    <span className="text-gray-400">Total Cards:</span>
                                    <span className="font-bold text-lg text-blue-400">{deckData.cardCount}</span>
                                </div>
                            )}

                            {/* Show due cards count in spaced mode */}
                            {studyMode === 'spaced' && dueCardsCount > 0 && (
                                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                                    <span className="text-gray-400">Cards Due:</span>
                                    <span className="font-bold text-lg text-yellow-400">{dueCardsCount}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center py-3 border-b border-gray-700">
                                <span className="text-gray-400">Correct:</span>
                                <span className="font-bold text-lg text-emerald-400">{knowAnswer}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-700">
                                <span className="text-gray-400">Wrong:</span>
                                <span className="font-bold text-lg text-red-400">{dontKnowAnswer}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-700">
                                <span className="text-gray-400">Accuracy:</span>
                                <span className="font-bold text-lg text-violet-400">{percent}%</span>
                            </div>
                            
                            
                            
                            
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
                                        className="w-full bg-violet-600 hover:bg-violet-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                                    >
                                        <RotateCcw className="w-5 h-5 mr-2" />
                                        <span>Redo Deck</span>
                                    </button>
                                )}

                                {publicDeckData && publicDeckData.ownerId === user?.uid ? (
                                    !publicDeckData?.isPublic ? (
                                        <button id="publishBtn" class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                                            onClick={handleSetToPublic}
                                        >
                                            <Globe />
                                            <span>Make Public</span>
                                        </button>

                                    ) : (
                                         <button id="privateBtn" class="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                                            onClick={handleSetToPrivate}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                            </svg>
                                            <span>Make Private</span>
                                        </button>
                                    )
                                   
                                
                                ) : (
                                    <div></div>
                                )
                                
                            }
                                
                                {/* Show priority indicator for spaced mode */}
                                {studyMode === 'spaced' && dueCardsCount > 0 && (
                                    <div className="w-full bg-blue-600/20 border border-blue-600 px-4 py-3 rounded-lg">
                                        <div className="text-blue-300 text-sm font-medium">
                                            🎯 Priority: Spaced Review
                                        </div>
                                        <div className="text-blue-400 text-xs mt-1">
                                            Focus on due cards for optimal learning
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default FlashCardsPage;