// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBN34rYNaR2gF2ENoIRyj1iYEdWbaKsspk",
  authDomain: "inventory-systems-c8f00.firebaseapp.com",
  projectId: "inventory-systems-c8f00",
  storageBucket: "inventory-systems-c8f00.firebasestorage.app",
  messagingSenderId: "165776074844",
  appId: "1:165776074844:web:bfa2d1681d51dc2bad9e99",
  measurementId: "G-TZ29G7V4Z4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const appId = firebaseConfig.appId;

export default app;