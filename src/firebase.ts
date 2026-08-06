// src/firebase.ts
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check"; // ✅ Nieuw toegevoegd
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // ✅ Nieuw toegevoegd

console.log("API KEY:", process.env.REACT_APP_FIREBASE_API_KEY);

// ✅ Firebase configuratie (komt uit .env.local)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY!,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.REACT_APP_FIREBASE_APP_ID!,
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ App Check — moet direct na initializeApp() en vóór het gebruik van
// Firestore/Auth geïnitialiseerd worden.
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(process.env.REACT_APP_RECAPTCHA_SITE_KEY!),
  isTokenAutoRefreshEnabled: true,
});

// ✅ Firestore database
export const db = getFirestore(app);

// ✅ Authentication (voor anonieme login)
export const auth = getAuth(app);