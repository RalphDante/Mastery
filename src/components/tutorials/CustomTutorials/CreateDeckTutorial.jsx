import { useEffect, useState } from "react";
import { useTutorials } from "../../../contexts/TutorialContext";
import TutorialOverlay from "../TutorialOverlay";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "../../../contexts/AuthContext";
import CreateActionsDropdown from "../../CreateActionsDropdown/CreateActionsDropdown";

function CreateDeckTutorial({isFolderModalOpen, isDeckModalOpen, isCreateWithAIModalOpen, onCreateDeckClick, onCreateWithAIModalClick}){
    const {user} = useAuthContext()
    const location = useLocation();

    const [showTutorial, setShowTutorial] = useState(false);



    useEffect(() => {


        // Special case for root path - show navbar only if user is authenticated
        if (location.pathname === '/') {
            setShowTutorial(true);
        } else if (
            location.pathname === '/signup' || 
            location.pathname === "/createfile" || 
            location.pathname === '/signin' || 
            location.pathname === '/try-now' || 
            location.pathname === '/pricing' || 
            location.pathname === '/newhome' || 
            location.pathname === '/newflashcardui' || 
            location.pathname === '/flashcards-demo' || 
            location.pathname === '/browse-decks' || 
            location.pathname.startsWith('/flashcards') ||
            location.pathname.startsWith('/create-deck') ||
            location.pathname.startsWith('/blog')

        ) {
            setShowTutorial(false);
        } else {
            setShowTutorial(true);
        }
    }, [location, user]);

    // Tutorials
    const { isTutorialAtStep, advanceStep, completeTutorial, isInTutorial } = useTutorials();
    const isCreateDeckNotCompleted = isInTutorial('create-deck');
    const isAtCreateDeckFirstStep = isTutorialAtStep('create-deck', 1);

    const handleItemClick = (callback, event) => {
        event.preventDefault();
        if (callback) {
            callback(event);
        }
        // advanceStep('create-deck')
    };
  
    return(
        <>
            {!(isFolderModalOpen || isDeckModalOpen || isCreateWithAIModalOpen) && showTutorial ? 
                <TutorialOverlay isVisible={isCreateDeckNotCompleted && isAtCreateDeckFirstStep}>
    <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full p-6 text-white ring-2 ring-emerald-500/40 animate-in fade-in duration-300">

        <div className="flex items-center gap-8 mb-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
                Let's create your first deck
            </h2>
        </div>

        <p className="text-sm text-white/80 leading-relaxed mb-6">
            Start remembering one card at a time. Don't worry — you can always edit or improve it later.
        </p>

        <div className="flex gap-3 mt-6">
        <button 
            onClick={(e) => handleItemClick(onCreateDeckClick, e)}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105"
        >
            Create Manually
        </button>
        <button 
            onClick={(e) => handleItemClick(onCreateWithAIModalClick, e)}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105"
        >
            Upload Material
        </button>
        </div>
    </div>
</TutorialOverlay> : ""
              }
        </>
    )
}

export default CreateDeckTutorial;