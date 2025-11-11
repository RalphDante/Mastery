import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Users } from 'lucide-react';

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

// Incentive Toast - Shows BEFORE studying to motivate completion
function DeckIncentiveToast({ xpAmount = 200, onComplete }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return createPortal(
    <div 
      className={`fixed top-4 left-4 right-4 sm:top-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[9999] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-amber-300">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-white">
            <div className="font-bold text-base sm:text-lg flex items-center gap-2">
              <span>Complete This Deck!</span>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
            </div>
            <div className="text-purple-100 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <span>Earn</span>
              <span className="font-semibold text-yellow-300">+{xpAmount} XP</span>
              <span>when you finish!</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Completion Toast - Shows AFTER finishing the deck
function SessionCompleteToast({ xpAmount = 200, onComplete }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return createPortal(
    <div 
      className={`fixed top-4 left-4 right-4 sm:top-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[9999] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-emerald-400">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-white">
            <div className="font-bold text-base sm:text-lg flex items-center gap-2">
              <span>First Deck Complete!</span>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
            </div>
            <div className="text-emerald-100 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-yellow-300">+{xpAmount} XP Earned</span>
              <span>•</span>
              <span>Amazing work! 🎉</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Timer Started Celebration - Shows RIGHT after starting (+100 XP earned)
function TimerStartedToast({ xpAmount = 100, onComplete }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return createPortal(
    <div 
      className={`fixed top-4 left-4 right-4 sm:top-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[9999] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-purple-400">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-white">
            <div className="font-bold text-base sm:text-lg flex items-center gap-2">
              <span>Session Started!</span>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
            </div>
            <div className="text-purple-100 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-yellow-300">+{xpAmount} XP</span>
              <span>•</span>
              <span>Great start! Keep going! 🚀</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Timer Incentive Toast - Shows AFTER started toast (motivates completion)
function TimerIncentiveToast({ xpAmount = 300, onComplete }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return createPortal(
    <div 
      className={`fixed top-4 left-4 right-4 sm:top-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[9999] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-amber-300">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-white">
            <div className="font-bold text-base sm:text-lg flex items-center gap-2">
              <span>Complete Your Study Session!</span>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-200" />
            </div>
            <div className="text-amber-50 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <span>Earn</span>
              <span className="font-semibold text-yellow-200">+{xpAmount} XP</span>
              <span>when you finish! ⏱️</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Timer Complete Toast - Shows AFTER finishing timer
function TimerCompleteToast({ xpAmount = 300, onComplete }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return createPortal(
    <div 
      className={`fixed top-4 left-4 right-4 sm:top-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[9999] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-emerald-400">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-white">
            <div className="font-bold text-base sm:text-lg flex items-center gap-2">
              <span>First Session Complete!</span>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
            </div>
            <div className="text-emerald-100 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-yellow-300">+{xpAmount} XP Earned</span>
              <span>•</span>
              <span>Keep the momentum going! 🔥</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Welcome Toast - Encourages user to start studying
function WelcomeStudyToast({ xpAmount = 300, onComplete }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, 5000); // Show a bit longer for first-time message

    return () => clearTimeout(timer);
  }, [onComplete]);

  return createPortal(
    <div 
      className={`fixed top-4 left-4 right-4 sm:top-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[9999] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-violet-400 relative overflow-hidden">
        {/* Animated shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" 
             style={{ animation: 'shimmer 3s infinite' }} />
        
        <div className="flex items-center gap-3 sm:gap-4 relative z-10">
          {/* <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-yellow-400 rounded-full animate-bounce">
            <span className="text-xl sm:text-2xl">⚡</span>
          </div> */}
          
          <div className="text-white flex-1">
            <div className="font-bold text-base sm:text-lg flex items-center gap-2">
              <span>Your Party Needs You!</span>
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
            </div>
           <div className="text-purple-100 text-xs sm:text-sm text-center px-2 leading-relaxed">
              Start a study session and earn up to{' '}
              <span className="font-bold text-yellow-300 text-sm sm:text-base whitespace-nowrap">+{xpAmount} XP</span>
              {' '}<span className="font-semibold">for FREE!</span>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
}

export { 
  FirstDeckCelebration, 
  Confetti, 
  DeckIncentiveToast, 
  SessionCompleteToast,
  TimerStartedToast,
  TimerIncentiveToast,
  TimerCompleteToast,
  WelcomeStudyToast
};