// FlashCardsPage.jsx - SIMPLIFIED with TestTypeUI component

import LimitReachedModal from '../../components/Modals/LimitReachedModal.jsx';
import { ArrowLeft, WalletCards } from 'lucide-react';
import { getFirestore, doc, getDoc } from "firebase/firestore"; 
import { useLocation, useNavigate } from "react-router-dom";
import { app } from '../../api/firebase';
import { useEffect, useState, useCallback, useRef } from "react"; 
import { useParams } from "react-router-dom";
import { X, BookOpen, Brain } from 'lucide-react';

import FlashCardUI from "./FlashCardUI";
import TestTypeUI from "./TestTypeUI/TestTypeUI.jsx";  // ⭐ NEW COMPONENT
import styles from './FlashCardsPage.module.css'
import { useAuthContext } from '../../contexts/AuthContext';
import DeckActionsDropdown from './DeckActionsDropdown';
import BattleSection from './BattleSection';
import { useDeckCache } from '../../contexts/DeckCacheContext';

import { useTutorials } from '../../contexts/TutorialContext.jsx';
import { usePartyContext } from '../../contexts/PartyContext.jsx';

import { Confetti, SessionCompleteToast, DeckIncentiveToast } from '../../components/ConfettiAndToasts.jsx';
import { awardWithXP } from '../../utils/giveAwardUtils.js';
import { useUserDataContext } from '../../contexts/UserDataContext.jsx';
import { generatePracticeTest } from '../../utils/aiServices/practiceTestGeneration.js';

import PracticeTestModal from '../../components/Modals/PracticeTestModal.jsx';
import BattleResult from './BattleResult.jsx';

function FlashCardsPage({onCreateWithAIModalClick}) {
    const {incrementExp} = useUserDataContext();
    const [showFirstDeckCelebration, setShowFirstDeckCelebration] = useState(false);
    const [deaths, setDeaths] = useState(0);
    const [showAILimitModal, setShowAILimitModal] = useState(false);

    // ==========================================
    // MODE STATE
    // ==========================================
    const [mode, setMode] = useState('study'); // 'study' or 'test'

    // ==========================================
    // TEST STATE
    // ==========================================
    const [testQuestions, setTestQuestions] = useState([]);
    const [currentTestIndex, setCurrentTestIndex] = useState(0);
    const [testAnswers, setTestAnswers] = useState({});
    const [isGeneratingTest, setIsGeneratingTest] = useState(false);


    const [showTestModal, setShowTestModal] = useState(false);

    // ==========================================
    // SHARED STATE (used by both modes)
    // ==========================================
    const [knowAnswer, setKnowAnswer] = useState(0);
    const [dontKnowAnswer, setDontKnowAnswer] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [testComplete, setTestComplete] = useState(false);

    // Study mode specific
    const [originalDeckSize, setOriginalDeckSize] = useState(0);
    const [phaseOneComplete, setPhaseOneComplete] = useState(false);
    const [redoDeck, setRedoDeck] = useState(false);

    // Data
    const [deckData, setDeckData] = useState(null);
    const [flashCards, setFlashCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Contexts
    const { user, userProfile } = useAuthContext();
    const {partyMembers, updateUserProfile} = usePartyContext();
    const { fetchDeckAndCards } = useDeckCache();
    const {isInTutorial} = useTutorials();
    const hasNotCreatedADeck = isInTutorial('create-deck');
    
    // Navigation
    const navigate = useNavigate();
    const location = useLocation();
    const { deckId: paramDeckId } = useParams(); 
    const db = getFirestore(app);
    
    const currentUser = user?.uid ? partyMembers[user.uid] : null;

    // UI State
    const [isMuted, setIsMuted] = useState(() => {
        return localStorage.getItem('soundMuted') === 'true';
    });
    const [showDeckIncentive, setShowDeckIncentive] = useState(false);
    const [showSessionComplete, setShowSessionComplete] = useState(false);

    // ==========================================
    // TEST HANDLERS
    // ==========================================
    const handleGeneratePracticeTest = async (config) => {
        setIsGeneratingTest(true);
        setError(null);
        
        try {
          const result = await generatePracticeTest(flashCards, config, user);
          setTestQuestions(result.questions);
          setCurrentTestIndex(0);
          setTestAnswers({});
          
          // Reset boss battle stats for test mode
          setKnowAnswer(0);
          setDontKnowAnswer(0);
          setDeaths(0);
          
          setMode('test');
        } catch (err) {
          setError(err.message);
          console.error('Test generation error:', err);
        } finally {
          setIsGeneratingTest(false);
        }
    };

    const handleGenerateTest = async (config) => {
        setTestComplete(false);
        setShowTestModal(false);
        setIsGeneratingTest(true);
        setError(null);
        try {
          const result = await generatePracticeTest(flashCards, config, user);
          setTestQuestions(result.questions);
          setCurrentTestIndex(0);
          setTestAnswers({});
          
          // Reset boss battle stats for test mode
          setKnowAnswer(0);
          setDontKnowAnswer(0);
          setDeaths(0);
          
          setMode('test');
        } catch (err) {
            // ⭐ CHECK FOR AI LIMIT ERROR
          if (err.message && err.message.toLowerCase().includes('ai generation')) {
            setShowAILimitModal(true);
          } else {
            setError(err.message);
          }
          console.error('Test generation error:', err);
        //   setError(err.message);
        //   console.error('Test generation error:', err);
        } finally {
          setIsGeneratingTest(false);
        }
    };

    const handleExitTest = () => {
        setMode('study');
        setTestQuestions([]);
        setCurrentTestIndex(0);
        setTestAnswers({});
        
        // Reset stats (they'll be recalculated in study mode)
        setKnowAnswer(0);
        setDontKnowAnswer(0);
        setDeaths(0);
    };

    const handleTestComplete = () => {
        // Calculate final score
        const results = calculateTestResults();
        console.log('Test completed!', results);
        

        // Could show a completion modal here
        // For now, just reset

        setTestComplete(true);
        // handleExitTest(); 
    };

    // ==========================================
    // CALCULATIONS
    // ==========================================
    const calculateTestResults = () => {
        let correct = 0;
        let attempted = 0;

        testQuestions.forEach(q => {
            const userAnswer = testAnswers[q.id];
            if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
                attempted++;
                
                let isCorrect = false;
                if (q.type === 'multiple_choice' || q.type === 'true_false') {
                    isCorrect = userAnswer === q.answer;
                } else if (q.type === 'fill_blank') {
                    isCorrect = userAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim();
                }
                
                if (isCorrect) correct++;
            }
        });

        return {
            correct,
            attempted,
            total: testQuestions.length,
            percentage: attempted > 0 ? Math.round((correct / attempted) * 100) : 0
        };
    };

    const calculateGrade = (currentIndex, knowAnswer) => {
        const percentage = Math.round((knowAnswer/currentIndex) * 100);
        let grade;
        
        if (percentage === 100) grade = "S";
        else if (percentage >= 80) grade = "A";
        else if (percentage >= 60) grade = "B";
        else if (percentage >= 40) grade = "C";
        else grade = "D";

        return { percentage, grade };
    };

    // ==========================================
    // DATA LOADING
    // ==========================================
    const loadDeckData = useCallback(async () => {
        if (!paramDeckId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await fetchDeckAndCards(paramDeckId);
            
            if (result.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            setDeckData(result.deck);
            setFlashCards(result.cards);
            setOriginalDeckSize(result.cards.length);
            setLoading(false);
        } catch (err) {
            console.error('Error loading deck data:', err);
            setError('Failed to load deck');
            setLoading(false);
        }
    }, [user, paramDeckId, fetchDeckAndCards]);

    // ==========================================
    // EFFECTS
    // ==========================================
    useEffect(() => {
        if (user === undefined) return;
        loadDeckData();
    }, [user, paramDeckId, fetchDeckAndCards]);

    useEffect(() => {
        if (location.state?.showFirstDeckCelebration) {
            setShowFirstDeckCelebration(true);
            setTimeout(() => {
                setShowFirstDeckCelebration(false);
                setTimeout(() => setShowDeckIncentive(true), 500);
            }, 4000);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    const renderScoreContainer = () => {
        if (mode === 'test') {
            // Show test progress
            return (
                <div className={`${styles.scoreContainer}`}>
                    <div style={{ margin: '0px', textAlign: 'center' }}>
                        <span className="text-white/70 text-sm">Test Mode</span>
                        <div style={{ 
                            fontSize: '0.7rem', 
                            color: '#A78BFA', 
                            marginTop: '0.5px'
                        }}>
                            Question {currentTestIndex + 1} of {testQuestions.length}
                        </div>
                    </div>
                </div>
            );
        }
        
        // Study mode progress
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
    };

    const renderModeToggle = () => {
        // Show "Back to Study" button when in test mode
        if (mode === 'test') {
            return (
                <button
                    onClick={() => {
                        setMode('study');
                        setTestQuestions([]);
                        setCurrentTestIndex(0);
                        setTestAnswers({});
                    }}
                    className={`w-full py-2 px-4 rounded-lg font-medium ${testComplete ? 'bg-purple-600' : 'bg-purple-600/40'} hover:bg-purple-700 text-white transition-colors`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className='w-6 h-auto inline xs:mr-2' viewBox="0 0 24 24">
                        <path fill="currentColor" d="m21.47 4.35l-1.34-.56v9.03l2.43-5.86c.41-1.02-.06-2.19-1.09-2.61m-19.5 3.7L6.93 20a2.01 2.01 0 0 0 1.81 1.26c.26 0 .53-.05.79-.16l7.37-3.05c.75-.31 1.21-1.05 1.23-1.79c.01-.26-.04-.55-.13-.81L13 3.5a1.95 1.95 0 0 0-1.81-1.25c-.26 0-.52.06-.77.15L3.06 5.45a1.994 1.994 0 0 0-1.09 2.6m16.15-3.8a2 2 0 0 0-2-2h-1.45l3.45 8.34"/>
                    </svg>
                    <span className='hidden xs:inline'>Back to Study Mode</span>
                </button>
            );
        }

        // Show "Simulate Exam" button when in study mode
        return (
            <button
                onClick={() => setShowTestModal(true)}
                disabled={isGeneratingTest || flashCards.length === 0}
                className="w-full max-w-sm py-2 px-4 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-colors disabled:opacity-50"
            >
                <Brain className="w-6 h-6 inline xs:mr-2" />
                <span className='hidden xs:inline'>{isGeneratingTest ? 'Generating...' : 'Simulate Exam'}</span>
            </button>
        );
    };

    // ==========================================
    // LOADING STATE
    // ==========================================
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    // ==========================================
    // ERROR STATE
    // ==========================================
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Error: {error}</h1>
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
    // MAIN RENDER
    // ==========================================
    return (
        <>
            {showAILimitModal && (
                <LimitReachedModal 
                    limitType="ai"
                    onClose={() => setShowAILimitModal(false)}
                />
            )}

            <PracticeTestModal
                isOpen={showTestModal}
                onClose={() => setShowTestModal(false)}
                onGenerate={handleGenerateTest}
                maxQuestions={flashCards.length}
            />
            {/* {showDeckIncentive && (
                <DeckIncentiveToast 
                    xpAmount={200}
                    onComplete={() => setShowDeckIncentive(false)}
                />
            )} */}

            {showSessionComplete && (
                <>
                    <Confetti/>
                    <SessionCompleteToast 
                        xpAmount={200}
                        onComplete={() => setShowSessionComplete(false)}
                    />
                </>
            )}
        
            <div className={`${styles.flashCardsPageContainer} max-w-7xl px-4 mt-8`}>
                <div className={`${styles.leftSideFlashCardsPageContainer}`}>
                    {/* HEADER */}
                    <div className="flex justify-between mb-1">
                        <button
                            onClick={() => navigate('/')}
                            className="flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-all duration-200"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className='truncate max-w-36'>{deckData?.title || "Unknown Deck"}</span>
                        </button>

                        <div className='flex'>
                            {renderModeToggle()}
                            
                            <DeckActionsDropdown 
                                deckId={paramDeckId}
                                deckData={deckData}
                                flashCards={flashCards}
                                user={user}
                                isMuted={isMuted}
                                onToggleMute={() => setIsMuted(prev => !prev)}
                            />
                        </div>
                        
                    </div>

                   
                    

                    {/* MOBILE BATTLE SECTION */}
                    <div className="block lg:hidden mb-4">
                        <BattleSection
                            deckData={deckData}
                            knowAnswer={knowAnswer}
                            dontKnowAnswer={dontKnowAnswer}
                            deaths={deaths}
                            setDeaths={setDeaths}
                            cardCount={mode === 'study' ? originalDeckSize : testQuestions.length} 
                            deckId={paramDeckId}
                            currentUser={currentUser}
                        />
                    </div>

                    {/* SCORE CONTAINER */}
                    {renderScoreContainer()}

                    {/* CONDITIONAL RENDERING */}
                    {mode === 'study' ? (
                        <FlashCardUI 
                            flashCards={flashCards}
                            setFlashCards={setFlashCards}
                            deckData={deckData}
                            setKnowAnswer={setKnowAnswer}
                            setDontKnowAnswer={setDontKnowAnswer}
                            redoDeck={redoDeck}
                            setRedoDeck={setRedoDeck}
                            currentIndex={currentIndex}
                            setCurrentIndex={setCurrentIndex}
                            db={db}
                            onReload={loadDeckData}
                            phaseOneComplete={phaseOneComplete}
                            setPhaseOneComplete={setPhaseOneComplete}
                            originalDeckSize={originalDeckSize}
                            setOriginalDeckSize={setOriginalDeckSize}
                            result={calculateGrade(currentIndex, knowAnswer)}
                            deaths={deaths}
                            onCreateWithAIModalClick={onCreateWithAIModalClick}
                            knowAnswer={knowAnswer}
                            dontKnowAnswer={dontKnowAnswer}
                            isMuted={isMuted}
                            hasNotCreatedADeck={hasNotCreatedADeck}
                            onSessionComplete={() => setShowSessionComplete(true)}
                        />
                    ) : (
                        <>  
                            {testComplete ? 
                            <BattleResult 
                                currentIndex={knowAnswer + dontKnowAnswer}
                                result={calculateGrade(knowAnswer + dontKnowAnswer, knowAnswer)}
                                deaths={deaths}
                                onCreateWithAIModalClick={onCreateWithAIModalClick}
                                deckData={deckData}
                                knowAnswer={knowAnswer}
                                dontKnowAnswer={dontKnowAnswer}
                            /> :
                            <TestTypeUI 
                                testQuestions={testQuestions}
                                testAnswers={testAnswers}
                                setTestAnswers={setTestAnswers}
                                currentTestIndex={currentTestIndex}
                                setCurrentTestIndex={setCurrentTestIndex}
                                setKnowAnswer={setKnowAnswer}
                                setDontKnowAnswer={setDontKnowAnswer}
                                setDeaths={setDeaths}
                                isMuted={isMuted}
                                onTestComplete={handleTestComplete}
                            />}
                        </>
                    )}

                 

                </div>
                
                {/* RIGHT SIDEBAR */}
                <div className={`hidden lg:block ${styles.rightSideFlashCardsPageContainer} mt-9 md:mt-0`}>
                    <BattleSection
                        deckData={deckData}
                        knowAnswer={knowAnswer}
                        dontKnowAnswer={dontKnowAnswer}
                        deaths={deaths}
                        setDeaths={setDeaths}
                        cardCount={mode === 'study' ? originalDeckSize : testQuestions.length} 
                        deckId={paramDeckId}
                        currentUser={currentUser}
                    />
                </div>
            </div>
        </>
    );
}

export default FlashCardsPage;