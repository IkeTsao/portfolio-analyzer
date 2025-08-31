import dynamic from 'next/dynamic';
import { GetServerSideProps } from 'next';

// 動態導入Firebase頁面組件，避免SSR問題
const FirebaseHomePage = dynamic(() => import('@/app/firebase-page'), {
  ssr: false,
  loading: () => <div>載入Firebase頁面中...</div>
});

// Firebase 測試頁面
export default function FirebaseTestPage() {
  return <FirebaseHomePage />;
}

// 這個頁面不需要 SSR
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};

