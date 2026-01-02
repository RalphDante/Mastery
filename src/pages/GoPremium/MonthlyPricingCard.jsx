import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const MonthlyPricingCard = ({ masteryStudyProMonthlyPrice = "$1", priceIds, openCheckout, FeatureList }) => {
  // Set end date to match your banner
  const endDate = new Date('2025-08-28T23:59:59');
  
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
    <div className="bg-white rounded-2xl p-8 text-gray-800 shadow-lg relative border-2 border-red-300">
      {/* Flash Sale Banner */}
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
        <div className="bg-red-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
          🔥 FLASH SALE - 80% OFF
        </div>
      </div>
      <div className="text-center mt-4 pb-4">
        <h3 className="text-2xl font-bold mb-4">Monthly</h3>
        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-1">Limited time offer</div>
          
          {/* Price with strikethrough */}
          <div className="mb-2">
            <span className="text-xl text-gray-400 line-through mr-2">$4.99</span>
            <span className="text-5xl font-bold text-red-600 mb-1">{masteryStudyProMonthlyPrice}</span>
          </div>
          
          <div className="text-lg text-gray-600 mb-2">/first month</div>
          <div className="text-sm text-orange-600 font-semibold">Then $4.99/month</div>
        </div>

        

        <div className="text-sm text-gray-600 mb-6">Recurring billing. Cancel anytime.</div>
        
        {/* Enhanced CTA Button */}
        <button 
          className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg border-2 border-red-400 transform hover:scale-105"
          onClick={() => openCheckout(priceIds.proMonthly, 'pro')}
        >
          🔥 Claim $1 Deal Now!
        </button>
        
        {/* Money back guarantee */}
        
      </div>

      <div>
        {FeatureList()}

      </div>
      
    </div>
  );
};

export default MonthlyPricingCard;