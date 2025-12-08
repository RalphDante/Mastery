import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateActionsDropdown from '../CreateActionsDropdown/CreateActionsDropdown';
import Profile from './Profile';
import { useAuthContext } from '../../contexts/AuthContext';
import { Plus } from 'lucide-react'; // Make sure you have lucide-react installed

function NavBar({ onCreateFolderClick, onCreateDeckClick, onCreateWithAIModalClick, onSignOutClick }) {
    const { userProfile } = useAuthContext();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [userName, setUserName] = useState("Loading...");

    useEffect(() => {
        if (userProfile) {
            setUserName(userProfile.displayName || userProfile.email || "Guest");
        } else {
            setUserName("Guest");
        }
    }, [userProfile]);

    // Check if user is already Pro
    const isPro = userProfile?.subscription?.tier === "pro";

    return (
        <header className="bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gray-700">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-8">
                        <a 
                            href="#" 
                            className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 text-transparent bg-clip-text" 
                            onClick={(e) => { e.preventDefault(); navigate('/'); }}
                        >
                            Mastery
                        </a>
                        <div className="hidden md:flex space-x-6">
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a>
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e) => { e.preventDefault(); navigate('/about'); }}>About</a>
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e) => { e.preventDefault(); navigate('/contactme'); }}>Contact Me</a>
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e) => { e.preventDefault(); navigate('/blog'); }}>Blog</a>
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e) => { e.preventDefault(); navigate('/leaderboard'); }}>Leaderboard</a>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        
                        
                        {/* Plus icon for Create Actions - replaces the old dropdown button */}
                        <CreateActionsDropdown 
                            onCreateFolderClick={onCreateFolderClick}
                            onCreateDeckClick={onCreateDeckClick}
                            onCreateWithAIModalClick={onCreateWithAIModalClick}
                            renderTrigger={(onClick) => (
                                <button
                                    onClick={onClick}
                                    className="bg-violet-600 hover:bg-violet-500 text-white p-2 rounded-lg transition-all transform hover:scale-105 shadow-lg"
                                    title="Create"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            )}
                        />
                        
                        {/* Try Pro Free button with Ad-Free badge */}
                        {!isPro && (
                            <button
                                onClick={() => navigate('/pricing')}
                                className="relative bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-slate-900 font-bold px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-lg text-sm whitespace-nowrap"
                            >
                                Try Pro Free
                                {/* Ad-Free badge */}
                                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[8px] font-bold px-1 py-0.1 rounded-full shadow-md">
                                    AD-FREE
                                </span>
                            </button>
                        )}

                        <div className="hidden md:flex items-center space-x-2">
                            <span className="hidden lg:inline text-slate-300 font-medium">{userName}</span>
                            <Profile />
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
            
            {/* Mobile Menu */}
            <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-gray-800 border-t border-gray-700 py-4`}>
                <div className="flex flex-col space-y-3 px-4">
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={(e) => { e.preventDefault(); navigate('/'); setIsMobileMenuOpen(false); }}>Home</a>
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={(e) => { e.preventDefault(); navigate('/about'); setIsMobileMenuOpen(false); }}>About</a>
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={(e) => { e.preventDefault(); navigate('/contactme'); setIsMobileMenuOpen(false); }}>Contact Me</a>
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={(e) => { e.preventDefault(); navigate('/blog'); setIsMobileMenuOpen(false); }}>Blog</a>
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={(e) => { e.preventDefault(); navigate('/leaderboard'); setIsMobileMenuOpen(false); }}>Leaderboard</a>
                    
                    <div className="flex items-center space-x-2 border-t border-gray-700 pt-3 mt-3">
                        <span className="text-slate-300 font-medium">{userName}</span>
                        <Profile />
                    </div>
                </div>
            </div>
        </header>
    );
}

export default NavBar;