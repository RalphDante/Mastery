import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../api/firebase';
import SignUpBtn from '../../pages/TryNowPage/LandingPage/SignUpBtn';
import { useNavigate } from 'react-router-dom';

// Reusable component for the Create dropdown button
function CreateActionsDropdown({ onCreateFolderClick, onCreateDeckClick, onGenerateAIClick }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

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

    const handleItemClick = (callback, event) => {
        setIsDropdownOpen(false);
        if (callback) {
            callback(event);
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

// NavBar component
function NavBar({ onCreateFolderClick, onCreateDeckClick, onGenerateAIClick, onSignOutClick }) {

    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [userName, setUserName] = useState("Loading...");

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const profileData = userDocSnap.data();
                        setUserName(profileData.displayName || profileData.email);
                    } else {
                        console.log("User profile not found in Firestore for NavBar. Displaying 'Guest'.");
                        setUserName("Guest");
                    }
                } catch (error) {
                    console.error("Error fetching user profile for NavBar:", error);
                    setUserName("Error");
                }
            } else {
                setUserName("Guest");
            }
        });
        return () => unsubscribeAuth();
    }, []);

    return (
        <header className="bg-gray-900/80 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-gray-700">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-8">
                        <a href="#" className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 text-transparent bg-clip-text" onClick={(e)=>{e.preventDefault(); navigate('/mastery')}}>Mastery</a>
                        <div className="hidden md:flex space-x-6">
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e)=>{e.preventDefault(); navigate('/')}}>Home</a>
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e)=>{e.preventDefault(); navigate('/about')}}>About</a>
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e)=>{e.preventDefault(); navigate('/contactme')}}>Contact Me</a>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <CreateActionsDropdown 
                            onCreateFolderClick={onCreateFolderClick}
                            onCreateDeckClick={onCreateDeckClick}
                            onGenerateAIClick={onGenerateAIClick}
                        />
                        <div className="hidden md:flex items-center space-x-2">
                             <span className="hidden sm:inline text-slate-300 font-medium">{userName}</span>
                             <SignUpBtn />

                        </div>
                        <div className="md:hidden flex items-center">
                            <button 
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                                className="text-slate-300 hover:text-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-md p-2"
                            >
                                <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-2xl`}></i>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            
            <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-gray-800 border-t border-gray-700 py-4`}>
                <div className="flex flex-col space-y-3 px-4">
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Home</a>
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>About</a>
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Contact Me</a>
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Mastery Page</a>
                    <div className="flex items-center space-x-2 border-t border-gray-700 pt-3 mt-3">
                        <span className="text-slate-300 font-medium">{userName}</span>
                        <SignUpBtn />
                    </div>
                </div>
            </div>
        </header>
    );
}

export default NavBar;