import { useAuthContext } from "../../contexts/AuthContext";
import { useCallback, useState, useEffect } from "react";
import { PLAYER_CONFIG, getExpProgressForCurrentLevel } from "../../utils/playerStatsUtils";
import { createPortal } from "react-dom";
import { X } from "lucide-react";


function BattleSection({deckData, knowAnswer, dontKnowAnswer, deaths, setDeaths, cardCount, children}){

    const {partyProfile, partyMembers, user} = useAuthContext();
    const [showModal, setShowModal] = useState(false);
    const doubledCardCount = cardCount * (1 + deaths);
    const playerHealth = Math.round((doubledCardCount - dontKnowAnswer) / cardCount * 100);

    const openModal = ()=>{
        setShowModal(true);
    }

    const closeModal = ()=>{
        setShowModal(false);
    }


    useEffect(() => {
        if (dontKnowAnswer >= doubledCardCount) {
            setDeaths(prev => prev + 1);
            console.log("deaths: ", deaths + 1)
        } 
        if(dontKnowAnswer === 0){
            setDeaths(0)
        }
    }, [dontKnowAnswer]);
    


    const currentUser = user?.uid ? partyMembers[user.uid] : null;
    // Calculate EXP progress for current level
    const expProgress = currentUser 
        ? getExpProgressForCurrentLevel(currentUser.exp, currentUser.level)
        : { percentage: 0 };

    

    return(
        <>
        {/* <div className="w-full h-180 flex bg-slate-800 rounded-t-lg md:rounded-lg p-2 flex items-center justify-between text-slate-100 relative"> */}
            <div className="bg-slate-700/20 border border-gray-800 rounded-2xl p-3 h-fit"
             onClick={openModal}
             >
            <div className="flex flex-row lg:flex-col gap-2">

                {/* Boss */}
                <div className="flex flex-row flex-1 items-center min-w-0"> {/* ← Added flex-1 and min-w-0 */}
                    {/* Avatar */}
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

                {/* User Profile */}
                <div className="hidden sm:flex flex-row flex-1 items-center min-w-0"> {/* ← Added flex-1 and min-w-0 */}
                    {/* Avatar */}
                    <div 
                        className="relative cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                        onClick={openModal}
                    >
                        <div className={`w-20 h-20 border-2 rounded-lg overflow-hidden bg-slate-700 mr-2 border-purple-500/50`}>
                            {
                                currentUser?.avatar ? currentUser.avatar === "knight-idle" ?
                                (<div className="knight-idle" style={{ 
                                    transform: 'scale(2.5)', 
                                    imageRendering: 'pixelated',
                                    position: 'relative',
                                    top: '0px',      // Move down
                                    left: '-13px'       // Move right
                                }}></div>)
                                : <img 
                                src={`/images/avatars/${currentUser.avatar}.png`}
                                alt={currentUser?.displayName}
                                className="w-full h-full p-2 object-cover"
                                
                                /> :
                                ""
                            }
                        </div>
                    </div>
                    
                    <div className='flex flex-col w-full min-w-0'> {/* ← Added min-w-0 */}
                        {/* User Info */}
                        <div className="text-left">
                            <p className={`text-xs font-medium text-blue-400 truncate`}>
                                {currentUser?.displayName} (You)
                            </p>
                            <p className="text-xs text-slate-400">Lv.{currentUser?.level}</p>
                        </div>

                        <div className='flex flex-col w-full'>
                            {/* HP Bar */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-700 h-3 relative overflow-hidden">
                                    <div 
                                        className="h-full transition-all duration-300 bg-red-500"
                                        style={{ width: `${playerHealth}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-slate-400 min-w-[45px] text-right">
                                    {playerHealth}%
                                </p>
                            </div>    
                        </div>
                    </div>
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
                    
                                <div 
                                className="relative cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={openModal}
                                >
                                <div className={`w-20 h-20 border-2 rounded-lg overflow-hidden bg-slate-700 mr-2 border-purple-500/50`}>
                                    {
                                        currentUser?.avatar ? currentUser.avatar === "knight-idle" ?
                                        (<div className="knight-idle" style={{ 
                                            transform: 'scale(2.5)', 
                                            imageRendering: 'pixelated',
                                            position: 'relative',
                                            top: '0px',      // Move down
                                            left: '-13px'       // Move right
                                        }}></div>)
                                        : <img 
                                        src={`/images/avatars/${currentUser.avatar}.png`}
                                        alt={currentUser?.displayName}
                                        className="w-full h-full p-2 object-cover"
                                        
                                        /> :
                                        ""
                                    }
                                </div>
                                </div>
                                
                                <div className='flex flex-col w-full'>
                                    {/* User Info */}
                                    <div className="text-left">
                                        <p className={`text-xs font-medium text-blue-400`}>
                                        {currentUser?.displayName} (You)
                                        </p>
                                        <p className="text-xs text-slate-400">Lv.{currentUser?.level}</p>
                                    </div>
                        
                                    <div className='flex flex-col w-full gap-2'>
                                        {/* HP Bar */}
                                        <div className="flex items-center">
                                            <div className="flex-1 bg-slate-700 h-3 relative overflow-hidden">
                                                <div 
                                                className="h-full transition-all duration-300 bg-red-500"
                                                style={{ width: `${playerHealth}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-slate-400 min-w-[60px] text-right">
                                                {playerHealth}%

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