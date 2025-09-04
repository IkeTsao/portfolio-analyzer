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
  Modal,
  Alert,
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
  IconDatabase,
  IconAlertCircle,
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
  onUpdatePrices?: () => void;
}

const TYPE_COLORS: { [key: string]: string } = {
  stock: 'cyan',
  fund: 'blue',
  bond: 'indigo',
  gold: 'teal',
  crypto: 'green',
  commodity: 'orange',
  cash: 'lime',
};

const TYPE_LABELS: { [key: string]: string } = {
  stock: '股票與ETF',
  fund: '股票共同基金',
  bond: '債券',
  gold: '黃金',
  crypto: '加密貨幣',
  commodity: '大宗物資',
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
  onRefresh,
  onUpdatePrices
}: HoldingsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [savingToday, setSavingToday] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 獲取今天的日期字串
  const getTodayString = (): string => {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  };

  // 檢查今天是否已有記錄
  const checkTodayExists = (): boolean => {
    try {
      const saved = localStorage.getItem('portfolioHistoricalData');
      if (saved) {
        const records = JSON.parse(saved);
        return records.some((record: any) => record.date === getTodayString());
      }
    } catch (error) {
      console.error('檢查今日記錄失敗:', error);
    }
    return false;
  };

  // 儲存當日 CSV 資料
  const handleSaveTodayCSV = () => {
    if (!holdings || holdings.length === 0) {
      notifications.show({
        title: '無資料可儲存',
        message: '目前沒有持倉資料可以儲存',
        color: 'orange',
      });
      return;
    }

    if (checkTodayExists()) {
      setConfirmModalOpened(true);
    } else {
      saveTodayData();
    }
  };

  // 執行儲存當日資料
  const saveTodayData = async () => {
    setSavingToday(true);
    
    try {
      const todayString = getTodayString();
      
      // 獲取匯率資料（使用匯率頁顯示的5種匯率）
      let exchangeRates: any = {};
      try {
        const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY']; // 日圓排最後
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        
        const ratePromises = currencies.map(async (currency) => {
          try {
            const response = await fetch(`${baseUrl}/api/scrape-exchange-rate?from=${currency}&to=TWD`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.rate && data.rate > 0) {
                return { currency, rate: data.rate };
              }
            }
          } catch (error) {
            console.warn(`獲取 ${currency} 匯率失敗:`, error);
          }
          return null;
        });
        
        const rateResults = await Promise.all(ratePromises);
        const validRates = rateResults.filter(result => result !== null);
        
        if (validRates.length > 0) {
          exchangeRates = {
            timestamp: Date.now(),
          };
          
          // 設定獲取到的匯率
          validRates.forEach((result) => {
            if (result) {
              exchangeRates[result.currency] = parseFloat(result.rate.toFixed(2));
            }
          });
          
          // 補充備用匯率（如果某些匯率獲取失敗）
          const fallbackRates = {
            USD: 32.0,
            EUR: 35.0,
            GBP: 40.0,
            CHF: 35.5,
            JPY: 0.22,
          };
          
          currencies.forEach(currency => {
            if (!exchangeRates[currency]) {
              exchangeRates[currency] = fallbackRates[currency];
            }
          });
        } else {
          // 全部失敗時使用備用匯率
          exchangeRates = {
            USD: 32.0,
            EUR: 35.0,
            GBP: 40.0,
            CHF: 35.5,
            JPY: 0.22,
            timestamp: Date.now(),
          };
        }
      } catch (error) {
        console.warn('獲取匯率資料失敗，使用備用匯率:', error);
        // 使用備用匯率
        exchangeRates = {
          USD: 32.0,
          EUR: 35.0,
          JPY: 0.22,
          GBP: 40.0,
          CHF: 35.5,
          timestamp: Date.now(),
        };
      }
      
      // 計算投資組合摘要
      let totalValue = 0;
      let totalCost = 0;
      
      holdings.forEach((holding) => {
        const quantity = holding.quantity || 0;
        const currentPrice = holding.currentPrice || 0;
        const costBasis = holding.costBasis || 0;
        
        totalValue += quantity * currentPrice;
        totalCost += quantity * costBasis;
      });
      
      const totalGainLoss = totalValue - totalCost;
      
      // 準備新記錄（包含匯率資料）
      const newRecord = {
        date: todayString,
        timestamp: Date.now(),
        data: holdings,
        exchangeRates, // 新增匯率資料
        totalValue,
        totalCost,
        totalGainLoss,
        recordCount: holdings.length,
      };

      // 獲取現有記錄
      const saved = localStorage.getItem('portfolioHistoricalData');
      let records = saved ? JSON.parse(saved) : [];
      
      // 移除今天的舊記錄（如果存在）
      records = records.filter((record: any) => record.date !== todayString);
      
      // 添加新記錄
      records.push(newRecord);
      
      // 儲存到 localStorage
      localStorage.setItem('portfolioHistoricalData', JSON.stringify(records));
      
      notifications.show({
        title: '儲存成功',
        message: `今日 (${todayString}) 的投資組合資料和匯率已儲存`,
        color: 'green',
      });
    } catch (error) {
      console.error('儲存今日資料失敗:', error);
      notifications.show({
        title: '儲存失敗',
        message: '儲存今日投資組合資料時發生錯誤',
        color: 'red',
      });
    } finally {
      setSavingToday(false);
      setConfirmModalOpened(false);
    }
  };

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
  const handleExportCSV = async () => {
    try {
      // 獲取當前匯率資料（使用匯率頁的5種匯率）
      let exchangeRates: any = {};
      try {
        const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY']; // 日圓排最後
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        
        const ratePromises = currencies.map(async (currency) => {
          try {
            const response = await fetch(`${baseUrl}/api/scrape-exchange-rate?from=${currency}&to=TWD`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.rate && data.rate > 0) {
                return { currency, rate: data.rate };
              }
            }
          } catch (error) {
            console.warn(`獲取 ${currency} 匯率失敗:`, error);
          }
          return null;
        });
        
        const rateResults = await Promise.all(ratePromises);
        const validRates = rateResults.filter(result => result !== null);
        
        if (validRates.length > 0) {
          exchangeRates = {
            timestamp: Date.now(),
          };
          
          // 設定獲取到的匯率
          validRates.forEach((result) => {
            if (result) {
              exchangeRates[result.currency] = parseFloat(result.rate.toFixed(2));
            }
          });
          
          // 補充備用匯率（如果某些匯率獲取失敗）
          const fallbackRates = {
            USD: 32.0,
            EUR: 35.0,
            GBP: 40.0,
            CHF: 35.5,
            JPY: 0.22,
          };
          
          currencies.forEach(currency => {
            if (!exchangeRates[currency]) {
              exchangeRates[currency] = fallbackRates[currency];
            }
          });
        } else {
          // 全部失敗時使用備用匯率
          exchangeRates = {
            USD: 32.0,
            EUR: 35.0,
            GBP: 40.0,
            CHF: 35.5,
            JPY: 0.22,
            timestamp: Date.now(),
          };
        }
      } catch (error) {
        console.error('獲取匯率失敗:', error);
        // 使用備用匯率
        exchangeRates = {
          USD: 32.0,
          EUR: 35.0,
          JPY: 0.22,
          GBP: 40.0,
          CHF: 35.5,
          timestamp: Date.now(),
        };
      }

      const csvContent = exportHoldingsToCSV(holdings, exchangeRates);
      const filename = `持倉明細_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csvContent, filename);
      
      notifications.show({
        title: '導出成功',
        message: `已導出 ${holdings.length} 筆持倉數據（包含匯率資料）`,
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
  const filteredHoldings = holdings
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
        <Text size="sm">{holding.quantity.toFixed(3)}</Text>
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
    <>
    <Paper p="md" withBorder>
      <Stack gap="md">
        {/* 標題和操作按鈕 */}
        <Group justify="space-between">
          <Title order={3}>持倉明細</Title>
          <Group gap="xs">
            <Button 
              variant="light" 
              leftSection={<IconDatabase size={16} />}
              onClick={handleSaveTodayCSV}
              size="sm"
              color="purple"
              loading={savingToday}
            >
              儲存當日
            </Button>
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
            {onUpdatePrices && (
              <Button 
                variant="light" 
                leftSection={<IconRefresh size={16} />}
                onClick={onUpdatePrices}
                size="sm"
                color="orange"
                loading={loading}
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
              { value: 'stock', label: '股票與ETF' },
              { value: 'fund', label: '股票共同基金' },
              { value: 'bond', label: '債券' },
              { value: 'gold', label: '黃金' },
              { value: 'crypto', label: '加密貨幣' },
              { value: 'commodity', label: '大宗物資' },
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

        {/* 小計行 */}
        {filteredHoldings.length > 0 && (
          <Paper p="sm" withBorder style={{ backgroundColor: '#f8f9fa' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '80px 200px 120px 100px 120px 120px 120px 120px 120px 120px',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              paddingLeft: '8px',
              paddingRight: '8px'
            }}>
              {/* 代碼欄位 */}
              <div></div>
              
              {/* 名稱欄位 */}
              <div></div>
              
              {/* 帳戶欄位 */}
              <div></div>
              
              {/* 數量欄位 */}
              <div></div>
              
              {/* 成本價欄位 */}
              <div></div>
              
              {/* 現價欄位 */}
              <div></div>
              
              {/* 成本欄位 */}
              <div style={{ textAlign: 'left' }}>
                <Text fw={600} size="sm" c="dimmed">
                  小計 ({filteredHoldings.length} 筆)
                </Text>
              </div>
              
              {/* 市值(台幣)欄位 - 向左調整對齊 */}
              <div style={{ textAlign: 'right' }}>
                <Text fw={600} size="sm">
                  市值(台幣)小計: {formatCurrency(
                    filteredHoldings.reduce((sum, holding) => 
                      sum + (holding.currentValue || 0), 0
                    )
                  )}
                </Text>
              </div>
              
              {/* 損益(台幣)欄位 - 向左調整對齊 */}
              <div style={{ textAlign: 'right' }}>
                <Text 
                  fw={600} 
                  size="sm"
                  c={filteredHoldings.reduce((sum, holding) => 
                    sum + (holding.gainLoss || 0), 0
                  ) >= 0 ? 'green' : 'red'}
                >
                  損益(台幣)小計: {formatCurrency(
                    filteredHoldings.reduce((sum, holding) => 
                      sum + (holding.gainLoss || 0), 0
                    )
                  )}
                </Text>
              </div>
              
              {/* 操作欄位 */}
              <div></div>
            </div>
          </Paper>
        )}
      </Stack>
    </Paper>

    {/* 確認覆蓋 Modal */}
    <Modal
      opened={confirmModalOpened}
      onClose={() => setConfirmModalOpened(false)}
      title="確認覆蓋今日資料"
      size="sm"
    >
      <Stack gap="md">
        <Alert icon={<IconAlertCircle size={16} />} color="orange">
          <Text size="sm">
            今日 ({getTodayString()}) 已有投資組合記錄。確定要覆蓋現有資料嗎？
          </Text>
        </Alert>
        <Group justify="flex-end" gap="sm">
          <Button 
            variant="outline" 
            onClick={() => setConfirmModalOpened(false)}
          >
            取消
          </Button>
          <Button 
            color="orange"
            onClick={saveTodayData}
            loading={savingToday}
          >
            確認覆蓋
          </Button>
        </Group>
      </Stack>
    </Modal>
  </>
  );
}
