import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

function DashboardLayout({ children }: Props) {
  return <>{children}</>;
}

export default DashboardLayout;
