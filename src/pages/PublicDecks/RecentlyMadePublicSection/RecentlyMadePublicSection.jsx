import { Clock, Calendar, BookOpen, Users, Star, Copy } from "lucide-react";

function RecentlyMadePublicSection() {
    const recentDecks = [
        {
            id: 4,
            title: "Introduction to Machine Learning",
            author: "Prof. David Kim",
            copies: 45,
            cards: 167,
            rating: 4.6,
            category: "Technology",
            description: "Basic concepts and algorithms in machine learning for beginners. Basic concepts and algorithms in machine learning for beginners.",
            publishedDate: "2 hours ago",
            isNew: true
        },
        {
            id: 5,
            title: "Italian Cooking Terms",
            author: "Chef Marco Rossi",
            copies: 23,
            cards: 89,
            rating: 4.8,
            category: "Culinary",
            description: "Essential Italian culinary vocabulary for aspiring chefs.",
            publishedDate: "5 hours ago",
            isNew: true
        },
        {
            id: 6,
            title: "Art History: Renaissance",
            author: "Dr. Emily Foster",
            copies: 67,
            cards: 234,
            rating: 4.7,
            category: "Art",
            description: "Major works and artists from the Renaissance period.",
            publishedDate: "1 day ago",
            isNew: false
        },
        {
            id: 7,
            title: "Basic Financial Literacy",
            author: "Sarah Johnson",
            copies: 156,
            cards: 198,
            rating: 4.5,
            category: "Finance",
            description: "Essential financial concepts everyone should know.",
            publishedDate: "2 days ago",
            isNew: false
        },
    ];

    const getCategoryColor = (category) => {
        const colors = {
            Technology: "bg-purple-500/20 text-purple-300 border-purple-500/30",
            Culinary: "bg-orange-500/20 text-orange-300 border-orange-500/30",
            Art: "bg-pink-500/20 text-pink-300 border-pink-500/30",
            Finance: "bg-green-500/20 text-green-300 border-green-500/30",
        };
        return colors[category] || "bg-gray-500/20 text-gray-300 border-gray-500/30";
    };

    return (
        <section>
            {/* Section Header */}
            <div className="flex items-center mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-3 rounded-xl mr-4">
                    <Clock className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-slate-100">Recently Published</h2>
                    <p className="text-slate-400 mt-1">Fresh content from our community</p>
                </div>
            </div>

            {/* Cards Grid - Different layout for recent decks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recentDecks.map((deck) => (
                    <div
                        key={deck.id}
                        className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 relative"
                    >
                        {/* New Badge */}
                        {deck.isNew && (
                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                NEW
                            </div>
                        )}

                        {/* Category Badge */}
                        <div className="flex justify-between items-start mb-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(deck.category)}`}>
                                {deck.category}
                            </span>
                            <div className="flex items-center space-x-1 text-xs text-slate-500">
                                <Calendar className="w-3 h-3" />
                                <span>{deck.publishedDate}</span>
                            </div>
                        </div>

                        {/* Deck Info */}
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-slate-100 mb-2 line-clamp-2">
                                {deck.title}
                            </h3>
                            
                            <p className="text-slate-400 text-sm mb-3 line-clamp-3">
                                {deck.description}
                            </p>
                            
                            <div className="text-sm text-slate-500 mb-1">
                                by {deck.author}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between mb-4 text-sm text-slate-500">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1">
                                    <BookOpen className="w-4 h-4" />
                                    <span>{deck.cards}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                    <span>{deck.rating}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-1 text-blue-400">
                                <Users className="w-4 h-4" />
                                <span className="font-semibold">{deck.copies}</span>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2">
                            <Copy className="w-4 h-4" />
                            <span>Copy Deck</span>
                        </button>
                    </div>
                ))}
            </div>

            {/* View More Button */}
            <div className="mt-6 text-center">
                <button className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200">
                    View all recent decks →
                </button>
            </div>
        </section>
    );
}

export default RecentlyMadePublicSection;