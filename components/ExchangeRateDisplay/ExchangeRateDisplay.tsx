'use client';

import { useState, useEffect } from 'react';
import { Paper, Title, Group, Text, Stack, Badge, Loader } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

interface ExchangeRate {
  currency: string;
  rate: number;
  change: number;
  label: string;
  symbol: string;
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
          return {
            currency,
            rate: data.success ? data.rate || 0 : 0,
            change: data.change || 0,
            label: getCurrencyLabel(currency),
            symbol: getCurrencySymbol(currency),
          };
        } catch (error) {
          console.error(`獲取 ${currency} 匯率失敗:`, error);
          // 返回備用數據
          const fallbackRates: { [key: string]: number } = {
            'USD': 30.5,
            'EUR': 35.7,
            'GBP': 41.2,
            'CHF': 38.2,
          };
          return {
            currency,
            rate: fallbackRates[currency] || 0,
            change: 0,
            label: getCurrencyLabel(currency),
            symbol: getCurrencySymbol(currency),
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
        { currency: 'USD', rate: 30.5, change: 0, label: '美金', symbol: '$' },
        { currency: 'EUR', rate: 35.7, change: 0, label: '歐元', symbol: '€' },
        { currency: 'GBP', rate: 41.2, change: 0, label: '英鎊', symbol: '£' },
        { currency: 'CHF', rate: 38.2, change: 0, label: '瑞士法郎', symbol: 'CHF' },
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

  useEffect(() => {
    fetchExchangeRates();
    // 每5分鐘更新一次匯率
    const interval = setInterval(fetchExchangeRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3}>即時匯率</Title>
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
            <Paper key={rate.currency} p="sm" withBorder bg="gray.0">
              <Stack gap="xs" align="center">
                <Group gap="xs">
                  <Text fw={500} size="sm">{rate.label}</Text>
                  <Badge size="xs" variant="light">
                    {rate.currency}/TWD
                  </Badge>
                </Group>
                <Text size="lg" fw={700} c="blue">
                  {rate.symbol}1 = NT${rate.rate.toFixed(2)}
                </Text>
                {rate.change !== 0 && (
                  <Badge 
                    size="xs" 
                    color={rate.change > 0 ? 'green' : 'red'}
                    variant="light"
                  >
                    {rate.change > 0 ? '+' : ''}{rate.change.toFixed(2)}%
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

