import React, { useState, useEffect } from 'react';
import { X, Sparkles, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProBanner = ({ onUpgradeClick }) => {
  const navigate = useNavigate();
  // Set end date to 7 days from now
  const endDate = new Date('2025-08-28T23:59:59'); // Replace with your actual end date
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0
  });
  const [isVisible, setIsVisible] = useState(true);

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
        className="absolute top-1 right-1 text-white/60 hover:text-white/80 transition-colors z-20 hover:bg-white/10 rounded "
      >
        <X size={12} />
      </button>

      {/* Mobile: Stack vertically, Desktop: Side by side */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        {/* Content section */}
        <div className="flex items-start sm:items-center space-x-3 pr-8 sm:pr-0">
          <div className="bg-white/20 rounded-full p-1.5 sm:p-2 flex-shrink-0">
            <Sparkles className="text-white w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold text-base sm:text-lg leading-tight">
              🔥 FLASH SALE: Pro Features for Only $1!
            </h3>
            <p className="text-white/95 text-xs sm:text-sm mt-0.5 leading-tight">
              Regular price $4.99 - Save 80%! • Unlimited AI • Smart reviews • Priority support
            </p>
          </div>
        </div>

        {/* CTA section with countdown */}
        <div className="flex items-center justify-between sm:justify-end sm:space-x-6">
          {/* Countdown Timer */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-white">
            <Clock size={14} className="sm:w-4 sm:h-4 animate-pulse" />
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-bold">
              <div className="bg-white/20 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                {timeLeft.days.toString().padStart(2, '0')}
              </div>
              <span className="text-white/80">:</span>
              <div className="bg-white/20 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                {timeLeft.hours.toString().padStart(2, '0')}
              </div>
              <span className="text-white/80">:</span>
              <div className="bg-white/20 rounded px-1.5 py-0.5 min-w-[24px] text-center">
                {timeLeft.minutes.toString().padStart(2, '0')}
              </div>
            </div>
          </div>
          
          {/* Labels for countdown (desktop only) */}
          <div className="hidden sm:flex text-xs text-white/80 space-x-4 -ml-2">
            <span>Days</span>
            <span>Hours</span>
            <span>Mins</span>
          </div>

          <button 
            className="bg-yellow-400 text-black px-4 sm:px-6 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-bold hover:bg-yellow-300 transition-colors shadow-lg text-sm sm:text-base whitespace-nowrap ml-3 sm:ml-4 border-2 border-yellow-500"
            onClick={()=>navigate('/pricing')}
          >
            Claim $1 Deal!
          </button>
        </div>
      </div>
      
      {/* Mobile countdown labels */}
      <div className="flex sm:hidden text-xs text-white/80 space-x-8 mt-2 ml-12">
        <span>Days</span>
        <span>Hours</span>
        <span>Minutes</span>
      </div>
    </div>
  );
};

export default ProBanner;