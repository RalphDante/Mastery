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
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../../api/firebase'; // Adjust path as needed
import { Link } from 'react-router-dom'; // Import Link

function LearningHubSection() {
    const [user, loading, error] = useAuthState(auth);
    const [folders, setFolders] = useState([]);
    const [newFolderName, setNewFolderName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isFoldersLoading, setIsFoldersLoading] = useState(true);

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
            // You might want to show an error message to the user
        }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!user) return;

        try {
            const folderRef = doc(db, 'folders', folderId);
            await deleteDoc(folderRef);
        } catch (error) {
            console.error('Error deleting folder:', error);
            // You might want to show an error message to the user
        }
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
    // Assuming each folder item is approx. 120px high including vertical padding/margin
    // 3 rows * 120px/row + 2 * (gap-4 which is 16px) = 360px + 32px = 392px
    // Let's set the max height to 395px to be precise for 3 rows
    const MAX_FOLDER_HEIGHT_PX = 120; // Estimated height of one folder card
    const GRID_GAP_PX = 16;         // From 'gap-4' in Tailwind CSS

    const desiredMaxHeight = (3 * MAX_FOLDER_HEIGHT_PX) + (2 * GRID_GAP_PX); // For exactly 3 rows

    const showScrollbar = folders.length > 9; // Still show scrollbar if more than 9 items (3x3 grid)

    return (
        <section id="learning-hub-section" className="p-6 bg-gray-900 min-h-screen">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-100">Your Learning Hub</h2>
                <p className="text-md text-slate-400">Quickly jump back into your studies or create something new.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Your Folders Section */}
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
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
                            // Apply max-height and overflow-y only if there are more than 9 folders
                            style={showScrollbar ? { maxHeight: `${desiredMaxHeight}px`, overflowY: 'auto' } : {}}
                        >
                            {folders.map(folder => (
                                <Link
                                    key={folder.id}
                                    to={`/folders/${folder.id}`}
                                    state={{ folderName: folder.name, folderId: folder.id }}
                                    className="relative group block bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg shadow"
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
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
                    <h3 className="text-xl font-semibold text-slate-100 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <Link to="/create-deck" className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg">
                            <i className="fa-solid fa-pen-to-square text-violet-400 text-xl"></i>
                            <span className="font-semibold text-slate-200">Create New Deck</span>
                        </Link>
                        {/* Assuming these will also be Links to specific routes */}
                        <Link to="/generate-ai" className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg">
                            <i className="fa-solid fa-wand-magic-sparkles text-violet-400 text-xl"></i>
                            <span className="font-semibold text-slate-200">Generate with AI</span>
                        </Link>
                        <Link to="/public-decks" className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 transition-colors p-4 rounded-lg">
                            <i className="fa-solid fa-globe text-violet-400 text-xl"></i>
                            <span className="font-semibold text-slate-200">Browse Public Decks</span>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default LearningHubSection;