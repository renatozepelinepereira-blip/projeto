import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

const firebaseConfig = { 
    apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", 
    authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", 
    projectId: "sistema-pedidos-3f2c2", 
    storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", 
    messagingSenderId: "669786014126", 
    appId: "1:669786014126:web:d0da498633a145d56a883f" 
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
