import { useState, useEffect } from 'react';
import { Sparkles, Star } from 'lucide-react';

const TestimonialsCarousel = () => {
  const testimonials = [
    {
      text: "OMG this is actually magic!! Improved my grades by 2 letter grades",
      source: "YouTube Viewer"
    },
    {
      text: "I wish this was there during my boards 😭. Would have saved me hundreds of hours",
      source: "Social Media User"
    },
    {
      text: "It's so easy to understand!",
      source: "Content Viewer"
    },
    {
      text: "Finally, a study method that actually works!",
      source: "App User"
    },
    {
      text: "This saved me so much time during finals week",
      source: "YouTube Viewer"
    },
    {
      text: "Game changer for my study routine",
      source: "Social Media User"
    },
    {
      text: "Best study app I've ever used",
      source: "Content Viewer"
    },
    {
      text: "Made studying actually enjoyable for once",
      source: "App User"
    }
  ];

  // Duplicate testimonials for seamless loop
  const duplicatedTestimonials = [...testimonials, ...testimonials];

  return (
    <section 
      className="backdrop-blur-sm rounded-3xl  mb-20 " 
      aria-labelledby="testimonials"
    >
      
      
      <div className="relative overflow-hidden">
        {/* Continuous sliding container */}
        <div 
          className="flex animate-scroll gap-6"
          style={{
            animation: 'scroll 40s linear infinite',
            width: `${duplicatedTestimonials.length * 320}px`
          }}
        >
          {duplicatedTestimonials.map((testimonial, index) => (
            <article 
              key={index} 
              className="flex-shrink-0 w-80"
            >
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 hover:border-violet-500/30 transition-all duration-300 h-full">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="font-bold text-violet-400">{testimonial.source}</span>
                  <div className="text-yellow-400" aria-label="Verified feedback">
                    <Star size={16} />
                  </div>
                </div>
                <p className="text-gray-300">{testimonial.text}</p>
              </div>
            </article>
          ))}
        </div>
        
        {/* Gradient overlays for smooth edges */}
        <div className="absolute top-0 left-0 w-20 h-full bg-gradient-to-r from-slate-900 to-transparent pointer-events-none z-10"></div>
        <div className="absolute top-0 right-0 w-20 h-full bg-gradient-to-l from-slate-900 to-transparent pointer-events-none z-10"></div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-${testimonials.length * 320}px);
          }
        }
        
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

export default TestimonialsCarousel;