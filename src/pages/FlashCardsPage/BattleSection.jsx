

function BattleSection({deckData, knowAnswer, dontKnowAnswer}){

   

    const openModal = () => {
        return;
    }

    return(
        <>
            {/* User Profile */}
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
                    <p className={`text-xs font-medium text-blue-400`}>
                    {deckData?.title}
                    </p>
                </div>
    
                <div className='flex flex-col w-full gap-2'>
                    {/* HP Bar */}
                    <div className="flex items-center">
                    <div className="flex-1 bg-slate-700 h-3 relative overflow-hidden">
                        <div 
                        className="h-full transition-all duration-300 bg-red-500"
                        style={{ width: `${(deckData?.cardCount - knowAnswer)/deckData?.cardCount * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-400 min-w-[60px] text-right">
                        {(deckData?.cardCount - knowAnswer)/deckData?.cardCount * 100}%
                    </p>
                    </div>
    
                    
    
                  
                </div>
                </div>
            </div>
        </>
    )
}


export default BattleSection;