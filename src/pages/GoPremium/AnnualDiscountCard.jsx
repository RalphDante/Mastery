import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const AnnualDiscountCard = ({ priceIds, openCheckout, FeatureList }) => {
  // Set end date for the offer
  const endDate = new Date('2026-01-15T23:59:59Z'); 
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0
  });

  const calculateTimeLeft = () => {
    const now = new Date();
    const difference = endDate - now;
    
    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return { days, hours };
    }
    return { days: 0, hours: 0 };
  };

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 lg:p-8 text-gray-800 relative shadow-xl border-2 border-red-300">
      {/* Flash Sale Banner */}
      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
        <div className="bg-red-500 text-center text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
          NEW YEAR SPECIAL - 50% OFF FIRST YEAR
        </div>
      </div>
      
      <div className="text-center">
        <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Founding Member</h3>
        
        <div className="mb-3 sm:mb-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">
            First year billed at $19.99, that's like
          </div>
          <div className="text-4xl sm:text-5xl font-bold text-red-600 mb-1">$1.66</div>
          <div className="text-base sm:text-lg text-gray-600">/month</div>
          <div className="text-xs text-gray-500 mt-2">
            (Regular price: <span className="line-through">$39.99/year</span>)
          </div>
          <div className="text-xs text-orange-600 font-semibold mt-1">
            Then $39.99/year after first year
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-center space-x-2 text-red-600 mb-1">
            <Clock size={16} className="animate-pulse" />
            <span className="text-sm font-semibold">
              Offer expires in: {timeLeft.days} days {timeLeft.hours} hours
            </span>
          </div>
          <span className="text-xs font-semibold text-orange-600">
            2/50 spots reserved 
          </span>
        </div>

        <div className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Start with free 7-day trial</div>
        
        <button 
          className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg border-2 border-red-400 transform hover:scale-105 mb-4"
          onClick={() => openCheckout(priceIds.proYearly, 'pro', '2026LOCKIN')}
        >
           Start My 7-Day Free Trial
        </button>
        
        <FeatureList />
      </div>
    </div>
  );
};

export default AnnualDiscountCard;