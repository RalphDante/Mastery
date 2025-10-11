// contexts/DeckCacheContext.js
import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuthContext } from './AuthContext';

const DeckCacheContext = createContext();

export const useDeckCache = () => {
    const context = useContext(DeckCacheContext);
    if (!context) {
        throw new Error('useDeckCache must be used within DeckCacheProvider');
    }
    return context;
};

export const DeckCacheProvider = ({ children }) => {
    const { user } = useAuthContext();
    
    // 📁 FOLDERS (with real-time listener - these change frequently)
    const [folders, setFolders] = useState([]);
    
    // 📦 CACHES (using refs to avoid re-renders)
    const deckMetadataCacheRef = useRef({}); // { deckId: metadata }
    const decksByFolderCacheRef = useRef({}); // { folderId: [decks] }
    const cardsCacheRef = useRef({}); // { deckId: [cards] }
    
    // 🕒 TIMESTAMP TRACKING (to know when cache was last updated)
    const cacheTimestampsRef = useRef({
        deckMetadata: {},
        decksByFolder: {},
        cards: {}
    });

    // ==========================================
    // FOLDERS LISTENER (only thing with real-time updates)
    // ==========================================
    
    useEffect(() => {
        if (!user) {
            setFolders([]);
            return;
        }

        console.log('📂 Setting up folders listener...');
        const foldersRef = collection(db, 'folders');
        const foldersQuery = query(foldersRef, where('ownerId', '==', user.uid));
        
        const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
            const fetchedFolders = [];
            snapshot.forEach((doc) => {
                fetchedFolders.push({ id: doc.id, ...doc.data() });
            });
            
            // Sort by updatedAt
            fetchedFolders.sort((a, b) => {
                const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
                const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
            
            setFolders(fetchedFolders);
            console.log('📁 Folders updated:', fetchedFolders.length);
        });

        return () => unsubFolders();
    }, [user]);

    // ==========================================
    // DECK METADATA
    // ==========================================
    
    const getDeckMetadata = useCallback(async (deckId, forceRefresh = false) => {
        if (!user || !deckId) return null;

        // Check cache first (unless force refresh)
        if (!forceRefresh && deckMetadataCacheRef.current[deckId]) {
            console.log(`📦 Using cached deck metadata for ${deckId}`);
            return deckMetadataCacheRef.current[deckId];
        }

        console.log(`🔍 Fetching deck metadata for ${deckId}...`);
        try {
            const deckRef = doc(db, 'decks', deckId);
            const deckSnap = await getDoc(deckRef);
            
            if (deckSnap.exists()) {
                const metadata = {
                    id: deckSnap.id,
                    ...deckSnap.data()
                };
                
                // Store in cache with timestamp
                deckMetadataCacheRef.current[deckId] = metadata;
                cacheTimestampsRef.current.deckMetadata[deckId] = Date.now();
                return metadata;
            }
            return null;
        } catch (err) {
            console.error('Error fetching deck metadata:', err);
            return null;
        }
    }, [user]);

    // ==========================================
    // DECKS BY FOLDER
    // ==========================================
    
    const getDecksByFolder = useCallback(async (folderId, forceRefresh = false) => {
        if (!user || !folderId) return [];

        // Check cache first (unless force refresh)
        if (!forceRefresh && decksByFolderCacheRef.current[folderId]) {
            console.log(`📦 Using cached decks for folder ${folderId}`);
            return decksByFolderCacheRef.current[folderId];
        }

        console.log(`🔍 Fetching decks for folder ${folderId}...`);
        try {
            const decksRef = collection(db, 'decks');
            const q = query(
                decksRef,
                where('folderId', '==', folderId),
                where('ownerId', '==', user.uid)
            );
            
            const snapshot = await getDocs(q);
            const fetchedDecks = [];
            snapshot.forEach((doc) => {
                const deckData = {
                    id: doc.id,
                    ...doc.data()
                };
                fetchedDecks.push(deckData);
                
                // BONUS: Store each deck in metadata cache too!
                deckMetadataCacheRef.current[doc.id] = deckData;
                cacheTimestampsRef.current.deckMetadata[doc.id] = Date.now();
            });

            // Sort by updatedAt
            fetchedDecks.sort((a, b) => {
                const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
                const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            // Store in cache with timestamp
            decksByFolderCacheRef.current[folderId] = fetchedDecks;
            cacheTimestampsRef.current.decksByFolder[folderId] = Date.now();
            return fetchedDecks;
        } catch (err) {
            console.error('Error fetching decks:', err);
            return [];
        }
    }, [user]);

    // ==========================================
    // FLASHCARDS (Simple cached fetch)
    // ==========================================
    
    const getCards = useCallback(async (deckId, forceRefresh = false) => {
        if (!user || !deckId) return [];

        // Check cache first (unless force refresh)
        if (!forceRefresh && cardsCacheRef.current[deckId]) {
            console.log(`📦 Using cached cards for deck ${deckId}`);
            return cardsCacheRef.current[deckId];
        }

        console.log(`🔍 Fetching cards for deck ${deckId}...`);
        try {
            const cardsRef = collection(db, 'decks', deckId, 'cards');
            const cardsQuery = query(cardsRef, orderBy('order', 'asc'));
            const snapshot = await getDocs(cardsQuery);
            
            const cards = [];
            snapshot.forEach((doc) => {
                cards.push({
                    id: doc.id,
                    ...doc.data(),
                    deckId: deckId
                });
            });

            // Store in cache with timestamp
            cardsCacheRef.current[deckId] = cards;
            cacheTimestampsRef.current.cards[deckId] = Date.now();
            return cards;
        } catch (err) {
            console.error('Error fetching cards:', err);
            return [];
        }
    }, [user]);

    // ==========================================
    // FETCH DECK AND CARDS (Convenience method)
    // ==========================================
    
    const fetchDeckAndCards = useCallback(async (deckId, forceRefresh = false) => {
        if (!user || user === undefined) {
            console.log('Auth state still loading or no user...');
            return { deck: null, cards: [], error: 'No user authenticated' };
        }

        if (!deckId) {
            return { deck: null, cards: [], error: 'No deck ID provided' };
        }

        try {
            // 1️⃣ FETCH DECK METADATA (using cache)
            const deckData = await getDeckMetadata(deckId, forceRefresh);
            
            if (!deckData) {
                return { deck: null, cards: [], error: 'Deck not found' };
            }
            
            // Enhanced access control logic
            const userOwnsTheDeck = deckData.ownerId === user?.uid;
            const deckIsPublic = deckData.isPublic;
            const hasAccess = userOwnsTheDeck || deckIsPublic;
            
            if (!hasAccess) {
                return { 
                    deck: null, 
                    cards: [], 
                    error: 'The owner of this deck has set it to private.'
                };
            }

            // 2️⃣ FETCH CARDS (using cache)
            const cards = await getCards(deckId, forceRefresh);

            return { 
                deck: deckData, 
                cards: cards, 
                error: null,
                isPublic: deckIsPublic && !userOwnsTheDeck
            };

        } catch (err) {
            console.error('Error in fetchDeckAndCards:', err);
            return { 
                deck: null, 
                cards: [], 
                error: 'Failed to load data'
            };
        }
    }, [user, getDeckMetadata, getCards]);

    // ==========================================
    // CACHE INVALIDATION
    // ==========================================
    
    const invalidateDeckMetadata = useCallback((deckId) => {
        delete deckMetadataCacheRef.current[deckId];
        delete cacheTimestampsRef.current.deckMetadata[deckId];
        console.log(`🗑️ Deck metadata cache invalidated for ${deckId}`);
    }, []);

    const invalidateFolderDecks = useCallback((folderId) => {
        delete decksByFolderCacheRef.current[folderId];
        delete cacheTimestampsRef.current.decksByFolder[folderId];
        console.log(`🗑️ Folder decks cache invalidated for ${folderId}`);
    }, []);

    const invalidateCards = useCallback((deckId) => {
        delete cardsCacheRef.current[deckId];
        delete cacheTimestampsRef.current.cards[deckId];
        console.log(`🗑️ Cards cache invalidated for ${deckId}`);
    }, []);

    const clearAllCache = useCallback(() => {
        deckMetadataCacheRef.current = {};
        decksByFolderCacheRef.current = {};
        cardsCacheRef.current = {};
        cacheTimestampsRef.current = {
            deckMetadata: {},
            decksByFolder: {},
            cards: {}
        };
        console.log(`🗑️ All caches cleared`);
    }, []);

    // ==========================================
    // CACHE UTILITIES
    // ==========================================
    
    const getCacheAge = useCallback((type, id) => {
        const timestamp = cacheTimestampsRef.current[type]?.[id];
        if (!timestamp) return null;
        return Date.now() - timestamp;
    }, []);

    const isCacheStale = useCallback((type, id, maxAgeMs = 5 * 60 * 1000) => {
        const age = getCacheAge(type, id);
        return age === null || age > maxAgeMs;
    }, [getCacheAge]);

    // ==========================================
    // PREFETCH FUNCTIONS (for optimization)
    // ==========================================
    
    const prefetchDeck = useCallback(async (deckId) => {
        if (!deckMetadataCacheRef.current[deckId]) {
            await getDeckMetadata(deckId);
        }
        if (!cardsCacheRef.current[deckId]) {
            await getCards(deckId);
        }
        console.log(`✅ Prefetched deck ${deckId}`);
    }, [getDeckMetadata, getCards]);

    const prefetchFolder = useCallback(async (folderId) => {
        if (!decksByFolderCacheRef.current[folderId]) {
            await getDecksByFolder(folderId);
        }
        console.log(`✅ Prefetched folder ${folderId}`);
    }, [getDecksByFolder]);

    // ==========================================
    // CONTEXT VALUE
    // ==========================================
    
    const value = {
        // Folders (real-time via onSnapshot)
        folders,
        
        // Simple cached getters
        getDeckMetadata,
        getDecksByFolder,
        getCards,
        
        // Convenience method
        fetchDeckAndCards,
        
        // Invalidators (call these after mutations)
        invalidateDeckMetadata,
        invalidateFolderDecks,
        invalidateCards,
        clearAllCache,
        
        // Cache utilities
        getCacheAge,
        isCacheStale,
        
        // Prefetch (for performance optimization)
        prefetchDeck,
        prefetchFolder
    };

    return (
        <DeckCacheContext.Provider value={value}>
            {children}
        </DeckCacheContext.Provider>
    );
};

// Export hook for folders
export const useFolders = () => {
    const { folders } = useDeckCache();
    return folders;
};