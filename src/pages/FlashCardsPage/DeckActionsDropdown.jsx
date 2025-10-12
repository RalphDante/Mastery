import { Ellipsis } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function DeckActionsDropdown({ deckId, deckData, flashCards }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

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

    const handleEditFlashCard = () => {
        // Pass the already-loaded data to avoid re-fetching
        navigate(`/edit-deck/${deckId}`, {
            state: {
                deckData: deckData,
                flashCards: flashCards,
                fromCache: true // Flag to indicate we're using cached data
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
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        handleEditFlashCard();
                    }}
                    className="block px-4 py-2 text-sm text-slate-200 hover:bg-gray-700 transition-colors"
                >
                    Edit Deck
                </a>
            </div>
        </div>
    );
}

export default DeckActionsDropdown;