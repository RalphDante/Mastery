import React, {useEffect, useState} from "react";
import { auth } from '../../api/firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import styles from "./SignUpPage.module.css"

function SignUp(){
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [reEnterPassword, setReEnterPassWord] = useState("")
    const navigate = useNavigate();
   

    const signIn = () => {
        if(password !== reEnterPassword){
            alert("Your passwords are not the same")
            return;
        }
        createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log(userCredential)
            navigate('/')
        })
        .catch((error) => {
            console.log(error)
        });
    };

   

    return( 
        <>
        <div className={styles.universal}>
            <div className={styles.wrapper}>
                <h2>Register</h2>
                <form onSubmit={(e)=>{
                    e.preventDefault()
                    signIn()
                    }}>
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
                    <div className={styles.inputBox}>
                        <input 
                            type="password" 
                            placeholder="Create your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className={styles.inputBox}>
                        <input 
                            type="password" 
                            placeholder="Re-enter your password"
                            value={reEnterPassword}
                            onChange={(e) => setReEnterPassWord(e.target.value)}
                        />
                    </div>
                    
                    <div className={styles.inputBox + " " + styles.button}>
                        <input type="submit" value="Create" />
                    </div>
                    <div className={styles.text}>
                        <h3>Already have an account? <a href="#" onClick={(e) => {e.preventDefault();navigate('/signin')}}>Log In</a></h3> 
                    </div>
                </form>
            </div>
        </div>


        {/* <div className="sign-in-container">
            <form onSubmit={signIn}>
                <h1>Create account</h1>
                <input type="email" placeholder="Enter your email"
                        value = {email}
                        onChange={(e) => setEmail(e.target.value)}              
                ></input>
                <input type="password" placeholder="Enter your password"
                        value = {password}
                        onChange = {(e) => setPassword(e.target.value)}
                ></input>
                <button type="submit">Sign Up</button>
            </form>
        </div> */}
        </>
        
    );
};

export default SignUp;