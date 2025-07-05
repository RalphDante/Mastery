import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { 
    collection, 
    query, 
    where, 
    onSnapshot // Use onSnapshot for real-time updates from Firestore
} from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '../../api/firebase'; // Ensure 'auth' and 'db' are exported from firebase.js

import styles from './CreateFilePage.module.css'; // Assuming this CSS file contains styles for folders display

// Custom message component (replaces alert)
function CustomMessage({ message, type, onClose }) {
    if (!message) return null;
    return (
        <div className={`fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50`}>
            <div className={`bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center ${type === 'error' ? 'border-red-500' : 'border-green-500'} border-2`}>
                <p className={`text-lg font-semibold ${type === 'error' ? 'text-red-700' : 'text-green-700'} mb-4`}>
                    {type === 'error' ? 'Error!' : 'Success!'}
                </p>
                <p className="text-gray-800 mb-6">{message}</p>
                <button 
                    onClick={onClose} 
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-full transition-all duration-200"
                >
                    OK
                </button>
            </div>
        </div>
    );
}

// Renamed from DisplayFolder to FoldersListPage
function FoldersList(){ 
    const navigate = useNavigate();
    const [authUser, setAuthUser] = useState(null);
    const [folders, setFolders] = useState([]); // Renamed from 'folder' to 'folders' for clarity (plural)
    const [loading, setLoading] = useState(true); // Loading state for fetching folders
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');

    const showCustomMessage = (msg, type = 'info') => {
        setMessage(msg);
        setMessageType(type);
    };
    const closeCustomMessage = () => setMessage('');

    // 1. Authenticate user and set authUser state
    useEffect(()=>{
        const unsubscribeAuth = onAuthStateChanged(auth, (user)=>{
            setAuthUser(user);
            if (!user) {
                // If user logs out or is not authenticated, redirect to sign-in
                navigate('/signin'); 
            }
        });
        return () => unsubscribeAuth();
    },[navigate]);

    // 2. Fetch user's folders from Firestore in real-time using onSnapshot
    useEffect(() => {
        if (!authUser) {
            setFolders([]); // Clear folders if no user
            setLoading(false);
            return;
        }
        
        setLoading(true);
        showCustomMessage('Loading your folders...', 'info');

        try {
            const foldersCollectionRef = collection(db, "folders");
            // Query folders owned by the current user, ordered by creation time
            const q = query(
                foldersCollectionRef, 
                where("ownerId", "==", authUser.uid)
                // orderBy("createdAt", "desc") // Add orderBy if you want a specific order
            );

            // Set up real-time listener
            const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
                const fetchedFolders = querySnapshot.docs.map(doc => ({
                    id: doc.id, // Store Firestore document ID
                    ...doc.data()
                }));
                setFolders(fetchedFolders);
                setLoading(false);
                showCustomMessage(''); // Clear loading message
                console.log("Real-time folders fetched from Firestore:", fetchedFolders);
            }, (error) => {
                console.error("Error fetching real-time folders from Firestore:", error);
                showCustomMessage(`Error loading folders: ${error.message}`, 'error');
                setLoading(false);
            });

            return () => unsubscribeFirestore(); // Unsubscribe when component unmounts or authUser changes
        } catch (error) {
            console.error("Failed to set up Firestore listener:", error);
            showCustomMessage(`Failed to load folders: ${error.message}`, 'error');
            setLoading(false);
        }
    }, [authUser]); // Re-run when authUser changes

    // Handle click on an existing folder
    const handleClick = useCallback((folderId, folderName, e) => {
        e.preventDefault();
        // Navigate to the page that displays decks within this folder
        // Pass the Firestore folderId and name in state
        navigate(`/folders/${folderId}/decks`, { state: { folderId: folderId, folderName: folderName } });
    }, [navigate]);

    // Handle click on "Create New Folder" button
    const handleCreate = useCallback((e) => {
        e.preventDefault();
        navigate("/createfolder"); // Navigate to the CreateFolderPage
    }, [navigate]);

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <CustomMessage message={message} type={messageType} onClose={closeCustomMessage} />

            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">My Folders</h1>
            
            {loading ? (
                <div className="text-center text-gray-600 text-lg">Loading folders...</div>
            ) : (
                <div className={`${styles.folderListContainer} flex justify-center flex-wrap gap-4`}>
                    {folders.length > 0 ? (
                        folders.map((folderItem) => (
                            <div 
                                key={folderItem.id} // Use Firestore document ID as key
                                onClick={(e) => handleClick(folderItem.id, folderItem.name, e)} 
                                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer p-6 flex flex-col items-center justify-center text-center w-48 h-48 border border-gray-200"
                            >
                                <i className="fa-solid fa-folder text-6xl text-blue-500 mb-3"></i>
                                <h2 className="text-lg font-semibold text-gray-800 truncate w-full">{folderItem.name}</h2>
                                <p className="text-sm text-gray-500 mt-1">{folderItem.deckCount} decks</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-600 text-lg col-span-full">
                            No folders found. Click the '+' button to create your first folder!
                        </div>
                    )}

                    {/* Button to create a new folder */}
                    <div 
                        onClick={handleCreate} 
                        className="bg-gray-100 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer p-6 flex flex-col items-center justify-center text-center w-48 h-48 border-2 border-dashed border-gray-300 hover:border-blue-400"
                    >
                        <i className="fa fa-plus text-6xl text-gray-400 mb-3"></i>
                        <h2 className="text-lg font-semibold text-gray-600">Create New Folder</h2>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FoldersList;