// firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Connect to emulators when developing locally
// if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
//   // Connect to Firestore emulator - change localhost to 127.0.0.1
//   connectFirestoreEmulator(db, '127.0.0.1', 8080);
  
//   // Connect to Authentication emulator - change localhost to 127.0.0.1  
//   connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  
//   // Connect to Functions emulator - change localhost to 127.0.0.1
//   connectFunctionsEmulator(functions, '127.0.0.1', 5001);
// }


// ✅ Connect to emulators ONLY when on localhost
const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

if (isLocalhost) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  console.log('🔧 Connected to Firebase emulators');
} else {
  console.log('🌐 Using production Firebase');
}

export { db, auth, app, functions, analytics };