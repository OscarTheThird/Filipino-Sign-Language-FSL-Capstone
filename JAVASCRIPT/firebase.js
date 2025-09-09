import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAvWeiC2zc8Mmf0bGf7JSMlPYMe5Ab94Xg",
    authDomain: "fsl-gestsure.firebaseapp.com",
    projectId: "fsl-gestsure",
    storageBucket: "fsl-gestsure.appspot.com",
    messagingSenderId: "441721432339",
    appId: "1:441721432339:web:5da8f6daa14de85d4912e6",
    measurementId: "G-XY1GHGFXQ3"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };