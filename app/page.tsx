'use client';

import { useState, useEffect } from 'react';
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
  LiveInfoDisplay,
  TopHoldings,
} from '@/components';
import { usePortfolio } from '@/hooks/usePortfolio';

export default function HomePage() {
  const [holdingFormOpened, setHoldingFormOpened] = useState(false);
  const [editingHolding, setEditingHolding] = useState(null);

  const {
    holdings,
    portfolioStats,
    topHoldings,
    loading,
    lastUpdate,
    updatePrices,
    refreshHoldings,
    getHoldingDetails,
    updateHoldingCalculations,
  } = usePortfolio();

  // 確保計算欄位是最新的
  useEffect(() => {
    if (holdings.length > 0) {
      updateHoldingCalculations();
    }
  }, [holdings.length]); // 移除 updateHoldingCalculations 依賴避免無限循環

  // 頁面載入時自動更新價格
  useEffect(() => {
    const autoUpdatePrices = async () => {
      try {
        // 顯示自動更新通知
        notifications.show({
          id: 'auto-updating-prices',
          title: '正在載入最新數據',
          message: '自動更新價格和匯率中...',
          loading: true,
          autoClose: false,
        });

        await updatePrices();

        // 更新價格後刷新持倉明細，確保記憶體內容同步
        refreshHoldings();

        // 顯示成功通知
        notifications.update({
          id: 'auto-updating-prices',
          title: '數據載入完成',
          message: '已載入最新的價格和匯率數據',
          color: 'green',
          loading: false,
          autoClose: 2000,
        });
      } catch (error) {
        // 顯示錯誤通知
        notifications.update({
          id: 'auto-updating-prices',
          title: '數據載入失敗',
          message: '無法獲取最新數據，顯示快取數據',
          color: 'orange',
          loading: false,
          autoClose: 3000,
        });
        console.error('自動更新價格失敗:', error);
      }
    };

    // 延遲500ms執行，確保頁面完全載入
    const timer = setTimeout(autoUpdatePrices, 500);
    
    return () => clearTimeout(timer);
  }, []); // 空依賴陣列，只在組件首次載入時執行

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

  const handleFormSave = async () => {
    try {
      // 防止重複執行
      if (loading) return;
      
      // 延遲一點時間確保資料已經保存
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 刷新持倉數據
      refreshHoldings();
      
      // 延遲關閉表單，確保狀態更新完成
      setTimeout(() => {
        handleFormClose();
      }, 50);
      
    } catch (error) {
      console.error('保存後刷新失敗:', error);
      // 即使刷新失敗也要關閉表單
      handleFormClose();
    }
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

      // 強制更新所有價格（除了手動輸入的價格）
      await updatePrices(undefined, true);

      // 更新價格後刷新持倉明細，確保記憶體內容同步
      refreshHoldings();

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
            <Grid.Col span={{ base: 12 }}>
              <TopHoldings
                data={topHoldings}
                loading={loading}
              />
            </Grid.Col>
          </Grid>

          {/* 即時資訊 */}
          <LiveInfoDisplay />

          {/* 持倉明細表格 */}
        <HoldingsTable
          holdings={holdings}
          loading={loading}
          onAdd={handleAddHolding}
          onEdit={handleEditHolding}
          onUpdatePrices={(forceUpdate = false) => updatePrices(undefined, forceUpdate)}
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
