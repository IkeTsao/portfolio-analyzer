'use client';

import { useState } from 'react';
import { Paper, Title, Group, SegmentedControl, Text, Stack } from '@mantine/core';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PortfolioStats } from '@/types/portfolio';
import { formatCurrency, formatPercentage } from '@/utils/portfolioCalculations';

interface PortfolioDistributionChartProps {
  stats: PortfolioStats | null;
  loading?: boolean;
}

type DistributionType = 'market' | 'type' | 'account';

const COLORS = {
  market: {
    US: '#22b8cf',
    TW: '#339af0', 
    OTHER: '#5c7cfa',
  },
  type: {
    stock: '#22b8cf',
    fund: '#339af0',
    bond: '#5c7cfa',
    gold: '#20c997',
    crypto: '#51cf66',
    cash: '#94d82d',
  },
  account: {
    etrade: '#22b8cf',
    fubon: '#339af0',
    esun: '#5c7cfa',
  },
};

const LABELS = {
  market: {
    US: '美國市場',
    TW: '台灣市場',
    OTHER: '其他市場',
  },
  type: {
    stock: '股票',
    fund: '基金',
    bond: '債券',
    gold: '黃金',
    crypto: '數位貨幣',
    cash: '現金',
  },
  account: {
    etrade: 'Etrade',
    fubon: '富邦銀行',
    esun: '玉山銀行',
  },
};

export default function PortfolioDistributionChart({ stats, loading }: PortfolioDistributionChartProps) {
  const [distributionType, setDistributionType] = useState<DistributionType>('market');

  const getChartData = () => {
    if (!stats) return [];

    let distribution: any;
    let colors: any;
    let labels: any;

    switch (distributionType) {
      case 'market':
        distribution = stats.marketDistribution;
        colors = COLORS.market;
        labels = LABELS.market;
        break;
      case 'type':
        distribution = stats.typeDistribution;
        colors = COLORS.type;
        labels = LABELS.type;
        break;
      case 'account':
        distribution = stats.accountDistribution;
        colors = COLORS.account;
        labels = LABELS.account;
        break;
      default:
        return [];
    }

    return Object.entries(distribution)
      .filter(([_, data]: [string, any]) => data.value > 0)
      .map(([key, data]: [string, any]) => ({
        name: labels[key] || key,
        value: data.value,
        percentage: data.percentage,
        fill: colors[key] || '#8884d8',
      }));
  };

  const chartData = getChartData();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper p="xs" shadow="md" withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={500}>{data.name}</Text>
            <Text size="sm">{formatCurrency(data.value)}</Text>
            <Text size="sm" c="dimmed">{formatPercentage(data.percentage / 100)}</Text>
          </Stack>
        </Paper>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <Stack gap="xs" mt="md">
        {payload?.map((entry: any, index: number) => (
          <Group key={index} gap="xs">
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: entry.color,
                borderRadius: 2,
              }}
            />
            <Text size="sm">{entry.value}</Text>
            <Text size="sm" c="dimmed" ml="auto">
              {formatPercentage(entry.payload.percentage / 100)}
            </Text>
          </Group>
        ))}
      </Stack>
    );
  };

  if (loading) {
    return (
      <Paper p="md" withBorder>
        <Title order={3} mb="md">投資組合分布</Title>
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text c="dimmed">載入中...</Text>
        </div>
      </Paper>
    );
  }

  if (!stats || chartData.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Title order={3} mb="md">投資組合分布</Title>
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text c="dimmed">暫無數據</Text>
        </div>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3}>投資組合分布</Title>
        <SegmentedControl
          size="sm"
          value={distributionType}
          onChange={(value) => setDistributionType(value as DistributionType)}
          data={[
            { label: '市場', value: 'market' },
            { label: '類型', value: 'type' },
            { label: '帳戶', value: 'account' },
          ]}
        />
      </Group>

      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Paper>
  );
}

