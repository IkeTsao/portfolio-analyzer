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

const TYPE_COLORS: { [key: string]: string } = {
  stock: 'cyan',
  fund: 'blue',
  bond: 'indigo',
  gold: 'teal',
  crypto: 'green',
  cash: 'lime',
};

const TYPE_LABELS: { [key: string]: string } = {
  stock: '股票',
  fund: '基金',
  bond: '債券',
  gold: '黃金',
  crypto: '數位貨幣',
  cash: '現金',
};

const MARKET_LABELS: { [key: string]: string } = {
  US: '美國',
  TW: '台灣',
  OTHER: '其他',
};

export default function HoldingsTable({ 
  holdings, 
  loading, 
  onAdd, 
  onEdit, 
  onRefresh 
}: HoldingsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);

  const handleDelete = async (holding: Holding) => {
    try {
      deleteHolding(holding.id);
      notifications.show({
        title: '刪除成功',
        message: `已刪除 ${holding.name}`,
        color: 'green',
      });
      onRefresh?.();
    } catch (error) {
      notifications.show({
        title: '刪除失敗',
        message: '請稍後再試',
        color: 'red',
      });
    }
  };

  // 過濾數據
  const filteredHoldings = holdings.filter(holding => {
    const matchesSearch = !searchQuery || 
      holding.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      holding.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = !typeFilter || holding.type === typeFilter;
    const matchesAccount = !accountFilter || holding.accountId === accountFilter;
    
    return matchesSearch && matchesType && matchesAccount;
  });

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
        <Text size="sm">{formatCurrency(holding.costBasis, holding.currency)}</Text>
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
              formatCurrency(holding.currentPrice, holding.currency) : 
              '-'
            }
          </Text>
          {holding.priceChangePercent !== undefined && (
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
      render: (holding: HoldingWithCalculations) => (
        <Text size="sm">
          {holding.costValue ? formatCurrency(holding.costValue) : '-'}
        </Text>
      ),
    },
    {
      accessor: 'currentValue',
      title: '市值',
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
      title: '損益',
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
      title: '',
      width: 60,
      textAlign: 'center' as const,
      render: (holding: HoldingWithCalculations) => (
        <Menu position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" size="sm">
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
    <Paper p="md" withBorder>
      <Stack gap="md">
        {/* 標題和操作按鈕 */}
        <Group justify="space-between">
          <Title order={3}>持倉明細</Title>
          <Group gap="xs">
            {onRefresh && (
              <ActionIcon variant="light" onClick={onRefresh}>
                <IconRefresh size={16} />
              </ActionIcon>
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
        </Group>

        {/* 數據表格 */}
        <DataTable
          columns={columns}
          records={filteredHoldings}
          fetching={loading}
          noRecordsText="暫無持倉數據"
          minHeight={200}
          striped
          highlightOnHover
        />
      </Stack>
    </Paper>
  );
}

