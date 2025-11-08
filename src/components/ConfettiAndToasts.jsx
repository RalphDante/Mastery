
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from 'lucide-react';

// Confetti Component
function Confetti() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDelay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 5)]
    }));
    setParticles(newParticles);
  }, []);

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            left: `${particle.left}%`,
            top: '-10px',
            backgroundColor: particle.color,
            animationDelay: `${particle.animationDelay}s`,
            animationDuration: `${particle.duration}s`
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>,
    document.body
  );
}

// Floating Celebration Toast
function FirstDeckCelebration() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Slide in after a tiny delay
    setTimeout(() => setIsVisible(true), 100);
    
    // Auto-hide after 4 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return createPortal(
    <div 
      className={`fixed top-4 left-4 right-4 sm:top-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[9999] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-purple-400">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-yellow-400 rounded-full animate-bounce">
            <span className="text-xl sm:text-2xl">🎉</span>
          </div> */}
          
          <div className="text-white">
            <div className="font-bold text-base sm:text-lg flex items-center gap-2">
              <span>First Deck Created!</span>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
            </div>
            <div className="text-purple-100 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-yellow-300">+100 XP</span>
              <span>•</span>
              <span>You're on your way to mastery!</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Export both components
export { FirstDeckCelebration, Confetti };