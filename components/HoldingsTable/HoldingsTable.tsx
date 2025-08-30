'use client';
import { useState } from 'react';
import {
  Paper,
  Title,
  Group,
  Button,
  Text,
  Badge,
  ActionIcon,
  Menu,
  Stack,
  TextInput,
  Select,
} from '@mantine/core';
import { 
  IconPlus, 
  IconDots, 
  IconEdit, 
  IconTrash, 
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import { Holding } from '@/types/portfolio';
import { formatCurrency, formatPercentage } from '@/utils/portfolioCalculations';
import { formatCurrencyWithSymbol } from '@/utils/currencyUtils';
import { deleteHolding } from '@/utils/portfolioStorage';
import { notifications } from '@mantine/notifications';

interface HoldingWithCalculations extends Holding {
  currentPrice?: number;
  currentValue?: number;
  costValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  priceChange?: number;
  priceChangePercent?: number;
  lastUpdated?: string;
}

interface HoldingsTableProps {
  holdings: HoldingWithCalculations[];
  loading?: boolean;
  onAdd?: () => void;
  onEdit?: (holding: Holding) => void;
  onRefresh?: () => void;
  onUpdatePrices?: () => void;
}

// 類型顏色映射
const TYPE_COLORS: { [key: string]: string } = {
  stock: 'blue',
  fund: 'green',
  bond: 'orange',
  gold: 'yellow',
  crypto: 'purple',
  cash: 'gray',
};

// 類型標籤映射
const TYPE_LABELS: { [key: string]: string } = {
  stock: '股票',
  fund: '基金',
  bond: '債券',
  gold: '黃金',
  crypto: '加密貨幣',
  cash: '現金',
};

// 市場標籤映射
const MARKET_LABELS: { [key: string]: string } = {
  US: '美國',
  TW: '台灣',
  OTHER: '其他',
};

export default function HoldingsTable({
  holdings,
  loading = false,
  onAdd,
  onEdit,
  onRefresh,
  onUpdatePrices,
}: HoldingsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleDelete = async (holding: Holding) => {
    try {
      await deleteHolding(holding.id);
      notifications.show({
        title: '刪除成功',
        message: `已刪除持倉 ${holding.symbol}`,
        color: 'green',
      });
      // 觸發刷新
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      notifications.show({
        title: '刪除失敗',
        message: '無法刪除持倉，請稍後再試',
        color: 'red',
      });
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdatePrices = async () => {
    if (!onUpdatePrices) return;
    
    setRefreshing(true);
    try {
      await onUpdatePrices();
    } finally {
      setRefreshing(false);
    }
  };

  // 篩選持倉
  const filteredHoldings = holdings
    .filter((holding) => {
      const matchesSearch = !searchQuery || 
        holding.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        holding.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = !typeFilter || holding.type === typeFilter;
      const matchesAccount = !accountFilter || holding.accountId === accountFilter;
      const matchesRegion = !regionFilter || holding.market === regionFilter;
      
      return matchesSearch && matchesType && matchesAccount && matchesRegion;
    })
    .sort((a, b) => {
      // 按帳戶排序：Etrade → 富邦銀行 → 玉山銀行
      const accountOrder = { 'etrade': 1, 'fubon': 2, 'esun': 3 };
      const aOrder = accountOrder[a.accountId as keyof typeof accountOrder] || 999;
      const bOrder = accountOrder[b.accountId as keyof typeof accountOrder] || 999;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // 相同帳戶內按代碼排序（數字和英文字母從 A 到 Z）
      return a.symbol.localeCompare(b.symbol, 'en', { 
        numeric: true,  // 數字排序
        caseFirst: 'upper'  // 大寫字母優先
      });
    });

  // 恢復原始的欄位順序
  const columns = [
    {
      accessor: 'symbol',
      title: '代碼',
      width: 100,
      render: (holding: HoldingWithCalculations) => (
        <Text fw={500}>{holding.symbol}</Text>
      ),
    },
    {
      accessor: 'name',
      title: '名稱',
      width: 200,
      render: (holding: HoldingWithCalculations) => (
        <Stack gap={2}>
          <Text size="sm" fw={500}>{holding.name}</Text>
          <Group gap="xs">
            <Badge size="xs" color={TYPE_COLORS[holding.type]}>
              {TYPE_LABELS[holding.type]}
            </Badge>
            <Badge size="xs" variant="light">
              {MARKET_LABELS[holding.market]}
            </Badge>
          </Group>
        </Stack>
      ),
    },
    {
      accessor: 'accountId',
      title: '帳戶',
      width: 120,
      render: (holding: HoldingWithCalculations) => {
        const accountLabels: { [key: string]: string } = {
          etrade: 'Etrade',
          fubon: '富邦銀行',
          esun: '玉山銀行',
        };
        return (
          <Badge size="sm" variant="light" color="blue">
            {accountLabels[holding.accountId] || holding.accountId}
          </Badge>
        );
      },
    },
    {
      accessor: 'quantity',
      title: '數量',
      width: 100,
      textAlign: 'right' as const,
      render: (holding: HoldingWithCalculations) => (
        <Text size="sm">{holding.quantity.toLocaleString()}</Text>
      ),
    },
    {
      accessor: 'costBasis',
      title: '成本價',
      width: 120,
      textAlign: 'right' as const,
      render: (holding: HoldingWithCalculations) => (
        <Text size="sm">{formatCurrencyWithSymbol(holding.costBasis, holding.currency)}</Text>
      ),
    },
    {
      accessor: 'currentPrice',
      title: '現價',
      width: 120,
      textAlign: 'right' as const,
      render: (holding: HoldingWithCalculations) => (
        <Stack gap={2} align="flex-end">
          <Text size="sm" fw={500}>
            {holding.currentPrice ? 
              formatCurrencyWithSymbol(holding.currentPrice, holding.currency) : 
              '-'
            }
          </Text>
          {holding.priceChangePercent !== undefined && holding.priceChangePercent !== 0 && (
            <Text 
              size="xs" 
              c={holding.priceChangePercent >= 0 ? 'green' : 'red'}
            >
              {formatPercentage(holding.priceChangePercent)}
            </Text>
          )}
        </Stack>
      ),
    },
    {
      accessor: 'costValue',
      title: '成本',
      width: 120,
      textAlign: 'right' as const,
      render: (holding: HoldingWithCalculations) => {
        const totalCost = holding.quantity * holding.costBasis;
        return (
          <Text size="sm">
            {formatCurrencyWithSymbol(totalCost, holding.currency)}
          </Text>
        );
      },
    },
    {
      accessor: 'currentValue',
      title: '市值(台幣)',
      width: 120,
      textAlign: 'right' as const,
      render: (holding: HoldingWithCalculations) => (
        <Text size="sm" fw={500}>
          {holding.currentValue ? formatCurrency(holding.currentValue) : '-'}
        </Text>
      ),
    },
    {
      accessor: 'gainLoss',
      title: '損益(台幣)',
      width: 140,
      textAlign: 'right' as const,
      render: (holding: HoldingWithCalculations) => (
        <Stack gap={2} align="flex-end">
          <Text 
            size="sm" 
            fw={500}
            c={holding.gainLoss && holding.gainLoss >= 0 ? 'green' : 'red'}
          >
            {holding.gainLoss ? formatCurrency(holding.gainLoss) : '-'}
          </Text>
          {holding.gainLossPercent !== undefined && (
            <Text 
              size="xs" 
              c={holding.gainLossPercent >= 0 ? 'green' : 'red'}
            >
              {formatPercentage(holding.gainLossPercent)}
            </Text>
          )}
        </Stack>
      ),
    },
    {
      accessor: 'actions',
      title: '操作',
      width: 120,
      textAlign: 'center' as const,
      render: (holding: any) => (
        <Group gap="xs" justify="center">
          <ActionIcon 
            variant="subtle" 
            size="sm" 
            color="blue"
            onClick={() => onEdit?.(holding)}
          >
            <IconEdit size={14} />
          </ActionIcon>
          <ActionIcon 
            variant="subtle" 
            size="sm" 
            color="red"
            onClick={() => handleDelete(holding)}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ),
    },
  ];

  return (
    <Paper p="md" shadow="sm" radius="md">
      <Stack gap="md">
        {/* 標題和操作按鈕 */}
        <Group justify="space-between">
          <Title order={3}>持倉明細</Title>
          <Group gap="xs">
            {onUpdatePrices && (
              <Button 
                variant="light" 
                leftSection={<IconRefresh size={16} />}
                onClick={handleUpdatePrices}
                loading={refreshing || loading}
                size="sm"
              >
                更新價格
              </Button>
            )}
            {onAdd && (
              <Button leftSection={<IconPlus size={16} />} onClick={onAdd}>
                新增持倉
              </Button>
            )}
          </Group>
        </Group>

        {/* 搜尋和篩選 */}
        <Group>
          <TextInput
            placeholder="搜尋代碼或名稱..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="類型"
            value={typeFilter}
            onChange={setTypeFilter}
            data={[
              { value: '', label: '全部類型' },
              { value: 'stock', label: '股票' },
              { value: 'fund', label: '基金' },
              { value: 'bond', label: '債券' },
              { value: 'gold', label: '黃金' },
              { value: 'crypto', label: '加密貨幣' },
              { value: 'cash', label: '現金' },
            ]}
            clearable
          />
          <Select
            placeholder="帳戶"
            value={accountFilter}
            onChange={setAccountFilter}
            data={[
              { value: '', label: '全部帳戶' },
              { value: 'etrade', label: 'Etrade' },
              { value: 'fubon', label: '富邦銀行' },
              { value: 'esun', label: '玉山銀行' },
            ]}
            clearable
          />
          <Select
            placeholder="區域"
            value={regionFilter}
            onChange={setRegionFilter}
            data={[
              { value: '', label: '全部區域' },
              { value: 'US', label: '美國市場' },
              { value: 'TW', label: '台灣市場' },
              { value: 'OTHER', label: '其他市場' },
            ]}
            clearable
          />
        </Group>

        {/* 數據表格 */}
        <DataTable
          columns={columns}
          records={filteredHoldings}
          fetching={loading || refreshing}
          noRecordsText="暫無持倉數據"
          minHeight={200}
          striped
          highlightOnHover
          scrollAreaProps={{ type: 'scroll' }}
          style={{ width: '100%', overflowX: 'auto' }}
        />
      </Stack>
    </Paper>
  );
}
