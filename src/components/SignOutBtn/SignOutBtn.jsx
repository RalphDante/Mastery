import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import styles from './SignOutBtn.module.css';

function SignOutBtn (){
    const navigate = useNavigate();
    const signOutFunction = async () => {
        try {
            await signOut(auth);
            console.log('User signed out');
            navigate("/");
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    return (
        <button onClick={signOutFunction} className={styles.signOutBtn}>
            <i className={styles.signOutBtn} class="fa-solid fa-right-from-bracket"></i>
        </button>
    );
}

export default SignOutBtn;
