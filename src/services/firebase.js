import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAQQW1vPJ6815Q8GLBgAoycTmwEufK30J8",
    authDomain: "emsagent-2627a.firebaseapp.com",
    projectId: "emsagent-2627a",
    storageBucket: "emsagent-2627a.firebasestorage.app",
    messagingSenderId: "708061627770",
    appId: "1:708061627770:web:e9f069d53dfb61321f82c3",
    measurementId: "G-S8E6TLH3LL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
