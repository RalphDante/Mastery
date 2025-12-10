import { createPortal } from "react-dom";
import { X, Flame, Trophy, Check } from "lucide-react";
import { arrayUnion, doc, setDoc, updateDoc } from "firebase/firestore";
import { useAuthContext } from "./AuthContext";
import { db } from "../api/firebase";
import { getRandomObtainableAvatar } from "../configs/avatarConfig";
import { useUserDataContext } from "./UserDataContext";

function StreakModal({ streak, onClose, user }) {
  const {userProfile} = useAuthContext();
  const currentUser = userProfile;
  const unlockedSkins = userProfile?.unlockedSkins;
  const { dailySessionsWithToday } = useUserDataContext();

  const last7Days = dailySessionsWithToday.slice(-7);
  


  const randomSkin = getRandomObtainableAvatar();

  const handleGiveReward = async () =>{
    if(!unlockedSkins){
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        unlockedSkins: arrayUnion(randomSkin)
      });
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-0 relative shadow-2xl animate-scale-in overflow-hidden">
          {/* Close button */}
          <button 
            onClick={() => onClose(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10 transition-colors"
          >
            <X size={24} />
          </button>

          {/* Header Section with Flame Animation */}
          <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-8 text-center relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full translate-x-20 translate-y-20"></div>
            
            {/* Flame Icon */}
            <div className="relative z-10 mb-4 flex justify-center">
             
              <img 
                src={`/images/icons/fire.gif`} 
                alt={'fire'}
                className="w-24 h-24 object-cover"
              />
              
            </div>

            <h2 className="text-3xl font-bold text-white mb-2 relative z-10">
              {streak === 1 ? "New Streak" : "Streak Maintained"}
            </h2>
            <p className="text-white/90 text-lg font-medium relative z-10">
              {streak}  {streak === 1 ? "day" : "days"} and counting!
            </p>
          </div>

          {/* Content Section */}
          <div className="p-6 space-y-4">
            

            <div className="flex justify-center gap-2 sm:gap-3 py-4 px-2">
              {last7Days.map((day, index) => {
                const hasStudied = day.minutesStudied > 0;
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('en', { weekday: 'short' }).charAt(0);
                
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1.5 sm:gap-2">
                    {/* Day label */}
                    <div className="text-xs font-semibold text-gray-600">
                      {dayName}
                    </div>
                    
                    {/* Circle with checkmark or fire */}
                    {hasStudied || day.isToday ? (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Milestone Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-gray-600">
                <span>Next Milestone</span>
                <span>{Math.ceil(streak / 10) * 10 - streak} days to go</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(streak % 10) * 10}%` }}
                ></div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => {
                // handleGiveReward();
                onClose(false);
               
              }}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600
                        text-white font-bold py-3 px-6 rounded-xl 
                        transition-all hover:scale-105 shadow-lg"
            >
              Continue Domination
            </button>

            {/* Motivational Quote */}
            <p className="text-center text-xs text-gray-500 italic">
              "Success is the sum of small efforts repeated day in and day out."
            </p>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </>,
    document.body
  );
}

export default StreakModal;
