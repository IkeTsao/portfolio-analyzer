'use client';

import { useState } from 'react';
import {
  Container,
  Grid,
  Stack,
} from '@mantine/core';

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
    // 直接更新價格，不再詢問共同基金手動輸入
    await updatePrices();
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
