import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../api/firebase';
import { useAuth } from '../../hooks/useAuth';
import LimitReachedModal from './LimitReachedModal';

// Context
import { useAuthContext } from '../../contexts/AuthContext';

import { useNavigate } from 'react-router-dom';

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

function CreateFolderModal({ isOpen, onClose, onFolderCreated }) {
    // Context
    const {getFolderLimits} = useAuthContext()
    const { signIn } = useAuth();
    const [folderName, setFolderName] = useState("");
    const [folderDescription, setFolderDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [showLimitModal, setShowLimitModal] = useState(false);

    const navigate = useNavigate()
    
    // Use actual Firebase auth hook
    const [user, authLoading, authError] = useAuthState(auth);

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

        // Validation
        if (!folderName.trim() || !folderDescription.trim()) {
            showCustomMessage("Please enter both Folder Name and Description.", 'error');
            setLoading(false);
            return;
        }

        const {canGenerate, maxFolders} = getFolderLimits()
        if(!canGenerate){
            setShowLimitModal(true)
            setLoading(false);
            return;
        }

        if (!user) {
            showCustomMessage("You must be signed in to create a folder.", 'error');
            setLoading(false);
            return;
        }

        try {
            // Create folder document in Firestore
            const foldersCollection = collection(db, 'folders');
            const newFolderData = {
                name: folderName.trim(),
                description: folderDescription.trim(), // Added description field
                ownerId: user.uid, // Reference to the user who owns this folder
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                subscriptionTier: "free", // Default tier
                isPublic: false, // Default to private
                deckCount: 0 // Initialize with 0 decks
            };

            const docRef = await addDoc(foldersCollection, newFolderData);
            
            console.log("Folder created with ID:", docRef.id);
            showCustomMessage("Folder created successfully!", 'success');
            
            // Call the callback with the new folder data
            if (onFolderCreated) {
                onFolderCreated(docRef.id, folderName.trim(), {
                    ...newFolderData,
                    id: docRef.id
                });
            }
            
            // Close modal after successful creation
            setTimeout(() => {
                onClose();
            }, 1500); // Give time to show success message
            
        } catch (error) {
            console.error("Error creating folder:", error);
            let errorMessage = "Failed to create folder. Please try again.";
            
            // Handle specific Firestore errors
            if (error.code === 'permission-denied') {
                errorMessage = "Permission denied. Please check your authentication.";
            } else if (error.code === 'unavailable') {
                errorMessage = "Service temporarily unavailable. Please try again later.";
            }
            
            showCustomMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
        {showLimitModal && (
              <LimitReachedModal 
                limitType={'folders'}
                onClose={() => setShowLimitModal(false)}
              />
            )}
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
                        id="modalFolderName"
                        value={folderName} 
                        className="bg-gray-700 text-slate-100 border border-gray-600 rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-violet-500"
                        onChange={(e) => setFolderName(e.target.value)}
                        placeholder='e.g., Science Studies'
                        disabled={loading || authLoading}
                    />
                </div>
                <div className="mb-6">
                    <label htmlFor="modalFolderDescription" className="block text-slate-300 text-sm font-semibold mb-2">
                        Description:
                    </label>
                    <textarea 
                        id="modalFolderDescription"
                        value={folderDescription} 
                        className="bg-gray-700 text-slate-100 border border-gray-600 rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-violet-500 h-24"
                        onChange={(e) => setFolderDescription(e.target.value)}
                        placeholder='A brief description of this folder (e.g., "All my biology notes")'
                        disabled={loading || authLoading}
                    />
                </div>
                
                <button 
                    className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    onClick={handleCreateFolder} 
                    disabled={loading || authLoading || !user}
                >
                    {loading ? 'Creating Folder...' : 'Create Folder'}
                </button>
                
                {authError && (
                    <p className="text-center text-sm text-red-400 mt-4">
                        Authentication error: {authError.message}
                    </p>
                )}
                
                {!authLoading && !user && (
                    <p className="text-center text-sm text-slate-400 mt-4">
                        Please{' '}
                        <span 
                            onClick={() => signIn()}
                            className="text-blue-400 hover:text-blue-300 cursor-pointer underline"
                        >
                            sign in
                        </span>
                        {' '}to create folders.
                    </p>
                )}
            </div>
        </div>

        </>
        
    );
}

export default CreateFolderModal;