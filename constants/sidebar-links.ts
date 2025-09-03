import { IconChartBar, IconTable, IconSettings } from '@tabler/icons-react';

import { PATH_DASHBOARD } from '@/routes';

// Sidebar will only show the dashboard.
export const SIDEBAR_LINKS = [
  {
    title: 'Dashboard',
    links: [
      { label: 'Overview', icon: IconChartBar, link: PATH_DASHBOARD.default },
    ],
  },
  {
    title: 'Management',
    links: [
      { label: 'Data', icon: IconTable, link: PATH_DASHBOARD.rawData },
      { label: 'Account Settings', icon: IconSettings, link: PATH_DASHBOARD.accountSettings },
    ],
  }
];
