import { useAuthContext } from "../../contexts/AuthContext";
import { useState } from "react";
import { PLAYER_CONFIG, getExpProgressForCurrentLevel } from "../../utils/playerStatsUtils";



function BattleSection({deckData, knowAnswer, dontKnowAnswer}){

    const {partyProfile, partyMembers, user} = useAuthContext();
    const [showModal, setShowModal] = useState(false);
  
  


    const currentUser = user?.uid ? partyMembers[user.uid] : null;
    // Calculate EXP progress for current level
    const expProgress = currentUser 
        ? getExpProgressForCurrentLevel(currentUser.exp, currentUser.level)
        : { percentage: 0 };

    const openModal = () => {
        return;
    }

    return(
        <>
        <div className="w-full h-180 flex bg-slate-800 rounded-t-lg md:rounded-lg p-2 flex items-center justify-between text-slate-100 relative">

            <div className="flex flex-row">
                {/* User Profile */}
                <div className="flex flex-row w-full md:w-96 items-center">
                    {/* Avatar */}
        
                    <div 
                    className="relative cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={openModal}
                    >
                    <div className={`w-28 h-28 border-2 overflow-hidden bg-slate-700 mr-2 border-purple-500/50`}>
                        {
                        currentUser?.avatar ? 
                            <img 
                            src={`/images/avatars/${currentUser?.avatar}.png`}
                            alt={currentUser?.displayName}
                            className="w-full h-full object-cover"
                        /> :
                        ""
                        }
                    </div>
                    </div>
                    
                    <div className='flex flex-col w-full'>
                        {/* User Info */}
                        <div className="text-left">
                            <p className={`text-xs font-medium text-blue-400`}>
                            {currentUser?.displayName}
                            </p>
                            <p className="text-xs text-slate-400">Lv.{currentUser?.level}</p>
                        </div>
            
                        <div className='flex flex-col w-full gap-2'>
                            {/* HP Bar */}
                            <div className="flex items-center">
                                <div className="flex-1 bg-slate-700 h-3 relative overflow-hidden">
                                    <div 
                                    className="h-full transition-all duration-300 bg-red-500"
                                    style={{ width: `${(deckData?.cardCount - dontKnowAnswer) / deckData?.cardCount * 100}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-slate-400 min-w-[60px] text-right">
                                    {Math.round((deckData?.cardCount - dontKnowAnswer) / deckData?.cardCount * 100)}%

                                </p>
                            </div>
            
                         
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center justify-center">
                    <img 
                        src={`/images/icons/VS.png`}
                        alt="VS icon"
                        className="max-w-20 max-h-20 object-cover"
                    />
                </div>
                
                {/* Boss Info */}
                

                {/* Boss */}
                <div className="flex flex-row w-full md:w-96 md:mr-8 items-center">
                    {/* Avatar */}
        
                    <div 
                    className="relative cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={openModal}
                    >
                    <div className={`w-28 h-28 border-2 overflow-hidden bg-slate-700 mr-2 border-purple-500/50`}>
                        {
                        true ? 
                            <img 
                            src={`/images/bosses/${"ancient-scholar"}.png`}
                            alt={deckData?.title}
                            className="w-full h-full object-cover"
                        /> :
                        ""
                        }
                    </div>
                    </div>
                    
                    <div className='flex flex-col w-full'>
                        {/* User Info */}
                        <div className="text-left">
                        <p className="text-xs font-medium text-red-400">
                            {deckData?.title}
                        </p>
                        <p className="text-xs text-slate-400">
                            {deckData?.cardCount} cards
                        </p>
                        </div>

                        {/* HP Bar */}
                        <div className="flex items-center">
                        <div className="flex-1 bg-slate-700 h-3 relative overflow-hidden">
                            <div 
                            className="h-full transition-all duration-300 bg-red-500"
                            style={{ width: `${(deckData?.cardCount - knowAnswer)/deckData?.cardCount * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-slate-400 min-w-[60px] text-right">
                            {Math.round((deckData?.cardCount - knowAnswer) / deckData?.cardCount * 100)}%
                        </p>
                    </div>
                    </div>
                </div>

            </div>
           
        </div>    
        </>
    )
}


export default BattleSection;