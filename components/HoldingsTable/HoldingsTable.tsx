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
}

export default function HoldingsTable({
  holdings,
  loading = false,
  onAdd,
  onEdit,
  onRefresh,
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
      // 按帳戶排序：Etrade → 富邦 → 玉山
      const accountOrder = { 'etrade': 1, 'fubon': 2, 'esun': 3 };
      const aOrder = accountOrder[a.accountId as keyof typeof accountOrder] || 999;
      const bOrder = accountOrder[b.accountId as keyof typeof accountOrder] || 999;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // 相同帳戶內按類型排序
      const typeOrder = { 'stock': 1, 'fund': 2, 'bond': 3, 'gold': 4, 'crypto': 5, 'cash': 6 };
      const aTypeOrder = typeOrder[a.type as keyof typeof typeOrder] || 999;
      const bTypeOrder = typeOrder[b.type as keyof typeof typeOrder] || 999;
      
      if (aTypeOrder !== bTypeOrder) {
        return aTypeOrder - bTypeOrder;
      }
      
      // 相同類型內按代碼排序
      return a.symbol.localeCompare(b.symbol);
    });

  const getAccountName = (accountId: string) => {
    switch (accountId) {
      case 'etrade': return 'Etrade';
      case 'fubon': return '富邦';
      case 'esun': return '玉山';
      default: return accountId;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'stock': return '股票';
      case 'fund': return '基金';
      case 'bond': return '債券';
      case 'gold': return '黃金';
      case 'crypto': return '數位貨幣';
      case 'cash': return '現金';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'stock': return 'blue';
      case 'fund': return 'green';
      case 'bond': return 'orange';
      case 'gold': return 'yellow';
      case 'crypto': return 'purple';
      case 'cash': return 'gray';
      default: return 'gray';
    }
  };

  const columns = [
    {
      accessor: 'accountId',
      title: '帳戶',
      width: 80,
      render: (holding: HoldingWithCalculations) => (
        <Text size="sm" fw={500}>
          {getAccountName(holding.accountId)}
        </Text>
      ),
    },
    {
      accessor: 'type',
      title: '類型',
      width: 80,
      render: (holding: HoldingWithCalculations) => (
        <Badge color={getTypeColor(holding.type)} size="sm">
          {getTypeName(holding.type)}
        </Badge>
      ),
    },
    {
      accessor: 'symbol',
      title: '代碼',
      width: 100,
      render: (holding: HoldingWithCalculations) => (
        <Text size="sm" fw={600}>
          {holding.symbol}
        </Text>
      ),
    },
    {
      accessor: 'name',
      title: '名稱',
      width: 200,
      render: (holding: HoldingWithCalculations) => (
        <Text size="sm" lineClamp={2}>
          {holding.name}
        </Text>
      ),
    },
    {
      accessor: 'quantity',
      title: '數量',
      width: 100,
      textAlign: 'right' as const,
      render: (holding: HoldingWithCalculations) => (
        <Text size="sm">
          {formatCurrency(holding.quantity, '', 0)}
        </Text>
      ),
    },
    {
      accessor: 'costPrice',
      title: '成本價',
      width: 120,
      textAlign: 'right' as const,
      render: (holding: HoldingWithCalculations) => (
        <Text size="sm">
          {formatCurrencyWithSymbol(holding.costPrice, holding.currency)}
        </Text>
      ),
    },
    {
      accessor: 'currentPrice',
      title: '現價',
      width: 120,
      textAlign: 'right' as const,
      render: (holding: HoldingWithCalculations) => (
        <Stack gap={2}>
          <Text size="sm">
            {holding.currentPrice 
              ? formatCurrencyWithSymbol(holding.currentPrice, holding.currency)
              : '-'
            }
          </Text>
          {holding.priceChange !== undefined && holding.priceChangePercent !== undefined && (
            <Text 
              size="xs" 
              c={holding.priceChange >= 0 ? 'green' : 'red'}
            >
              {holding.priceChange >= 0 ? '+' : ''}{formatCurrency(holding.priceChange, holding.currency)} 
              ({holding.priceChangePercent >= 0 ? '+' : ''}{formatPercentage(holding.priceChangePercent)})
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
      render: (holding: HoldingWithCalculations) => (
        <Text size="sm">
          {holding.costValue 
            ? formatCurrencyWithSymbol(holding.costValue, holding.currency)
            : '-'
          }
        </Text>
      ),
    },
    {
      accessor: 'currentValue',
      title: '市值',
      width: 120,
      textAlign: 'right' as const,
      render: (holding: HoldingWithCalculations) => (
        <Text size="sm">
          {holding.currentValue 
            ? formatCurrencyWithSymbol(holding.currentValue, holding.currency)
            : '-'
          }
        </Text>
      ),
    },
    {
      accessor: 'gainLoss',
      title: '損益',
      width: 140,
      textAlign: 'right' as const,
      render: (holding: HoldingWithCalculations) => (
        <Stack gap={2}>
          <Text 
            size="sm" 
            c={holding.gainLoss && holding.gainLoss >= 0 ? 'green' : 'red'}
            fw={500}
          >
            {holding.gainLoss 
              ? `${holding.gainLoss >= 0 ? '+' : ''}${formatCurrencyWithSymbol(holding.gainLoss, holding.currency)}`
              : '-'
            }
          </Text>
          {holding.gainLossPercent !== undefined && (
            <Text 
              size="xs" 
              c={holding.gainLossPercent >= 0 ? 'green' : 'red'}
            >
              {holding.gainLossPercent >= 0 ? '+' : ''}{formatPercentage(holding.gainLossPercent)}
            </Text>
          )}
        </Stack>
      ),
    },
    {
      accessor: 'actions',
      title: '操作',
      width: 80,
      textAlign: 'center' as const,
      render: (holding: HoldingWithCalculations) => (
        <Menu shadow="md" width={120}>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray">
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconEdit size={14} />}
              onClick={() => onEdit?.(holding)}
            >
              編輯
            </Menu.Item>
            <Menu.Item
              leftSection={<IconTrash size={14} />}
              color="red"
              onClick={() => handleDelete(holding)}
            >
              刪除
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
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
            {onRefresh && (
              <Button 
                variant="light" 
                leftSection={<IconRefresh size={16} />}
                onClick={handleRefresh}
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
              { value: 'crypto', label: '數位貨幣' },
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
