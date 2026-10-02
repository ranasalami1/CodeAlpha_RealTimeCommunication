import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getAuth,
    signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyAuvP16jEU2i1_qung5zv1pA4X0sLao-rc",
    authDomain: "realtime-communication-8c85f.firebaseapp.com",
    projectId: "realtime-communication-8c85f",
    storageBucket: "realtime-communication-8c85f.firebasestorage.app",
    messagingSenderId: "952882559565",
    appId: "1:952882559565:web:73993355f0245108b4fa04"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


async function authenticateWithFirebase() {
    try {
        const response = await fetch("/firebase-token/");

        if (!response.ok) {
            throw new Error("Could not get Firebase token.");
        }

        const data = await response.json();

        await signInWithCustomToken(
            auth,
            data.token
        );

        console.log(
            "Firebase authentication successful."
        );

        return true;

    } catch (error) {

        console.error(
            "Firebase authentication failed:",
            error
        );

        return false;
    }
}


const firebaseAuthReady = authenticateWithFirebase();


export {
    db,
    auth,
    firebaseAuthReady
};