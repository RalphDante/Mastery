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
import Boss from "../HomePage/Boss/Boss";

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
            {/* <div className="bg-slate-700/20 border border-gray-800 rounded-2xl p-3 h-fit"
             onClick={openModal}
             >
                <div className="flex flex-row lg:flex-col gap-2">

                    

                

                    
                    
                    
                    {children}
                </div>
            </div> */}

            <Boss
                collapsible={true}
            />



            

        {/* </div>     */}
        </>
    )
}


export default BattleSection;