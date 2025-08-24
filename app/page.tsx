'use client';

import {
  Container,
  Grid,
  PaperProps,
  Stack,
} from '@mantine/core';

import {
  MobileDesktopChart,
  PageHeader,
  RevenueChart,
  SalesChart,
  StatsGrid,
  TextInsightsGrid,
} from '@/components';
import { useFetchData } from '@/hooks';

const PAPER_PROPS: PaperProps = {
  p: 'md',
  style: { minHeight: '100%' },
};

export default function HomePage() {
  const {
    data: statsData,
    error: statsError,
    loading: statsLoading,
  } = useFetchData('/mocks/StatsGrid.json');
  const {
    data: textInsightsData,
    error: textInsightsError,
    loading: textInsightsLoading,
  } = useFetchData('/mocks/TextInsights.json');


  return (
    <>
      <>
        <title>Dashboard</title>
        <meta
          name="description"
          content="Manus Analytics Dashboard"
        />
      </>
      <Container fluid>
        <Stack gap="lg">
          <PageHeader title="Overview" withActions={true} />

          {/* Stats Grid - Full Width */}
          <StatsGrid
            data={statsData.data}
            loading={statsLoading}
            error={statsError}
            paperProps={PAPER_PROPS}
          />

          {/* Main Charts Row */}
          <Grid gutter={{ base: 5, xs: 'sm', md: 'md', xl: 'lg' }}>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <MobileDesktopChart {...PAPER_PROPS} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <SalesChart {...PAPER_PROPS} />
            </Grid.Col>
          </Grid>

          {/* Revenue Chart - Full Width */}
          <RevenueChart {...PAPER_PROPS} />

          {/* Text Insights - Bottom */}
          <TextInsightsGrid
            data={textInsightsData}
            loading={textInsightsLoading}
            error={textInsightsError}
            paperProps={PAPER_PROPS}
          />
        </Stack>
      </Container>
    </>
  );
}
