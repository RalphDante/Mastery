import { useCallback, useEffect, useRef, useState } from "react";
import { useTutorials } from "../../contexts/TutorialContext";
import TutorialOverlay from "../tutorials/TutorialOverlay";
import { Wand2 } from 'lucide-react'

function CreateActionsDropdown({ onCreateFolderClick, onCreateDeckClick, onCreateWithAIModalClick }) {

    const { isTutorialAtStep, advanceStep, completeTutorial, isInTutorial } = useTutorials();
    const isCreateDeckNotCompleted = isInTutorial('create-deck');
    const isAtCreateDeckFirstStep = isTutorialAtStep('create-deck', 1);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Handle dropdown toggle
    const toggleDropdown = useCallback((event) => {
        event.stopPropagation();
        setIsDropdownOpen(prev => !prev);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // Handle clicks on dropdown items
    const handleItemClick = (callback, event) => {
        event.preventDefault();
        setIsDropdownOpen(false);
        if (callback) {
            callback(event);
        }
        // advanceStep('create-deck')
    };

    return (
        <>
        {/* <TutorialOverlay isVisible={isCreateDeckNotCompleted && isAtCreateDeckFirstStep}>
            <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full p-6 text-white ring-2 ring-emerald-500/40 animate-in fade-in duration-300">
    
                <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl animate-pulse">✨</div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
                    Let’s create your first deck
                </h2>
                </div>

                <p className="text-sm text-white/80 leading-relaxed">
                Start building your knowledge one card at a time. Don’t worry — you can always edit or improve it later.
                </p>
            </div>
        </TutorialOverlay> */}
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={toggleDropdown} 
                className={`bg-violet-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-violet-700 transition-all transform hover:scale-105 shadow-sm
              
                `}
            >
                Create
            </button>
            
            <div className={`${isDropdownOpen ? 'block' : 'hidden'} absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5`}>
                <a 
                    href="#" 
                    onClick={(e) => {
                        if (isCreateDeckNotCompleted) {
                        e.preventDefault();
                        return;
                        }
                        handleItemClick(onCreateFolderClick, e);
                    }}
                    className={`block px-4 py-2 text-sm text-slate-200 hover:bg-gray-700 transition-colors ${isCreateDeckNotCompleted ? 'opacity-50' : ''}`}
                >
                    Create New Folder
                </a>
                <a 
                    href="#" 
                    onClick={(e) => handleItemClick(onCreateDeckClick, e)} 
                    className="block px-4 py-2 text-sm text-slate-200 hover:bg-gray-700 transition-colors"
                >
                    Create Deck Manually
                </a>
                <a 
                    href="#" 
                    onClick={(e) => handleItemClick(onCreateWithAIModalClick, e)} 
                    className="flex px-4 py-2 text-sm text-slate-200 hover:bg-gray-700 transition-colors"
                >
                    Create Deck with AI
                </a>
            </div>
        </div>
        </>
        
    );
}

export default CreateActionsDropdown;