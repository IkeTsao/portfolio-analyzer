'use client';

import { Container, Stack, Grid } from '@mantine/core';

import { PageHeader, HistoricalDataManager } from '@/components';
import { usePortfolio } from '@/hooks/usePortfolio';

export default function RawDataPage() {
  const { holdings, updatePrices } = usePortfolio();
  // 使用原始 holdings 資料，而不是經過複雜處理的 holdingDetails

  const handleDataSaved = (date: string) => {
    console.log(`資料已儲存到 ${date}`);
  };

  const handleUpdatePrices = async () => {
    await updatePrices();
  };

  return (
    <>
      <title>原始數據</title>
      <meta
        name="description"
        content="查看和管理投資組合原始數據"
      />
      <Container fluid>
        <Stack gap="lg">
          <PageHeader title="原始數據" withActions={false} />
          
          <Grid gutter={{ base: 5, xs: 'sm', md: 'md', xl: 'lg' }}>
            {/* 左側：歷史數據管理 - 寬度從4調整為5 (增加20%) */}
            <Grid.Col span={{ base: 12, lg: 5 }}>
              <HistoricalDataManager 
                currentPortfolioData={holdings}
                onDataSaved={handleDataSaved}
                onUpdatePrices={handleUpdatePrices}
              />
            </Grid.Col>
            
            {/* 右側：原始數據顯示 - 寬度從8調整為7 */}
            <Grid.Col span={{ base: 12, lg: 7 }}>
              {/* 這裡可以添加原始數據表格或其他功能 */}
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    </>
  );
}
