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

// First Deck Celebration Toast
function FirstDeckCelebration() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    
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
      <div className="bg-slate-800 px-6 py-3 rounded-lg border border-slate-700 shadow-lg shadow-purple-500/20">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <div className="text-white">
            <div className="font-semibold text-sm">
              First Deck Created!
            </div>
            <div className="text-slate-300 text-xs mt-0.5">
              <span className="text-purple-400 font-medium">+100 XP</span> • You're on your way to mastery!
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Deck Incentive Toast - Shows BEFORE studying
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
      <div className="bg-slate-800 px-6 py-3 rounded-lg border border-slate-700 shadow-lg shadow-amber-500/20">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="text-white">
            <div className="font-semibold text-sm">
              Complete This Deck!
            </div>
            <div className="text-slate-300 text-xs mt-0.5">
              Earn <span className="text-amber-400 font-medium">+{xpAmount} XP</span> when you finish!
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Session Complete Toast - Shows AFTER finishing deck
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
      <div className="bg-slate-800 px-6 py-3 rounded-lg border border-slate-700 shadow-lg shadow-emerald-500/20">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="text-white">
            <div className="font-semibold text-sm">
              First Deck Complete!
            </div>
            <div className="text-slate-300 text-xs mt-0.5">
              <span className="text-emerald-400 font-medium">+{xpAmount} XP Earned</span> • Amazing work! 🎉
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Timer Started Toast
function TimerStartedToast({ xpAmount = 100, onComplete }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return createPortal(
    <div 
      className={`fixed top-4 left-4 right-4 sm:top-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[9999] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-slate-800 px-6 py-3 rounded-lg border border-slate-700 shadow-lg shadow-blue-500/20">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div className="text-white">
            <div className="font-semibold text-sm">
              Session Started
            </div>
            <div className="text-slate-300 text-xs mt-0.5">
              <span className="text-blue-400 font-medium">+{xpAmount} XP</span> earned
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Timer Incentive Toast
function TimerIncentiveToast({ xpAmount = 300, onComplete }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return createPortal(
    <div 
      className={`fixed top-4 left-4 right-4 sm:top-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[9999] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-slate-800 px-6 py-3 rounded-lg border border-slate-700 shadow-lg shadow-amber-500/20">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="text-white">
            <div className="font-semibold text-sm">
              Complete Your Session
            </div>
            <div className="text-slate-300 text-xs mt-0.5">
              Earn <span className="text-amber-400 font-medium">+{xpAmount} XP</span> when you finish
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Timer Complete Toast
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
      <div className="bg-slate-800 px-6 py-3 rounded-lg border border-slate-700 shadow-lg shadow-emerald-500/20">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="text-white">
            <div className="font-semibold text-sm">
              First Session Complete!
            </div>
            <div className="text-slate-300 text-xs mt-0.5">
              <span className="text-emerald-400 font-medium">+{xpAmount} XP Earned</span> <br></br>• Keep the momentum going! 🔥
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Welcome Toast
function WelcomeStudyToast({ xpAmount = 300, onComplete }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return createPortal(
    <div 
      className={`fixed top-4 left-4 right-4 sm:top-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[9999] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-slate-800 px-6 py-3 rounded-lg border border-slate-700 shadow-lg shadow-purple-500/20">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <div className="text-white">
            <div className="font-semibold text-sm">
              Your Party Needs You!
            </div>
            <div className="text-slate-300 text-xs mt-0.5">
              Start a study session and earn <span className="text-purple-400 font-medium">+{xpAmount} XP</span> for FREE!
            </div>
          </div>
        </div>
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