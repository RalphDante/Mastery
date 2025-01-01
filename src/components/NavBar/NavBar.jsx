import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SignOutBtn from '../SignOutBtn/SignOutBtn';
import CreateBtn from '../CreateQuizlet/QuizletBtn/QuizletBtn';
import UserName from '../auth/UserName';
import 'bootstrap/dist/css/bootstrap.min.css';
import './NavBar.css';

import 'bootstrap';

function NavBar() {
    const navigate = useNavigate();
    const navbarToggler = useRef(null);

    const closeNavbar = () => {
        if (navbarToggler.current && navbarToggler.current.getAttribute('aria-expanded') === 'true') {
            navbarToggler.current.click();
        }
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark">
            <h1>HiIIIIIII</h1>
            <div className="container-fluid">
                <a className="navbar-brand custom-navbar-brand" href="#" onClick={(e) => { e.preventDefault(); navigate('/mastery'); closeNavbar(); }}>Mastery</a>
                
                <button ref={navbarToggler} className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item">
                            <a className="nav-link custom-nav-link" href="#" onClick={(e) => { e.preventDefault(); navigate('/'); closeNavbar(); }}>Home</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link custom-nav-link" href="#" onClick={(e) => { e.preventDefault(); navigate('/about'); closeNavbar(); }}>About</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link custom-nav-link" href="#" onClick={(e) => { e.preventDefault(); navigate('/contactme'); closeNavbar(); }}>Contact Me</a>
                        </li>
                    </ul>
                    <div className="custom-navbar-gap">
                        <div onClick={closeNavbar}><CreateBtn /></div>
                        <div onClick={closeNavbar}><UserName /></div>
            
              
                    </div>

                    <div className="separator"></div>

                    <div onClick={closeNavbar} title="log out"><SignOutBtn /></div>
                </div>
            </div>
        </nav>
    );
}

export default NavBar;