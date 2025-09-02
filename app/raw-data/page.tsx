'use client';

import { Container, Stack, Grid } from '@mantine/core';

import { PageHeader, HistoricalDataManager } from '@/components';
import { usePortfolio } from '@/hooks/usePortfolio';

export default function RawDataPage() {
  const { getHoldingDetails } = usePortfolio();
  const holdingDetails = getHoldingDetails();

  const handleDataSaved = (date: string) => {
    console.log(`資料已儲存到 ${date}`);
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
            {/* 左側：歷史數據管理 */}
            <Grid.Col span={{ base: 12, lg: 4 }}>
              <HistoricalDataManager 
                currentPortfolioData={holdingDetails}
                onDataSaved={handleDataSaved}
              />
            </Grid.Col>
            
            {/* 右側：原始數據顯示 (未來可擴展) */}
            <Grid.Col span={{ base: 12, lg: 8 }}>
              {/* 這裡可以添加原始數據表格或其他功能 */}
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    </>
  );
}
