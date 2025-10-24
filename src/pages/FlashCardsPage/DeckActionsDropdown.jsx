import { Ellipsis } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function DeckActionsDropdown({ 
    deckId, 
    deckData, 
    flashCards, 
    user,
    isMuted,       
    onToggleMute  
}) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const isOwner = deckData?.ownerId === user?.uid;

    const toggleDropdown = useCallback((event) => {
        event.stopPropagation();
        setIsDropdownOpen(prev => !prev);
    }, []);

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

    const handleEditFlashCard = () => {
        navigate(`/edit-deck/${deckId}`, {
            state: {
                deckData: deckData,
                flashCards: flashCards,
                fromCache: true
            }
        });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                className="bg-slate-800 text-white px-4 py-2 rounded-full font-semibold hover:bg-slate-600 transition-all transform hover:scale-105 shadow-sm"
            >
                <Ellipsis />
            </button>

            <div className={`${isDropdownOpen ? 'block' : 'hidden'} absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5`}>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        if (!isOwner) return;
                        handleEditFlashCard();
                    }}
                    disabled={!isOwner}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        isOwner
                        ? "text-slate-200 hover:bg-gray-700"
                        : "text-gray-500 cursor-not-allowed opacity-50"
                    }`}
                >
                    Edit Deck
                </button>

                {/* Divider */}
                <div className="border-t border-gray-700 my-1"></div>

                {/* 🆕 Sound toggle */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onToggleMute(); // 🆕 Call parent handler
                        
                        // 🆕 Optional: Play confirmation sound when unmuting
                        if (isMuted) {
                            const confirmSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
                            confirmSound.volume = 0.3;
                            confirmSound.play().catch(() => {});
                        }
                    }}
                    className="block w-full text-left px-4 py-2 text-sm transition-colors text-slate-200 hover:bg-gray-700"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span>Sound Effects</span>
                        </div>
                        <span className={`text-xs font-medium ${
                            isMuted ? 'text-red-400' : 'text-green-400'
                        }`}>
                            {isMuted ? 'OFF' : 'ON'}
                        </span>
                    </div>
                </button>
            </div>
        </div>
    );
}

export default DeckActionsDropdown;