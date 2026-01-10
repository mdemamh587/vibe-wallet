import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getDatabase, ref, push, onValue } from "firebase/database"; // Realtime DB এর জন্য

const firebaseConfig = {
  apiKey: "AIzaSyD8scAfkUYU0iiI3LoRsia5IP7uq2kSA_s",
  authDomain: "smart-wallet-4.firebaseapp.com",
  projectId: "smart-wallet-4",
  storageBucket: "smart-wallet-4.firebasestorage.app",
  messagingSenderId: "86487504106",
  appId: "1:86487504106:web:4370145a4dc596a869b393",
  databaseURL: "https://smart-wallet-4-default-rtdb.asia-southeast1.firebasedatabase.app/" // এটি আপনার ডাটাবেস লিঙ্ক
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app); // Realtime Database কানেক্ট হলো
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, signOut, ref, push, onValue };