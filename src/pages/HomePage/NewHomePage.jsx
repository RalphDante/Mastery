import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';

// Register all Chart.js components (scales, elements, etc.)
Chart.register(...registerables);

// Placeholder for CustomMessage - In a real app, this would be imported:
// import CustomMessage from './CustomMessage';
function CustomMessage({ message, type, onClose }) {
    if (!message) return null;
    return (
        <div className={`fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50`}>
            <div className={`bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full text-center ${type === 'error' ? 'border-red-500' : 'border-green-500'} border-2`}>
                <p className={`text-lg font-semibold ${type === 'error' ? 'text-red-700' : 'text-green-700'} mb-4`}>
                    {type === 'error' ? 'Error!' : 'Success!'}
                </p>
                <p className="text-slate-200 mb-6">{message}</p>
                <button 
                    onClick={onClose} 
                    className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-full transition-all duration-200"
                >
                    OK
                </button>
            </div>
        </div>
    );
}

// Dummy auth and db for this single immersive, replace with actual imports
const auth = { onAuthStateChanged: () => () => {} }; // Dummy function
const db = {}; // Dummy object

// CreateFolderModal component (kept inline for single immersive file)
function CreateFolderModal({ isOpen, onClose, onFolderCreated }) {
    const [folderName, setFolderName] = useState("");
    const [folderDescription, setFolderDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [authUser, setAuthUser] = useState({ uid: 'mockUserId', email: 'mock@example.com' }); // Mock authenticated user

    const showCustomMessage = (msg, type = 'info') => {
        setMessage(msg);
        setMessageType(type);
    };
    const closeCustomMessage = () => setMessage('');

    // Reset form when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setFolderName('');
            setFolderDescription('');
            setMessage('');
            setLoading(false);
        }
    }, [isOpen]);

    const handleCreateFolder = async () => {
        setLoading(true);
        showCustomMessage(''); 

        if (!folderName.trim() || !folderDescription.trim()) {
            showCustomMessage("Please enter both Folder Name and Description.", 'error');
            setLoading(false);
            return;
        }

        if (!authUser) {
            showCustomMessage("You must be signed in to create a folder.", 'error');
            setLoading(false);
            return;
        }

        try {
            // Mock Firestore save operation
            const newFolderId = `folder_${Date.now()}`; // Simulate Firestore auto-ID
            console.log(`Mock: Creating folder "${folderName.trim()}" with ID: ${newFolderId}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async operation

            showCustomMessage("Folder created successfully!", 'success');
            
            if (onFolderCreated) {
                onFolderCreated(newFolderId, folderName.trim());
            }
            // onClose(); // Modal will be closed by parent after navigation
        } catch (error) {
            console.error("Mock: Error creating folder:", error);
            showCustomMessage(`Error creating folder: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700 max-w-md w-full relative">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
                    disabled={loading}
                >
                    <i className="fa-solid fa-xmark text-2xl"></i>
                </button>
                <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">Create New Folder</h2>
                
                <CustomMessage message={message} type={messageType} onClose={closeCustomMessage} />

                <div className="mb-4">
                    <label htmlFor="modalFolderName" className="block text-slate-300 text-sm font-semibold mb-2">
                        Folder Name:
                    </label>
                    <input 
                        type="text" 
                        id="modalFolderName" // Changed ID to avoid conflict if main page has one
                        value={folderName} 
                        className="bg-gray-700 text-slate-100 border border-gray-600 rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-violet-500"
                        onChange={(e) => setFolderName(e.target.value)}
                        placeholder='e.g., Science Studies'
                        disabled={loading}
                    />
                </div>
                <div className="mb-6">
                    <label htmlFor="modalFolderDescription" className="block text-slate-300 text-sm font-semibold mb-2">
                        Description:
                    </label>
                    <textarea 
                        id="modalFolderDescription" // Changed ID
                        value={folderDescription} 
                        className="bg-gray-700 text-slate-100 border border-gray-600 rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-violet-500 h-24"
                        onChange={(e)=>{setFolderDescription(e.target.value)}}
                        placeholder='A brief description of this folder (e.g., "All my biology notes")'
                        disabled={loading}
                    />
                </div>
                
                <button 
                    className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 w-full"
                    onClick={handleCreateFolder} 
                    disabled={loading || !authUser}
                >
                    {loading ? 'Creating Folder...' : 'Create Folder'}
                </button>
                {!authUser && (
                    <p className="text-center text-sm text-slate-400 mt-4">
                        Please sign in to create folders.
                    </p>
                )}
            </div>
        </div>
    );
}

// New reusable component for the Create dropdown button
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


// Main App Component for the Dashboard
function App() {
    // Mock Data - In a real app, this would come from Firestore or an API
    const [mockData, setMockData] = useState({
        user: {
            name: "Ralph",
            currentStreak: 7,
            longestStreak: 25,
            totalDecks: 12,
            totalCards: 480,
            totalReviews: 1256
        },
        dailyProgress: {
            due: 15,
            completed: 5,
        },
        recentFolders: [
            { id: 'f1', name: "Biology 101", deckCount: 3, lastAccessed: "2d ago" },
            { id: 'f2', name: "Spanish Vocab", deckCount: 5, lastAccessed: "5d ago" },
            { id: 'f3', name: "History Finals", deckCount: 2, lastAccessed: "1w ago" },
        ],
        overallMastery: {
            mastered: 360,
            learning: 120
        }
    });

    const masteryChartRef = useRef(null); // Ref for the Chart.js canvas
    const chartInstance = useRef(null); // Ref to store the Chart.js instance

    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for mobile menu

    // Function to render/update the Mastery Doughnut Chart
    const renderMasteryChart = useCallback(() => {
        if (!masteryChartRef.current) return;

        const ctx = masteryChartRef.current.getContext('2d');

        // Destroy existing chart instance if it exists
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        chartInstance.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Mastered', 'Learning'],
                datasets: [{
                    data: [mockData.overallMastery.mastered, mockData.overallMastery.learning],
                    backgroundColor: ['#a78bfa', '#475569'], // Violet-400 and Slate-600 for dark theme
                    borderColor: ['#1e293b', '#1e293b'], // Dark background color for border
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Important for responsive height
                cutout: '75%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed;
                                }
                                return label;
                            }
                        }
                    },
                },
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
    }, [mockData.overallMastery.mastered, mockData.overallMastery.learning]); // Dependencies for chart data

    // Effect to render chart when component mounts or data changes
    useEffect(() => {
        renderMasteryChart();
    }, [renderMasteryChart]);

    // Handle "Create New Folder" click from dropdown
    const handleCreateNewFolderClick = useCallback((event) => {
        event.preventDefault();
        setIsCreateFolderModalOpen(true); // Open modal
        setIsMobileMenuOpen(false); // Close mobile menu if open
    }, []);

    // Placeholder for "Create New Deck" click
    const handleCreateNewDeckClick = useCallback((event) => {
        event.preventDefault();
        console.log("Navigating to Create New Deck Page");
        alert("Navigating to Create New Deck Page");
        setIsMobileMenuOpen(false); // Close mobile menu if open
        // In a real app, you'd navigate here, potentially to a page where user selects a folder
        // navigate('/createdeck'); 
    }, []);

    // Placeholder for "Create with AI" click
    const handleGenerateAIClick = useCallback((event) => {
        event.preventDefault();
        console.log("Navigating to Generate with AI Page");
        alert("Navigating to Generate with AI Page");
        setIsMobileMenuOpen(false); // Close mobile menu if open
        // navigate('/generate-ai-deck');
    }, []);


    // Callback when a folder is successfully created in the modal
    const handleFolderCreated = useCallback((newFolderId, newFolderName) => {
        setIsCreateFolderModalOpen(false); // Close modal
        // Now you can navigate to CreateDeckPage, passing the new folder ID
        // In a real app, you'd use react-router-dom's navigate function here:
        // navigate(`/createdeckpage?folderId=${newFolderId}&folderName=${newFolderName}`);
        console.log(`Folder "${newFolderName}" created! Now you would be redirected to create a deck in it.`);
        alert(`Folder "${newFolderName}" created! Now you would be redirected to create a deck in it.`);
    }, []);

    const { user, dailyProgress, recentFolders } = mockData;
    const progressPercent = (dailyProgress.completed / dailyProgress.due) * 100;

    return (
        <div id="app" className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
            
            {/* Header */}
            <header className="bg-gray-900/80 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-gray-700">
                <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-8">
                            <a href="#" className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 text-transparent bg-clip-text">Mastery</a>
                            {/* Desktop Navigation Links */}
                            <div className="hidden md:flex space-x-6">
                                <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors">Home</a>
                                <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors">About</a>
                                <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors">Contact Me</a>
                                <a href="#" className="text-slate-300 hover:text-violet-400 transition-colors">Mastery Page</a>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Replaced original create dropdown with the new component */}
                            <CreateActionsDropdown 
                                onCreateFolderClick={handleCreateNewFolderClick}
                                onCreateDeckClick={handleCreateNewDeckClick}
                                onGenerateAIClick={handleGenerateAIClick}
                            />
                            <div className="hidden md:flex items-center space-x-2"> {/* Hide on mobile */}
                                 <span className="hidden sm:inline text-slate-300 font-medium">{user.name}</span>
                                 <button className="bg-gray-700 text-slate-300 px-4 py-2 rounded-full font-semibold hover:bg-gray-600 transition-colors">
                                    Sign Out
                                 </button>
                            </div>
                            {/* Hamburger Icon for Mobile */}
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
                
                {/* Mobile Menu (conditionally rendered) */}
                <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-gray-800 border-t border-gray-700 py-4`}>
                    <div className="flex flex-col space-y-3 px-4">
                        <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Home</a>
                        <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>About</a>
                        <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Contact Me</a>
                        <a href="#" className="block text-slate-200 hover:text-violet-400 transition-colors py-2" onClick={() => setIsMobileMenuOpen(false)}>Mastery Page</a>
                        {/* User name and Sign Out button for mobile */}
                        <div className="flex items-center space-x-2 border-t border-gray-700 pt-3 mt-3">
                            <span className="text-slate-300 font-medium">{user.name}</span>
                            <button className="bg-gray-700 text-slate-300 px-4 py-2 rounded-full font-semibold hover:bg-gray-600 transition-colors">
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="space-y-12">

                    {/* Section 1: Welcome & Quick Stats */}
                    <section id="welcome-section">
                        <div className="text-center md:text-left mb-8">
                            <h1 className="text-4xl font-extrabold text-slate-100 mb-2">Welcome back, {user.name}!</h1>
                            <p className="text-lg text-slate-400">Ready to master something new today?</p>
                        </div>

                        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                
                                {/* Cards Due */}
                                <div className="text-center md:text-left">
                                    <p className="text-sm font-medium text-slate-400 mb-1">DUE FOR REVIEW</p>
                                    <h2 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 text-transparent bg-clip-text">{dailyProgress.due}</h2>
                                    <div>
                                        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-3">
                                            <div className="bg-violet-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                                        </div>
                                        <p className="text-xs text-slate-400 text-right mt-1">{dailyProgress.completed} / {dailyProgress.due} Reviewed</p>
                                    </div>
                                </div>
                                
                                {/* Stats */}
                                <div className="flex justify-around text-center border-t md:border-t-0 md:border-l md:border-r border-gray-700 py-6 md:py-0">
                                    <div>
                                        <p className="text-sm font-medium text-slate-400">CURRENT STREAK</p>
                                        <p className="text-3xl font-bold text-slate-200">🔥 {user.currentStreak}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-400">LONGEST STREAK</p>
                                        <p className="text-3xl font-bold text-slate-200">🏆 {user.longestStreak}</p>
                                    </div>
                                </div>
                                
                                {/* Action Button */}
                                <div className="flex justify-center">
                                    <a href="#" className="w-full md:w-auto text-center bg-violet-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-violet-700 transition-all transform hover:scale-105 shadow-lg shadow-violet-500/30">
                                        Start Review
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>
                    
                    {/* Section 2: Your Learning Hub */}
                    <section id="learning-hub-section">
                         <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-100">Your Learning Hub</h2>
                            <p className="text-md text-slate-400">Quickly jump back into your studies or create something new.</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Recent Folders */}
                            <div className="lg:col-span-2 bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
                               <div className="flex justify-between items-center mb-4">
                                   <h3 className="text-xl font-semibold text-slate-100">Recent Folders</h3>
                                   <a href="#" className="text-sm font-medium text-violet-400 hover:text-violet-300">View All</a>
                               </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {recentFolders.map(folder => (
                                        <a 
                                            key={folder.id} 
                                            href="#" // Placeholder for actual navigation
                                            className="block bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg shadow"
                                        >
                                            <div className="flex items-center space-x-3 mb-2">
                                                 <i className="fa-solid fa-folder text-xl text-violet-400"></i>
                                                 <h4 className="font-semibold text-slate-200 truncate">{folder.name}</h4>
                                            </div>
                                            <p className="text-xs text-slate-400">{folder.deckCount} decks</p>
                                        </a>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Quick Actions */}
                            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
                                <h3 className="text-xl font-semibold text-slate-100 mb-4">Quick Actions</h3>
                                <div className="space-y-3">
                                   <a href="#" className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg">
                                       <i className="fa-solid fa-pen-to-square text-violet-400 text-xl"></i>
                                       <span className="font-semibold text-slate-200">Create New Deck</span>
                                   </a>
                                   <a href="#" className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg">
                                       <i className="fa-solid fa-wand-magic-sparkles text-violet-400 text-xl"></i>
                                       <span className="font-semibold text-slate-200">Generate with AI</span>
                                   </a>
                                   <a href="#" className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg">
                                       <i className="fa-solid fa-globe text-violet-400 text-xl"></i>
                                       <span className="font-semibold text-slate-200">Browse Public Decks</span>
                                   </a>
                                </div>
                            </div>
                        </div>
                    </section>
                    
                    {/* Section 3: Overall Mastery */}
                     <section id="overall-mastery-section">
                         <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-100">Overall Mastery</h2>
                            <p className="text-md text-slate-400">This section provides a high-level summary of your learning journey, combining all your stats to visualize your total progress.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                             {/* Mastery Chart */}
                            <div className="md:col-span-1 bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700 flex flex-col items-center justify-center">
                                 <h3 className="text-xl font-semibold text-slate-100 mb-4">Mastery Progress</h3>
                                 <div className="chart-container">
                                     <canvas ref={masteryChartRef} id="masteryChart"></canvas>
                                 </div>
                            </div>
                            {/* Stats Breakdown */}
                            <div className="md:col-span-2 grid grid-cols-2 gap-6">
                                <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
                                    <i className="fa-solid fa-layer-group text-violet-400 text-2xl mb-2"></i>
                                    <p className="text-sm font-medium text-slate-400">Total Decks</p>
                                    <p className="text-3xl font-bold text-slate-200">{user.totalDecks.toLocaleString()}</p>
                                </div>
                                 <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
                                    <i className="fa-solid fa-clone text-violet-400 text-2xl mb-2"></i>
                                    <p className="text-sm font-medium text-slate-400">Total Cards</p>
                                    <p className="text-3xl font-bold text-slate-200">{user.totalCards.toLocaleString()}</p>
                                </div>
                                 <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700 col-span-2">
                                    <i className="fa-solid fa-book-open-reader text-violet-400 text-2xl mb-2"></i>
                                    <p className="text-sm font-medium text-slate-400">Total Reviews Completed</p>
                                    <p className="text-3xl font-bold text-slate-200">{user.totalReviews.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
            </main>
            
            {/* Footer */}
            <footer className="bg-gray-900 mt-12 border-t border-gray-700">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-slate-400">
                    <p>&copy; 2025 Mastery. All rights reserved.</p>
                </div>
            </footer>

            {/* Create Folder Modal */}
            <CreateFolderModal 
                isOpen={isCreateFolderModalOpen} 
                onClose={() => setIsCreateFolderModalOpen(false)} 
                onFolderCreated={handleFolderCreated} 
            />
        </div>
    );
}

export default App;
