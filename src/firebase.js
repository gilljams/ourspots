import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBe5bAF1CtXWftWA8biN7Tcd0Ms4cGWGvI",
  authDomain: "ourspots-b536b.firebaseapp.com",
  projectId: "ourspots-b536b",
  storageBucket: "ourspots-b536b.firebasestorage.app",
  messagingSenderId: "1047808506108",
  appId: "1:1047808506108:web:c418b70d0f27f2b679ff79"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();