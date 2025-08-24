'use client';

import { Container, Stack } from '@mantine/core';

import { PageHeader, RawDataTable } from '@/components';
import { useFetchData } from '@/hooks';

const PAPER_PROPS = {
  p: 'md',
  style: { minHeight: '100%' },
};

export default function RawDataPage() {
  const {
    data: invoicesData,
    error: invoicesError,
    loading: invoicesLoading,
  } = useFetchData('/mocks/Invoices.json');

  return (
    <>
      <title>Raw Data</title>
      <meta
        name="description"
        content="View all invoice data in a comprehensive table format."
      />
      <Container fluid>
        <Stack gap="lg">
          <PageHeader title="Raw data" withActions={false} />
          
          <RawDataTable
            data={invoicesData}
            error={invoicesError}
            loading={invoicesLoading}
            {...PAPER_PROPS}
          />
        </Stack>
      </Container>
    </>
  );
}
