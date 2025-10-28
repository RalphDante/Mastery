import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

function DemoDeckCard({ deck, onSelect }) {
  const difficultyColors = {
    'Easy': 'text-green-400 border-green-500/30 bg-green-500/10',
    'Medium': 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    'Hard': 'text-red-400 border-red-500/30 bg-red-500/10'
  };
  const navigate = useNavigate();
  
  return (
    <button
      onClick={onSelect}
      className="group relative bg-slate-700 hover:bg-slate-800 border-2 border-slate-600/50 
                 hover:border-purple-500/50 rounded-xl p-4 text-left transition-all 
                 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20"
    >
      {/* Deck Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-white font-bold text-lg group-hover:text-purple-300 transition-colors">
          {deck.title}
        </h4>
        <div className={`text-xs font-mono px-2 py-1 rounded border ${difficultyColors[deck.difficulty]}`}>
          {deck.difficulty}
        </div>
      </div>

      {/* Description */}
      <p className="text-white/60 text-sm mb-3 line-clamp-2">
        {deck.description}
      </p>

      {/* Stats Row - THIS IS THE EGO STROKING PART */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {/* Card Count */}
          <div className="flex items-center gap-1 text-white/70">
            <span className="text-purple-400">📚</span>
            <span className="font-mono">{deck.cardCount} cards</span>
          </div>
          
          {/* Avg Time */}
          <div className="flex items-center gap-1 text-white/70">
            <span className="text-blue-400">⏱️</span>
            <span className="font-mono">{deck.avgTime}</span>
          </div>
        </div>

        {/* XP Reward - EGO STROKE */}
        <div className="flex items-center gap-1 text-yellow-400 font-bold font-mono">
          <span>+{deck.estimatedXP}</span>
          <span className="text-xs">XP</span>
        </div>
      </div>

      {/* Hover Arrow Indicator */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 
                      group-hover:translate-x-1 transition-all">
        <ArrowRight className="text-purple-400" size={20} />
      </div>
    </button>
  );
}

export default DemoDeckCard;