import React, { useState } from "react";
import { auth } from '../../api/firebase';
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import styles from './SignInPage.module.css';

function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate(); 

    const signIn = (e) => {
        e.preventDefault();
        signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log(userCredential);
            navigate('/');
        })
        .catch((error) => {
            console.log(error);
        });
    };

    return (
        <>
        <div className={styles.loginPageWrapper}>
            <div className={styles.leftSide}>
                <h1>You're just about to get a little smarter :)</h1>
            </div>
            
            
            <div className={styles.rightSide}>
                <h2>Login</h2>
                <form onSubmit={signIn}>
                    {/* <div className={styles.inputBox}>
                        <input type="text" placeholder="Enter your name" required />
                    </div> */}
                    <div className={styles.inputBox}>
                        <input 
                            type="email" 
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}              
                        />
                    </div>
                    {/* <div className={styles.inputBox}>
                        <input type="password" placeholder="Create password" required />
                    </div> */}
                    <div className={styles.inputBox}>
                        <input 
                            type="password" 
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    
                    <div className={styles.inputBox + " " + styles.button}>
                        <input type="submit" value="Log In" />
                    </div>
                    <div className={styles.text}>
                        <h3>Don't have an account? <a href="#" onClick={(e) => {e.preventDefault();navigate('/signup')}}>Sign Up</a></h3> 
                    </div>
                </form>
            </div>
           

        </div>
        
        
        {/* <div className={styles.signInContainer}>
            <form onSubmit={signIn}>
                <h1>Log in to your account</h1>
                
                
                <button type="submit">Log In</button>
                
            </form>
        </div> */}
        </>
    );
}

export default SignIn;
