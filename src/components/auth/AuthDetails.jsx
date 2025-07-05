import { onAuthStateChanged } from 'firebase/auth';
import React, {useEffect, useState} from 'react';
import {auth} from '../../api/firebase';


const AuthDetails = () => {
    const [authUser, setAuthUser] = useState(null);
   
    useEffect(()=>{
        onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user)
            } else {
                setAuthUser(null)
            }
        });
    }, []);

    return (
        <>
            {authUser ? <h1 style={{ margin: '0px' }}>{authUser.email}</h1> : 'Not signed in'}
        </>
    );
}

export default AuthDetails;