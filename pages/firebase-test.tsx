import { GetServerSideProps } from 'next';
import FirebaseHomePage from '@/app/firebase-page';

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

