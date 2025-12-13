import { useAuthContext } from "../../contexts/AuthContext";
import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { usePartyContext } from "../../contexts/PartyContext";
import { 
    PLAYER_CONFIG, 
    getExpProgressForCurrentLevel, 
    getLevelFromTotalExp 
} from "../../utils/playerStatsUtils";
import AvatarWithPlatform from "../../components/AvatarWithPlatform";

function BattleSection({deckData, knowAnswer, dontKnowAnswer, deaths, setDeaths, cardCount, children, deckId, currentUser}){

    const sessionBaselineRef = useRef(null);
    const lastDeckIdRef = useRef(null);
    const [showModal, setShowModal] = useState(false);
    const doubledCardCount = cardCount * (1 + deaths);
    // Calculate how many wrong answers within current "life"
    const wrongAnswersInCurrentLife = dontKnowAnswer % cardCount;
    const playerHealth = Math.round((cardCount - wrongAnswersInCurrentLife) / cardCount * 100);
    const openModal = ()=>{
        setShowModal(true);
    }

    const closeModal = ()=>{
        setShowModal(false);
    }
  
    
    // Calculate EXP progress for current level

 
   
     useEffect(() => {
        if (currentUser && !sessionBaselineRef.current) {
            sessionBaselineRef.current = {
                exp: currentUser.exp,
                health: currentUser.health,
                mana: currentUser.mana,
                level: currentUser.level
            };
            console.log('📊 Session baseline initialized for deck:', deckId, sessionBaselineRef.current);
        }
    }, [currentUser, deckId]);
 

    const dynamicStats = useMemo(() => {
        if (!currentUser) {
            return {
                exp: 0,
                level: 1,
                health: 100,
                mana: 100,
                expProgress: { percentage: 0, current: 0, required: 100 }
            };
        }

        const baseline = sessionBaselineRef.current || {
            exp: currentUser.exp,
            health: currentUser.health,
            mana: currentUser.mana,
            level: currentUser.level
        };

        const expPerCorrect = PLAYER_CONFIG.FLASHCARD_REWARDS.CORRECT.exp;
        const expPerIncorrect = PLAYER_CONFIG.FLASHCARD_REWARDS.INCORRECT.exp;
        const manaPerCorrect = PLAYER_CONFIG.FLASHCARD_REWARDS.CORRECT.mana;
        const manaPerIncorrect = PLAYER_CONFIG.FLASHCARD_REWARDS.INCORRECT.mana;
        const healthPerCorrect = PLAYER_CONFIG.FLASHCARD_REWARDS.CORRECT.health;

        const sessionExpGained = (knowAnswer * expPerCorrect) + (dontKnowAnswer * expPerIncorrect);
        const sessionManaGained = (knowAnswer * manaPerCorrect) + (dontKnowAnswer * manaPerIncorrect);
        const sessionHealthGained = (knowAnswer * healthPerCorrect);

        // ✅ Use `baseline` instead of `sessionBaselineRef.current`
        const accumulatedExp = baseline.exp + sessionExpGained;
        const currentMana = Math.min(PLAYER_CONFIG.BASE_MANA, baseline.mana + sessionManaGained);
        const currentHealth = Math.min(PLAYER_CONFIG.BASE_HEALTH, baseline.health + sessionHealthGained);

        const dynamicLevel = getLevelFromTotalExp(accumulatedExp);
        const expProgress = getExpProgressForCurrentLevel(accumulatedExp, dynamicLevel);

        return {
            exp: accumulatedExp,
            level: dynamicLevel,
            health: currentHealth,
            mana: currentMana,
            expProgress
        };
    }, [currentUser, knowAnswer, dontKnowAnswer, cardCount]);

    useEffect(() => {
        // When player reaches cardCount wrong answers, increment death counter
        const expectedDeaths = Math.floor(dontKnowAnswer / cardCount);
        if (expectedDeaths !== deaths) {
            setDeaths(expectedDeaths);
            console.log("deaths: ", expectedDeaths);
        }
    }, [dontKnowAnswer, cardCount]);




    return(
        <>
        {/* <div className="w-full h-180 flex bg-slate-800 rounded-t-lg md:rounded-lg p-2 flex items-center justify-between text-slate-100 relative"> */}
            <div className="bg-slate-700/20 border border-gray-800 rounded-2xl p-3 h-fit"
             onClick={openModal}
             >
            <div className="flex flex-row lg:flex-col gap-2">

                {/* Boss */}
                <div className="flex flex-row flex-1 items-center min-w-0"> {/* ← Added flex-1 and min-w-0 */}
                    {/* Avatar hidden sm: */}
                    <div 
                        className="relative cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                    >
                        {Math.round((cardCount - knowAnswer)/cardCount * 100) === 0 ? 
                            <div className="relative">
                                <div className="w-28 h-28 mr-2 rounded-lg bg-slate-900 border-2 border-slate-700 overflow-hidden opacity-60">
                                    <img 
                                        src={`/images/bosses/${"ancient-scholar"}.png`} 
                                        alt={deckData?.title}
                                        className="w-full h-full object-cover grayscale"
                                    />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-4xl rotate-12">❌</span>
                                </div>
                            </div>
                            :
                            <div className={`w-28 h-28 border-2 rounded-lg overflow-hidden bg-slate-700 mr-2 border-red-700/50`}>
                                <img 
                                    src={`/images/bosses/${"ancient-scholar"}.png`}
                                    alt={deckData?.title}
                                    className="w-full h-full object-cover"
                                /> 
                            </div>
                        }
                    </div>

                    <div className='flex flex-col w-full min-w-0'> {/* ← Added min-w-0 */}
                        {/* Boss Info */}
                        <div className="text-left">
                            <p className="text-xl font-medium text-red-400 truncate">
                                {deckData?.title}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                                {deckData?.description}
                            </p>
                        </div>

                        {/* HP Bar */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-700 h-3 relative overflow-hidden">
                                <div 
                                    className="h-full transition-all duration-300 bg-red-500"
                                    style={{ width: `${Math.round((cardCount - knowAnswer)/cardCount * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-slate-400 min-w-[45px] text-right">
                                {Math.round((cardCount - knowAnswer) / cardCount * 100)}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* VS ICON */}
                <div className="hidden sm:flex items-center justify-center flex-shrink-0">
                    <img 
                        src={`/images/icons/VS.png`}
                        alt="VS icon"
                        className="w-16 h-16 object-cover"
                    />
                </div>

                {/* Mobile view - NEW: Show only player stats */}
                <div className="hidden sm:flex flex-col flex-1 rounded-2xl h-fit" onClick={openModal}>
                    <div className="flex flex-row items-center gap-3">
                    {/* Avatar */}
                    <AvatarWithPlatform 
                        avatar={currentUser?.avatar}
                        displayName={currentUser?.displayName}
                        tier={currentUser?.tier}
                        streak={currentUser?.streak}
                        size="small"
                        onClick={openModal}
                    />
                    {/* Stats */}
                    <div className="flex-1 min-w-0">
                        <div className="mb-2">
                            <p className="text-sm font-medium text-blue-400 truncate">
                                {currentUser?.displayName}
                            </p>
                            <p className="text-xs text-slate-400">Level {dynamicStats.level}</p>
                        </div>

                        {/* HP Bar */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] text-red-400 font-medium w-6">HP</span>
                            <div className="flex-1 bg-slate-900 h-2.5 relative overflow-hidden rounded-full">
                                <div 
                                    className="h-full transition-all duration-300 bg-gradient-to-r from-red-600 to-red-400"
                                    style={{ width: `${(playerHealth / PLAYER_CONFIG.BASE_HEALTH) * 100}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-slate-300 min-w-[45px] text-right">
                                {playerHealth}/{PLAYER_CONFIG.BASE_HEALTH}
                            </span>
                        </div>

                        {/* EXP Bar */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] text-yellow-400 font-medium w-6">XP</span>
                            <div className="flex-1 bg-slate-900 h-2.5 relative overflow-hidden rounded-full">
                                <div 
                                    className="h-full transition-all duration-300 bg-gradient-to-r from-yellow-600 to-yellow-400"
                                    style={{ width: `${Math.min(100, dynamicStats.expProgress.percentage)}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-slate-300 min-w-[45px] text-right">
                                {Math.floor(dynamicStats.expProgress.current)}/{dynamicStats.expProgress.required}
                            </span>
                        </div>

                        {/* Mana Bar */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-blue-400 font-medium w-6">MP</span>
                            <div className="flex-1 bg-slate-900 h-2.5 relative overflow-hidden rounded-full">
                                <div 
                                    className="h-full transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-400"
                                    style={{ width: `${(dynamicStats.mana / PLAYER_CONFIG.BASE_MANA) * 100}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-slate-300 min-w-[45px] text-right">
                                {Math.floor(dynamicStats.mana)}/{PLAYER_CONFIG.BASE_MANA}
                            </span>
                        </div>
                    </div>
                    </div>
                    
                    {/* Quick stats */}
                    {/* <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-around text-center">
                    <div>
                        <p className="text-[10px] text-slate-400">Correct</p>
                        <p className="text-sm font-bold text-emerald-400">{knowAnswer}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400">Wrong</p>
                        <p className="text-sm font-bold text-red-400">{dontKnowAnswer}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400">Deaths</p>
                        <p className="text-sm font-bold text-purple-400">{deaths}</p>
                    </div>
                    </div> */}
                </div>

                
                
                {children}
            </div>
            </div>



            {showModal && createPortal( 
                <div 
                className="sm:hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
                onClick={closeModal}
                >
                    <div className="bg-slate-800 w-full border border-gray-800 rounded-2xl p-3 h-fit">
                        
                        
                        <div className="flex flex-col">
                            {/* Header */}
                            <div className="sticky top-0 bg-slate-800 border-b mb-2 border-slate-700 p-4 z-10 flex items-center justify-end">
                                <button
                                onClick={closeModal}
                                className="text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                <X size={24} />
                                </button>
                            </div>
                            {/* Boss Info */}
                            

                            {/* Boss */}
                            <div className="flex flex-row w-full items-center">
                                {/* Avatar */}
                    
                                <div 
                                className="relative cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={openModal}
                                >
                                    {Math.round((cardCount - knowAnswer)/cardCount * 100) === 0 ? 
                                        <div className="relative">
                                            <div className="w-28 h-28 mr-2 rounded-lg bg-slate-900 border-2 border-slate-700 overflow-hidden opacity-60">
                                            <img 
                                                src={`/images/bosses/${"ancient-scholar"}.png`} 
                                                alt={deckData?.title}
                                                className="w-full h-full object-cover grayscale"
                                            />
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-4xl rotate-12">❌</span>
                                            </div>
                                        </div>
                                
                                        :
                                        <div className={`w-28 h-28 border-2 rounded-lg overflow-hidden bg-slate-700 mr-2 border-red-700/50`}>
                                        
                                            <img 
                                            src={`/images/bosses/${"ancient-scholar"}.png`}
                                            alt={deckData?.title}
                                            className="w-full h-full object-cover"
                                            /> 
                                        </div>
                                    }

                                    
                                </div>

                            
                                <div className='flex flex-col w-full'>
                                    {/* Boss Info */}
                                    <div className="text-left">
                                    <p className="text-xl font-medium text-red-400">
                                        {deckData?.title}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {deckData?.description}
                                    </p>
                                    </div>

                                    {/* HP Bar */}
                                    <div className="flex items-center">
                                    <div className="flex-1 bg-slate-700 h-3 relative overflow-hidden">
                                        <div 
                                        className="h-full transition-all duration-300 bg-red-500"
                                        style={{ width: `${Math.round((cardCount - knowAnswer)/cardCount * 100)}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-slate-400 min-w-[60px] text-right">
                                        {Math.round((cardCount - knowAnswer) / cardCount * 100)}%
                                    </p>
                                </div>
                                </div>
                            </div>
                            

                            {/* VS ICON */}
                            <div className="flex items-center justify-center">
                                <img 
                                    src={`/images/icons/VS.png`}
                                    alt="VS icon"
                                    className="max-w-20 max-h-20 object-cover"
                                />
                            </div>
                            

                            {/* User Profile */}
                            <div className="flex flex-row w-full items-center">
                                {/* Avatar */}
                                <AvatarWithPlatform 
                                    avatar={currentUser?.avatar}
                                    displayName={currentUser?.displayName}
                                    tier={currentUser?.tier}
                                    streak={currentUser?.streak}
                                    size="small"
                                    onClick={openModal}
                                />
                                <div className='flex flex-col w-full'>
                                    {/* User Info */}
                                    <div className="text-left">
                                        <p className={`text-xs font-medium text-blue-400`}>
                                        {currentUser?.displayName} (You)
                                        </p>
                                        <p className="text-xs text-slate-400">Lv.{dynamicStats.level}</p>
                                    </div>
                        
                                    <div className='flex flex-col w-full gap-2'>
                                        {/* HP Bar */}
                                        <div className="flex items-center">
                                            <div className="flex-1 bg-slate-700 h-3 relative overflow-hidden">
                                                <div 
                                                className="h-full transition-all duration-300 bg-red-500"
                                                style={{ width: `${(playerHealth/ PLAYER_CONFIG.BASE_HEALTH) * 100}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-slate-400 min-w-[60px] text-right">
                                                {playerHealth}/{PLAYER_CONFIG.BASE_HEALTH}
                                            </p>
                                        </div>    
                                    </div>
                                </div>
                            </div>
                            
                           <div className="space-y-4">
                            {/* {deckData?.cardCount && (
                                <div className="flex justify-between items-center py-3 border-b border-gray-700">
                                    <span className="text-gray-400">Total Cards:</span>
                                    <span className="font-bold text-lg text-blue-400">{deckData.cardCount}</span>
                                </div>
                            )} */}

                            <div className="flex justify-between items-center py-3 border-b border-gray-700">
                                <span className="text-gray-400">Correct:</span>
                                <span className="font-bold text-lg text-emerald-400">{knowAnswer}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 ">
                                <span className="text-gray-400">Wrong:</span>
                                <span className="font-bold text-lg text-red-400">{dontKnowAnswer}</span>
                            </div>
                            {/* <div className="flex justify-between items-center py-3 border-b border-gray-700">
                                <span className="text-gray-400">Accuracy:</span>
                                <span className="font-bold text-lg text-violet-400">{percent}%</span>
                            </div> */}
                        </div>

                        </div>
                    </div>
                </div>
                
                ,document.body
            )}

        {/* </div>     */}
        </>
    )
}


export default BattleSection;