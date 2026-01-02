import React, { useState, useEffect } from 'react';
import { X, Sparkles, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../../contexts/AuthContext';

const ProBanner = ({ onUpgradeClick }) => {
  const {userProfile} = useAuthContext();
  const currentUser = userProfile;
  const isPro = currentUser?.subscription?.tier === "pro";


  const location = useLocation();

  const HIDDEN_ROUTES = ['/pricing', '/welcome-pro'];

  const shouldHide =
    isPro ||
    HIDDEN_ROUTES.some(route =>
      location.pathname.startsWith(route)
    );

  if (shouldHide) return null;

  const navigate = useNavigate();
  // Set end date to 7 days from now
  const endDate = new Date('2026-01-15T23:59:59Z'); // Replace with your actual end date
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0
  });
  const [isVisible, setIsVisible] = useState(isPro ? false : true);

  const calculateTimeLeft = () => {
    const now = new Date();
    const difference = endDate - now;
    
    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      
      return { days, hours, minutes };
    }
    return { days: 0, hours: 0, minutes: 0 };
  };

  useEffect(() => {
    // Calculate initial time left
    setTimeLeft(calculateTimeLeft());
    
    // Update every minute for real-time countdown
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      // Hide banner when time expires
      if (newTimeLeft.days <= 0 && newTimeLeft.hours <= 0 && newTimeLeft.minutes <= 0) {
        setIsVisible(false);
      }
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="relative bg-gradient-to-r from-red-500 via-orange-500 to-red-600 rounded-lg p-3 sm:p-4 shadow-lg border border-red-400/20">
      {/* Subtle animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse pointer-events-none opacity-50"></div>
      
      {/* Close button - smaller and less prominent */}
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsVisible(false);
        }}
        className="absolute top-1 right-1 text-white/60 hover:text-white/80 transition-colors z-20 hover:bg-white/10 rounded p-1"
      >
        <X size={16} />
      </button>

      {/* Desktop/Tablet Layout */}
      <div className="hidden sm:flex items-center justify-between">
        {/* Content section */}
        <div className="flex items-center space-x-3 flex-1 min-w-0 pr-4">
          <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold text-lg leading-tight">
              🔥 NEW YEAR SPECIAL: $1.66/mo First Year!
            </h3>
            <p className="text-white/95 text-sm mt-0.5 leading-tight">
              Just $19.99 first year, then $39.99/year • 2/50 spots left
            </p>
          </div>
        </div>

        {/* Timer and CTA section */}
        <div className="flex items-center space-x-4 flex-shrink-0">
          {/* Countdown Timer with labels */}
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-2 text-white">
              <Clock size={16} className="animate-pulse" />
              <div className="flex items-center space-x-2 text-sm font-bold">
                <div className="flex flex-col items-center">
                  <div className="bg-white/20 rounded px-2 py-1 min-w-[32px] text-center">
                    {timeLeft.days.toString().padStart(2, '0')}
                  </div>
                  <span className="text-[10px] text-white/80 mt-1">Days</span>
                </div>
                <span className="text-white/80 mb-4">:</span>
                <div className="flex flex-col items-center">
                  <div className="bg-white/20 rounded px-2 py-1 min-w-[32px] text-center">
                    {timeLeft.hours.toString().padStart(2, '0')}
                  </div>
                  <span className="text-[10px] text-white/80 mt-1">Hours</span>
                </div>
                <span className="text-white/80 mb-4">:</span>
                <div className="flex flex-col items-center">
                  <div className="bg-white/20 rounded px-2 py-1 min-w-[32px] text-center">
                    {timeLeft.minutes.toString().padStart(2, '0')}
                  </div>
                  <span className="text-[10px] text-white/80 mt-1">Mins</span>
                </div>
              </div>
            </div>
          </div>

          <button 
            className="bg-yellow-400 text-black px-6 py-2 rounded-lg font-bold hover:bg-yellow-300 transition-colors shadow-lg text-base whitespace-nowrap border-2 border-yellow-500"
            onClick={()=>navigate('/pricing')}
          >
            Get 50% Off
          </button>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="sm:hidden space-y-3">
        {/* Content section */}
        <div className="flex items-start space-x-2 pr-6">
          <div className="bg-white/20 rounded-full p-1.5 flex-shrink-0">
            <Sparkles className="text-white w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold text-sm leading-tight">
              🔥 NEW YEAR: $1.66/mo First Year!
            </h3>
            <p className="text-white/95 text-xs mt-0.5 leading-tight">
              $19.99 first year, then $39.99/year
            </p>
          </div>
        </div>

        {/* Timer and CTA row */}
        <div className="flex items-center justify-between space-x-2">
          {/* Countdown Timer */}
          <div className="flex items-center space-x-1.5 text-white">
            <Clock size={12} className="animate-pulse flex-shrink-0" />
            <div className="flex items-center space-x-1 text-xs font-bold">
              <div className="flex flex-col items-center">
                <div className="bg-white/20 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                  {timeLeft.days.toString().padStart(2, '0')}
                </div>
                <span className="text-[9px] text-white/70 mt-0.5">Days</span>
              </div>
              <span className="text-white/80 mb-3">:</span>
              <div className="flex flex-col items-center">
                <div className="bg-white/20 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                  {timeLeft.hours.toString().padStart(2, '0')}
                </div>
                <span className="text-[9px] text-white/70 mt-0.5">Hrs</span>
              </div>
              <span className="text-white/80 mb-3">:</span>
              <div className="flex flex-col items-center">
                <div className="bg-white/20 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                  {timeLeft.minutes.toString().padStart(2, '0')}
                </div>
                <span className="text-[9px] text-white/70 mt-0.5">Min</span>
              </div>
            </div>
          </div>

          <button 
            className="bg-yellow-400 text-black px-3 py-1.5 rounded-md font-bold hover:bg-yellow-300 transition-colors shadow-lg text-xs whitespace-nowrap border-2 border-yellow-500 flex-shrink-0"
            onClick={()=>navigate('/pricing')}
          >
            Get 50% Off
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProBanner;