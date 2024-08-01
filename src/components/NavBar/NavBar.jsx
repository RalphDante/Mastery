import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './navbar.module.css';
import SignOutBtn from '../SignOutBtn/SignOutBtn';
import CreateBtn from '../CreateQuizlet/QuizletBtn/QuizletBtn';
import AuthDetails from '../auth/AuthDetails';
import UserName from '../auth/UserName';

function NavBar() {
    const navigate = useNavigate();

    return (
        <div className={styles.navBar}>
            <header>
                <nav className={styles.navContainer}>
                    <div className={styles.leftNavContainer}>
                        <h1 className={styles.navBarTitle}>Mastery</h1>
                        <ul className={styles.navList}>
                            <li className={styles.navItem}>
                                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/home'); }}>Home</a>
                            </li>
                            <li className={styles.navItem}>
                                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/about'); }}>About</a>
                            </li>
                            <li className={styles.navItem}>
                                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/contactme'); }}>Contact Me</a>
                            </li>
                        </ul>
                    </div>
                    <div className={styles.rightNavContainer}>
                        <CreateBtn />
                        <UserName />
                        <SignOutBtn />
                    </div>
                </nav>
            </header>
        </div>
    );
}

export default NavBar;
