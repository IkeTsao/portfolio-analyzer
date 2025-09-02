'use client';

import { useState, useEffect } from 'react';
import { Paper, Title, Group, Text, Stack, Badge, Loader, Tooltip, SimpleGrid, Tabs } from '@mantine/core';
import { IconRefresh, IconAlertTriangle, IconTrendingUp, IconCurrencyDollar, IconChartLine } from '@tabler/icons-react';

interface ExchangeRate {
  currency: string;
  rate: number;
  change: number;
  label: string;
  symbol: string;
  isFallback: boolean;
}

interface FinancialIndicator {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  unit: string;
  category: 'index' | 'bond' | 'commodity' | 'crypto';
  isFallback: boolean;
}

export default function LiveInfoDisplay() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [indicators, setIndicators] = useState<FinancialIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchExchangeRates = async () => {
    try {
      const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY'];
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      
      const ratePromises = currencies.map(async (currency) => {
        try {
          const response = await fetch(`${baseUrl}/api/scrape-exchange-rate?from=${currency}&to=TWD`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          
          if (data.success && data.rate && data.rate > 0) {
            return {
              currency,
              rate: data.rate,
              change: data.change || 0,
              label: getCurrencyLabel(currency),
              symbol: getCurrencySymbol(currency),
              isFallback: false,
            };
          } else {
            throw new Error('API 返回無效數據');
          }
        } catch (error) {
          console.error(`獲取 ${currency} 匯率失敗:`, error);
          const fallbackRates: { [key: string]: number } = {
            'USD': 31.5,
            'EUR': 34.2,
            'GBP': 39.8,
            'CHF': 35.1,
            'JPY': 0.21,
          };
          return {
            currency,
            rate: fallbackRates[currency] || 0,
            change: 0,
            label: getCurrencyLabel(currency),
            symbol: getCurrencySymbol(currency),
            isFallback: true,
          };
        }
      });

      const fetchedRates = await Promise.all(ratePromises);
      setRates(fetchedRates);
    } catch (error) {
      console.error('獲取匯率失敗:', error);
      const fallbackRates = [
        { currency: 'USD', rate: 31.5, change: 0, label: '美金', symbol: '$', isFallback: true },
        { currency: 'EUR', rate: 34.2, change: 0, label: '歐元', symbol: '€', isFallback: true },
        { currency: 'GBP', rate: 39.8, change: 0, label: '英鎊', symbol: '£', isFallback: true },
        { currency: 'CHF', rate: 35.1, change: 0, label: '瑞士法郎', symbol: 'CHF', isFallback: true },
        { currency: 'JPY', rate: 0.21, change: 0, label: '日圓', symbol: '¥', isFallback: true },
      ];
      setRates(fallbackRates);
    }
  };

  const fetchFinancialIndicators = async () => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      
      // 定義要獲取的金融指標
      const indicatorSymbols = [
        // 美國指數
        { symbol: 'DX-Y.NYB', name: '美元指數', category: 'index' as const },
        { symbol: '^DJI', name: '道瓊指數', category: 'index' as const },
        { symbol: '^GSPC', name: 'S&P 500', category: 'index' as const },
        
        // 台股指數
        { symbol: '^TWII', name: '台股指數', category: 'index' as const },
        
        // 債券利率
        { symbol: '^TNX', name: '美國10年公債', category: 'bond' as const },
        { symbol: '^TYX', name: '美國30年公債', category: 'bond' as const },
        
        // 商品
        { symbol: 'GC=F', name: '黃金', category: 'commodity' as const },
        
        // 加密貨幣
        { symbol: 'BTC-USD', name: '比特幣', category: 'crypto' as const },
      ];

      const indicatorPromises = indicatorSymbols.map(async (item) => {
        try {
          const response = await fetch(`${baseUrl}/api/stock-price?symbol=${encodeURIComponent(item.symbol)}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          
          if (data.success && data.data) {
            return {
              symbol: item.symbol,
              name: item.name,
              value: data.data.price || 0,
              change: data.data.change || 0,
              changePercent: data.data.changePercent || 0,
              unit: getIndicatorUnit(item.symbol),
              category: item.category,
              isFallback: false,
            };
          } else {
            throw new Error('API 返回無效數據');
          }
        } catch (error) {
          console.error(`獲取 ${item.name} 數據失敗:`, error);
          return {
            symbol: item.symbol,
            name: item.name,
            value: getFallbackValue(item.symbol),
            change: 0,
            changePercent: 0,
            unit: getIndicatorUnit(item.symbol),
            category: item.category,
            isFallback: true,
          };
        }
      });

      const fetchedIndicators = await Promise.all(indicatorPromises);
      setIndicators(fetchedIndicators);
    } catch (error) {
      console.error('獲取金融指標失敗:', error);
      // 設置備用數據
      const fallbackIndicators: FinancialIndicator[] = [
        { symbol: 'DX-Y.NYB', name: '美元指數', value: 104.5, change: 0, changePercent: 0, unit: '', category: 'index', isFallback: true },
        { symbol: '^DJI', name: '道瓊指數', value: 34500, change: 0, changePercent: 0, unit: '', category: 'index', isFallback: true },
        { symbol: '^GSPC', name: 'S&P 500', value: 4400, change: 0, changePercent: 0, unit: '', category: 'index', isFallback: true },
        { symbol: '^TWII', name: '台股指數', value: 17000, change: 0, changePercent: 0, unit: '', category: 'index', isFallback: true },
        { symbol: '^TNX', name: '美國10年公債', value: 4.5, change: 0, changePercent: 0, unit: '%', category: 'bond', isFallback: true },
        { symbol: '^TYX', name: '美國30年公債', value: 4.8, change: 0, changePercent: 0, unit: '%', category: 'bond', isFallback: true },
        { symbol: 'GC=F', name: '黃金', value: 2000, change: 0, changePercent: 0, unit: '$', category: 'commodity', isFallback: true },
        { symbol: 'BTC-USD', name: '比特幣', value: 45000, change: 0, changePercent: 0, unit: '$', category: 'crypto', isFallback: true },
      ];
      setIndicators(fallbackIndicators);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchExchangeRates(), fetchFinancialIndicators()]);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  const getCurrencyLabel = (currency: string): string => {
    const labels: { [key: string]: string } = {
      USD: '美金',
      EUR: '歐元',
      GBP: '英鎊',
      CHF: '瑞士法郎',
      JPY: '日圓',
    };
    return labels[currency] || currency;
  };

  const getCurrencySymbol = (currency: string): string => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CHF: 'CHF',
      JPY: '¥',
    };
    return symbols[currency] || currency;
  };

  const getIndicatorUnit = (symbol: string): string => {
    if (symbol.includes('TNX') || symbol.includes('TYX')) return '%';
    if (symbol.includes('GC=F') || symbol.includes('BTC-USD')) return '$';
    return '';
  };

  const getFallbackValue = (symbol: string): number => {
    const fallbackValues: { [key: string]: number } = {
      'DX-Y.NYB': 104.5,
      '^DJI': 34500,
      '^GSPC': 4400,
      '^TWII': 17000,
      '^TNX': 4.5,
      '^TYX': 4.8,
      'GC=F': 2000,
      'BTC-USD': 45000,
    };
    return fallbackValues[symbol] || 0;
  };

  const formatValue = (value: number, unit: string): string => {
    if (unit === '%') {
      return `${value.toFixed(2)}%`;
    }
    if (unit === '$') {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  const hasFallbackData = rates.some(rate => rate.isFallback) || indicators.some(ind => ind.isFallback);

  useEffect(() => {
    fetchAllData();
    // 每5分鐘更新一次數據
    const interval = setInterval(fetchAllData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const renderIndicatorCard = (indicator: FinancialIndicator) => (
    <Paper 
      key={indicator.symbol} 
      p="sm" 
      withBorder 
      bg={indicator.isFallback ? "yellow.0" : "gray.0"}
    >
      <Stack gap="xs" align="center">
        <Group gap="xs">
          <Text fw={500} size="sm">{indicator.name}</Text>
          {indicator.isFallback && (
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
        <Text 
          size="lg" 
          fw={700} 
          c={indicator.isFallback ? "orange" : "blue"}
        >
          {formatValue(indicator.value, indicator.unit)}
        </Text>
        {indicator.change !== 0 && !indicator.isFallback && (
          <Badge 
            size="xs" 
            color={indicator.change > 0 ? 'green' : 'red'}
            variant="light"
          >
            {indicator.change > 0 ? '+' : ''}{indicator.changePercent.toFixed(2)}%
          </Badge>
        )}
        {indicator.isFallback && (
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

  const renderRateCard = (rate: ExchangeRate) => (
    <Paper 
      key={rate.currency} 
      p="sm" 
      withBorder 
      bg={rate.isFallback ? "yellow.0" : "gray.0"}
    >
      <Stack gap="xs" align="center">
        <Group gap="xs">
          <Text fw={500} size="sm">{rate.label}</Text>
          <Badge size="xs" variant="light">
            {rate.currency}/TWD
          </Badge>
          {rate.isFallback && (
            <Tooltip 
              label="此為備用匯率，非即時數據"
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
        <Text 
          size="lg" 
          fw={700} 
          c={rate.isFallback ? "orange" : "blue"}
        >
          {rate.symbol}1 = NT${rate.rate.toFixed(2)}
        </Text>
        {rate.change !== 0 && !rate.isFallback && (
          <Badge 
            size="xs" 
            color={rate.change > 0 ? 'green' : 'red'}
            variant="light"
          >
            {rate.change > 0 ? '+' : ''}{rate.change.toFixed(2)}%
          </Badge>
        )}
        {rate.isFallback && (
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
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Title order={3}>即時資訊</Title>
          {hasFallbackData && (
            <Tooltip 
              label="部分數據無法獲取，正在顯示備用數據"
              position="top"
              withArrow
            >
              <IconAlertTriangle 
                size={18} 
                color="orange" 
                style={{ cursor: 'help' }}
              />
            </Tooltip>
          )}
        </Group>
        <Group gap="xs">
          {lastUpdate && (
            <Text size="xs" c="dimmed">
              {lastUpdate.toLocaleTimeString('zh-TW')} 更新
            </Text>
          )}
          <IconRefresh 
            size={16} 
            style={{ cursor: 'pointer' }} 
            onClick={fetchAllData}
          />
        </Group>
      </Group>

      {loading ? (
        <Group justify="center" p="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">載入即時資訊中...</Text>
        </Group>
      ) : (
        <Tabs defaultValue="markets" variant="outline">
          <Tabs.List>
            <Tabs.Tab value="markets" leftSection={<IconTrendingUp size={16} />}>
              市場指數
            </Tabs.Tab>
            <Tabs.Tab value="bonds" leftSection={<IconChartLine size={16} />}>
              債券利率
            </Tabs.Tab>
            <Tabs.Tab value="commodities" leftSection={<IconCurrencyDollar size={16} />}>
              商品 & 加密貨幣
            </Tabs.Tab>
            <Tabs.Tab value="exchange" leftSection={<IconCurrencyDollar size={16} />}>
              匯率
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="markets" pt="md">
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
              {indicators
                .filter(ind => ind.category === 'index')
                .map(renderIndicatorCard)}
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="bonds" pt="md">
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
              {indicators
                .filter(ind => ind.category === 'bond')
                .map(renderIndicatorCard)}
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="commodities" pt="md">
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
              {indicators
                .filter(ind => ind.category === 'commodity' || ind.category === 'crypto')
                .map(renderIndicatorCard)}
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="exchange" pt="md">
            <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
              {rates.map(renderRateCard)}
            </SimpleGrid>
          </Tabs.Panel>
        </Tabs>
      )}
    </Paper>
  );
}

