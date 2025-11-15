import { Paper, Title, Table, Text, Group, Badge } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { TopHolding, formatCurrency, formatPercentage, formatQuantity } from '@/utils/portfolioCalculations';

interface TopHoldingsProps {
  data: TopHolding[];
  loading?: boolean;
}

export default function TopHoldings({ data, loading }: TopHoldingsProps) {
  if (loading) {
    return (
      <Paper p="md" withBorder>
        <Title order={3} mb="md">持股排序與現金</Title>
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text c="dimmed">載入中...</Text>
        </div>
      </Paper>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Title order={3} mb="md">持股排序與現金</Title>
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text c="dimmed">暫無持股數據</Text>
        </div>
      </Paper>
    );
  }

  const rows = data.map((holding, index) => {
    const isProfit = holding.gainLoss >= 0;
    const profitColor = isProfit ? 'green' : 'red';
    const profitIcon = isProfit ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />;
    
    // 判斷是否為現金項目
    const isCash = holding.id === 'TWD_CASH' || holding.id === 'USD_CASH';
    const badgeColor = isCash ? 'orange' : (index < 10 ? 'blue' : 'gray');
    const displayRank = isCash ? '現金' : (index + 1).toString();

    return (
      <Table.Tr key={holding.id}>
        <Table.Td>
          <Badge variant="light" color={badgeColor} size="sm">
            {displayRank}
          </Badge>
        </Table.Td>
        <Table.Td>
          <div>
            <Text size="sm" fw={500}>
              {holding.name}
            </Text>
            <Text size="xs" c="dimmed">
              {holding.symbol}
            </Text>
          </div>
        </Table.Td>
        <Table.Td>
          <Text size="sm" fw={500}>
            {formatQuantity(holding.quantity)}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" fw={500}>
            {isCash ? '—' : `${holding.currency} ${formatQuantity(holding.currentPrice)}`}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" fw={500}>
            {formatCurrency(holding.currentValue, 'TWD')}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" fw={500} c="blue">
            {holding.assetRatio.toFixed(2)}%
          </Text>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            {!isCash && profitIcon}
            <div>
              <Text size="sm" c={isCash ? 'dimmed' : profitColor} fw={500}>
                {isCash ? '—' : (isProfit ? '+' : '') + formatCurrency(holding.gainLoss, 'TWD')}
              </Text>
              <Text size="xs" c={isCash ? 'dimmed' : profitColor}>
                {isCash ? '—' : (isProfit ? '+' : '') + formatPercentage(holding.gainLossPercent)}
              </Text>
            </div>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Paper p="md" withBorder>
      <Title order={3} mb="md">持股排序與現金</Title>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>排名</Table.Th>
            <Table.Th>名稱/代碼</Table.Th>
            <Table.Th>數量</Table.Th>
            <Table.Th>現價(原幣)</Table.Th>
            <Table.Th>市值(台幣)</Table.Th>
            <Table.Th>佔資產比例</Table.Th>
            <Table.Th>損益(台幣)</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
