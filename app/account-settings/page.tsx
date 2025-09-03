'use client';

import { Container, Stack, Grid } from '@mantine/core';

import { PageHeader, AccountManager } from '@/components';

export default function AccountSettingsPage() {
  const handleAccountsUpdated = () => {
    console.log('帳號設定已更新');
    // 這裡可以觸發全域更新，例如重新載入持倉資料
    window.location.reload();
  };

  return (
    <>
      <title>帳號名稱設定</title>
      <meta
        name="description"
        content="管理投資組合的帳號名稱設定"
      />
      <Container fluid>
        <Stack gap="lg">
          <PageHeader title="帳號名稱設定" withActions={false} />
          
          <Grid gutter={{ base: 5, xs: 'sm', md: 'md', xl: 'lg' }}>
            {/* 左側：帳號名稱設定 */}
            <Grid.Col span={{ base: 12, lg: 6 }}>
              <AccountManager onAccountsUpdated={handleAccountsUpdated} />
            </Grid.Col>
            
            {/* 右側：預留擴展空間 */}
            <Grid.Col span={{ base: 12, lg: 6 }}>
              {/* 這裡可以添加其他管理功能 */}
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    </>
  );
}

