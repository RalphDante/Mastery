// FlashCardsPage.jsx - Parent handles ALL data fetching

import { ArrowLeft, Globe, RotateCcw } from 'lucide-react';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"; 
import { useLocation, useNavigate } from "react-router-dom";
import { app } from '../../api/firebase';
import { useEffect, useState, useCallback } from "react"; 
import { useParams } from "react-router-dom";

import FlashCardUI from "./FlashCardUI";
import styles from './FlashCardsPage.module.css'
import { useAuthContext } from '../../contexts/AuthContext';
import DeckActionsDropdown from './DeckActionsDropdown';
import BattleSection from './BattleSection';
import { useDeckCache } from '../../contexts/DeckCacheContext';

function FlashCardsPage() {
    const { user } = useAuthContext();
    const { fetchDeckAndCards } = useDeckCache();
    const navigate = useNavigate();
    const location = useLocation();
    const { deckId: paramDeckId } = useParams(); 
    const db = getFirestore(app); 

    // ==========================================
    // STATE - Progress Tracking
    // ==========================================
    const [knowAnswer, setKnowAnswer] = useState(0);
    const [dontKnowAnswer, setDontKnowAnswer] = useState(0);
    const [percent, setPercent] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [redoDeck, setRedoDeck] = useState(false);

    // ==========================================
    // STATE - Data (fetched by parent)
    // ==========================================
    const [deckData, setDeckData] = useState(null);
    const [flashCards, setFlashCards] = useState([]);
    const [deckOwnerData, setDeckOwnerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ==========================================
    // EFFECT - Calculate percentage
    // ==========================================
    useEffect(() => {
        const totalAttempted = knowAnswer + dontKnowAnswer;
        if (totalAttempted > 0) {
            setPercent(Math.floor((knowAnswer / totalAttempted) * 100));
        } else {
            setPercent(0);
        }
    }, [knowAnswer, dontKnowAnswer]);

    // ==========================================
    // MAIN FETCH FUNCTION (Parent-controlled)
    // ==========================================
    const loadDeckData = useCallback(async () => {
        if (user === undefined) {
            console.log('Auth state still loading...');
            return;
        }

        if (!paramDeckId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Fetch both deck metadata and cards from cache context
            const result = await fetchDeckAndCards(paramDeckId);

            if (result.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            // Set deck metadata
            setDeckData(result.deck);

            // Set cards
            setFlashCards(result.cards);

            // Fetch owner info if it's a public deck
            if (result.isPublic && result.deck?.ownerId) {
                try {
                    const ownerDoc = await getDoc(doc(db, 'users', result.deck.ownerId));
                    if (ownerDoc.exists()) {
                        setDeckOwnerData({
                            displayName: ownerDoc.data().displayName || 'Anonymous User',
                            email: ownerDoc.data().email
                        });
                    }
                } catch (err) {
                    console.log('Could not fetch owner info:', err);
                }
            }

            setLoading(false);

        } catch (err) {
            console.error('Error loading deck data:', err);
            setError('Failed to load deck');
            setLoading(false);
        }
    }, [user, paramDeckId, fetchDeckAndCards, db]);

    // ==========================================
    // EFFECT - Initial load
    // ==========================================
    useEffect(() => {
        loadDeckData();
    }, [loadDeckData]);

    // ==========================================
    // EFFECT - Handle redo deck
    // ==========================================
    useEffect(() => {
        if (redoDeck) {
            loadDeckData();
            setRedoDeck(false);
            // Reset progress
            setKnowAnswer(0);
            setDontKnowAnswer(0);
            setCurrentIndex(0);
        }
    }, [redoDeck, loadDeckData]);

    // ==========================================
    // HANDLERS - Public/Private toggle
    // ==========================================
    const handleSetToPublic = async () => {
        if (!deckData || !user) return;

        try {
            const deckRef = doc(db, 'decks', paramDeckId);
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const firestoreDisplayName = userDoc.exists() ? userDoc.data().displayName : user.displayName;

            const updateData = {
                isPublic: true,
                publishedAt: serverTimestamp(),
                ownerDisplayName: firestoreDisplayName
            };
            if (deckData.copies === undefined) {
                updateData.copies = 0;
            }

            await updateDoc(deckRef, updateData);
            
            setDeckData(prev => ({
                ...prev,
                isPublic: true,
                publishedAt: new Date()
            }));
        
            console.log("Deck set to public successfully!");
        } catch (error) {
            console.log("Error setting deck to public:", error);
        }
    };

    const handleSetToPrivate = async () => {
        if (!deckData || !user) return;

        try {
            const deckRef = doc(db, 'decks', paramDeckId);
            await updateDoc(deckRef, { isPublic: false });
            
            setDeckData(prev => ({
                ...prev,
                isPublic: false,
            }));
        
            console.log("Deck set to private successfully!");
        } catch (error) {
            console.log("Error setting deck to private:", error);
        }
    };

    // ==========================================
    // RENDER - Loading state
    // ==========================================
    if (loading) {
        return (
            <div className={`${styles.flashCardsPageContainer}`}>
                <div className={`${styles.leftSideFlashCardsPageContainer}`}>
                    <h1 className="text-3xl font-bold text-white mb-2">Loading...</h1>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER - Error state
    // ==========================================
    if (error) {
        return (
            <div className={`${styles.flashCardsPageContainer}`}>
                <div className={`${styles.leftSideFlashCardsPageContainer}`}>
                    <h1 className="text-2xl font-bold text-red-400 mb-2">Error: {error}</h1>
                    <button 
                        onClick={loadDeckData}
                        className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER - Display variables
    // ==========================================
    const displayName = deckData?.title || "Unknown Deck";
    const isPublicDeck = deckData?.isPublic && deckData?.ownerId !== user?.uid;

    // ==========================================
    // MAIN RENDER
    // ==========================================
    return (
        <div className={`${styles.flashCardsPageContainer} max-w-7xl px-4 mt-8`}>
            <div className={`${styles.leftSideFlashCardsPageContainer}`}>
                {/* Buttons */}
                <div className="flex justify-between mb-1">
                    <button
                        onClick={() => navigate('/')}
                        className="gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-all duration-200 shadow-md text-sm sm:text-base"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    
                    <DeckActionsDropdown 
                        deckId={paramDeckId}
                        deckData={deckData}
                        flashCards={flashCards}
                    />
                </div>

                <BattleSection
                    deckData={deckData}
                    knowAnswer={knowAnswer}
                    dontKnowAnswer={dontKnowAnswer}
                />

                {/* Pass all data as props to FlashCardUI */}
                <FlashCardUI 
                    // Data props (fetched by parent)
                    flashCards={flashCards}
                    deckData={deckData}
                    
                    // Progress setters
                    setKnowAnswer={setKnowAnswer}
                    setDontKnowAnswer={setDontKnowAnswer}
                    
                    // Control props
                    redoDeck={redoDeck}
                    setRedoDeck={setRedoDeck}
                    currentIndex={currentIndex}
                    setCurrentIndex={setCurrentIndex}
                    
                    // Firestore instance for session tracking
                    db={db}
                    
                    // Reload function for child to trigger parent refresh
                    onReload={loadDeckData}
                />
            </div>
            
            <div className={`${styles.rightSideFlashCardsPageContainer} mt-9 md:mt-0`}>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 h-fit">
                    <div className="text-2xl font-bold mb-1 text-purple-400 flex items-center gap-2">
                        {isPublicDeck && <Globe className="w-6 h-6" />}
                        {displayName}
                    </div>

                    {deckData?.description && deckData.description !== "No Description" && (
                        <p className="text-gray-400 mb-4">{deckData.description}</p> 
                    )}

                    {deckOwnerData && (
                        <p className="text-white/70 text-sm mb-4">
                            Created by: {deckOwnerData.displayName}
                        </p>
                    )}
                    
                    <div className="space-y-4">
                        {deckData?.cardCount && (
                            <div className="flex justify-between items-center py-3 border-b border-gray-700">
                                <span className="text-gray-400">Total Cards:</span>
                                <span className="font-bold text-lg text-blue-400">{deckData.cardCount}</span>
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
                            <button 
                                onClick={() => setRedoDeck(true)}
                                className="w-full bg-violet-600 hover:bg-violet-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                            >
                                <RotateCcw className="w-5 h-5 mr-2" />
                                <span>Redo Deck</span>
                            </button>

                            {deckData && deckData.ownerId === user?.uid && (
                                !deckData.isPublic ? (
                                    <button 
                                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                                        onClick={handleSetToPublic}
                                    >
                                        <Globe />
                                        <span>Make Public</span>
                                    </button>
                                ) : (
                                    <button 
                                        className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                                        onClick={handleSetToPrivate}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                        </svg>
                                        <span>Make Private</span>
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FlashCardsPage;