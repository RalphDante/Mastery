import { useState } from 'react';
import { ChevronLeft, ChevronRight, Brain } from 'lucide-react';

export default function SmartReviewButtons({ onSuccess }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to Smart Review!",
      content: (
        <div className="text-center space-y-6">
          <div className="flex text-6xl justify-center items-center mb-8"><Brain className='w-16 h-16 text-pink-500 mr-1'/>✨</div>
          <p className="text-lg text-gray-300 leading-relaxed max-w-md mx-auto">
            This study mode uses <span className="text-blue-400 font-semibold">SRS (Spaced Repetion)</span> - 
            it shows you cards right before you're about to forget them.
          </p>
        </div>
      )
    },
    {
      title: "Button Meanings",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 rounded-lg">
            <div className="w-20 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-medium text-sm">
              Again
            </div>
            <div className="text-gray-300">
              <span className="text-white">"I got it wrong"</span> <span className="text-gray-400">(see it soon)</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-3 rounded-lg ">
            <div className="w-20 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-medium text-sm">
              Hard
            </div>
            <div className="text-gray-300">
              <span className="text-white">"I got it right, but it was difficult"</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-3 rounded-lg ">
            <div className="w-20 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-medium text-sm">
              Good
            </div>
            <div className="text-gray-300">
              <span className="text-white">"I got it right normally"</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-3 rounded-lg">
            <div className="w-20 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-medium text-sm">
              Easy
            </div>
            <div className="text-gray-300">
              <span className="text-white">"Too easy!"</span> <span className="text-gray-400">(see it much later)</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Overlay Background */}
      
      {/* Modal */}
      <div className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-lg w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            {slides[currentSlide].title}
          </h2>
          <div className="flex justify-center gap-2">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="mb-8 min-h-[280px] flex items-center justify-center">
          {slides[currentSlide].content}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentSlide === 0
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <ChevronLeft size={18} />
            Back
          </button>

          {currentSlide === slides.length - 1 ? (
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                onClick={()=>onSuccess(true)}
            >
              Start Studying →
            </button>
          ) : (
            <button
              onClick={nextSlide}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              Next
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}