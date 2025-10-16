import { useState, useEffect } from 'react';

const HeroSection = ({setShowModal, signIn}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="container mx-auto mb-20 py-10">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-12 max-w-7xl mx-auto">
        
        {/* Mobile: Image First, Desktop: Image Second */}
        <div className="flex-1 max-w-lg lg:max-w-xl order-1 lg:order-2">
          <div className={`transition-all duration-1000 delay-300 lg:delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <img 
              src="/images/bosses-headline-image.webp" 
              alt="A picture of the bosses in the game"
              className="w-full h-auto rounded-2xl"
              loading="eager"
              width="600"
              height="400"
            />
          </div>
        </div>

        {/* Mobile: Text Second, Desktop: Text First */}
        <div className="flex-1 text-center lg:text-left order-2 lg:order-1">
          <h1 className={`text-5xl sm:text-5xl lg:text-6xl xl:text-7xl opacity-90 font-black mb-6 transition-all duration-1000 delay-500 lg:delay-0 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            Studying Alone  
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent block animate-pulse py-2 lg:py-4">
              Is Boring.
            </span>
            So This Exists.
          </h1>

          {/* Science-backed metrics */}
<div className={`flex flex-row gap-4 sm:gap-6 justify-center lg:justify-start mb-6 transition-all duration-1000 delay-600 lg:delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
  <div className="text-center">
    <div className="text-2xl sm:text-3xl font-bold text-violet-400">2X</div>
    <div className="text-sm text-gray-400 font-medium">retention</div>
    <div className="text-xs text-gray-500">with active recall</div>
  </div>
  <div className="text-center">
    <div className="text-2xl sm:text-3xl font-bold text-purple-400">50%</div>
    <div className="text-sm text-gray-400 font-medium">less time</div>
    <div className="text-xs text-gray-500">needed to study</div>
  </div>
  <div className="text-center">
    <div className="text-2xl sm:text-3xl font-bold text-indigo-400">80%</div>
    <div className="text-sm text-gray-400 font-medium">remember</div>
    <div className="text-xs text-gray-500">after 1 week</div>
  </div>
</div>

          {/* Updated subheading */}
          <p className={`text-lg sm:text-xl lg:text-2xl text-gray-300 mb-8 transition-all duration-1000 delay-700 lg:delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            Turn studying into 
            <span className="text-violet-400 font-semibold"> boss battles. </span>
            <span className="">Study with your party.  Built by a student. Used by <span className="font-bold">students.</span></span>
          </p>

          {/* CTA Buttons */}
          <div className={`flex sm:flex-row gap-4 justify-center lg:justify-start items-center transition-all duration-1000 delay-900 lg:delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <button 
              className="group bg-gradient-to-r from-violet-500 to-purple-600 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-lg sm:text-xl font-bold hover:shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
              onClick={() => signIn()}
              aria-label="Generate flashcards from your notes now"
            >
              <span>Start Adventure</span>
            </button>

            {/* <button 
              className="group border-2 border-violet-500 bg-transparent hover:bg-violet-500 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-lg sm:text-xl font-bold hover:shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
              onClick={() => setShowModal(true)}
              aria-label="Browse decks"
            >
              <span>Try Demo</span>
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;