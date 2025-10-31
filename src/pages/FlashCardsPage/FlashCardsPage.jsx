// FlashCardsPage.jsx - Parent handles ALL data fetching

import { ArrowLeft, Globe, RotateCcw } from 'lucide-react';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"; 
import { useLocation, useNavigate } from "react-router-dom";
import { app } from '../../api/firebase';
import { useEffect, useState, useCallback, useRef } from "react"; 
import { useParams } from "react-router-dom";
import { X } from 'lucide-react';

import FlashCardUI from "./FlashCardUI";
import styles from './FlashCardsPage.module.css'
import { useAuthContext } from '../../contexts/AuthContext';
import DeckActionsDropdown from './DeckActionsDropdown';
import BattleSection from './BattleSection';
import { useDeckCache } from '../../contexts/DeckCacheContext';

import Boss from '../HomePage/Boss/Boss.jsx';
import { createPortal } from 'react-dom';
import { useTutorials } from '../../contexts/TutorialContext.jsx';
import { usePartyContext } from '../../contexts/PartyContext.jsx';


function FlashCardsPage({onCreateWithAIModalClick}) {
    const [deaths, setDeaths] = useState(0);

    const {isInTutorial} = useTutorials();
    const hasNotCreatedADeck = isInTutorial('create-deck')

    const [originalDeckSize, setOriginalDeckSize] = useState(0);
    const [phaseOneComplete, setPhaseOneComplete] = useState(false);
    const { user } = useAuthContext();
    const {partyMembers} = usePartyContext();
    const { fetchDeckAndCards } = useDeckCache();
    const navigate = useNavigate();
    const location = useLocation();
    const { deckId: paramDeckId } = useParams(); 
    const db = getFirestore(app); 

    const currentUser = user?.uid ? partyMembers[user.uid] : null;


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

    const [showBossTip, setShowBossTip] = useState(false);
    const bossTipSoundRef = useRef();

    // ==========================================
    // SFX TOGGLE
    // ==========================================
    // Add mute state at parent level
    const [isMuted, setIsMuted] = useState(() => {
        return localStorage.getItem('soundMuted') === 'true';
    });
    

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
    // EFFECT - Show boss tip for new users
    // ==========================================
    useEffect(() => {
        if (hasNotCreatedADeck && !loading && deckData) {
            // Show tip after a brief delay so user can see the deck first
            const showTimer = setTimeout(() => {
                setShowBossTip(true);
            }, 1000);

            // Auto-hide after 5 seconds
            const hideTimer = setTimeout(() => {
                setShowBossTip(false);
            }, 6000);

            return () => {
                clearTimeout(showTimer);
                clearTimeout(hideTimer);
            };
        }
    }, [hasNotCreatedADeck, loading, deckData]);

    // Initialize the sound in a useEffect (add this with your other sound effects)
    useEffect(() => {
        bossTipSoundRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
        bossTipSoundRef.current.volume = 0.3;
    }, []);

    // Update the show boss tip effect to play sound
    useEffect(() => {
        if (hasNotCreatedADeck && !loading && deckData) {
            // Show tip after a brief delay so user can see the deck first
            const showTimer = setTimeout(() => {
                setShowBossTip(true);
                // Play sound when showing
                if (!isMuted && bossTipSoundRef.current) {
                    bossTipSoundRef.current.play().catch(() => {});
                }
            }, 1000);

            // Auto-hide after 5 seconds
            const hideTimer = setTimeout(() => {
                setShowBossTip(false);
            }, 6000);

            return () => {
                clearTimeout(showTimer);
                clearTimeout(hideTimer);
            };
        }
    }, [hasNotCreatedADeck, loading, deckData, isMuted]);

    

    // Handler to update mute state
    const handleToggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newMuted = !prev;
            localStorage.setItem('soundMuted', newMuted.toString());
            return newMuted;
        });
    }, []);


    // ==========================================
    // HELPER FUNCTION - Calculate Grade
    // ==========================================
    const calculateGrade = (currentIndex, knowAnswer)=>{
        const percentage = Math.round((knowAnswer/currentIndex) * 100);
        let grade;

       
        if (percentage === 100) grade = "S";
        else if (percentage >= 80) grade = "A";
        else if (percentage >= 60) grade = "B";
        else if (percentage >= 40) grade = "C";
        else grade = "D";

        const val = {
            percentage,
            grade
        }


        return val;
    }

    // Render Score Container
    const renderScoreContainer = () => {
       
        const remainingCards = flashCards.length - currentIndex;
        const progressThroughOriginal = Math.min(currentIndex + 1, originalDeckSize);
        const isInReviewPhase = phaseOneComplete || currentIndex >= originalDeckSize;
        
        return (
            <div className={`${styles.scoreContainer}`}>
                <div style={{ margin: '0px', textAlign: 'center' }}>
                    {isInReviewPhase ? (
                        <>
                            <span className="text-white/70 text-sm">Review Phase</span>
                            <div style={{ 
                                fontSize: '0.7rem', 
                                color: '#F59E0B', 
                                marginTop: '0.5px'
                            }}>
                                {remainingCards} left
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-white/70 text-sm my-3">
                            Card {progressThroughOriginal} of {originalDeckSize}
                        </div>
                    )}
                </div>
               
            </div>
        );
    }
    

    // ==========================================
    // MAIN FETCH FUNCTION (Parent-controlled)
    // ==========================================
    const loadDeckData = useCallback(async () => {
      

        if (!paramDeckId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Fetch both deck metadata and cards from cache context
            const result = await fetchDeckAndCards(paramDeckId);
            const flashCards = result.cards;

            if (result.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            // Set deck metadata
            setDeckData(result.deck);

            // Set cards
            setFlashCards(flashCards);
            setOriginalDeckSize(flashCards.length)


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
            // advanceStep('create-deck')

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
    // Don't attempt to load until we know auth state
        if (user === undefined) {
            console.log('Auth state still loading...');
            return;
        }
        
        loadDeckData();
    }, [user, paramDeckId, fetchDeckAndCards]);

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
    // EFFECT - Reset progress when deck changes
    // ==========================================
    useEffect(() => {
        // Reset all progress when switching decks
        setKnowAnswer(0);
        setDontKnowAnswer(0);
        setCurrentIndex(0);
        setPercent(0);
        setDeaths(0);
        setPhaseOneComplete(false);
        setOriginalDeckSize(0);
    }, [paramDeckId]); // Trigger whenever the deck ID changes

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
            <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center">
                {/* Pixel-style animated sword/weapon */}
                <div className="mb-8 flex justify-center">
                <div className="relative">
                    {/* Spinning pixelated sword */}
                    <div className="w-24 h-24 relative animate-spin" style={{ animationDuration: '2s' }}>
                    <div className="absolute inset-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* Sword blade */}
                        <rect x="46" y="10" width="8" height="50" fill="#94a3b8" />
                        <rect x="42" y="10" width="4" height="4" fill="#cbd5e1" />
                        <rect x="54" y="10" width="4" height="4" fill="#64748b" />
                        
                        {/* Sword guard */}
                        <rect x="38" y="58" width="24" height="6" fill="#fbbf24" />
                        <rect x="38" y="58" width="24" height="2" fill="#fde047" />
                        
                        {/* Sword handle */}
                        <rect x="44" y="64" width="12" height="20" fill="#7c3aed" />
                        <rect x="44" y="64" width="6" height="20" fill="#8b5cf6" />
                        
                        {/* Pommel */}
                        <rect x="42" y="84" width="16" height="8" fill="#fbbf24" />
                        <rect x="42" y="84" width="8" height="4" fill="#fde047" />
                        </svg>
                    </div>
                    </div>
                    
                    {/* Glowing effect */}
                    <div className="absolute inset-0 blur-xl opacity-50 bg-purple-500 animate-pulse" />
                </div>
                </div>

                {/* Loading text with retro pixel font style */}
                <div className="space-y-4">
                <h1 className="text-5xl font-bold text-white mb-2 tracking-wider" 
                    style={{ 
                        fontFamily: 'monospace',
                        textShadow: '4px 4px 0px #7c3aed, 8px 8px 0px rgba(124, 58, 237, 0.3)'
                    }}>
                    LOADING
                    <span className="inline-block animate-pulse">...</span>
                </h1>
                
                {/* Pixelated subtitle */}
                <p className="text-xl text-purple-300 font-mono tracking-widest animate-pulse"
                    style={{
                    textShadow: '2px 2px 0px rgba(124, 58, 237, 0.5)'
                    }}>
                    Preparing your Flashcards
                </p>
                </div>

                {/* Retro loading bar */}
                <div className="mt-8 w-64 mx-auto">
                <div className="h-6 bg-gray-800 border-4 border-purple-500 relative overflow-hidden"
                    style={{ imageRendering: 'pixelated' }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 animate-loading-bar" />
                    <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full grid grid-cols-8 gap-1 p-1">
                        {[...Array(8)].map((_, i) => (
                        <div 
                            key={i}
                            className="bg-purple-400 opacity-30 animate-pulse"
                            style={{ animationDelay: `${i * 0.1}s` }}
                        />
                        ))}
                    </div>
                    </div>
                </div>
                </div>

                
            </div>

            <style jsx>{`
                @keyframes loading-bar {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
                }
                
                @keyframes scan {
                0% { transform: translateY(-100%); }
                100% { transform: translateY(100%); }
                }
                
                .animate-loading-bar {
                animation: loading-bar 1.5s linear infinite;
                }
                
                .animate-scan {
                animation: scan 8s linear infinite;
                }
            `}</style>
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
        <>
        {showBossTip && hasNotCreatedADeck && (
            <div className="fixed top-4 sm:top-10 left-0 right-0 px-4 flex justify-center z-50 pointer-events-none">
                <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-2xl border-2 border-purple-400/50 w-full sm:max-w-sm text-center">
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-xl sm:text-2xl">⚔️</span>
                        <span className="font-semibold text-xs sm:text-sm md:text-base leading-tight">
                            New Quest: My First Study Session
                        </span>
                    </div>
                </div>
            </div>
        )}
        <div className={`${styles.flashCardsPageContainer} max-w-7xl px-4 mt-8`}>
            

            <div className={`${styles.leftSideFlashCardsPageContainer}`}>
                {/* HEADER */}
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
                        user={user}
                        isMuted={isMuted}
                        onToggleMute={handleToggleMute}
                    />
                </div>

                {renderScoreContainer()}

                <div className="block lg:hidden">
                    <BattleSection
                        deckData={deckData}
                        knowAnswer={knowAnswer}
                        dontKnowAnswer={dontKnowAnswer}
                        deaths={deaths}
                        setDeaths={setDeaths}
                        cardCount={originalDeckSize}
                        deckId={paramDeckId}
                        currentUser={currentUser}
                    />
                </div>

                
                

                {/* Pass all data as props to FlashCardUI */}
                <FlashCardUI 
                    // Data props (fetched by parent)
                    flashCards={flashCards}
                    setFlashCards={setFlashCards}
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

                    // Phase Tracking
                    phaseOneComplete = {phaseOneComplete}
                    setPhaseOneComplete = {setPhaseOneComplete}

                    originalDeckSize={originalDeckSize}
                    setOriginalDeckSize={setOriginalDeckSize}

                    result={calculateGrade(currentIndex, knowAnswer)}

                    deaths={deaths}

                    onCreateWithAIModalClick={onCreateWithAIModalClick}

                    knowAnswer={knowAnswer}
                    dontKnowAnswer={dontKnowAnswer}

                    isMuted={isMuted}
                />
            </div>
            
            <div className={`hidden lg:block ${styles.rightSideFlashCardsPageContainer} mt-9 md:mt-0`}>
                
                    <BattleSection
                        deckData={deckData}
                        knowAnswer={knowAnswer}
                        dontKnowAnswer={dontKnowAnswer}
                        deaths={deaths}
                        setDeaths={setDeaths}
                        cardCount={originalDeckSize} 
                        deckId={paramDeckId}
                        currentUser={currentUser}
                    >
                        {/* <div className="space-y-4">
                         

                            <div className="flex justify-between items-center py-3 border-b border-gray-700">
                                <span className="text-gray-400">Correct:</span>
                                <span className="font-bold text-lg text-emerald-400">{knowAnswer}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-700">
                                <span className="text-gray-400">Wrong:</span>
                                <span className="font-bold text-lg text-red-400">{dontKnowAnswer}</span>
                            </div>
                       
                        </div> */}
                        {/* Quick Actions */}
                        <div className="mt-6">
                            <h4 className="text-gray-300 mb-4 font-medium">Quick Actions</h4>
                            <div className="space-y-3">
                                <button 
                                    onClick={() => setRedoDeck(true)}
                                    className="w-full bg-violet-600 hover:bg-violet-700 px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                                >
                                    <RotateCcw className="w-5 h-5 mr-2" />
                                    <span>Restart</span>
                                </button>

                                {/* {deckData && deckData.ownerId === user?.uid && (
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
                                )} */}
                            </div>
                        </div>
                    </BattleSection>
                    {/* <div className="text-2xl font-bold mb-1 text-purple-400 flex items-center gap-2">
                        {isPublicDeck && <Globe className="w-6 h-6" />}
                        {displayName}
                    </div> */}

                    {/* {deckData?.description && deckData.description !== "No Description" && (
                        <p className="text-gray-400 mb-4">{deckData.description}</p> 
                    )} */}

                    {deckOwnerData && (
                        <p className="text-white/70 text-sm mb-4">
                            Created by: {deckOwnerData.displayName}
                        </p>
                    )}
                    
                    
            </div>
        </div>
        </>

    );
}

export default FlashCardsPage;