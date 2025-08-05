import { useState, useEffect } from "react";

export const EncourageBanner = ({ currentCard, totalCards, onSuccess }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [animate, setAnimate] = useState(false);
  
  

  // Trigger animation on mount
  useEffect(() => {
    setTimeout(() => setAnimate(true), 100);
  }, []);

  // Dynamic messages based on progress
  const getMessage = () => {
    if (currentCard === 0) return "🚀 Let's finish your first Smart Review session! You've got this!";
    if (currentCard >= 1 && currentCard < totalCards-1) return "💪 Great start! Keep going - you're building great habits!";
    return "✨ Almost there! Just 1 more card to complete your first session!";
  };

  if(currentCard === totalCards){
    onSuccess(true)
  }

  if (!isVisible) return null;

  return (
    <div className={`
      bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg shadow-xl border border-purple-500/50
      transition-all duration-500 ease-out transform
      ${animate ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'}
      hover:scale-105 hover:shadow-2xl
      animate-pulse
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
          <p className="font-semibold text-sm sm:text-base">{getMessage()}</p>
        </div>
        {/* Progress indicator */}
        
      </div>
      
      {/* Progress bar */}
      <div className="mt-2 w-full bg-white/20 rounded-full h-1">
        <div 
          className="bg-white h-1 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(currentCard / totalCards) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};