'use client';

import { useState, useEffect } from 'react';
import { Paper, Text, Stack, Badge, Loader, Tooltip, SimpleGrid, Group, Button, Modal, TextInput, Select } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconAlertTriangle } from '@tabler/icons-react';

interface CustomStock {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  isFallback: boolean;
}

// 預設的指標股配置
const DEFAULT_STOCKS = [
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'PLTR', name: 'Palantir' },
  { symbol: 'LITE', name: 'Lumentum' },
  { symbol: 'KTOS', name: 'Kratos Defense' },
  { symbol: 'MAGS', name: 'Magnet Forensics' },
  { symbol: '2330.TW', name: '台積電' },
  { symbol: '6640.TWO', name: '均華' },
  { symbol: '0050.TW', name: '元大台灣50' },
  { symbol: '3324.TWO', name: '雙鴻' },
];

interface CustomStocksPanelProps {
  onStocksUpdate?: (stocks: CustomStock[]) => void;
}

export default function CustomStocksPanel({ onStocksUpdate }: CustomStocksPanelProps) {
  const [stocks, setStocks] = useState<CustomStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingStock, setEditingStock] = useState<{ symbol: string; name: string } | null>(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');

  const fetchStockData = async (symbol: string, name: string): Promise<CustomStock> => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${baseUrl}/api/stock-price?symbol=${encodeURIComponent(symbol)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return {
          symbol,
          name,
          value: data.data.price || 0,
          change: data.data.change || 0,
          changePercent: data.data.changePercent || 0,
          isFallback: false,
        };
      } else {
        throw new Error('API 返回無效數據');
      }
    } catch (error) {
      console.error(`獲取 ${symbol} 數據失敗:`, error);
      return {
        symbol,
        name,
        value: getFallbackPrice(symbol),
        change: 0,
        changePercent: 0,
        isFallback: true,
      };
    }
  };

  const getFallbackPrice = (symbol: string): number => {
    const fallbackPrices: { [key: string]: number } = {
      'NVDA': 450,
      'PLTR': 25,
      'LITE': 60,
      'KTOS': 18,
      'MAGS': 35,
      '2330.TW': 580,
      '6640.TWO': 120,
      '0050.TW': 140,
      '3324.TWO': 85,
    };
    return fallbackPrices[symbol] || 100;
  };

  const fetchAllStocks = async () => {
    setLoading(true);
    try {
      // 從 localStorage 獲取用戶自訂股票，如果沒有則使用預設值
      const savedStocks = localStorage.getItem('customStocks');
      const stockConfigs = savedStocks ? JSON.parse(savedStocks) : DEFAULT_STOCKS;
      
      const stockPromises = stockConfigs.map((config: { symbol: string; name: string }) =>
        fetchStockData(config.symbol, config.name)
      );
      
      const fetchedStocks = await Promise.all(stockPromises);
      setStocks(fetchedStocks);
      
      if (onStocksUpdate) {
        onStocksUpdate(fetchedStocks);
      }
    } catch (error) {
      console.error('獲取股票數據失敗:', error);
      // 使用預設備用數據
      const fallbackStocks = DEFAULT_STOCKS.map(config => ({
        symbol: config.symbol,
        name: config.name,
        value: getFallbackPrice(config.symbol),
        change: 0,
        changePercent: 0,
        isFallback: true,
      }));
      setStocks(fallbackStocks);
    } finally {
      setLoading(false);
    }
  };

  const saveStocksToStorage = (stockConfigs: { symbol: string; name: string }[]) => {
    localStorage.setItem('customStocks', JSON.stringify(stockConfigs));
  };

  const handleAddStock = () => {
    if (stocks.length >= 10) {
      alert('最多只能添加10支股票');
      return;
    }
    setEditingStock(null);
    setNewSymbol('');
    setNewName('');
    setModalOpened(true);
  };

  const handleEditStock = (stock: CustomStock) => {
    setEditingStock({ symbol: stock.symbol, name: stock.name });
    setNewSymbol(stock.symbol);
    setNewName(stock.name);
    setModalOpened(true);
  };

  const handleDeleteStock = (symbol: string) => {
    const updatedStocks = stocks.filter(stock => stock.symbol !== symbol);
    setStocks(updatedStocks);
    
    const stockConfigs = updatedStocks.map(stock => ({ symbol: stock.symbol, name: stock.name }));
    saveStocksToStorage(stockConfigs);
  };

  const handleSaveStock = async () => {
    if (!newSymbol.trim() || !newName.trim()) {
      alert('請填寫股票代碼和名稱');
      return;
    }

    const currentConfigs = stocks.map(stock => ({ symbol: stock.symbol, name: stock.name }));
    
    if (editingStock) {
      // 編輯現有股票
      const updatedConfigs = currentConfigs.map(config =>
        config.symbol === editingStock.symbol
          ? { symbol: newSymbol.trim(), name: newName.trim() }
          : config
      );
      saveStocksToStorage(updatedConfigs);
    } else {
      // 添加新股票
      if (currentConfigs.some(config => config.symbol === newSymbol.trim())) {
        alert('該股票代碼已存在');
        return;
      }
      
      const newConfigs = [...currentConfigs, { symbol: newSymbol.trim(), name: newName.trim() }];
      saveStocksToStorage(newConfigs);
    }

    setModalOpened(false);
    fetchAllStocks(); // 重新獲取數據
  };

  const formatValue = (value: number): string => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const hasFallbackData = stocks.some(stock => stock.isFallback);

  useEffect(() => {
    fetchAllStocks();
    // 每5分鐘更新一次數據
    const interval = setInterval(fetchAllStocks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const renderStockCard = (stock: CustomStock) => (
    <Paper 
      key={stock.symbol} 
      p="sm" 
      withBorder 
      bg={stock.isFallback ? "yellow.0" : "gray.0"}
    >
      <Stack gap="xs">
        <Group justify="space-between">
          <div>
            <Text fw={500} size="sm">{stock.name}</Text>
            <Text size="xs" c="dimmed">{stock.symbol}</Text>
          </div>
          <Group gap="xs">
            <Button
              size="xs"
              variant="subtle"
              onClick={() => handleEditStock(stock)}
            >
              <IconEdit size={12} />
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="red"
              onClick={() => handleDeleteStock(stock.symbol)}
            >
              <IconTrash size={12} />
            </Button>
          </Group>
        </Group>
        
        <Group justify="space-between" align="center">
          <Text 
            size="lg" 
            fw={700} 
            c={stock.isFallback ? "orange" : "blue"}
          >
            {formatValue(stock.value)}
          </Text>
          
          {stock.isFallback && (
            <Tooltip 
              label="此為備用數據，非即時數據"
              position="top"
              withArrow
            >
              <Badge 
                size="xs" 
                color="orange" 
                variant="filled"
                style={{ cursor: 'help' }}
              >
                !
              </Badge>
            </Tooltip>
          )}
        </Group>
        
        {stock.change !== 0 && !stock.isFallback && (
          <Badge 
            size="xs" 
            color={stock.change > 0 ? 'green' : 'red'}
            variant="light"
          >
            {stock.change > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
          </Badge>
        )}
        
        {stock.isFallback && (
          <Badge 
            size="xs" 
            color="orange"
            variant="light"
          >
            備用數據
          </Badge>
        )}
      </Stack>
    </Paper>
  );

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <Text fw={500} size="sm">自訂指標股 ({stocks.length}/10)</Text>
            {hasFallbackData && (
              <Tooltip 
                label="部分股票數據無法獲取，正在顯示備用數據"
                position="top"
                withArrow
              >
                <IconAlertTriangle 
                  size={16} 
                  color="orange" 
                  style={{ cursor: 'help' }}
                />
              </Tooltip>
            )}
          </Group>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={handleAddStock}
            disabled={stocks.length >= 10}
          >
            新增股票
          </Button>
        </Group>

        {loading ? (
          <Group justify="center" p="md">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">載入股票數據中...</Text>
          </Group>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
            {stocks.map(renderStockCard)}
          </SimpleGrid>
        )}
      </Stack>

      {/* 新增/編輯股票 Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingStock ? '編輯股票' : '新增股票'}
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="股票代碼"
            placeholder="例如: NVDA, 2330.TW"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            required
          />
          <TextInput
            label="股票名稱"
            placeholder="例如: NVIDIA, 台積電"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="outline" onClick={() => setModalOpened(false)}>
              取消
            </Button>
            <Button onClick={handleSaveStock}>
              {editingStock ? '更新' : '新增'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

