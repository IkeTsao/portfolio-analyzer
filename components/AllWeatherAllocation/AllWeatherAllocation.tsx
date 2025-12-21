'use client';

import { Paper, Title, Table, Text, Group } from '@mantine/core';
import { PortfolioStats } from '@/types/portfolio';
import { formatCurrencyNTD, formatPercentage } from '@/utils/portfolioCalculations';

interface AllWeatherAllocationProps {
  stats: PortfolioStats | null;
  loading?: boolean;
}

// 全天候配置映射
const ALL_WEATHER_ROLES = {
  attack: {
    label: '先鋒 (攻)',
    types: ['growth', 'crypto'],
    assets: '成長股、加密貨幣',
    bestPeriod: '降息、經濟擴張、熱錢多',
    role: '衝刺回報率'
  },
  stable: {
    label: '中鋒 (穩)',
    types: ['index'],
    assets: '大盤 ETF',
    bestPeriod: '經濟穩定成長',
    role: '獲取市場平均利潤'
  },
  defense: {
    label: '後衛 (守/息)',
    types: ['dividend', 'longBond'],
    assets: '高股息、中長債',
    bestPeriod: '景氣末端、利率下滑',
    role: '提供現金流、穩定軍心'
  },
  goalkeeper: {
    label: '守門員 (避)',
    types: ['gold', 'cash'],
    assets: '黃金、現金',
    bestPeriod: '戰爭、金融危機、股市崩盤',
    role: '保命、留子彈'
  },
  special: {
    label: '特殊兵 (變)',
    types: ['commodity'],
    assets: '大宗物資',
    bestPeriod: '高通膨、供應鏈中斷',
    role: '針對通膨進行奇襲'
  }
};

export function AllWeatherAllocation({ stats, loading }: AllWeatherAllocationProps) {
  if (loading || !stats) {
    return (
      <Paper p="md" withBorder>
        <Title order={3} mb="md">全天候配置</Title>
        <Text c="dimmed">載入中...</Text>
      </Paper>
    );
  }

  // 計算各戰鬥位置的統計
  const roleStats = Object.entries(ALL_WEATHER_ROLES).map(([key, role]) => {
    let totalValue = 0;
    let totalPercentage = 0;

    role.types.forEach(type => {
      const typeData = stats.distributionByType[type];
      if (typeData) {
        totalValue += typeData.totalValue;
        totalPercentage += typeData.percentage;
      }
    });

    return {
      key,
      ...role,
      totalValue,
      totalPercentage
    };
  });

  return (
    <Paper p="md" withBorder>
      <Title order={3} mb="md">全天候配置</Title>
      
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>戰鬥位置</Table.Th>
            <Table.Th>資產名稱</Table.Th>
            <Table.Th>最強表現時期</Table.Th>
            <Table.Th>扮演角色</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>金額</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>佔比</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {roleStats.map((role) => (
            <Table.Tr key={role.key}>
              <Table.Td>
                <Text fw={600}>{role.label}</Text>
              </Table.Td>
              <Table.Td>{role.assets}</Table.Td>
              <Table.Td>{role.bestPeriod}</Table.Td>
              <Table.Td>{role.role}</Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text fw={500}>{formatCurrencyNTD(role.totalValue)}</Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text fw={500} c={role.totalPercentage > 0 ? 'blue' : 'dimmed'}>
                  {formatPercentage(role.totalPercentage)}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {/* 總和統計 */}
      <Group justify="flex-end" mt="md" gap="xl">
        <Group gap="xs">
          <Text size="sm" c="dimmed">總金額：</Text>
          <Text size="sm" fw={700}>{formatCurrencyNTD(stats.totalValue)}</Text>
        </Group>
        <Group gap="xs">
          <Text size="sm" c="dimmed">總佔比：</Text>
          <Text size="sm" fw={700}>100.00%</Text>
        </Group>
      </Group>
    </Paper>
  );
}
