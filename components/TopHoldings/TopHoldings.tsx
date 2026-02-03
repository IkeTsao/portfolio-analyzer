import { Paper, Title, Table, Text, Group, Badge } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { TopHolding, formatCurrency, formatPercentage, formatQuantity, formatQuantityWithCommas } from '@/utils/portfolioCalculations';
import { formatCurrencyWithSymbol } from '@/utils/currencyUtils';

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
        <Table.Td style={{ textAlign: 'center' }}>
          {(() => {
            const offensiveTypes = ['growth', 'index', 'dividend', 'crypto'];
            const isOffensive = offensiveTypes.includes(holding.type);
            return (
              <Badge 
                size="xs" 
                color={isOffensive ? 'blue' : 'orange'}
                variant="filled"
              >
                {isOffensive ? '攻擊端' : '防禦端'}
              </Badge>
            );
          })()}
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
        <Table.Td style={{ textAlign: 'right' }}>
          <Text size="sm" fw={500}>
            {isCash ? '—' : formatCurrencyWithSymbol(holding.currentPrice, holding.currency)}
          </Text>
        </Table.Td>
        <Table.Td style={{ textAlign: 'right' }}>
          <Text size="sm" fw={500}>
            {holding.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </Table.Td>
        <Table.Td style={{ textAlign: 'right' }}>
          <Text size="sm" fw={500}>
            {isCash ? '—' : formatCurrencyWithSymbol(holding.costBasis, holding.currency)}
          </Text>
        </Table.Td>
        <Table.Td style={{ textAlign: 'right' }}>
          <Text size="sm" fw={500}>
            {formatCurrencyWithSymbol(holding.currentValueInOriginalCurrency, holding.currency)}
          </Text>
        </Table.Td>
        <Table.Td style={{ textAlign: 'right' }}>
          <Text size="sm" fw={500}>
            {formatCurrency(holding.currentValue, 'TWD')}
          </Text>
        </Table.Td>
        <Table.Td style={{ textAlign: 'right' }}>
          <Text size="sm" fw={500} c="blue">
            {holding.assetRatio.toFixed(2)}%
          </Text>
        </Table.Td>
        <Table.Td style={{ textAlign: 'right' }}>
          <Group gap="xs" justify="flex-end">
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
            <Table.Th style={{ textAlign: 'center' }}>資產類型</Table.Th>
            <Table.Th>名稱/代碼</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>現價(原幣)</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>數量</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>購入成本(原幣)</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>市值(原幣)</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>市值(台幣)</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>佔資產比例</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>損益(台幣)</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
