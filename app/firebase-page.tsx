'use client';

import { useState } from 'react';
import {
  Container,
  Grid,
  Stack,
  Alert,
  Text,
  Loader,
  Center,
  MantineProvider,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { notifications } from '@mantine/notifications';
import { IconCloudCheck, IconCloudX, IconDatabase } from '@tabler/icons-react';

import {
  PageHeader,
  PortfolioStatsGrid,
  PortfolioDistributionChart,
  HoldingsTable,
  HoldingForm,
  ExchangeRateDisplay,
} from '@/components';
import { useFirebasePortfolio } from '@/hooks/useFirebasePortfolio';

// 導入樣式
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

export default function FirebaseHomePage() {
  const [holdingFormOpened, setHoldingFormOpened] = useState(false);
  const [editingHolding, setEditingHolding] = useState<any>(null);

  const {
    portfolioStats,
    loading,
    lastUpdate,
    authInitialized,
    migrationCompleted,
    updatePrices,
    refreshData,
  } = useFirebasePortfolio();

  // 顯示初始化狀態
  if (!authInitialized) {
    return (
      <MantineProvider>
        <Container size="lg" py="xl">
          <Center>
            <Stack align="center" gap="md">
              <Loader size="lg" />
              <Text>正在初始化 Firebase 連接...</Text>
            </Stack>
          </Center>
        </Container>
      </MantineProvider>
    );
  }

  const handleUpdatePrices = async () => {
    try {
      await updatePrices();
      notifications.show({
        title: '更新成功',
        message: '價格數據已更新',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: '更新失敗',
        message: '無法更新價格數據',
        color: 'red',
      });
    }
  };

  const handleRefreshData = async () => {
    try {
      await refreshData();
      notifications.show({
        title: '刷新成功',
        message: '數據已重新載入',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: '刷新失敗',
        message: '無法重新載入數據',
        color: 'red',
      });
    }
  };

  return (
    <MantineProvider>
      <Notifications />
      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Firebase 狀態指示器 */}
          <Alert
            icon={<IconCloudCheck size={16} />}
            title="Firebase 雲端存儲"
            color="green"
            variant="light"
          >
            <Stack gap="xs">
              <Text size="sm">
                ✅ 已連接到 Firebase 雲端數據庫
              </Text>
              {migrationCompleted && (
                <Text size="sm" c="blue">
                  🔄 本地數據已成功遷移到雲端
                </Text>
              )}
              <Text size="xs" c="dimmed">
                您的投資組合數據現在存儲在雲端，可以跨設備同步
              </Text>
            </Stack>
          </Alert>

          {/* 頁面標題 */}
          <PageHeader 
            title="投資組合總覽 (Firebase 版本)"
          />

          {/* 統計卡片 */}
          <PortfolioStatsGrid 
            stats={portfolioStats}
            loading={loading}
            lastUpdate={lastUpdate}
            onRefresh={handleRefreshData}
          />

          {/* 圖表和匯率 */}
          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <PortfolioDistributionChart 
                stats={portfolioStats}
                type="amount"
                title="投資組合分布"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <ExchangeRateDisplay />
            </Grid.Col>
          </Grid>

          {/* 持倉表格 */}
          <HoldingsTable
            holdings={[]} // Firebase版本暫時傳空數組
            onAdd={() => {
              setEditingHolding(null);
              setHoldingFormOpened(true);
            }}
            onEdit={(holding) => {
              setEditingHolding(holding);
              setHoldingFormOpened(true);
            }}
            onRefresh={handleRefreshData}
          />

          {/* 新增/編輯持倉表單 */}
          <HoldingForm
            opened={holdingFormOpened}
            onClose={() => {
              setHoldingFormOpened(false);
              setEditingHolding(null);
            }}
          />
        </Stack>
      </Container>
    </MantineProvider>
  );
}

