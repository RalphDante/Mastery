import { Users, BookOpen, TrendingUp, Copy, Star, Loader, Eye, ArrowDown, ArrowUp } from 'lucide-react';
import getPopularDecks from './getPopularDecks';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function MostCopiesSection() {
    const [displayLimit, setDisplayLimit] = useState(3); // How many to show
    const [allDecks, setAllDecks] = useState([]); // Only 3 for preview
    const [loading, setLoading] = useState(false);

    const [activeDeck, setActiveDeck] = useState(0);

    const navigate = useNavigate();
    const MAX_DECKS = 12; // Maximum we'll ever fetch

    useEffect(() => {
        async function fetchTopDecks() {
            try {
                setLoading(true);
                const topDecks = await getPopularDecks(MAX_DECKS); // Fetch all 12 once
                setAllDecks(topDecks);
            } catch(error) {
                console.log("Error loading top decks: ", error);
            } finally {
                setLoading(false);
            }
        }
        fetchTopDecks();
    }, []); // Only runs once on mount

    useEffect(() => {
        if (allDecks.length === 0) return;
        const interval = setInterval(() => {
            setActiveDeck(prev => (prev + 1) % allDecks.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [allDecks]);

    if (loading) {
        return (
            <section className="mb-16">
                
                <div className="flex items-center justify-center py-16">
                    <Loader className="w-8 h-8 text-purple-400 animate-spin" />
                    <span className="ml-3 text-slate-400">Loading featured decks...</span>
                </div>
            </section>
        );
    }

    // Show only the first 'displayLimit' decks
    const decksToShow = allDecks.slice(0, displayLimit);

    const getCategoryColor = (category) => {
        const colors = {
            Medicine: "bg-red-500/20 text-red-300 border-red-500/30",
            Language: "bg-blue-500/20 text-blue-300 border-blue-500/30",
            Technology: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        };
        return colors[category] || "bg-gray-500/20 text-gray-300 border-gray-500/30";
    };

    return (
        <section className="mb-16 text-left bg-black/20 backdrop-blur-sm rounded-3xl p-8 mb-20 border border-white/10">
            <div className="flex flex-col items-center">
                <div className="flex items-center">
                    <h3 className="text-3xl font-bold text-slate-100">
                        <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent block animate-pulse">
                             Hot Decks
                        </span>
                    </h3>
                   

                </div>
            </div>

            {/* Cards Grid */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {decksToShow.map((deck, index) => {
                    const isActive = index === activeDeck;
                    return (
                        <div
                            key={deck.id}
                            className={`relative bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border transition-all duration-500
                                ${isActive 
                                ? 'border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-purple-500/10 shadow-2xl shadow-violet-500/25 scale-105 z-10'
                                : 'border-white/10 hover:border-white/20'
                                }`}
                            style={{ transition: 'all 0.5s cubic-bezier(.4,2,.6,1)' }}
                        >
                            {/* Category Badge */}
                            {deck.tags && deck.tags.length > 0 && (
                                <div className="flex justify-end mb-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(deck.tags[0])}`}>
                                        {deck.tags[0]}
                                    </span>
                                </div>
                            )}

                            {/* Deck Info */}
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-slate-100 mb-2 line-clamp-2">
                                    {deck.title}
                                </h3>
                                
                                <p className="text-slate-400 text-sm mb-3 line-clamp-3">
                                    {deck.description}
                                </p>
                                
                                <div className="text-sm text-slate-500 mb-1">
                                    by {deck.ownerDisplayName || 'Anonymous'}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between mb-4 text-sm text-slate-500">
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-1">
                                        <BookOpen className="w-4 h-4" />
                                        <span>{deck.cardCount}</span>
                                    </div>
                                    {deck.rating && (
                                        <div className="flex items-center space-x-1">
                                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                            <span>{deck.rating}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center space-x-1 text-purple-400">
                                    <Users className="w-4 h-4" />
                                    <span className="font-semibold">{(deck.copies || 0).toLocaleString()}</span>
                                </div>
                            
                            </div>

                        {/* Action Button */}
                        <button 
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                            onClick={() => navigate(`/flashcards/${deck.id}`)}
                        >
                            <Eye className="w-4 h-4" />
                            <span>Preview Deck</span>
                        </button>
                       
                        
                    </div>
                    );
                    
                })}
            </div>
            {/* Section Header */}
            

            
        </section>
    );
}

export default MostCopiesSection;