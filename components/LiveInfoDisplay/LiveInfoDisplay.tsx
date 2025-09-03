'use client';

import { useState, useEffect } from 'react';
import { Paper, Title, Group, Text, Stack, Badge, Loader, Tooltip, SimpleGrid, Tabs } from '@mantine/core';
import { IconRefresh, IconAlertTriangle, IconTrendingUp, IconCurrencyDollar, IconChartLine } from '@tabler/icons-react';
import CustomStocksPanel from '../CustomStocksPanel/CustomStocksPanel';

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
  category: 'index' | 'bond' | 'commodity' | 'crypto' | 'currency' | 'stock';
  isFallback: boolean;
}

export default function LiveInfoDisplay() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [indicators, setIndicators] = useState<FinancialIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<string>('markets'); // 新增 activeTab 狀態

  const fetchExchangeRates = async () => {
    try {
      // 首先檢查是否有今日的歷史匯率記錄（來自CSV導入）
      const today = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem('portfolioHistoricalData');
      let csvRates: any = null;
      
      if (saved) {
        const records = JSON.parse(saved);
        const todayRecord = records.find((r: any) => r.date === today);
        if (todayRecord && todayRecord.exchangeRates) {
          csvRates = todayRecord.exchangeRates;
          console.log('使用CSV導入的匯率資料:', csvRates);
        }
      }

      const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY']; // 日圓排最後
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      
      const ratePromises = currencies.map(async (currency) => {
        // 如果有CSV匯率資料，優先使用
        if (csvRates && csvRates[currency]) {
          return {
            currency,
            rate: csvRates[currency],
            change: 0, // CSV資料沒有變化資訊
            label: getCurrencyLabel(currency),
            symbol: getCurrencySymbol(currency),
            isFallback: false,
          };
        }

        // 否則嘗試獲取即時匯率
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
        // 市場指數 (重新排列：恐慌指數、道瓊、S&P 500、台股，移除日經指數)
        { symbol: '^VIX', name: 'VIX 恐慌指數', category: 'index' as const },
        { symbol: '^DJI', name: '道瓊指數', category: 'index' as const },
        { symbol: '^GSPC', name: 'S&P 500', category: 'index' as const },
        { symbol: '^TWII', name: '台股指數', category: 'index' as const },
        
        // 債券利率 (按年份排序，新增德國 10 年公債)
        { symbol: '^FVX', name: '美國5年公債', category: 'bond' as const },
        { symbol: '^TNX', name: '美國10年公債', category: 'bond' as const },
        { symbol: '^TYX', name: '美國30年公債', category: 'bond' as const },
        { symbol: 'DE10Y', name: '德國10年公債', category: 'bond' as const },
        
        // 商品 (調整排列：黃金、比特幣、原油)
        { symbol: 'GC=F', name: '黃金', category: 'commodity' as const },
        { symbol: 'BTC-USD', name: '比特幣', category: 'crypto' as const },
        { symbol: 'BZ=F', name: 'Brent 原油', category: 'commodity' as const },
        { symbol: 'CL=F', name: 'WTI 原油', category: 'commodity' as const },
        
        // 美元指數移到匯率類別
        { symbol: 'DX-Y.NYB', name: '美元指數', category: 'currency' as const },
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
        // 市場指數 (按新順序)
        { symbol: '^VIX', name: 'VIX 恐慌指數', value: 18.5, change: 0, changePercent: 0, unit: '', category: 'index', isFallback: true },
        { symbol: '^DJI', name: '道瓊指數', value: 34500, change: 0, changePercent: 0, unit: '', category: 'index', isFallback: true },
        { symbol: '^GSPC', name: 'S&P 500', value: 4400, change: 0, changePercent: 0, unit: '', category: 'index', isFallback: true },
        { symbol: '^TWII', name: '台股指數', value: 17000, change: 0, changePercent: 0, unit: '', category: 'index', isFallback: true },
        
        // 債券利率 (按年份排序)
        { symbol: '^FVX', name: '美國5年公債', value: 4.2, change: 0, changePercent: 0, unit: '%', category: 'bond', isFallback: true },
        { symbol: '^TNX', name: '美國10年公債', value: 4.5, change: 0, changePercent: 0, unit: '%', category: 'bond', isFallback: true },
        { symbol: '^TYX', name: '美國30年公債', value: 4.8, change: 0, changePercent: 0, unit: '%', category: 'bond', isFallback: true },
        
        // 商品 (按新順序)
        { symbol: 'GC=F', name: '黃金', value: 2000, change: 0, changePercent: 0, unit: '$', category: 'commodity', isFallback: true },
        { symbol: 'BZ=F', name: 'Brent 原油', value: 85, change: 0, changePercent: 0, unit: '$', category: 'commodity', isFallback: true },
        { symbol: 'CL=F', name: 'WTI 原油', value: 82, change: 0, changePercent: 0, unit: '$', category: 'commodity', isFallback: true },
        
        // 加密貨幣 (只保留比特幣)
        { symbol: 'BTC-USD', name: '比特幣', value: 45000, change: 0, changePercent: 0, unit: '$', category: 'crypto', isFallback: true },
        
        // 美元指數
        { symbol: 'DX-Y.NYB', name: '美元指數', value: 104.5, change: 0, changePercent: 0, unit: '', category: 'currency', isFallback: true },
      ];
      setIndicators(fallbackIndicators);
    }
  };

  const fetchAllData = async (forceUpdateRates: boolean = false) => {
    setLoading(true);
    try {
      if (forceUpdateRates) {
        // 強制更新時，先清除今日的CSV匯率記錄
        try {
          const today = new Date().toISOString().split('T')[0];
          const saved = localStorage.getItem('portfolioHistoricalData');
          
          if (saved) {
            const records = JSON.parse(saved);
            const todayRecordIndex = records.findIndex((r: any) => r.date === today);
            
            if (todayRecordIndex >= 0) {
              // 清除今日記錄的匯率資料，但保留其他資料
              delete records[todayRecordIndex].exchangeRates;
              localStorage.setItem('portfolioHistoricalData', JSON.stringify(records));
              console.log('已清除今日CSV匯率記錄，將獲取新的即時匯率');
            }
          }
        } catch (error) {
          console.warn('清除CSV匯率記錄失敗:', error);
        }
      }
      
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
    if (symbol.includes('TNX') || symbol.includes('TYX') || symbol.includes('FVX') || symbol === 'DE10Y') return '%';
    if (symbol.includes('GC=F') || symbol.includes('BTC-USD') || 
        symbol.includes('BZ=F') || symbol.includes('CL=F')) return '$';
    return '';
  };

  const getFallbackValue = (symbol: string): number => {
    const fallbackValues: { [key: string]: number } = {
      // 市場指數 (按新順序，移除日經指數)
      '^VIX': 18.5,
      '^DJI': 34500,
      '^GSPC': 4400,
      '^TWII': 17000,
      
      // 債券利率 (按年份排序，新增德國公債)
      '^FVX': 4.2,
      '^TNX': 4.5,
      '^TYX': 4.8,
      'DE10Y': 2.8,
      
      // 商品 (按新順序)
      'GC=F': 2000,
      'BZ=F': 85,
      'CL=F': 82,
      
      // 加密貨幣 (只保留比特幣)
      'BTC-USD': 45000,
      
      // 美元指數
      'DX-Y.NYB': 104.5,
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
      p="md" 
      withBorder 
      bg={indicator.isFallback ? "yellow.0" : "gray.0"}
    >
      <Stack gap="sm" align="center">
        <Group gap="xs">
          <Text fw={600} size="md">{indicator.name}</Text>
          {indicator.isFallback && (
            <Tooltip 
              label="此為備用數據，非即時數據"
              position="top"
              withArrow
            >
              <Badge 
                size="sm" 
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
          size="xl" 
          fw={700} 
          c={indicator.isFallback ? "orange" : "blue"}
        >
          {formatValue(indicator.value, indicator.unit)}
        </Text>
        {indicator.change !== 0 && !indicator.isFallback && (
          <Badge 
            size="md" 
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
      p="md" 
      withBorder 
      bg={rate.isFallback ? "yellow.0" : "gray.0"}
    >
      <Stack gap="sm" align="center">
        <Group gap="xs">
          <Text fw={600} size="md">{rate.label}</Text>
          <Badge size="sm" variant="light">
            {rate.currency}/TWD
          </Badge>
          {rate.isFallback && (
            <Tooltip 
              label="此為備用匯率，非即時數據"
              position="top"
              withArrow
            >
              <Badge 
                size="sm" 
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
          size="xl" 
          fw={700} 
          c={rate.isFallback ? "orange" : "blue"}
        >
          {rate.symbol}1 = NT${rate.rate.toFixed(2)}
        </Text>
        {rate.change !== 0 && !rate.isFallback && (
          <Badge 
            size="md" 
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
            onClick={() => fetchAllData(true)}
          />
        </Group>
      </Group>

      {loading ? (
        <Group justify="center" p="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">載入即時資訊中...</Text>
        </Group>
      ) : (
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'markets')} variant="outline">
          <Tabs.List>
            <Tabs.Tab value="markets" leftSection={<IconTrendingUp size={16} />}>
              市場指數
            </Tabs.Tab>
            <Tabs.Tab value="stocks" leftSection={<IconTrendingUp size={16} />}>
              指標股
            </Tabs.Tab>
            <Tabs.Tab value="bonds" leftSection={<IconChartLine size={16} />}>
              債券利率
            </Tabs.Tab>
            <Tabs.Tab value="commodities" leftSection={<IconCurrencyDollar size={16} />}>
              商品 & 加密貨幣
            </Tabs.Tab>
            <Tabs.Tab value="exchange" leftSection={<IconCurrencyDollar size={16} />}>
              匯率 & 美元指數
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="markets" pt="md">
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
              {indicators
                .filter(ind => ind.category === 'index')
                .map(renderIndicatorCard)}
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="stocks" pt="md">
            <CustomStocksPanel />
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
            <Stack gap="md">
              {/* 美元指數 */}
              <div>
                <Text size="sm" fw={500} mb="sm" c="dimmed">美元指數</Text>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {indicators
                    .filter(ind => ind.category === 'currency')
                    .map(renderIndicatorCard)}
                </SimpleGrid>
              </div>
              
              {/* 匯率 */}
              <div>
                <Text size="sm" fw={500} mb="sm" c="dimmed">主要貨幣匯率</Text>
                <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
                  {rates.map(renderRateCard)}
                </SimpleGrid>
              </div>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      )}
    </Paper>
  );
}

