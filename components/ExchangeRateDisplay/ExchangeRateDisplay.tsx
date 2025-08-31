'use client';

import { useState, useEffect } from 'react';
import { Paper, Title, Group, Text, Stack, Badge, Loader, Tooltip } from '@mantine/core';
import { IconRefresh, IconAlertTriangle } from '@tabler/icons-react';

interface ExchangeRate {
  currency: string;
  rate: number;
  change: number;
  label: string;
  symbol: string;
  isFallback: boolean; // 新增：標記是否為備用數據
}

export default function ExchangeRateDisplay() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchExchangeRates = async () => {
    setLoading(true);
    try {
      const currencies = ['USD', 'EUR', 'GBP', 'CHF'];
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      
      const ratePromises = currencies.map(async (currency) => {
        try {
          const response = await fetch(`${baseUrl}/api/scrape-exchange-rate?from=${currency}&to=TWD`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          
          // 檢查是否成功獲取數據
          if (data.success && data.rate && data.rate > 0) {
            return {
              currency,
              rate: data.rate,
              change: data.change || 0,
              label: getCurrencyLabel(currency),
              symbol: getCurrencySymbol(currency),
              isFallback: false, // 成功獲取即時數據
            };
          } else {
            throw new Error('API 返回無效數據');
          }
        } catch (error) {
          console.error(`獲取 ${currency} 匯率失敗:`, error);
          // 返回備用數據
          const fallbackRates: { [key: string]: number } = {
            'USD': 31.5,
            'EUR': 34.2,
            'GBP': 39.8,
            'CHF': 35.1,
          };
          return {
            currency,
            rate: fallbackRates[currency] || 0,
            change: 0,
            label: getCurrencyLabel(currency),
            symbol: getCurrencySymbol(currency),
            isFallback: true, // 標記為備用數據
          };
        }
      });

      const fetchedRates = await Promise.all(ratePromises);
      setRates(fetchedRates);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('獲取匯率失敗:', error);
      // 設置備用匯率數據
      const fallbackRates = [
        { currency: 'USD', rate: 31.5, change: 0, label: '美金', symbol: '$', isFallback: true },
        { currency: 'EUR', rate: 34.2, change: 0, label: '歐元', symbol: '€', isFallback: true },
        { currency: 'GBP', rate: 39.8, change: 0, label: '英鎊', symbol: '£', isFallback: true },
        { currency: 'CHF', rate: 35.1, change: 0, label: '瑞士法郎', symbol: 'CHF', isFallback: true },
      ];
      setRates(fallbackRates);
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
    };
    return labels[currency] || currency;
  };

  const getCurrencySymbol = (currency: string): string => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CHF: 'CHF',
    };
    return symbols[currency] || currency;
  };

  // 檢查是否有備用數據
  const hasFallbackData = rates.some(rate => rate.isFallback);

  useEffect(() => {
    fetchExchangeRates();
    // 每5分鐘更新一次匯率
    const interval = setInterval(fetchExchangeRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Title order={3}>即時匯率</Title>
          {hasFallbackData && (
            <Tooltip 
              label="部分匯率數據無法獲取，正在顯示備用匯率"
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
            onClick={fetchExchangeRates}
          />
        </Group>
      </Group>

      {loading ? (
        <Group justify="center" p="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">載入匯率中...</Text>
        </Group>
      ) : (
        <Group gap="md">
          {rates.map((rate) => (
            <Paper 
              key={rate.currency} 
              p="sm" 
              withBorder 
              bg={rate.isFallback ? "yellow.0" : "gray.0"} // 備用數據使用不同背景色
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
                  c={rate.isFallback ? "orange" : "blue"} // 備用數據使用橙色
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
          ))}
        </Group>
      )}
    </Paper>
  );
}
