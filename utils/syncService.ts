import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Holding, Account } from '@/types/portfolio';
import { initializeAuth } from '@/utils/firebaseStorage';

// 加密相關
const crypto = typeof window !== 'undefined' ? window.crypto : null;

/**
 * 生成6位同步碼
 */
export function generateSyncCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成加密密鑰
 */
async function generateKey(password: string, salt: string): Promise<CryptoKey> {
  if (!crypto) throw new Error('Crypto API 不可用');
  
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 加密數據
 */
async function encryptData(data: any, password: string): Promise<string> {
  if (!crypto) throw new Error('Crypto API 不可用');
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await generateKey(password, Array.from(salt).map(b => String.fromCharCode(b)).join(''));
  
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(data))
  );

  // 組合 salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  // 轉換為 base64
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

/**
 * 解密數據
 */
async function decryptData(encryptedData: string, password: string): Promise<any> {
  if (!crypto) throw new Error('Crypto API 不可用');
  
  // 從 base64 解碼
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(char => char.charCodeAt(0))
  );

  // 提取 salt, iv, encrypted data
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);

  const key = await generateKey(
    password, 
    Array.from(salt).map(b => String.fromCharCode(b)).join('')
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decrypted));
}

/**
 * 同步數據結構
 */
interface SyncData {
  holdings: Holding[];
  accounts: Account[];
  timestamp: string;
  version: number;
}

/**
 * 創建同步碼並上傳加密數據
 */
export async function createSyncCode(
  holdings: Holding[], 
  accounts: Account[], 
  password: string
): Promise<string> {
  try {
    // 確保認證
    const user = await initializeAuth();
    if (!user) throw new Error('用戶未認證');

    // 生成同步碼
    const syncCode = generateSyncCode();
    
    // 準備數據
    const syncData: SyncData = {
      holdings,
      accounts,
      timestamp: new Date().toISOString(),
      version: 1
    };

    // 加密數據
    console.log('🔐 加密數據中...');
    const encryptedData = await encryptData(syncData, password);

    // 上傳到 Firebase
    console.log('☁️ 上傳到雲端...');
    const syncRef = doc(db, 'sync', syncCode);
    await setDoc(syncRef, {
      data: encryptedData,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
      version: 1
    });

    console.log('✅ 同步碼創建成功:', syncCode);
    return syncCode;
  } catch (error) {
    console.error('❌ 創建同步碼失敗:', error);
    throw error;
  }
}

/**
 * 使用同步碼下載並解密數據
 */
export async function loadFromSyncCode(
  syncCode: string, 
  password: string
): Promise<SyncData> {
  try {
    // 確保認證
    const user = await initializeAuth();
    if (!user) throw new Error('用戶未認證');

    console.log('📥 從雲端下載數據...');
    const syncRef = doc(db, 'sync', syncCode.toUpperCase());
    const syncDoc = await getDoc(syncRef);

    if (!syncDoc.exists()) {
      throw new Error('同步碼不存在或已過期');
    }

    const { data: encryptedData } = syncDoc.data();
    
    console.log('🔓 解密數據中...');
    const decryptedData = await decryptData(encryptedData, password);

    console.log('✅ 數據載入成功');
    return decryptedData;
  } catch (error) {
    console.error('❌ 載入同步碼失敗:', error);
    throw error;
  }
}

/**
 * 更新同步碼數據
 */
export async function updateSyncCode(
  syncCode: string,
  holdings: Holding[],
  accounts: Account[],
  password: string
): Promise<void> {
  try {
    // 確保認證
    const user = await initializeAuth();
    if (!user) throw new Error('用戶未認證');

    // 準備數據
    const syncData: SyncData = {
      holdings,
      accounts,
      timestamp: new Date().toISOString(),
      version: 1
    };

    // 加密數據
    console.log('🔐 加密更新數據中...');
    const encryptedData = await encryptData(syncData, password);

    // 更新到 Firebase
    console.log('☁️ 更新雲端數據...');
    const syncRef = doc(db, 'sync', syncCode.toUpperCase());
    await setDoc(syncRef, {
      data: encryptedData,
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
      version: 1
    }, { merge: true });

    console.log('✅ 同步碼更新成功');
  } catch (error) {
    console.error('❌ 更新同步碼失敗:', error);
    throw error;
  }
}

/**
 * 檢查同步碼是否存在
 */
export async function checkSyncCode(syncCode: string): Promise<boolean> {
  try {
    const syncRef = doc(db, 'sync', syncCode.toUpperCase());
    const syncDoc = await getDoc(syncRef);
    return syncDoc.exists();
  } catch (error) {
    console.error('❌ 檢查同步碼失敗:', error);
    return false;
  }
}

/**
 * 本地存儲同步設置
 */
const SYNC_STORAGE_KEY = 'portfolio_sync_settings';

interface SyncSettings {
  syncCode?: string;
  autoSync: boolean;
  lastSync?: string;
}

export function saveSyncSettings(settings: SyncSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(settings));
  }
}

export function loadSyncSettings(): SyncSettings {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(SYNC_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  }
  return { autoSync: false };
}

export function clearSyncSettings(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SYNC_STORAGE_KEY);
  }
}

