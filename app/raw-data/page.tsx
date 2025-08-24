'use client';

import { Container, Stack, Text } from '@mantine/core';

import { PageHeader } from '@/components';

export default function RawDataPage() {
  return (
    <>
      <title>原始數據</title>
      <meta
        name="description"
        content="查看投資組合原始數據"
      />
      <Container fluid>
        <Stack gap="lg">
          <PageHeader title="原始數據" withActions={false} />
          
          <Text>此頁面將顯示投資組合的原始數據表格。</Text>
        </Stack>
      </Container>
    </>
  );
}
