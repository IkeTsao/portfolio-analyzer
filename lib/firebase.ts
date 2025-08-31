// Firebase 配置和初始化
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyCn4-OdDdXWO1Kk2zmiZZ5rEqEYlUQ2oWE",
  authDomain: "portfolio-analyzer-demo.firebaseapp.com",
  projectId: "portfolio-analyzer-demo",
  storageBucket: "portfolio-analyzer-demo.firebasestorage.app",
  messagingSenderId: "1094236238829",
  appId: "1:1094236238829:web:ba49ffab8d16757e9dade4",
  measurementId: "G-FF6YJ423XT"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化 Firestore
export const db = getFirestore(app);

// 初始化 Auth
export const auth = getAuth(app);

export default app;

