import { useState, useEffect } from 'react';
import { useTutorials } from '../../contexts/TutorialContext';
import { useNavigate } from 'react-router-dom';
import { usePartyContext } from '../../contexts/PartyContext';
import { useAuthContext } from '../../contexts/AuthContext';

function BattleResult({currentIndex, result, deaths, onCreateWithAIModalClick, deckData, knowAnswer, dontKnowAnswer}){
    const [showStats, setShowStats] = useState(false);
    const [counter, setCounter] = useState(0);
    const {partyMembers, partyProfile} = usePartyContext();
    const {user} = useAuthContext();

    const currentUser = user?.uid ? partyMembers[user.uid] : null;

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

    const {isInTutorial} = useTutorials()
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

    const createBossWithAi = ()=>{
        return(
            <div className={`space-y-4 transform transition-all duration-500 delay-400 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                {/* Celebration Header */}
                <div className="text-center space-y-2">
                    <div className="space-y-1">
                        <p className="text-white font-bold text-base md:text-lg">
                            Design <span className='text-green-400'>YOUR</span> Boss in 30 seconds
                        </p>
                    </div>
                </div>

                {/* Primary CTA - Upload Notes */}
                <button
                    onClick={()=>onCreateWithAIModalClick("First Folder")}
                    className="w-full bg-purple-600
                             hover:bg-purple-700
                             text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-xl 
                             transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50
                             flex items-center justify-center gap-2 md:gap-3
                             border-2 border-purple-400/30"
                >
                    <span className="text-xl md:text-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className='w-8 h-8 md:w-10 md:h-10 text-yellow-400' viewBox="0 0 24 24"><path fill="currentColor" d="M5 10H4V8h1V7h1V6h1V5h1V4h1V3h1V2h1V1h2v1h1v1h1v1h1v1h1v1h1v1h1v1h1v2h-1v1h-2v-1h-1V9h-1V8h-1v9h-4V8H9v1H8v1H7v1H5zM2 20h20v3H2z"/></svg>
                    </span>
                    <div className="text-left">
                        <div className="text-base md:text-lg">Upload My Notes</div>
                        <div className="text-xs text-white/70 font-normal">
                            Create flashcards in 30 seconds
                        </div>
                    </div>   
                </button>

                {/* Secondary - Skip */}
                <button
                    onClick={() => navigate('/')}
                    className="w-full text-white/40 hover:text-white/60 
                             text-xs md:text-sm transition-colors py-2"
                >
                    I'll do this later →
                </button>
            </div>
        )
    }

    const rewardsSection = ()=>{
        return(
            <div className={`space-y-4 transform transition-all duration-500 delay-400 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                

                {/* Rewards Grid */}
                <div className="grid grid-cols-4 gap-3 md:gap-4">
                    {/* HP Reward */}
                    <div className="bg-slate-600/20 border-2 border-red-500/30 rounded-lg p-3 md:p-4 text-center hover:border-red-500/50 transition-colors">
                        <div className="text-red-400 font-bold text-xl md:text-2xl font-mono">+{rewards.hp}</div>
                        <div className="text-white/60 text-xs md:text-sm font-mono">HP</div>
                    </div>

                    {/* EXP Reward */}
                    <div className="bg-slate-600/20 border-2 border-yellow-500/30 rounded-lg p-3 md:p-4 text-center hover:border-yellow-500/50 transition-colors">
                        <div className="text-yellow-400 font-bold text-xl md:text-2xl font-mono">+{rewards.exp}</div>
                        <div className="text-white/60 text-xs md:text-sm font-mono">EXP</div>
                    </div>

                    {/* Mana Reward */}
                    <div className="bg-slate-600/20 border-2 border-blue-500/30 rounded-lg p-3 md:p-4 text-center hover:border-blue-500/50 transition-colors">
                        <div className="text-blue-400 font-bold text-xl md:text-2xl font-mono">+{rewards.mana}</div>
                        <div className="text-white/60 text-xs md:text-sm font-mono">MANA</div>
                    </div>

                    {/* Boss Damage */}
                    <div className="flex flex-col text-center bg-slate-600/20 border-2 border-purple-500/30 rounded-lg p-2 md:p-3 items-center justify-center hover:border-purple-500/50 transition-colors">
                        {partyProfile?.currentBoss?.isAlive ?
                            (
                                <>
                                    <div className="text-purple-400 font-bold text-xl md:text-2xl font-mono">{rewards.bossDamage}</div>
                                    <div className="text-white/60 text-xs md:text-sm font-mono">DMG</div>
                                </>
                            ) : (
                                <div className="text-center">
                                    <div className="text-purple-400 font-bold text-[10px] md:text-xs font-mono leading-tight">Party Boss</div>
                                    <div className="text-purple-400/60 font-bold text-[9px] md:text-xs font-mono leading-tight">Defeated</div>
                                </div>
                            )
                        }
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
            {/* Title - Same for all screens */}
            <h3 className="text-xl md:text-2xl text-center font-bold text-white/60 font-mono mb-4 md:mb-6">
                DECK CONQUERED
            </h3>

            {/* Unified Layout - Same structure for mobile and desktop */}
            <div className="space-y-4 max-w-[500px] ml-auto mr-auto md:space-y-6">
                {/* Boss Info - All screens (optional, only if deckData exists) */}
                {deckData && (
                    <div className={`lg:hidden flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg transform transition-all duration-500 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                        <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center relative">
                            <span className="text-3xl">👾</span>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-red-500 text-4xl font-bold">✕</span>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold truncate text-sm">
                                {deckData.title || "Math Boss - Tutorial"}
                            </h3>
                            <p className="text-white/60 text-xs">
                                {deckData.description || "Your first boss battle!"}
                            </p>
                        </div>
                    </div>
                )}

                {hasNotCreatedADeck ? createBossWithAi() : ""}

                {/* Grade + Stats Container - Same layout for all screens */}
                <div className="flex  flex-row  bg-slate-600/20 border-2 border-slate-500/20 rounded-lg p-4 gap-3 md:gap-4">
                    {/* Grade Display */}
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


            </div>
        </div>
    );
}

export default BattleResult;