// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC47SqSbnqw0FNdy5YQ_d2-4AjYetiSGgk",
  authDomain: "blossomsaroma-c660f.firebaseapp.com",
  projectId: "blossomsaroma-c660f",
  storageBucket: "blossomsaroma-c660f.firebasestorage.app",
  messagingSenderId: "218486640029",
  appId: "1:218486640029:web:4019fa211a0446910ab374",
  measurementId: "G-B8RQTC0VMR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);