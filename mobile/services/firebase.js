import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAOgQoy-aoXrit21tf3keClD64FhWDwYRs",
  authDomain: "phone-authentication-387f9.firebaseapp.com",
  projectId: "phone-authentication-387f9",
  storageBucket: "phone-authentication-387f9.firebasestorage.app",
  messagingSenderId: "612657791812",
  appId: "1:612657791812:web:07fd6e2b1741a93af50d11",
  measurementId: "G-V92Y7M93H8"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export { app, auth, firebaseConfig };
