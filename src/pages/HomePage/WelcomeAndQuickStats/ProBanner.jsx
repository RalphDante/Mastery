import React, { useState, useEffect } from 'react';
import { X, Sparkles, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProBanner = () => {
  // Set end date to 7 days from now
  const endDate = new Date('2025-08-28T23:59:59'); // Replace with your actual end date
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const navigate = useNavigate();

  const calculateTimeLeft = () => {
    const now = new Date();
    const difference = endDate - now;
    
    if (difference > 0) {
      const days = Math.ceil(difference / (1000 * 60 * 60 * 24));
      return days;
    }
    return 0;
  };

  useEffect(() => {
    // Calculate initial time left
    setTimeLeft(calculateTimeLeft());
    
    // Update every hour (or every minute if you want more precision)
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      // Hide banner when time expires
      if (newTimeLeft <= 0) {
        setIsVisible(false);
      }
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="relative bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 rounded-lg p-4 mb-6 shadow-lg border border-purple-400/20">
      {/* Close button */}
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsVisible(false);
        }}
        className="absolute top-1 right-1 text-white/80 hover:text-white transition-colors z-20 hover:bg-white/10 rounded"
      >
        <X size={16} />
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 rounded-full p-2">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">
              Pro features for $1 first month
            </h3>
            <p className="text-white/90 text-sm">
              Unlimited AI generations • Smart review features • Priority support
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-white/90">
            <Clock size={16} />
            <span className="text-sm font-medium">
              Ends in {timeLeft} {timeLeft === 1 ? 'day' : 'days'}
            </span>
          </div>
          <button 
            className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-md"
            onClick={() => navigate("/pricing")}
          >
            Upgrade Now
          </button>
        </div>
      </div>

      {/* Subtle animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-pulse pointer-events-none"></div>
    </div>
  );
};

export default ProBanner;