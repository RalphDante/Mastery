import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HeroSection = ({setShowModal, signIn}) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="container mx-auto mb-5 py-6 sm:py-10">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 max-w-7xl mx-auto">
        
        {/* Text Content - Always First */}
        <div className="flex-1 text-center lg:text-left w-full">
          <h1 className={`text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-black mb-4 sm:mb-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            Gain A Positively 
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent block py-2">
              Unfair Advantage
            </span>
            In School And In Life
          </h1>

          {/* Stats */}
          <div className={`flex flex-row gap-4 sm:gap-6 justify-center lg:justify-start mb-4 sm:mb-6 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-violet-400">2X</div>
              <div className="text-xs sm:text-sm text-gray-400 font-medium">retention</div>
              <div className="text-xs text-gray-500">with active recall</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-400">50%</div>
              <div className="text-xs sm:text-sm text-gray-400 font-medium">less time</div>
              <div className="text-xs text-gray-500">needed to study</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-indigo-400">80%</div>
              <div className="text-xs sm:text-sm text-gray-400 font-medium">remember</div>
              <div className="text-xs text-gray-500">after 1 week</div>
            </div>
          </div>

          {/* Subheading */}
          <p className={`text-base sm:text-lg lg:text-xl text-gray-300 mb-6 sm:mb-8 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            Study like it's 
            <span className="text-violet-400 font-semibold"> a game. </span>
            Party up with friends. <br></br>You'll actually <span className="text-violet-400 font-semibold"> remember </span> what you learn.
          </p>

          {/* CTA Button */}
          {/* <div className={`flex justify-center lg:justify-start transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <button 
              className="w-full sm:w-auto group bg-gradient-to-r from-violet-500 to-purple-600 px-8 py-4 rounded-full text-lg sm:text-xl font-bold hover:shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 transform hover:scale-105"
              onClick={() => signIn()}
              aria-label="Start your study adventure"
            >
              <span>Start Adventure</span>
            </button>
          </div> */}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start items-stretch sm:items-center px-4 sm:px-0">
            <button 
              className="group bg-gradient-to-r from-violet-500 to-purple-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg lg:text-xl font-bold hover:shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
              onClick={() => signIn()}
            >
              <span>Start Adventure</span>
              <ArrowRight />
            </button>
           

            
          </div>

          
        </div>

        {/* Image - Shows on mobile below text, on desktop to the right */}
        <div className="flex-1 max-w-xs sm:max-w-sm lg:max-w-md xl:max-w-lg w-full lg:w-auto mt-6 lg:mt-0">
          <div className={`transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <img 
              src="/images/bosses-headline-image.webp" 
              alt="Gaming characters representing study bosses"
              className="w-full h-auto rounded-2xl mx-auto"
              loading="eager"
              width="400"
              height="400"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default HeroSection;