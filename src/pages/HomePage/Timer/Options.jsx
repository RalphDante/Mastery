import { useState, useEffect, useRef } from "react";
import Timer from "./Timer";
import { ArrowLeft } from "lucide-react";
import LearningHubSection from "../LearningHubSection/LearningHubSection";
import { useAuthContext } from "../../../contexts/AuthContext";
import { useFolders } from "../../../contexts/DeckCacheContext";
import { useTutorials } from "../../../contexts/TutorialContext";
import { doc, getDoc } from 'firebase/firestore';
import { logCreateFlashcardEvent, logTimerEvent } from "../../../utils/analytics";


function Options({db, authUser, onCreateDeckClick, onCreateWithAIModalClick, handleTimerStart, handleTimerComplete, timerStartRef}){
    const {loading} = useAuthContext();
    const folders = useFolders();
    const [studyMode, setStudyMode] = useState('options');
    const [showAIOption, setShowAIOption] = useState(false);
    const [isCheckingTimer, setIsCheckingTimer] = useState(true);
    const {isTutorialAtStep} = useTutorials();

    const hasNotStartedATimerSession = isTutorialAtStep('start-timer', 1);
    const hasNotStartedAFlashcardSession = isTutorialAtStep('create-deck', 1);

  

    useEffect(() => {
        const checkForActiveTimer = async () => {
            if (!authUser) {
                setIsCheckingTimer(false);
                return;
            }

            try {
                const userRef = doc(db, 'users', authUser.uid);
                const userDoc = await getDoc(userRef);
                const userData = userDoc.data();
                const activeTimer = userData?.activeTimer;

                // Check if user has never studied before
                const hasNeverStudied = !userData?.lastStudyDate;

            
                if (activeTimer?.isActive && activeTimer.startedAt) {
                    console.log('Active timer detected, switching to timer view');
                    setStudyMode('timer');
                }
            } catch (error) {
                console.error('Error checking for active timer:', error);
            } finally {
                setIsCheckingTimer(false);
            }
        };

        checkForActiveTimer();
    }, [authUser, db]);

    if (isCheckingTimer) {
        return (
            <div className="w-full h-full min-h-[450px] bg-slate-800 rounded-lg p-6 flex items-center justify-center">
                <div className="text-slate-400">Checking for active session...</div>
            </div>
        );
    }

    const openTimer = ()=>{
        if (authUser) {
            logTimerEvent.cardClicked(authUser.uid);
        }
        setStudyMode("timer");
    }

    const openFlashcards = ()=>{
        setStudyMode("flashcards");
    }
    
    const handleCreateWithAI = () => {
        // Log the event
        if (authUser) {
            logCreateFlashcardEvent.clickedUploadNotes(authUser.uid);
        }
        onCreateWithAIModalClick("First Folder");
    }

    const handleCreateManually = () => {
        // Log the event
        if (authUser) {
            logCreateFlashcardEvent.clickedCreateManually(authUser.uid);
        }
        onCreateDeckClick("First Folder");
    }

    const openOptions = ()=>{
        setStudyMode("options");
        setShowAIOption(false);
    }

    const openAIOption = ()=>{
        if (authUser) {
            logCreateFlashcardEvent.cardClicked(authUser.uid);
        }
        setShowAIOption(true);
    }

    

    // Render based on studyMode
    const renderContent = () => {
        switch (studyMode) {
        case "timer":
            return <Timer 
                db={db}
                authUser={authUser}
                handleTimerStart={handleTimerStart}
                handleTimerComplete={handleTimerComplete}
                timerStartRef={timerStartRef}
            />;
        case "flashcards":
            return <LearningHubSection 
                    onCreateDeckClick={onCreateDeckClick}
                    onCreateWithAIModalClick={onCreateWithAIModalClick}
                />
            ;
        default:
            return (
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!showAIOption ? 
                        ((!loading && (!folders || folders.length === 0)) ? (
                            <>
                            <button 
                            onClick={openAIOption}
                            className={`w-full group relative overflow-hidden bg-gradient-to-br from-red-600 to-orange-600 rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/50`}
                            >
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-300"></div>
                            <div className="relative z-10 flex items-center gap-4">
                                {/* Text Content - Left Side */}
                                <div className="flex-1 text-left">
                                <h3 className="text-xl font-bold text-white mb-1">Create Flashcards</h3>
                                <p className="text-xs text-white/80">Fight your notes (2x more rewards)</p>
                                </div>
                                {/* Image - Right Side */}
                                <img 
                                src="/images/bosses-headline-image.webp" 
                                alt="A picture of the bosses in the game"
                                className="w-28 h-auto rounded-lg flex-shrink-0"
                                loading="eager"
                                width="600"
                                height="400"
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 text-6xl opacity-40 group-hover:opacity-20 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-auto" viewBox="0 0 24 24">
                                <path fill="#ffb245" d="M13.995 4.077v.06A11 11 0 0 1 16.22 8.42c.605 2.167.876 4.414.805 6.662a1 1 0 0 1 0 .113a6.3 6.3 0 0 0-.721-1.846a4.4 4.4 0 0 0-1.367-1.45c.025.064.059.113.059.168a7 7 0 0 1 .528 2.245a4.7 4.7 0 0 1-1.076 3.41a1.4 1.4 0 0 0-.113.203l-.069-.065a3.95 3.95 0 0 0-.138-2.374c-.578 2.216-2.068 3.538-4.047 4.437c2.404-.01 4.723-.375 6.697-1.856c.015.533-.148.958-.696 1.841c1.673-.839 2.403-2.23 2.586-4.012c.45.536.755 1.178.888 1.866c.128.656.192 1.327.286 1.974c.71-1.747.686-3.593.444-5.512c2.137 1.248 3.02 3.266 3.701 5.428a25 25 0 0 0-.133-3.494c-.17-1.698-.59-3.36-1.248-4.935a11.84 11.84 0 0 0-6.638-6.583a8.8 8.8 0 0 0-1.973-.563m-2.734.11c-.306.522-.587 1.06-.933 1.539a18 18 0 0 1-1.14 1.524a1.3 1.3 0 0 1-.943.43l.445-2.083a.6.6 0 0 0-.143.188c-.3.46-.592.928-.908 1.372a.63.63 0 0 1-.726.247c-.493-.144-.987-.282-1.48-.44a.26.26 0 0 0-.326.08A18 18 0 0 1 3.785 8.42c-1.076.953-2.24 1.746-3.785 1.638v.065c.434 1.026.864 2.053 1.318 3.074a1.65 1.65 0 0 0 .69.74a12 12 0 0 1-.183-1.283c-.024-.523.094-.617.617-.667a.17.17 0 0 1 .203.129c.074.187.163.37.246.558c.104-.227.193-.44.296-.642a.3.3 0 0 1 .149-.133c.222-.094.45-.168.686-.257l.177.356c.153-.35.296-.696.46-1.037a.375.375 0 0 1 .468-.173v.242a4.93 4.93 0 0 0 .493 2.626a4.2 4.2 0 0 1 .281 1.046c.04.162-.043.257-.196.257l-.4.044a1.7 1.7 0 0 1 .27.247c.075.094.179.27.144.32a.9.9 0 0 1-.39.267a.54.54 0 0 1-.315 0a10 10 0 0 1-.81-.272a4 4 0 0 1-.414-.212l-.08.094l.716.612a1.55 1.55 0 0 0 1.24.41a.987.987 0 0 0 .986-.988c.045-.306.005-.616.045-.922a2.7 2.7 0 0 1 .927-1.974a2.56 2.56 0 0 0-1.214.74a6.4 6.4 0 0 1-.079-1.135a1.545 1.545 0 0 1 1.402-1.653a21 21 0 0 1 1.648-.281c.805-.08 1.599-.246 2.369-.494a4.4 4.4 0 0 0 1.406-.794a18 18 0 0 1-2.872.38a8.88 8.88 0 0 0 3.4-4.777c-1.056 1.48-2.202 2.867-3.87 3.701a22.7 22.7 0 0 0 1.447-4.086zM5.443 8.07c-.03.153-.054.305-.094.454c-.074.29-.163.577-.237.868a.197.197 0 0 1-.198.178c-.384.045-.764.103-1.183.157zM9.4 10.775a4 4 0 0 0-.577.053a2.9 2.9 0 0 0-1.48.523a.99.99 0 0 0-.43.923a1.1 1.1 0 0 1 .972-.671a3.07 3.07 0 0 1 1.762.34c.49.234.772.76.696 1.298a2.34 2.34 0 0 1-.687 1.377a5.8 5.8 0 0 1-1.914 1.308a9.7 9.7 0 0 0-2.32 1.41a3.95 3.95 0 0 0-1.396 2.567h5.921a2.023 2.023 0 0 1 .987-2.551l-.26 1.115a5.43 5.43 0 0 0 1.243-2.665c.171.407.245.848.216 1.288a5.6 5.6 0 0 0 .44-2.866l.518.561c-.049-.4-.09-.755-.134-1.11a3.1 3.1 0 0 0-1.865-2.585a4.2 4.2 0 0 0-1.692-.315"/>
                                </svg>
                            </div>
                            </button>

                            {/* Pomodoro Timer Card - Horizontal Layout */}
                            <button
                            onClick={openTimer}
                            className={`w-full group relative overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/50`}
                            >
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-300"></div>
                            <div className="relative z-10 flex items-center gap-4">
                                {/* Text Content - Left Side */}
                                <div className="flex-1 text-left">
                                <h3 className="text-xl font-bold text-white mb-1">Pomodoro Timer</h3>
                                <p className="text-xs text-white/80">Channel your focus (Steady damage and earn rewards)</p>
                                </div>
                                {/* Timer Icon - Right Side */}
                                <div className="flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-auto" viewBox="0 0 24 24">
                                    <path fill="#ffffffff" d="M22 9V7h-1V5h-1V4h-1V3h-2V2h-2V1H9v1H7v1H5v1H4v1H3v2H2v2H1v6h1v2h1v2h1v1h1v1h2v1h2v1h6v-1h2v-1h2v-1h1v-1h1v-2h1v-2h1V9zm-1 6h-1v2h-1v2h-2v1h-2v1H9v-1H7v-1H5v-2H4v-2H3V9h1V7h1V5h2V4h2V3h6v1h2v1h2v2h1v2h1z"/>
                                    <path fill="#ffd736ff" d="M16 15v1h-1v1h-1v-1h-1v-1h-1v-1h-1V5h2v8h1v1h1v1z"/>
                                </svg>
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 text-6xl opacity-40 group-hover:opacity-20 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-auto" viewBox="0 0 24 24">
                                <path fill="#ffd932ff" d="M19 13v-3h-1V9h-1V6h-1V4h-1V3h-1V2h-1V1h-2v1h1v2h-1v2h-1v1H9v1H8v1H7v1H6v3h1v2H6v-1H5v-2H4v2H3v3h1v2h1v1h1v1h1v1h1v1h8v-1h1v-1h1v-1h1v-2h1v-5zm-2 7h-1v1h-2v1h-4v-1H9v-4h1v-1h1v-1h1v-1h1v-3h-1v-1h-1V9h1v1h2v2h1v5h-1v2h1v-1h1v-1h1z"/>
                                </svg>
                            </div>
                            </button>
                            </>

                        ) : (
                            // Fight Bosses Card
                            <>
                            <button 
                            onClick={openFlashcards}
                            className="w-full group relative overflow-hidden bg-gradient-to-br from-red-600 to-orange-600 rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/50"
                            >
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-300"></div>
                            <div className="relative z-10 flex items-center gap-4">
                                {/* Text Content - Left Side */}
                                <div className="flex-1 text-left">
                                <h3 className="text-xl font-bold text-white mb-1">Your Decks</h3>
                                <p className="text-xs text-white/80">Battle through your flashcards</p>
                                </div>
                                {/* Image - Right Side */}
                                <img 
                                src="/images/bosses-headline-image.webp" 
                                alt="A picture of the bosses in the game"
                                className="w-28 h-auto rounded-lg flex-shrink-0"
                                loading="eager"
                                width="600"
                                height="400"
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 text-6xl opacity-40 group-hover:opacity-20 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-auto" viewBox="0 0 24 24">
                                <path fill="#ffb245" d="M13.995 4.077v.06A11 11 0 0 1 16.22 8.42c.605 2.167.876 4.414.805 6.662a1 1 0 0 1 0 .113a6.3 6.3 0 0 0-.721-1.846a4.4 4.4 0 0 0-1.367-1.45c.025.064.059.113.059.168a7 7 0 0 1 .528 2.245a4.7 4.7 0 0 1-1.076 3.41a1.4 1.4 0 0 0-.113.203l-.069-.065a3.95 3.95 0 0 0-.138-2.374c-.578 2.216-2.068 3.538-4.047 4.437c2.404-.01 4.723-.375 6.697-1.856c.015.533-.148.958-.696 1.841c1.673-.839 2.403-2.23 2.586-4.012c.45.536.755 1.178.888 1.866c.128.656.192 1.327.286 1.974c.71-1.747.686-3.593.444-5.512c2.137 1.248 3.02 3.266 3.701 5.428a25 25 0 0 0-.133-3.494c-.17-1.698-.59-3.36-1.248-4.935a11.84 11.84 0 0 0-6.638-6.583a8.8 8.8 0 0 0-1.973-.563m-2.734.11c-.306.522-.587 1.06-.933 1.539a18 18 0 0 1-1.14 1.524a1.3 1.3 0 0 1-.943.43l.445-2.083a.6.6 0 0 0-.143.188c-.3.46-.592.928-.908 1.372a.63.63 0 0 1-.726.247c-.493-.144-.987-.282-1.48-.44a.26.26 0 0 0-.326.08A18 18 0 0 1 3.785 8.42c-1.076.953-2.24 1.746-3.785 1.638v.065c.434 1.026.864 2.053 1.318 3.074a1.65 1.65 0 0 0 .69.74a12 12 0 0 1-.183-1.283c-.024-.523.094-.617.617-.667a.17.17 0 0 1 .203.129c.074.187.163.37.246.558c.104-.227.193-.44.296-.642a.3.3 0 0 1 .149-.133c.222-.094.45-.168.686-.257l.177.356c.153-.35.296-.696.46-1.037a.375.375 0 0 1 .468-.173v.242a4.93 4.93 0 0 0 .493 2.626a4.2 4.2 0 0 1 .281 1.046c.04.162-.043.257-.196.257l-.4.044a1.7 1.7 0 0 1 .27.247c.075.094.179.27.144.32a.9.9 0 0 1-.39.267a.54.54 0 0 1-.315 0a10 10 0 0 1-.81-.272a4 4 0 0 1-.414-.212l-.08.094l.716.612a1.55 1.55 0 0 0 1.24.41a.987.987 0 0 0 .986-.988c.045-.306.005-.616.045-.922a2.7 2.7 0 0 1 .927-1.974a2.56 2.56 0 0 0-1.214.74a6.4 6.4 0 0 1-.079-1.135a1.545 1.545 0 0 1 1.402-1.653a21 21 0 0 1 1.648-.281c.805-.08 1.599-.246 2.369-.494a4.4 4.4 0 0 0 1.406-.794a18 18 0 0 1-2.872.38a8.88 8.88 0 0 0 3.4-4.777c-1.056 1.48-2.202 2.867-3.87 3.701a22.7 22.7 0 0 0 1.447-4.086zM5.443 8.07c-.03.153-.054.305-.094.454c-.074.29-.163.577-.237.868a.197.197 0 0 1-.198.178c-.384.045-.764.103-1.183.157zM9.4 10.775a4 4 0 0 0-.577.053a2.9 2.9 0 0 0-1.48.523a.99.99 0 0 0-.43.923a1.1 1.1 0 0 1 .972-.671a3.07 3.07 0 0 1 1.762.34c.49.234.772.76.696 1.298a2.34 2.34 0 0 1-.687 1.377a5.8 5.8 0 0 1-1.914 1.308a9.7 9.7 0 0 0-2.32 1.41a3.95 3.95 0 0 0-1.396 2.567h5.921a2.023 2.023 0 0 1 .987-2.551l-.26 1.115a5.43 5.43 0 0 0 1.243-2.665c.171.407.245.848.216 1.288a5.6 5.6 0 0 0 .44-2.866l.518.561c-.049-.4-.09-.755-.134-1.11a3.1 3.1 0 0 0-1.865-2.585a4.2 4.2 0 0 0-1.692-.315"/>
                                </svg>
                            </div>
                            </button>

                            {/* Pomodoro Timer Card - Horizontal Layout */}
                            <button
                            onClick={openTimer}
                            className="w-full group relative overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/50"
                            >
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-300"></div>
                            <div className="relative z-10 flex items-center gap-4">
                                {/* Text Content - Left Side */}
                                <div className="flex-1 text-left">
                                <h3 className="text-xl font-bold text-white mb-1">Pomodoro Timer</h3>
                                <p className="text-xs text-white/80">Channel your focus in timed bursts (Steady damage and earn rewards)</p>
                                </div>
                                {/* Timer Icon - Right Side */}
                                <div className="flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-auto" viewBox="0 0 24 24">
                                    <path fill="#ffffffff" d="M22 9V7h-1V5h-1V4h-1V3h-2V2h-2V1H9v1H7v1H5v1H4v1H3v2H2v2H1v6h1v2h1v2h1v1h1v1h2v1h2v1h6v-1h2v-1h2v-1h1v-1h1v-2h1v-2h1V9zm-1 6h-1v2h-1v2h-2v1h-2v1H9v-1H7v-1H5v-2H4v-2H3V9h1V7h1V5h2V4h2V3h6v1h2v1h2v2h1v2h1z"/>
                                    <path fill="#ffd736ff" d="M16 15v1h-1v1h-1v-1h-1v-1h-1v-1h-1V5h2v8h1v1h1v1z"/>
                                </svg>
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 text-6xl opacity-40 group-hover:opacity-20 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-auto" viewBox="0 0 24 24">
                                <path fill="#ffd932ff" d="M19 13v-3h-1V9h-1V6h-1V4h-1V3h-1V2h-1V1h-2v1h1v2h-1v2h-1v1H9v1H8v1H7v1H6v3h1v2H6v-1H5v-2H4v2H3v3h1v2h1v1h1v1h1v1h1v1h8v-1h1v-1h1v-1h1v-2h1v-5zm-2 7h-1v1h-2v1h-4v-1H9v-4h1v-1h1v-1h1v-1h1v-3h-1v-1h-1V9h1v1h2v2h1v5h-1v2h1v-1h1v-1h1z"/>
                                </svg>
                            </div>
                            </button>
                            </>
                        )) : (
                            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Create with AI - Epic Purple Theme */}
                                <button
          onClick={handleCreateWithAI}
          className="w-full group relative overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/50"
        >
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-300"></div>
          
          {/* Animated sparkle */}
          <div className="absolute top-2 right-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 8 8">
              <path fill="#fbcd23" d="M4 0C2.9 0 2 .9 2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2M3 4.81V8l1-1l1 1V4.81c-.31.11-.65.19-1 .19s-.69-.08-1-.19"/>
            </svg>
          </div>
          
          <div className="relative z-10 flex items-center gap-4">
            {/* Text Content - Left Side */}
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold text-white mb-1">Upload my Notes</h3>
              <p className="text-xs text-white/90">Upload notes or images and let AI forge your boss cards</p>
              <div className="mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold inline-block">
                GET STARTED
              </div>
            </div>
            {/* Icon - Right Side */}
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-auto" viewBox="0 0 512 512">
                <path fill="#fbcd23" d="M311.9 47.95c-17.6 0-34.6.7-50.7 2.43L244.6 93.5l-4.9-40.04c-2.5.46-5 .94-7.5 1.47c-9.1 1.94-15.1 7.22-20.3 14.87s-8.9 17.5-12.1 26.6C191 121.5 184 148 178.4 175c6 5.1 12 10.3 17.9 15.4l30.7-17.6l33.8 26.1l51.9-19.7l61 24.5l-6.8 16.7l-54.4-21.8l-54.7 20.7l-32.2-24.9l-14.9 8.5c19.6 17.3 38.6 34.4 56.5 51.2l14-6.4l33.9 16.1l31.2-13.1l24.2 23.3l-12.4 13l-15.8-15.1l-27.6 11.7l-33-15.8c6.9 6.7 13.6 13.2 20.1 19.7l1.7 1.8l19.5 76.3l-7.8-5.7l-53 .4l-38.1-17.8l-42.4 14.6l-5.8-17l49.2-17l41.1 19.2l24.7-.2l-70.7-51.7c-19.7 4.6-39.4 2.8-58.1-3.7c-4.2 44.4-5.9 85.7-7 118.7c-.4 10.7 2.7 23 7.5 32.5c4.9 9.5 11.7 15.4 15 16.1c5.2 1.2 19 3.2 37.7 5.1l12.4-39l19.1 41.7c16.7 1.2 35 2 53.5 2.2c28.2.3 57.1-.9 82-4.7c15.8-2.3 29.6-6 40.7-10.4c-11.8-5.1-21.6-10.6-29.1-16.6c-11.1-8.9-18.2-19.3-17.3-30.9v.2c5.4-96.4 10.8-188.8 30.3-286l.1-.4l.1-.4c5.3-17.9 17.9-39.86 36.1-55.83c-13.9-2.06-28.6-4-43.7-5.66l-22.3 25.3l-2.2-27.7c-19-1.64-38.4-2.71-57.4-2.92h-5.7zm148.5 20.44c-4.7 3.69-9.2 8.03-13.3 12.73c12.1 8.18 21.4 23.38 21.8 36.98c.3 7.8-1.9 14.9-7.7 21.4c-5.8 6.4-15.6 12.4-31.6 15.8l3.8 17.6c18.6-4 32.3-11.5 41.2-21.4c9-9.9 12.7-22.2 12.3-34c-.6-19.3-11.1-37.59-26.5-49.11M25.44 71.91c-.24 1.61-.38 3.43-.38 5.62c.1 7.69 2.03 18.17 5.83 30.17c3.41 10.7 8.27 22.5 14.35 34.8c10.63-5.3 20.59-11 28.41-18.1c-4.42 12.5-10.15 24.7-18.6 36.5c4.14 7.2 8.63 14.4 13.45 21.5c10.64-5.3 20.72-13 29.52-26.1c-3.3 16-8.47 30.6-18.27 41.8c6.53 8.5 13.5 16.8 20.75 24.5c8.7-9.3 15.6-21 20.7-34.9c3.8 18.5 2.6 35.3-5.7 49.4c8 7.2 16.3 13.7 24.8 19.1c6.1-14 8.9-30.6 8.5-49.7c9.2 23.7 11.3 42.9 9.6 59.5c20.2 9.2 40.8 12 61.3 6.1l4.2-1.3l69.3 50.6l-5.9-22.8c-73-72.8-175.4-156.7-261.86-226.69M312.8 123.9l33.2 13.8l31.3-9.9l5.4 17.2l-37.5 11.9l-33.6-14l-28.8 8.1l-4.8-17.4zm107.3 236.2c-.7 0-1.3.1-2 .1c-3.5.1-7.2.5-11.1 1.3l3.4 17.6c12.2-2.3 20-.4 24.5 2.5c4.4 2.9 6.3 6.8 6.4 12.5c.1 9.3-7 23-23.3 32.5c5.4 2.9 11.9 5.9 19.3 8.7c14.4-11.6 22.1-26.8 22-41.4c-.1-10.7-5.2-21.2-14.6-27.4c-6.7-4.3-15-6.5-24.6-6.4"/>
              </svg>
            </div>
          </div>
          
          {/* Decorative element */}
          <div className="absolute -bottom-4 -right-4 text-8xl opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-auto" viewBox="0 0 512 512">
              <path fill="currentColor" d="M250.53 22.03c-57.055 45.157-80.673 37.81-100.31.22c16.598 61.517 10.408 66.415-44.72 116.594c67.324-35.666 96.206-34.238 130.97 7.187c-34.906-53.112-30.954-75.35 14.06-124zm18.407.126l11.688 114.938l-99.875 58.094l97.75 21.093c-9.58 8.352-20.214 19.028-31.28 30.095l-.032.03L18.563 472.438v19.438h32.156L273.343 272.5c10.26-10.263 18.902-19.538 25.78-27.75l18.938 87.75l58.094-99.875l114.938 11.688l-77.03-86.094l46.655-105.69l-105.69 46.657l-86.092-77.03zM26.875 55.938c33.765 27.66 35.21 42.767 30.75 87.78c18.975-53.73 27.964-67.297 64.5-82C82.972 71.094 66.21 73 26.875 55.94zm54.75 102.406c24.955 27.012 26.97 43.684 24.25 72.062c14.775-34.45 22.072-45.66 55.625-64.312c-34.56 11.183-45.5 10.22-79.875-7.75m325.594 95c9.27 51.694-4.61 73.708-32.845 106.687c43.3-37.043 57.852-44.284 96.844-38.75c-38.597-11.457-47.426-20.624-64-67.936zm-55.658 72.812c-18.705 68.79-45.304 83.944-107.625 70.125c54.126 20.1 56.34 21.07 53.532 85.25c24.757-55.42 46.49-52.217 95.06-37.217c-41.775-31.838-45.71-48.97-40.967-118.157zm109.344 55.97c-15.32 17.994-22.932 17.49-43.812 9.343c22.828 18.444 17.596 34.024 10.844 59.405c16.05-19.12 23.516-25.237 50.312-12.688c-22.86-21.342-27.13-29.857-17.344-56.062z"/>
            </svg>
          </div>
        </button>

        {/* Create Manually Card - Horizontal Layout */}
        <button 
          onClick={handleCreateManually}
          className="w-full group relative overflow-hidden bg-gradient-to-br from-amber-600 via-yellow-600 to-orange-600 rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/50"
        >
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-300"></div>
          
          <div className="relative z-10 flex items-center gap-4">
            {/* Text Content - Left Side */}
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold text-white mb-1">Create Manually</h3>
              <p className="text-xs text-white/90">Craft each card with your own hands like a true warrior</p>
              <div className="mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold inline-block">
                FULL CONTROL
              </div>
            </div>
            {/* Icon - Right Side */}
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-auto" viewBox="0 0 24 24">
                <path fill="#fff4e6ff" d="m21.71 20.29l-1.42 1.42a1 1 0 0 1-1.41 0L7 9.85A3.8 3.8 0 0 1 6 10a4 4 0 0 1-3.78-5.3l2.54 2.54l.53-.53l1.42-1.42l.53-.53L4.7 2.22A4 4 0 0 1 10 6a3.8 3.8 0 0 1-.15 1l11.86 11.88a1 1 0 0 1 0 1.41M2.29 18.88a1 1 0 0 0 0 1.41l1.42 1.42a1 1 0 0 0 1.41 0l5.47-5.46l-2.83-2.83M20 2l-4 2v2l-2.17 2.17l2 2L18 8h2l2-4Z"/>
              </svg>
            </div>
          </div>
          
          {/* Decorative element */}
          <div className="absolute -bottom-2 -right-2 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">⚒️</div>
        </button>
                            </div>
                        )
                    }
                    
                   

                   
                </div>
            );
        }
    };

    return(
        <>  

            <div className="w-full  bg-slate-800 rounded-lg p-6 flex flex-col justify-between text-slate-100 relative">
                
                {/* HEADER */}
                <div className="flex justify-between align-center items-center mb-2">
                    <div className="text-left">
                        <h2 className="texl-sm sm:text-xl font-semibold flex items-center justify-center mb-1">

                            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-auto" viewBox="0 0 512 512"><path fill="#ffb245" d="M66.54 18.002a18.07 18.07 0 0 0-12.37 4.541c-7.508 6.632-8.218 18.094-1.586 25.602c4.394 4.974 10.906 6.945 16.986 5.792l57.838 65.475l-50.373 44.498l24.188 27.38c9.69-21.368 22.255-39.484 37.427-54.65l6.91 36.188c25.092-6.29 49.834-10.563 74.366-12.873l-23.912-27.07l-38.66-12.483c17.117-12.9 36.734-22.97 58.62-30.474l-24.19-27.385l-50.37 44.496l-57.92-65.57c1.79-5.835.617-12.43-3.72-17.34a18.1 18.1 0 0 0-13.235-6.128zm384.397 0a18.1 18.1 0 0 0-13.232 6.127c-4.338 4.91-5.514 11.506-3.723 17.343l-57.92 65.568l-50.37-44.497l-24.188 27.385c21.884 7.504 41.5 17.573 58.62 30.472l-38.66 12.485l-23.255 26.324c24.71 1.863 49.367 5.706 74.118 11.46l6.498-34.03c15.173 15.166 27.74 33.282 37.43 54.65l24.185-27.38l-50.372-44.498l57.838-65.475c6.08 1.153 12.593-.818 16.987-5.792c6.63-7.508 5.92-18.97-1.586-25.602a18.07 18.07 0 0 0-12.37-4.541zm-186.425 158.51c-39.56-.098-79.467 5.226-120.633 16.095c-2.046 90.448 34.484 209.35 118.47 259.905c81.295-49.13 122.402-169.902 120.552-259.914c-39.75-10.496-78.91-15.988-118.39-16.086zm-117.176 153.5L60.47 428.35l-12.2 63.894l61.9-19.994l68.49-77.535c-12.86-20.108-23.246-42.03-31.324-64.703m228.203 6.11c-8.69 22.238-19.577 43.634-32.706 63.142l64.473 72.986l61.898 19.994l-12.2-63.894l-81.466-92.23z"/></svg> 
                            
                            {!(studyMode === 'options') ? 
                            (studyMode === 'timer' ? 'Study Timer' : 'Your Boss Collections') :
                                'Help Your Party'
                            }
                        </h2>
                        {/* <p className="text-slate-400 text-sm">Choose your battle session</p> */}
                    </div>
                    {!(studyMode === 'options') || showAIOption ? 
                        <button
                            onClick={openOptions}
                            className="gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-gray-700/20 text-white hover:bg-gray-600 transition-all duration-200 shadow-md text-sm sm:text-base"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button> : 
                        ""

                    }
                </div>



                {renderContent()}
            </div>



        </>
    )
}


export default Options;