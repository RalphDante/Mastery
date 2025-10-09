import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../api/firebase';
import SignUpBtn from '../../pages/TryNowPage/LandingPage/SignUpBtn';
import { useNavigate } from 'react-router-dom';
import CreateActionsDropdown from '../CreateActionsDropdown/CreateActionsDropdown';
import Profile from './Profile';



// NavBar component
function NavBar({ onCreateFolderClick, onCreateDeckClick, onCreateWithAIModalClick, onSignOutClick }) {

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
        <header className="bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gray-700">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-8">
                        <a href="#" className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 text-transparent bg-clip-text" onClick={(e)=>{e.preventDefault(); navigate('/')}}>Mastery</a>
                        <div className="hidden md:flex space-x-6">
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e)=>{e.preventDefault(); navigate('/')}}>Home</a>
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e)=>{e.preventDefault(); navigate('/about')}}>About</a>
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e)=>{e.preventDefault(); navigate('/contactme')}}>Contact Me</a>
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e)=>{e.preventDefault(); navigate('/blog')}}>Blog</a>
                            <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors" onClick={(e)=>{e.preventDefault(); navigate('/pricing')}}>Pricing</a>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <CreateActionsDropdown 
                            onCreateFolderClick={onCreateFolderClick}
                            onCreateDeckClick={onCreateDeckClick}
                            onCreateWithAIModalClick={onCreateWithAIModalClick}
                        />
                        <div className="hidden md:flex items-center space-x-2">
                            <span className="hidden sm:inline text-slate-300 font-medium">{userName}</span>
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
            
            <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-gray-800 border-t border-gray-700 py-4`}>
                <div className="flex flex-col space-y-3 px-4">
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={(e) => {e.preventDefault(); navigate('/'); setIsMobileMenuOpen(false)}}>Home</a>
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={(e) => {e.preventDefault(); navigate('/about'); setIsMobileMenuOpen(false)}}>About</a>
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={(e) => {e.preventDefault(); navigate('/contactme'); setIsMobileMenuOpen(false)}}>Contact Me</a>
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={(e) => {e.preventDefault(); navigate('/blog'); setIsMobileMenuOpen(false)}}>Blog</a>
                    <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={(e) => {e.preventDefault(); navigate('/pricing'); setIsMobileMenuOpen(false)}}>Pricing</a>
                    
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