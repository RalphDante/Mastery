import React, { useState, useRef, useEffect, useCallback } from 'react';
import SignUpBtn from '../../pages/TryNowPage/LandingPage/SignUpBtn';
import { useNavigate } from 'react-router-dom';

function Profile(){

    const navigate = useNavigate();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Handle dropdown toggle
    const toggleDropdown = useCallback((event) => {
        event.stopPropagation();
        setIsDropdownOpen(prev => !prev);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsDropdownOpen(false);
        }
        };
        document.addEventListener('click', handleClickOutside);
        return () => {
        document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // Handle clicks on dropdown items
    const handleItemClick = (callback, event) => {
        event.preventDefault();
        setIsDropdownOpen(false);
        if (callback) {
        callback(event);
        }
    };


    return(

        <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleDropdown}
              className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {/* Font Awesome user icon */}
              <i className="fas fa-user text-white"></i>
            </button>

            {/* Dropdown Menu */}
            <div className={`${isDropdownOpen ? 'block' : 'hidden'} absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5`}>
              {/* <a 
                href="#" 
                onClick={(e) => handleItemClick(handleSignOut, e)} 
                className="block px-4 py-2 text-sm text-slate-200 hover:bg-gray-700 transition-colors"
              >
                Sign Out
              </a> */}
              <button 
                onClick={() => {
                    navigate('/settings');
                }}
              className={`block px-4 py-2 text-sm text-slate-200 hover:bg-gray-700 transition-colors `}
              >
                Settings
              </button>
              <button 
                onClick={() => {
                    navigate('/pricing');
                }}
              className={`block px-4 py-2 text-sm text-slate-200 hover:bg-gray-700 transition-colors `}
              >
                Pricing
              </button>
              <SignUpBtn />
            </div>
        </div>
    )
}

export default Profile;