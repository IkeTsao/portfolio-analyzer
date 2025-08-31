// Firebase 配置和初始化
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase 配置 (開發環境使用測試配置)
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "portfolio-analyzer-demo.firebaseapp.com",
  projectId: "portfolio-analyzer-demo",
  storageBucket: "portfolio-analyzer-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:demo"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化 Firestore
export const db = getFirestore(app);

// 初始化 Auth
export const auth = getAuth(app);

// 開發環境連接到模擬器
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  try {
    // 連接 Firestore 模擬器
    connectFirestoreEmulator(db, 'localhost', 8080);
    
    // 連接 Auth 模擬器
    connectAuthEmulator(auth, 'http://localhost:9099');
    
    console.log('🔥 Connected to Firebase emulators');
  } catch (error) {
    // 模擬器可能已經連接，忽略錯誤
    console.log('Firebase emulators already connected or not available');
  }
}

export default app;

