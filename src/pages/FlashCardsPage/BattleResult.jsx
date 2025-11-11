import { useState, useEffect } from 'react';
import { useTutorials } from '../../contexts/TutorialContext';
import { useNavigate } from 'react-router-dom';
import { usePartyContext } from '../../contexts/PartyContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { ArrowRight } from 'lucide-react';
import { DEMO_DECKS } from '../../configs/DEMO_DECKS';
import DemoDeckCard from './DemoDeckCard';

function BattleResult({currentIndex, result, deaths, onCreateWithAIModalClick, deckData, knowAnswer, dontKnowAnswer}){
    const [showStats, setShowStats] = useState(false);
    const [counter, setCounter] = useState(0);
    const [showDemoDecks, setShowDemoDecks] = useState(false);

    const {isInTutorial, advanceStep, isTutorialAtStep} = useTutorials()
    
    const {partyMembers, partyProfile} = usePartyContext();

    const {user} = useAuthContext();

    const currentUser = user?.uid ? partyMembers[user.uid] : null;


    // Check if this is their first or second deck
    const shouldShowPartyIntro = isInTutorial('create-deck');

    const [timer, setTimer] = useState(60);
    const [bonusXP, setBonusXP] = useState(0);

    useEffect(() => {
        if (timer > 0) {
        const t = setTimeout(() => setTimer(timer - 1), 1000);
        return () => clearTimeout(t);
        } else if (timer === 0) {
        setBonusXP(100);
        }
    }, [timer]);



    const calculateRewards = () => {
        // Get correct and incorrect counts from result
        const correctAnswers = knowAnswer || 0;
        const incorrectAnswers = dontKnowAnswer || 0;
        
        // Get player level (default to 1 if not available)
        const playerLevel = currentUser?.level || 1;
        
        // Calculate EXP: (correct * 15) + (incorrect * 5)
        const exp = (correctAnswers * 15) + (incorrectAnswers * 5);
        
        // Calculate base boss damage: (correct * 15) + (incorrect * 5)
        const baseDamage = (correctAnswers * 15) + (incorrectAnswers * 5);
        
        // Apply level multiplier: +5% per level (Level 1 = base, Level 10 = 45% more)
        const levelMultiplier = 1 + ((playerLevel - 1) * 0.05);

        
        const bossDamage = `+${Math.floor(baseDamage * levelMultiplier)}`;
        
        // Calculate HP: correct * 2
        const hp = correctAnswers * 2;
        
        // Calculate MANA: (correct * 5) + (incorrect * 2)
        const mana = (correctAnswers * 5) + (incorrectAnswers * 2);
        
        return { exp, bossDamage, hp, mana };
    };


    const rewards = calculateRewards();

    const navigate = useNavigate(); 

    const handleDeckSelect = (deckId)=>{
        navigate(`/flashcards/${deckId}`)
    }

    const hasNotCreatedADeck = isInTutorial('create-deck')

    // Grade colors and styles
    const gradeStyles = {
        'S': { color: 'text-cyan-400', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.6)]', bg: 'from-cyan-500/20 to-blue-500/20' },
        'A': { color: 'text-green-400', glow: 'shadow-[0_0_20px_rgba(74,222,128,0.6)]', bg: 'from-green-500/20 to-emerald-500/20' },
        'B': { color: 'text-yellow-400', glow: 'shadow-[0_0_20px_rgba(250,204,21,0.6)]', bg: 'from-yellow-500/20 to-amber-500/20' },
        'C': { color: 'text-orange-400', glow: 'shadow-[0_0_20px_rgba(251,146,60,0.6)]', bg: 'from-orange-500/20 to-red-500/20' },
        'D': { color: 'text-red-400', glow: 'shadow-[0_0_20px_rgba(248,113,113,0.6)]', bg: 'from-red-500/20 to-pink-500/20' },
        'F': { color: 'text-gray-400', glow: 'shadow-[0_0_20px_rgba(156,163,175,0.6)]', bg: 'from-gray-500/20 to-slate-500/20' }
    };

    const currentGrade = gradeStyles[result.grade] || gradeStyles['F'];

    const handleContinueAdventureClick = ()=>{
        if(isTutorialAtStep('create-deck', 3)){
            advanceStep('create-deck')
        }
        setShowDemoDecks(true);
    }

    const createBossWithAi = () => {
        const isUrgent = timer <= 10;
        
        return (
            <div className="space-y-4 text-center">
                {/* URGENCY BANNER */}
                <div>

           

                    {/* NOW the urgency makes sense */}
                    <div className={`relative mx-6 rounded-t-xl p-4 shadow-lg transition-all ${
                        isUrgent 
                            ? 'bg-gradient-to-r from-red-600 to-red-700 border-red-400 animate-pulse' 
                            : ''
                    }`}>
                        {/* <p className="text-white font-black text-xl md:text-2xl tracking-tight">
                            {isUrgent ? '🚨 HURRY!' : '⏱️'} {timer}s LEFT
                        </p> */}
                        {/* Heading - More Direct */}
                        <h2 className="text-2xl md:text-3xl font-black text-white px-4">
                            Upload Notes & Get <span className="text-yellow-400">+100 XP!</span>
                        </h2>
                    
                        {/* <div className="absolute -top-3 -right-2 bg-yellow-400 text-black 
                                        text-xs font-bold px-3 py-1 rounded-full shadow-lg ">
                            LIMITED TIME
                        </div> */}
                    </div>

                    
                </div>


               

                {/* WARNING TEXT - NEW! */}
                {isUrgent && (
                    <p className="text-red-400 font-bold text-sm animate-pulse mx-8">
                        ⚠️ Upload now or lose your +100 XP bonus!
                    </p>
                )}

               
                <div className="relative w-full max-w-md mx-auto">
                    {/* BIG CTA - Enhanced */}
                    <button
                        onClick={() => {
                        onCreateWithAIModalClick("First Folder");
                        if (isTutorialAtStep('create-deck', 3)) advanceStep('create-deck');
                        }}
                        className={`group w-full font-bold py-5 md:py-6 rounded-t-2xl rounded-b-none
                            text-lg md:text-xl flex items-center justify-center gap-3 
                            transition-all duration-300 hover:scale-105 active:scale-95 
                            shadow-2xl relative overflow-hidden ${
                            isUrgent 
                                ? 'bg-gradient-to-r from-red-600 to-red-700 shadow-red-500/50 animate-pulse' 
                                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 border border-2 border-yellow-400'
                            } text-white`}
                    >   
                        {/* Pulse overlay when urgent */}
                        {isUrgent && (
                        <div className="absolute inset-0 bg-white/10 animate-pulse" />
                        )}
                        
                        <svg 
                        className="w-10 h-10 md:w-12 md:h-12 text-yellow-400 group-hover:scale-110 transition relative z-10" 
                        viewBox="0 0 24 24"
                        >
                        <path 
                            fill="currentColor" 
                            d="M5 10H4V8h1V7h1V6h1V5h1V4h1V3h1V2h1V1h2v1h1v1h1v1h1v1h1v1h1v1h1v1h1v2h-1v1h-2v-1h-1V9h-1V8h-1v9h-4V8H9v1H8v1H7v1H5zM2 20h20v3H2z" 
                        />
                        </svg>
                        <span className="leading-tight relative z-10">
                        UPLOAD NOTES &<br />FIGHT REAL BOSSES
                        </span>
                    </button>

                    {/* Timer Bar - Now full width, attached to button */}
                    <div className={`relative h-5 bg-slate-800 overflow-hidden border-2 border-t-0 rounded-b-2xl
                        ${isUrgent ? 'border-red-400' : 'border-yellow-400'}`}
                    >
                        <div
                        className={`h-full transition-all duration-300 shadow-inner ${
                            isUrgent 
                            ? 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse' 
                            : 'bg-gradient-to-r from-red-600 via-orange-500 to-green-500'
                        }`}
                        style={{ width: `${(timer / 60) * 100}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                        {isUrgent ? 'HURRY!' : ''} {timer}s
                        </div>
                    </div>

                    {/* LIMITED TIME Badge - Positioned outside */}
                    <div className="absolute -top-3 -right-0 bg-yellow-400 text-black 
                        text-xs font-bold px-3 py-1 rounded-full shadow-lg z-20">
                        LIMITED TIME
                    </div>
                    </div>

                
                

                {/* Helper text - Made more prominent */}
                <p className="text-white/90 text-sm font-semibold">
                    Takes only <span className="text-purple-400">15 seconds</span>
                </p>

                {/* Extra motivation text */}
                {/* {timer > 10 && (
                    <p className="text-white/60 text-xs px-8">
                        Act fast to secure your bonus XP reward!
                    </p>
                )} */}
            </div>
        );
    };

    const rewardsSection = ()=>{
        return(
            <div className={`space-y-4 transform transition-all duration-500 delay-400 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                

                {/* Rewards Grid */}
                <div className="grid grid-cols-4 gap-3 md:gap-4">
                    {/* HP Reward */}
                    <div className="bg-slate-600/20 border-2 border-red-500/30 rounded-lg p-2 md:p-3 flex flex-col items-center justify-center hover:border-red-500/50 transition-colors overflow-hidden">
                        <div className={`text-red-400 font-bold font-mono break-all text-center leading-tight ${rewards.hp >= 100 ? 'text-base md:text-lg' : 'text-xl md:text-2xl'}`}>
                            +{rewards.hp}
                        </div>
                        <div className="text-white/60 text-xs md:text-sm font-mono mt-1">HP</div>
                    </div>

                    {/* EXP Reward */}
                    <div className="bg-slate-600/20 border-2 border-yellow-500/30 rounded-lg p-2 md:p-3 flex flex-col items-center justify-center hover:border-yellow-500/50 transition-colors overflow-hidden">
                        <div className={`text-yellow-400 font-bold font-mono break-all text-center leading-tight ${rewards.exp >= 100 ? 'text-base md:text-lg' : 'text-xl md:text-2xl'}`}>
                            +{rewards.exp}
                        </div>
                        <div className="text-white/60 text-xs md:text-sm font-mono mt-1">EXP</div>
                    </div>

                    {/* Mana Reward */}
                    <div className="bg-slate-600/20 border-2 border-blue-500/30 rounded-lg p-2 md:p-3 flex flex-col items-center justify-center hover:border-blue-500/50 transition-colors overflow-hidden">
                        <div className={`text-blue-400 font-bold font-mono break-all text-center leading-tight ${rewards.mana >= 100 ? 'text-base md:text-lg' : 'text-xl md:text-2xl'}`}>
                            +{rewards.mana}
                        </div>
                        <div className="text-white/60 text-xs md:text-sm font-mono mt-1">MANA</div>
                    </div>

                    {/* Boss Damage - Enhanced for first-time users */}
                    <div className="relative group flex flex-col text-center bg-slate-600/20 border-2 border-purple-500/30 rounded-lg p-2 md:p-3 items-center justify-center hover:border-purple-500/50 transition-colors cursor-help">
                        {partyProfile?.currentBoss?.isAlive ? (
                            <>
                                <div className={`text-purple-400 font-bold font-mono break-all text-center leading-tight ${parseInt(rewards.bossDamage.replace('+', '')) >= 100 ? 'text-base md:text-lg' : 'text-xl md:text-2xl'}`}>
                                    {rewards.bossDamage}
                                </div>
                                <div className="text-white/60 text-xs md:text-sm font-mono mt-1">DMG</div>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className="text-purple-400 font-bold text-[10px] md:text-xs font-mono leading-tight">
                                    Party Boss
                                </div>
                                <div className="text-purple-400/60 font-bold text-[9px] md:text-xs font-mono leading-tight">
                                    Defeated
                                </div>
                            </div>
                        )}
                        
                        {/* Tooltip for new users - shows for both alive and defeated states */}
                        
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                                        w-48 bg-slate-900 border-2 border-purple-500/50 rounded-lg p-3 
                                        opacity-0 group-hover:opacity-100 transition-opacity z-10
                                        pointer-events-none text-xs text-white/90">
                            <div className="mb-2">
                                {partyProfile?.currentBoss?.isAlive ? (
                                    <>
                                        Damage dealt to your <span className="text-purple-400 font-bold">Party Boss</span>!
                                    </>
                                ) : (
                                    <>
                                        Your <span className="text-purple-400 font-bold">Party Boss</span> has been defeated!
                                    </>
                                )}
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/');
                                }}
                                className="text-purple-400 hover:text-purple-300 underline text-xs pointer-events-auto"
                            >
                                View party →
                            </button>
                            {/* Tooltip arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px]">
                                <div className="border-8 border-transparent border-t-purple-500/50"></div>
                            </div>
                        </div>
                    </div>
                </div>

                    {/* Continue Button */}
                    
            </div>
        )
    }


    // Animate stats appearance
    useEffect(() => {
        setTimeout(() => setShowStats(true), 300);
    }, []);

    // Counter animation for percentage
    useEffect(() => {
        if (showStats && counter < result.percentage) {
            const timer = setTimeout(() => {
                setCounter(prev => Math.min(prev + 2, result.percentage));
            }, 20);
            return () => clearTimeout(timer);
        }
    }, [counter, showStats, result.percentage]);

    return(


        <div className="border-2 border-slate-700 rounded-lg bg-slate-700/20 p-4 mb-3">
            {!showDemoDecks ? 
            (
            <>
                {/* Title - Same for all screens */}
                {!hasNotCreatedADeck ? (
                    <h3 className="text-xl md:text-2xl text-center font-bold text-white/60 font-mono mb-4 md:mb-6">
                        DECK CONQUERED
                    </h3>
                ):(
                    <h3 className="text-xl md:text-2xl text-center font-bold text-white/60 font-mono mb-4 md:mb-6">
                        TUTORIAL BOSS DEFEATED
                    </h3>
                )
                }
               

                {/* Unified Layout - Same structure for mobile and desktop */}
                <div className="space-y-4 max-w-[500px] ml-auto mr-auto">
                    {/* Boss Info - All screens (optional, only if deckData exists) */}
                    


                    {/* Grade + Stats Container - Same layout for all screens */}
                    {!hasNotCreatedADeck && (
                        <div className="flex  flex-col  bg-slate-600/20 border-2 border-slate-500/20 rounded-lg p-4 gap-3">
                            {/* Grade Display */}
                            <div className='flex flex-row gap-3 md:gap-4'>
                                <div className={`flex items-center justify-center text-center transform transition-all duration-500 ${showStats ? 'scale-100' : 'scale-0'}`}>
                                    <div className="inline-block rounded-2xl">
                                        <div className="text-xs md:text-sm text-gray-300 font-mono mb-1 md:mb-2">GRADE</div>
                                        <div className={`text-7xl md:text-9xl font-black ${currentGrade.color} font-mono tracking-tighter leading-none`}>
                                            {result.grade}
                                        </div>
                                        {result.grade === 'S' && (
                                            <div className="text-xs text-cyan-300 font-mono mt-2 animate-pulse">
                                                The Honored One
                                            </div>      
                                        )}
                                    </div>
                                </div>

                                {/* Stats Box */}
                                <div className={`w-full md:p-6 space-y-3 md:space-y-4 transform transition-all duration-500 delay-200 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                    <div className="flex items-center justify-between font-mono">
                                        <span className="text-white/80 text-xs md:text-sm">ACCURACY</span>
                                        <span className={`text-2xl md:text-3xl font-bold ${currentGrade.color}`}>
                                            {counter}%
                                        </span>
                                    </div>
                                    <div className="border-t-2 border-dashed border-slate-500/30"></div>
                                    <div className="flex items-center justify-between font-mono text-xs md:text-sm">
                                        <span className="text-white/80">DEATHS</span>
                                        <span className="text-red-400 font-bold text-lg md:text-xl">{deaths}</span>
                                    </div>
                                    <div className="border-t-2 border-dashed border-slate-500/30"></div>
                                    <div className="flex items-center justify-between font-mono text-xs md:text-sm">
                                        <span className="text-white/80">TOTAL ATTEMPTS</span>
                                        <span className="text-green-400 font-bold text-lg md:text-xl">{currentIndex}</span>
                                    </div>
                                </div>
                            </div>
                                
                            {/* CTA Section - Same for all screens */}
                            {rewardsSection()}
                        
                            {/* Link to Party Boss */}
                            {/* {shouldShowPartyIntro && partyProfile?.currentBoss?.isAlive && (
                            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 text-sm">
                                <div className="flex items-center gap-2 text-purple-300">
                                <span>
                                    <span className="text-purple-400 font-bold">💡 {rewards.bossDamage} DMG </span> 
                                    to party boss  
                                    <button 
                                    onClick={() => navigate('/')}
                                    className="text-purple-400 hover:text-purple-300 underline ml-1"
                                    >
                                    [View →]
                                    </button>
                                </span>
                                </div>
                            </div>
                            )} */}
                        </div>)
                     
                    }
                    

                    {/* Primary CTA - Upload Notes */}


                   

                   

                </div>
            </>
            ) : 
            (
                <>
                    {/*  NEW: Demo Decks Selection Screen */}
                    <div className="space-y-4 max-w-[600px] mx-auto">
                        {/* Header */}
                        <div className="text-center space-y-2">
                        <h3 className="text-2xl md:text-3xl font-bold text-white font-mono">
                            Choose Your Next Challenge
                        </h3>
                        <p className="text-white/60 text-sm md:text-base">
                            Pick a deck and keep the momentum going
                        </p>
                        </div>

                        {/* Demo Decks Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {DEMO_DECKS.map((deck) => (
                            <DemoDeckCard 
                            key={deck.id}
                            deck={deck}
                            onSelect={() => {
                                handleDeckSelect(deck.id)
                                advanceStep('create-deck')
                                }
                            }
                            />
                        ))}
                        </div>

                        {/* Divider */}
                        <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-600"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-slate-800 px-4 text-white/60 text-sm">
                            Or create your own
                            </span>
                        </div>
                        </div>

                        {/* Create Own Deck Option */}
                        {createBossWithAi()}

                        {/* Back Button */}
                        <button
                        onClick={() => setShowDemoDecks(false)}
                        className="w-full text-white/60 hover:text-white py-2 text-sm transition-colors"
                        >
                        ← Back to results
                        </button>
                    </div>

                </>
            )

            }
        </div>
    );
}

export default BattleResult;