function Testimonials(){
    return(
        <>
            <div className="text-center mb-6 sm:mb-8">
                <p className="text-gray-900 text-xl sm:text-2xl lg:text-3xl font-semibold px-4">
                    Here's what <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent ">Pro</span> user's are saying
                </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-10 mx-auto">

              {/* First Testimonial with Profile */}
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200 rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Avatar Section */}
                  <div className="flex flex-row gap-2 sm:gap-0 sm:flex-col flex-shrink-0">
                    <div className="relative">
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 border-2 overflow-hidden bg-slate-700 border-purple-500/50">
                        <div className="knight-idle" style={{ transform: 'scale(2.5)', imageRendering: 'pixelated' }}></div>
                        {/* Pro badge */}

                        <img
                          src="/images/icons/pro-badge.png"
                          className="absolute top-0 right-0 w-7 h-7 object-cover"
                          alt="Pro Badge"
                        />
                      </div>
                      
                    
                    </div>
                    
                    {/* Stats - Desktop */}
                    <div className="flex flex-col gap-1.5 mt-3 w-full sm:w-28">
                      <div className="text-xs text-left sm:text-center font-semibold text-violet-700 mb-1">Lv.11</div>
                      
                      {/* HP Bar */}
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-slate-700 h-2.5 relative overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: '89%' }}></div>
                        </div>
                        <span className="text-[10px] text-slate-600">89</span>
                      </div>
                      
                      {/* EXP Bar */}
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-slate-700 h-2.5 relative overflow-hidden">
                          <div className="h-full bg-yellow-500" style={{ width: '30%' }}></div>
                        </div>
                        <span className="text-[10px] text-slate-600">30</span>
                      </div>
                      
                      {/* Mana Bar */}
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-slate-700 h-2.5 relative overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
                        </div>
                        <span className="text-[10px] text-slate-600">100</span>
                      </div>
                    </div>
                  </div>

                  {/* Testimonial Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-violet-700">Cheng Han</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-xs text-gray-600">Pro User</span>
                    </div>
                    
                    <p className="text-gray-800 italic text-sm leading-relaxed">
                      "I have a lot of modules and I'm tired of spending too much time on 
                      <span className="font-semibold"> consumption without having enough for the digestion phase</span>. 
                      Mastery does a really good job of extracting the right information to test my active recall. 
                      <span className="font-semibold"> I finally found something that actually works for my learning style.</span>"
                    </p>
                  </div>
                </div>
              </div>

              {/* Second Testimonial with Profile */}
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200 rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Avatar Section */}
                  <div className="flex flex-row gap-2 sm:gap-0 sm:flex-col flex-shrink-0">
                    <div className=" relative">
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 border-2 overflow-hidden bg-slate-700 border-purple-500/50">
                        <div className="knight-idle" style={{ transform: 'scale(2.5)', imageRendering: 'pixelated' }}></div>
                        {/* Pro badge */}
                        <img
                        src="/images/icons/pro-badge.png"
                        className="absolute top-0 right-0 w-7 h-7 object-cover"
                        alt="Pro Badge"
                      />
                      </div>
                      
                      
                    </div>
                    
                    {/* Stats - Desktop */}
                    <div className="flex flex-col gap-1.5 mt-3 w-full sm:w-28">
                      <div className="text-xs text-left sm:text-center font-semibold text-violet-700 mb-1">Lv.20</div>
                      
                      {/* HP Bar */}
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-slate-700 h-2.5 relative overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: '92%' }}></div>
                        </div>
                        <span className="text-[10px] text-slate-600">92</span>
                      </div>
                      
                      {/* EXP Bar */}
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-slate-700 h-2.5 relative overflow-hidden">
                          <div className="h-full bg-yellow-500" style={{ width: '40%' }}></div>
                        </div>
                        <span className="text-[10px] text-slate-600">42</span>
                      </div>
                      
                      {/* Mana Bar */}
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-slate-700 h-2.5 relative overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: '80%' }}></div>
                        </div>
                        <span className="text-[10px] text-slate-600">80</span>
                      </div>
                    </div>
                  </div>

                  {/* Testimonial Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-violet-700">Kaia</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-xs text-gray-600">Early Pro User</span>
                    </div>
                    
                    <p className="text-gray-800 italic text-sm leading-relaxed">
                      "I upgraded because I figured if I support it now, it'll get super good way faster. 
                      <span className="font-semibold"> Best investment I've made for my studies.</span>"
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </>
    )
}

export default Testimonials;