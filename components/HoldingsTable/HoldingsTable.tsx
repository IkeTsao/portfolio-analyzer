'use client';

import { useState, useRef } from 'react';
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
  IconDownload,
  IconUpload,
} from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import { Holding } from '@/types/portfolio';
import { formatCurrency, formatPercentage } from '@/utils/portfolioCalculations';
import { formatCurrencyWithSymbol } from '@/utils/currencyUtils';
import { deleteHolding } from '@/utils/portfolioStorage';
import { notifications } from '@mantine/notifications';
import { exportHoldingsToCSV, downloadCSV, importHoldingsFromFile } from '@/utils/csvUtils';

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
  fund: '共同基金',
  bond: '債券',
  gold: '黃金',
  crypto: '加密貨幣',
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
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = async (holding: Holding) => {
    try {
      deleteHolding(holding.id);
      notifications.show({
        title: '刪除成功',
        message: `已刪除 ${holding.name}`,
        color: 'green',
      });
      // 刪除後重新計算投資組合
      onRefresh?.();
    } catch (error) {
      notifications.show({
        title: '刪除失敗',
        message: '請稍後再試',
        color: 'red',
      });
    }
  };

  // 導出 CSV
  const handleExportCSV = () => {
    try {
      const csvContent = exportHoldingsToCSV(holdings || []);
      const filename = `持倉明細_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csvContent, filename);
      
      notifications.show({
        title: '導出成功',
        message: `已導出 ${(holdings || []).length} 筆持倉數據`,
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: '導出失敗',
        message: '無法導出 CSV 檔案',
        color: 'red',
      });
    }
  };

  // 導入 CSV
  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 檢查檔案類型
    if (!file.name.toLowerCase().endsWith('.csv')) {
      notifications.show({
        title: '檔案格式錯誤',
        message: '請選擇 CSV 檔案',
        color: 'red',
      });
      return;
    }

    try {
      await importHoldingsFromFile(file);
      // 導入成功後刷新數據
      onRefresh?.();
    } catch (error) {
      // 錯誤處理已在 importHoldingsFromFile 中完成
    } finally {
      // 清空文件輸入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 帳戶排序優先級
  const getAccountOrder = (accountId: string): number => {
    const order: { [key: string]: number } = {
      'etrade': 1,
      'fubon': 2, 
      'esun': 3
    };
    return order[accountId] || 999;
  };

  // 智能代碼排序
  const sortBySymbol = (a: string, b: string): number => {
    // 提取數字和字母部分
    const extractParts = (str: string) => {
      const match = str.match(/^(\d*)(.*)$/);
      return {
        number: match?.[1] ? parseInt(match[1]) : Infinity,
        text: match?.[2] || str
      };
    };

    const partsA = extractParts(a);
    const partsB = extractParts(b);

    // 先按數字部分排序
    if (partsA.number !== partsB.number) {
      return partsA.number - partsB.number;
    }

    // 數字相同則按字母部分排序
    return partsA.text.localeCompare(partsB.text);
  };

  // 過濾和排序數據
  const filteredHoldings = (holdings || [])
    .filter(holding => {
      const matchesSearch = !searchQuery || 
        holding.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        holding.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = !typeFilter || holding.type === typeFilter;
      const matchesAccount = !accountFilter || holding.accountId === accountFilter;
      const matchesRegion = !regionFilter || holding.market === regionFilter;
      
      return matchesSearch && matchesType && matchesAccount && matchesRegion;
    })
    .sort((a, b) => {
      // 1. 按帳戶排序：Etrade → 富邦銀行 → 玉山銀行
      const orderA = getAccountOrder(a.accountId);
      const orderB = getAccountOrder(b.accountId);
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // 2. 相同帳戶內按代碼智能排序
      return sortBySymbol(a.symbol, b.symbol);
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
            title="編輯"
          >
            <IconEdit size={14} />
          </ActionIcon>
          <ActionIcon 
            variant="subtle" 
            size="sm" 
            color="red"
            onClick={() => handleDelete(holding)}
            title="刪除"
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
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
            <Button 
              variant="light" 
              leftSection={<IconDownload size={16} />}
              onClick={handleExportCSV}
              size="sm"
              color="green"
            >
              導出 CSV
            </Button>
            <Button 
              variant="light" 
              leftSection={<IconUpload size={16} />}
              onClick={handleImportCSV}
              size="sm"
              color="blue"
            >
              導入 CSV
            </Button>
            {onAdd && (
              <Button leftSection={<IconPlus size={16} />} onClick={onAdd}>
                新增持倉
              </Button>
            )}
          </Group>
        </Group>

        {/* 隱藏的文件輸入 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          style={{ display: 'none' }}
        />

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
          fetching={loading}
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
