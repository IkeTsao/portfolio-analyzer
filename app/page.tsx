'use client';

import { useState } from 'react';
import {
  Container,
  Grid,
  Stack,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

import {
  PageHeader,
  PortfolioStatsGrid,
  PortfolioDistributionChart,
  HoldingsTable,
  HoldingForm,
  ExchangeRateDisplay,
} from '@/components';
import { usePortfolio } from '@/hooks/usePortfolio';

export default function HomePage() {
  const [holdingFormOpened, setHoldingFormOpened] = useState(false);
  const [editingHolding, setEditingHolding] = useState(null);

  const {
    portfolioStats,
    loading,
    lastUpdate,
    updatePrices,
    refreshHoldings,
    getHoldingDetails,
  } = usePortfolio();

  const holdingDetails = getHoldingDetails();

  const handleAddHolding = () => {
    setEditingHolding(null);
    setHoldingFormOpened(true);
  };

  const handleEditHolding = (holding: any) => {
    setEditingHolding(holding);
    setHoldingFormOpened(true);
  };

  const handleFormClose = () => {
    setHoldingFormOpened(false);
    setEditingHolding(null);
  };

  const handleFormSave = () => {
    refreshHoldings();
    handleFormClose();
  };

  const handleUpdatePrices = async () => {
    try {
      // 顯示開始更新的通知
      notifications.show({
        id: 'updating-prices',
        title: '正在更新價格',
        message: '正在獲取最新股價和匯率...',
        loading: true,
        autoClose: false,
      });

      // 直接更新價格，不再詢問共同基金手動輸入
      await updatePrices();

      // 顯示成功通知
      notifications.update({
        id: 'updating-prices',
        title: '價格更新完成',
        message: '所有價格已更新到最新數據',
        color: 'green',
        loading: false,
        autoClose: 3000,
      });
    } catch (error) {
      // 顯示錯誤通知
      notifications.update({
        id: 'updating-prices',
        title: '價格更新失敗',
        message: '無法獲取最新價格，請稍後再試',
        color: 'red',
        loading: false,
        autoClose: 5000,
      });
      console.error('價格更新失敗:', error);
    }
  };

  return (
    <>
      <title>投資組合總覽</title>
      <meta
        name="description"
        content="投資組合分析工具 - 總覽"
      />
      
      <Container fluid>
        <Stack gap="lg">
          <PageHeader title="投資組合總覽" withActions={false} />

          {/* 投資組合統計 */}
          <PortfolioStatsGrid
            stats={portfolioStats}
            loading={loading}
            lastUpdate={lastUpdate}
            onRefresh={handleUpdatePrices}
          />

          {/* 圖表區域 */}
          <Grid gutter={{ base: 5, xs: 'sm', md: 'md', xl: 'lg' }}>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <PortfolioDistributionChart
                stats={portfolioStats}
                loading={loading}
                type="amount"
                title="投資組合金額分布"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <PortfolioDistributionChart
                stats={portfolioStats}
                loading={loading}
                type="gainloss"
                title="投資組合損益分布"
              />
            </Grid.Col>
          </Grid>

          {/* 即時匯率 */}
          <ExchangeRateDisplay />

          {/* 持倉明細表格 */}
          <HoldingsTable
            holdings={holdingDetails}
            loading={loading}
            onAdd={handleAddHolding}
            onEdit={handleEditHolding}
            onRefresh={refreshHoldings}
          />
        </Stack>
      </Container>

      {/* 持倉表單 */}
      <HoldingForm
        opened={holdingFormOpened}
        onClose={handleFormClose}
        holding={editingHolding}
        onSave={handleFormSave}
      />
    </>
  );
}
