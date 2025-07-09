import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    getDocs,
    runTransaction,
    increment,
    getDoc
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../../api/firebase'; // Adjust path as needed
import { useNavigate } from "react-router-dom";

function LearningHubSection({onCreateDeckClick, onCreateWithAIModalClick}) {
    const [user, loading, error] = useAuthState(auth);
    const [folders, setFolders] = useState([]);
    const [newFolderName, setNewFolderName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isFoldersLoading, setIsFoldersLoading] = useState(true);
    
    // New state for explorer-style navigation
    const [currentView, setCurrentView] = useState('folders'); // 'folders' or 'folder-contents'
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folderDecks, setFolderDecks] = useState([]);
    const [isDecksLoading, setIsDecksLoading] = useState(false);


    const navigate = useNavigate();

    // Real-time listener for user's folders
    useEffect(() => {
        if (!user) {
            setFolders([]);
            setIsFoldersLoading(false);
            return;
        }

        const foldersRef = collection(db, 'folders');
        const q = query(
            foldersRef,
            where('ownerId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedFolders = [];
            snapshot.forEach((doc) => {
                fetchedFolders.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort folders by updatedAt on the client-side (most recent first)
            fetchedFolders.sort((a, b) => {
                const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
                const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            setFolders(fetchedFolders);
            setIsFoldersLoading(false);
        }, (err) => {
            console.error('Error fetching folders:', err);
            setIsFoldersLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Real-time listener for decks in current folder
    useEffect(() => {
        if (!user || !currentFolder) {
            setFolderDecks([]);
            return;
        }

        setIsDecksLoading(true);
        const decksRef = collection(db, 'decks');
        const q = query(
            decksRef,
            where('folderId', '==', currentFolder.id),
            where('ownerId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedDecks = [];
            snapshot.forEach((doc) => {
                fetchedDecks.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort decks by updatedAt
            fetchedDecks.sort((a, b) => {
                const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
                const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            setFolderDecks(fetchedDecks);
            setIsDecksLoading(false);
        }, (err) => {
            console.error('Error fetching decks:', err);
            setIsDecksLoading(false);
        });

        return () => unsubscribe();
    }, [user, currentFolder]);

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim() || !user) return;

        try {
            const foldersRef = collection(db, 'folders');
            await addDoc(foldersRef, {
                name: newFolderName.trim(),
                ownerId: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isPublic: false,
                subscriptionTier: "free",
                deckCount: 0
            });

            setNewFolderName("");
            setIsCreating(false);
        } catch (error) {
            console.error('Error creating folder:', error);
        }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!user) return;
    
        try {
            // Step 1: Get all decks in this folder
            const decksQuery = query(
                collection(db, 'decks'),
                where('folderId', '==', folderId),
                where('ownerId', '==', user.uid)
            );
            const decksSnapshot = await getDocs(decksQuery);
            
            const folderRef = doc(db, 'folders', folderId);
            const folderSnap = await getDoc(folderRef);
            const folderName = folderSnap.data()?.name || 'Unknown Folder';
    
            if (!decksSnapshot.empty) {
                const deckCount = decksSnapshot.size;
                const message = `Are you sure you want to delete "${folderName}"?\n\nThis folder contains ${deckCount} deck(s). All decks and their cards will be permanently deleted, including any spaced repetition progress. This action cannot be undone.`;
                
                if (!window.confirm(message)) return;
    
                // Delete all decks in the folder WITHOUT showing individual confirmations
                for (const deckDoc of decksSnapshot.docs) {
                    await deleteDeckWithoutConfirmation(deckDoc.id);
                }
            } else {
                // Empty folder, just confirm deletion
                if (!window.confirm(`Are you sure you want to delete "${folderName}"?`)) return;
            }
    
            // Finally delete the folder
            await deleteDoc(folderRef);
            
        } catch (error) {
            console.error('Error deleting folder:', error);
            alert('Failed to delete folder. Please try again.');
        }
    };

    const deleteDeckWithoutConfirmation = async (deckId) => {
        if (!user) return;
    
        try {
            // Step 1: Get deck information
            const deckRef = doc(db, 'decks', deckId);
            const deckSnap = await getDocs(query(collection(db, 'decks'), where('__name__', '==', deckId)));
            
            if (deckSnap.empty) {
                console.error('Deck not found');
                return;
            }
    
            const deckData = deckSnap.docs[0].data();
    
            // Step 2: Get all cards in this deck
            const cardsRef = collection(db, 'decks', deckId, 'cards');
            const cardsSnapshot = await getDocs(cardsRef);
            
            if (cardsSnapshot.empty) {
                // No cards, safe to delete deck directly
                await deleteDoc(deckRef);
                return;
            }
    
            // Step 3: Delete everything using a batch operation
            const cardIds = cardsSnapshot.docs.map(doc => doc.id);
            
            await runTransaction(db, async (transaction) => {
                // Delete all card progress entries
                for (const cardId of cardIds) {
                    const progressQuery = query(
                        collection(db, 'cardProgress'), 
                        where('cardId', '==', cardId)
                    );
                    const progressSnapshot = await getDocs(progressQuery);
                    
                    progressSnapshot.docs.forEach(progressDoc => {
                        transaction.delete(progressDoc.ref);
                    });
                }
    
                // Delete all cards
                cardsSnapshot.docs.forEach(cardDoc => {
                    transaction.delete(cardDoc.ref);
                });
    
                // Delete the deck itself
                transaction.delete(deckRef);
    
                // Update folder's deckCount (denormalized data)
                if (deckData.folderId) {
                    const folderRef = doc(db, 'folders', deckData.folderId);
                    transaction.update(folderRef, {
                        deckCount: increment(-1),
                        updatedAt: serverTimestamp()
                    });
                }
            });
    
            console.log('Deck deleted successfully');
            
        } catch (error) {
            console.error('Error deleting deck:', error);
            throw error; // Re-throw to let the folder deletion handle it
        }
    };

    const handleFolderClick = (folder) => {
        setCurrentFolder(folder);
        setCurrentView('folder-contents');
    };

    const handleBackToFolders = () => {
        setCurrentView('folders');
        setCurrentFolder(null);
        setFolderDecks([]);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <section id="learning-hub-section" className="p-6 bg-gray-900 min-h-screen">
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-400">Loading user data...</div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section id="learning-hub-section" className="p-6 bg-gray-900 min-h-screen">
                <div className="flex items-center justify-center h-64">
                    <div className="text-red-400">Error: {error.message}</div>
                </div>
            </section>
        );
    }

    if (!user) {
        return (
            <section id="learning-hub-section" className="p-6 bg-gray-900 min-h-screen">
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-400">Please sign in to view your learning hub.</div>
                </div>
            </section>
        );
    }

    // Determine if scrollbar is needed
    const MAX_FOLDER_HEIGHT_PX = 120;
    const GRID_GAP_PX = 16;
    const desiredMaxHeight = (3 * MAX_FOLDER_HEIGHT_PX) + (2 * GRID_GAP_PX);
    const showScrollbar = folders.length > 9;


    // Handle Delete Deck Click

    const handleDeleteDeck = async (deckId) => {
        if (!user) return;
    
        try {
            // Step 1: Get deck information
            const deckRef = doc(db, 'decks', deckId);
            const deckSnap = await getDocs(query(collection(db, 'decks'), where('__name__', '==', deckId)));
            
            if (deckSnap.empty) {
                console.error('Deck not found');
                return;
            }
    
            const deckData = deckSnap.docs[0].data();
            const deckTitle = deckData.title;
    
            // Step 2: Get all cards in this deck
            const cardsRef = collection(db, 'decks', deckId, 'cards');
            const cardsSnapshot = await getDocs(cardsRef);
            
            if (cardsSnapshot.empty) {
                // No cards, safe to delete deck directly
                await deleteDoc(deckRef);
                return;
            }
    
            // Step 3: Check for card progress
            const cardIds = cardsSnapshot.docs.map(doc => doc.id);
            const progressQueries = cardIds.map(cardId => 
                query(collection(db, 'cardProgress'), where('cardId', '==', cardId))
            );
    
            // Check if any progress exists
            let hasProgress = false;
            let progressCount = 0;
            
            for (const progressQuery of progressQueries) {
                const progressSnapshot = await getDocs(progressQuery);
                if (!progressSnapshot.empty) {
                    hasProgress = true;
                    progressCount += progressSnapshot.size;
                }
            }
    
            // Step 4: Show confirmation dialog
            let shouldDelete = false;
            
            if (hasProgress) {
                const message = `Are you sure you want to delete "${deckTitle}"?\n\nThis deck contains ${cardIds.length} cards with ${progressCount} spaced repetition progress entries. This action cannot be undone.`;
                shouldDelete = window.confirm(message);
            } else {
                const message = `Are you sure you want to delete "${deckTitle}"?\n\nThis deck contains ${cardIds.length} cards. This action cannot be undone.`;
                shouldDelete = window.confirm(message);
            }
    
            if (!shouldDelete) return;
    
            // Step 5: Delete everything using a batch operation
            await runTransaction(db, async (transaction) => {
                // Delete all card progress entries
                for (const cardId of cardIds) {
                    const progressQuery = query(
                        collection(db, 'cardProgress'), 
                        where('cardId', '==', cardId)
                    );
                    const progressSnapshot = await getDocs(progressQuery);
                    
                    progressSnapshot.docs.forEach(progressDoc => {
                        transaction.delete(progressDoc.ref);
                    });
                }
    
                // Delete all cards
                cardsSnapshot.docs.forEach(cardDoc => {
                    transaction.delete(cardDoc.ref);
                });
    
                // Delete the deck itself
                transaction.delete(deckRef);
    
                // Update folder's deckCount (denormalized data)
                if (deckData.folderId) {
                    const folderRef = doc(db, 'folders', deckData.folderId);
                    transaction.update(folderRef, {
                        deckCount: increment(-1),
                        updatedAt: serverTimestamp()
                    });
                }
            });
    
            console.log('Deck deleted successfully');
            
        } catch (error) {
            console.error('Error deleting deck:', error);
            // You might want to show a user-friendly error message here
            alert('Failed to delete deck. Please try again.');
        }
    };
    


    // Handle Quick Actions Click

    const handleQuickActionsClick = (callback, e)=>{
        e.preventDefault()
        callback(e);
    }

    return (
        <section id="learning-hub-section" className="p-6 bg-gray-900 min-h-screen">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-100">Your Learning Hub</h2>
                <p className="text-md text-slate-400">Quickly jump back into your studies or create something new.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Section */}
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
                    {/* Breadcrumb Navigation */}
                    <div className="flex items-center mb-4 text-sm text-slate-400">
                        <button
                            onClick={handleBackToFolders}
                            className={`hover:text-violet-400 transition-colors ${currentView === 'folders' ? 'text-violet-400' : ''}`}
                        >
                            <i className="fa-solid fa-home mr-2"></i>
                            Your Folders
                        </button>
                        {currentView === 'folder-contents' && currentFolder && (
                            <>
                                <i className="fa-solid fa-chevron-right mx-2"></i>
                                <span className="text-slate-300">{currentFolder.name}</span>
                            </>
                        )}
                    </div>

                    {/* Folders View */}
                    {currentView === 'folders' && (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-end gap-2">
                                    <h3 className="text-xl font-semibold text-slate-100">Your Folders</h3>
                                    <span className="text-sm text-slate-500 mb-0.5">
                                        (First 6 are recently updated)
                                    </span>
                                </div>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="text-sm font-medium text-violet-400 hover:text-violet-300 bg-violet-400/10 px-3 py-1 rounded-lg hover:bg-violet-400/20 transition-colors"
                                >
                                    + New Folder
                                </button>
                            </div>

                            {/* Create new folder form */}
                            {isCreating && (
                                <form onSubmit={handleCreateFolder} className="mb-4 p-4 bg-gray-700 rounded-lg">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            placeholder="Enter folder name..."
                                            className="flex-1 px-3 py-2 bg-gray-600 text-slate-200 rounded-lg border border-gray-500 focus:border-violet-400 focus:outline-none"
                                            autoFocus
                                        />
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
                                        >
                                            Create
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCreating(false);
                                                setNewFolderName("");
                                            }}
                                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Loading state for folders */}
                            {isFoldersLoading && (
                                <div className="flex items-center justify-center h-32">
                                    <div className="text-slate-400">Loading folders...</div>
                                </div>
                            )}

                            {/* Empty state for folders */}
                            {!isFoldersLoading && folders.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                                    <i className="fa-solid fa-folder-open text-3xl mb-2"></i>
                                    <p>No folders yet. Create your first folder to get started!</p>
                                </div>
                            )}

                            {/* Folders grid */}
                            {!isFoldersLoading && folders.length > 0 && (
                                <div
                                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                                    style={showScrollbar ? { maxHeight: `${desiredMaxHeight}px`, overflowY: 'auto' } : {}}
                                >
                                    {folders.map(folder => (
                                        <div
                                            key={folder.id}
                                            onClick={() => handleFolderClick(folder)}
                                            className="relative group cursor-pointer bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg shadow"
                                        >
                                            <div className="flex items-center space-x-3 mb-2">
                                                <i className="fa-solid fa-folder text-xl text-violet-400"></i>
                                                <h4 className="font-semibold text-slate-200 truncate flex-1">{folder.name}</h4>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDeleteFolder(folder.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                                                >
                                                    <i className="fa-solid fa-trash text-sm"></i>
                                                </button>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs text-slate-400">{folder.deckCount || 0} decks</p>
                                                <p className="text-xs text-slate-500">{formatDate(folder.updatedAt)}</p>
                                            </div>
                                            {folder.isPublic && (
                                                <div className="absolute top-2 right-2">
                                                    <i className="fa-solid fa-globe text-xs text-green-400"></i>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Folder Contents View */}
                    {currentView === 'folder-contents' && currentFolder && (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <i className="fa-solid fa-folder-open text-xl text-violet-400"></i>
                                    <h3 className="text-xl font-semibold text-slate-100">{currentFolder.name}</h3>
                                </div>
                                <button
                                    onClick={() => {navigate(`/create-deck`, {state: {
                                        folderName: currentFolder.name, 
                                        folderId: currentFolder.id,
                                        isNewFolder: false,
                                        // uid: authUser.uid
                                    }})}}
                                    className="text-sm font-medium text-violet-400 hover:text-violet-300 bg-violet-400/10 px-3 py-1 rounded-lg hover:bg-violet-400/20 transition-colors"
                                >
                                    + New Deck
                                </button>
                            </div>

                            {/* Loading state for decks */}
                            {isDecksLoading && (
                                <div className="flex items-center justify-center h-32">
                                    <div className="text-slate-400">Loading decks...</div>
                                </div>
                            )}

                            {/* Empty state for decks */}
                            {!isDecksLoading && folderDecks.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                                    <i className="fa-solid fa-layer-group text-3xl mb-2"></i>
                                    <p>No decks in this folder yet. Create your first deck!</p>
                                </div>
                            )}

                            {/* Decks grid */}
                            {!isDecksLoading && folderDecks.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {folderDecks.map(deck => (
                                        <div
                                            key={deck.id}
                                            className="relative group cursor-pointer bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg shadow"
                                            onClick={()=>navigate(`/flashcards/${deck.id}`)}
                                        >
                                            <div 
                                                className="flex items-center space-x-3 mb-2">
                                                <i className="fa-solid fa-layer-group text-xl text-blue-400"></i>
                                                <h4 className="font-semibold text-slate-200 truncate flex-1">{deck.title}</h4>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDeleteDeck(deck.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                                                >
                                                    <i className="fa-solid fa-trash text-sm"></i>
                                                </button>
                                            </div>
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-xs text-slate-400">{deck.cardCount || 0} cards</p>
                                                <p className="text-xs text-slate-500">{formatDate(deck.updatedAt)}</p>
                                            </div>
                                            {deck.description && (
                                                <p className="text-xs text-slate-400 truncate mb-2">{deck.description}</p>
                                            )}
                                            {deck.tags && deck.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {deck.tags.slice(0, 3).map((tag, index) => (
                                                        <span
                                                            key={index}
                                                            className="px-2 py-1 bg-violet-500/20 text-violet-300 text-xs rounded-full"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {deck.tags.length > 3 && (
                                                        <span className="px-2 py-1 bg-gray-600 text-slate-400 text-xs rounded-full">
                                                            +{deck.tags.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {deck.isPublic && (
                                                <div className="absolute top-2 right-2">
                                                    <i className="fa-solid fa-globe text-xs text-green-400"></i>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Quick Actions - Updated to be context-aware */}
                <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
                    <h3 className="text-xl font-semibold text-slate-100 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        {currentView === 'folders' ? (
                            <>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg"
                                >
                                    <i className="fa-solid fa-folder-plus text-violet-400 text-xl"></i>
                                    <span className="font-semibold text-slate-200">Create New Folder</span>
                                </button>
                                <button 
                                    className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg"
                                    onClick={(e)=>{handleQuickActionsClick(onCreateDeckClick, e)}}
                                >
                                    <i className="fa-solid fa-pen-to-square text-violet-400 text-xl"></i>
                                    <span className="font-semibold text-slate-200">Create New Deck</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => {navigate(`/create-deck`, {state: {
                                        folderName: currentFolder.name, 
                                        folderId: currentFolder.id,
                                        isNewFolder: false,
                                        // uid: authUser.uid
                                    }})}}
                                    className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg"
                                >
                                    <i className="fa-solid fa-pen-to-square text-violet-400 text-xl"></i>
                                    <span className="font-semibold text-slate-200">Create Deck Here</span>
                                </button>
                                <button
                                    onClick={handleBackToFolders}
                                    className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg"
                                >
                                    <i className="fa-solid fa-arrow-left text-violet-400 text-xl"></i>
                                    <span className="font-semibold text-slate-200">Back to Folders</span>
                                </button>
                            </>
                        )}
                        <button 
                            className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg"
                            onClick={(e)=>{handleQuickActionsClick(onCreateWithAIModalClick, e)}}
                            
                        >
                            <i className="fa-solid fa-wand-magic-sparkles text-violet-400 text-xl"></i>
                            <span className="font-semibold text-slate-200">Generate with AI</span>
                        </button>
                        <button className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg">
                            <i className="fa-solid fa-globe text-violet-400 text-xl"></i>
                            <span className="font-semibold text-slate-200">Browse Public Decks</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default LearningHubSection;