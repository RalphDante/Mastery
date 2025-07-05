import { useCallback, useEffect, useRef, useState } from "react";


function CreateActionsDropdown({ onCreateFolderClick, onCreateDeckClick, onGenerateAIClick }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null); // Ref for the dropdown container

    // Handle dropdown toggle
    const toggleDropdown = useCallback((event) => {
        event.stopPropagation(); // Prevent document click from immediately closing
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
        setIsDropdownOpen(false); // Close dropdown
        if (callback) {
            callback(event); // Call the specific action callback
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={toggleDropdown} className="bg-violet-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-violet-700 transition-all transform hover:scale-105 shadow-sm">
                Create
            </button>
            <div className={`${isDropdownOpen ? 'block' : 'hidden'} absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5`}>
                <a href="#" onClick={(e) => handleItemClick(onCreateFolderClick, e)} className="block px-4 py-2 text-sm text-slate-200 hover:bg-gray-700">Create New Folder</a>
                <a href="#" onClick={(e) => handleItemClick(onCreateDeckClick, e)} className="block px-4 py-2 text-sm text-slate-200 hover:bg-gray-700">Create New Deck</a>
                <a href="#" onClick={(e) => handleItemClick(onGenerateAIClick, e)} className="block px-4 py-2 text-sm text-slate-200 hover:bg-gray-700">Create with AI</a>
            </div>
        </div>
    );
}

export default CreateActionsDropdown;