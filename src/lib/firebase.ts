// ─── Firebase Configuration ─────────────────────────────────────
// 📌 GANTI nilai-nilai di bawah dengan config dari Firebase Console:
//    1. Buka https://console.firebase.google.com
//    2. Buat project baru (atau pilih yang sudah ada)
//    3. Tambahkan Web App → copy config
//    4. Aktifkan Firestore Database (mode Test untuk development)
// ─────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBxCTq2rid_fxssCycoESuUxE3PYMGMEVY",
  authDomain: "badminton-cup.firebaseapp.com",
  projectId: "badminton-cup",
  storageBucket: "badminton-cup.firebasestorage.app",
  messagingSenderId: "640638035563",
  appId: "1:640638035563:web:a4f1b1dabc28177cb8b32e",
  measurementId: "G-XETMCERRHF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
