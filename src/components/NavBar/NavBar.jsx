import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignOutBtn from '../SignOutBtn/SignOutBtn';
import CreateBtn from '../CreateQuizlet/QuizletBtn/QuizletBtn';
import UserName from '../auth/UserName';

import './NavBar.css';
import SignUpBtn from '../TryNowPage/LandingPage/SignUpBtn';

function NavBar() {
    const navigate = useNavigate();
    const navbarToggler = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);

    const closeNavbar = () => {
        setMenuOpen(false)
        if (navbarToggler.current && navbarToggler.current.getAttribute('aria-expanded') === 'true') {
            navbarToggler.current.click();
        }
    };

    return (
        <header className="sticky top-0 z-[1] flex flex-wrap justify-between items-center  bg-transparent py-3 px-8 font-sans font-bold text-text-primary dark:border-gray-800 dark:bg-d-background dark:text-d-text-primary">
            <div className="pr-12">
                <a className="font-poppins text-xl font-bold " href="#" onClick={(e) => { e.preventDefault(); navigate('/mastery'); closeNavbar(); }}>Mastery</a>
            </div>
            <div className={`lg:flex flex-1 items-center justify-between hidden`}> 
                <div className="space-x-10">
                    <a className="font-normal p-2.5 rounded-md text-gray-500 hover:text-white hover:bg-white/10" href="#" onClick={(e) => { e.preventDefault(); navigate('/'); closeNavbar(); }}>Home</a>
                    <a className="font-normal p-2.5 rounded-md text-gray-500 hover:text-white hover:bg-white/10" href="#" onClick={(e) => { e.preventDefault(); navigate('/about'); closeNavbar(); }}>About</a>
                    <a className="font-normal p-2.5 rounded-md text-gray-500 hover:text-white hover:bg-white/10" href="#" onClick={(e) => { e.preventDefault(); navigate('/contactme'); closeNavbar(); }}>Contact Me</a>
                </div>
                <div className="flex items-center space-x-5">
                    <div onClick={closeNavbar}><CreateBtn /></div>
                    <div onClick={closeNavbar}><UserName /></div>
                    {/* <div onClick={closeNavbar} title="log out"><SignOutBtn /></div> */}
                    <div onClick={closeNavbar} title="log out"><SignUpBtn /></div>

                    
                </div>
            </div>
            <i onClick={()=>setMenuOpen(!menuOpen)} class="block lg:hidden fa-solid fa-bars text-3xl cursor-pointer hover:text-gray-500"></i>
            
            <div className={`overflow-hidden transition-all duration-700 ease-in-out flex basis-full w-full  lg:hidden ${menuOpen ? 'max-h-96 opacity-100' : "max-h-0 opacity-0"}`}>
                <div className=" flex-col  w-full flex">
                    <a className="px-auto font-normal p-2.5 rounded-md text-gray-500 hover:text-white hover:bg-white/10" href="#" onClick={(e) => { e.preventDefault(); navigate('/'); closeNavbar(); }}>Home</a>
                    <a className="font-normal p-2.5 rounded-md text-gray-500 hover:text-white hover:bg-white/10" href="#" onClick={(e) => { e.preventDefault(); navigate('/about'); closeNavbar(); }}>About</a>
                    <a className="font-normal p-2.5 rounded-md text-gray-500 hover:text-white hover:bg-white/10" href="#" onClick={(e) => { e.preventDefault(); navigate('/contactme'); closeNavbar(); }}>Contact Me</a>
                    <div className="flex items-center space-x-5">
                        <div onClick={closeNavbar}><CreateBtn /></div>
                        <div onClick={closeNavbar}><UserName /></div>
                        {/* <div onClick={closeNavbar} title="log out"><SignOutBtn /></div> */}
                        <div onClick={closeNavbar} title="log out"><SignUpBtn /></div>
                    
                    </div>
                    <div className={`h-0.5 w-full bg-white mt-2 transition-opacity duration-700 ${menuOpen ? 'opacity-10' : 'opacity-0'}`}></div>
                </div>
                
            </div>
                

            
            
        </header>
        
    );
}

export default NavBar;