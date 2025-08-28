import { useState } from 'react';
import { Paper, Title, Group, Text, SegmentedControl } from '@mantine/core';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { PortfolioStats } from '@/types/portfolio';
import { formatCurrency, formatPercentage } from '@/utils/portfolioCalculations';

interface PortfolioDistributionChartProps {
  stats: PortfolioStats | null;
  loading?: boolean;
  type: 'amount' | 'gainloss';
  title: string;
}

const TYPE_COLORS = {
  stock: '#22b8cf',
  fund: '#339af0',
  bond: '#5c7cfa',
  gold: '#20c997',
  crypto: '#51cf66',
  cash: '#94d82d',
};

const TYPE_LABELS = {
  stock: '股票',
  fund: '共同基金',
  bond: '債券',
  gold: '黃金',
  crypto: '數位貨幣',
  cash: '現金',
};

const ACCOUNT_COLORS = {
  etrade: '#22b8cf',
  fubon: '#339af0',
  esun: '#5c7cfa',
};

const ACCOUNT_LABELS = {
  etrade: 'Etrade',
  fubon: '富邦銀行',
  esun: '玉山銀行',
};

const MARKET_COLORS = {
  US: '#22b8cf',
  TW: '#339af0',
  OTHER: '#5c7cfa',
};

const MARKET_LABELS = {
  US: '美國市場',
  TW: '台灣市場',
  OTHER: '其他地區',
};

export default function PortfolioDistributionChart({ 
  stats, 
  loading,
  type,
  title
}: PortfolioDistributionChartProps) {
  
  const [viewMode, setViewMode] = useState<'type' | 'account' | 'market'>('type');

  // 準備類型分布數據
  const getTypeDistributionData = (isGainLoss = false) => {
    if (!stats?.distributionByType) return [];
    
    if (isGainLoss) {
      // 為直條圖準備數據：只顯示實際的損益值
      const categories = Object.entries(stats.distributionByType)
        .filter(([_, data]) => data.totalGainLoss !== 0)
        .map(([type, data]) => ({
          name: TYPE_LABELS[type as keyof typeof TYPE_LABELS] || type,
          value: data.totalGainLoss,  // 直接使用損益值（正數或負數）
        }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      
      return categories;
    }
    
    // 金額分布保持原邏輯
    return Object.entries(stats.distributionByType)
      .filter(([_, data]) => data.totalValue > 0)
      .map(([type, data]) => ({
        name: TYPE_LABELS[type as keyof typeof TYPE_LABELS] || type,
        value: data.totalValue,
        percentage: data.percentage,
        fill: TYPE_COLORS[type as keyof typeof TYPE_COLORS] || '#868e96',
      }))
      .sort((a, b) => b.value - a.value);
  };

  // 準備帳戶分布數據
  const getAccountDistributionData = (isGainLoss = false) => {
    if (!stats?.distributionByAccount) return [];
    
    if (isGainLoss) {
      // 為直條圖準備數據：只顯示實際的損益值
      const categories = Object.entries(stats.distributionByAccount)
        .filter(([_, data]) => data.totalGainLoss !== 0)
        .map(([account, data]) => ({
          name: ACCOUNT_LABELS[account as keyof typeof ACCOUNT_LABELS] || account,
          value: data.totalGainLoss,  // 直接使用損益值（正數或負數）
        }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      
      return categories;
    }
    
    // 金額分布保持原邏輯
    return Object.entries(stats.distributionByAccount)
      .filter(([_, data]) => data.totalValue > 0)
      .map(([account, data]) => ({
        name: ACCOUNT_LABELS[account as keyof typeof ACCOUNT_LABELS] || account,
        value: data.totalValue,
        percentage: data.percentage,
        fill: ACCOUNT_COLORS[account as keyof typeof ACCOUNT_COLORS] || '#868e96',
      }))
      .sort((a, b) => b.value - a.value);
  };

  // 準備市場分布數據
  const getMarketDistributionData = (isGainLoss = false) => {
    if (!stats?.distributionByMarket) return [];
    
    if (isGainLoss) {
      // 為直條圖準備數據：只顯示實際的損益值
      const categories = Object.entries(stats.distributionByMarket)
        .filter(([_, data]) => data.totalGainLoss !== 0)
        .map(([market, data]) => ({
          name: MARKET_LABELS[market as keyof typeof MARKET_LABELS] || market,
          value: data.totalGainLoss,  // 直接使用損益值（正數或負數）
        }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      
      return categories;
    }
    
    // 金額分布保持原邏輯
    return Object.entries(stats.distributionByMarket)
      .filter(([_, data]) => data.totalValue > 0)
      .map(([market, data]) => ({
        name: MARKET_LABELS[market as keyof typeof MARKET_LABELS] || market,
        value: data.totalValue,
        percentage: data.percentage,
        fill: MARKET_COLORS[market as keyof typeof MARKET_COLORS] || '#868e96',
      }))
      .sort((a, b) => b.value - a.value);
  };

  const getCurrentData = () => {
    const isGainLoss = type === 'gainloss';
    
    switch (viewMode) {
      case 'type':
        return getTypeDistributionData(isGainLoss);
      case 'account':
        return getAccountDistributionData(isGainLoss);
      case 'market':
        return getMarketDistributionData(isGainLoss);
      default:
        return [];
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isGainLoss = type === 'gainloss';
      
      if (isGainLoss) {
        // 對於損益分布，根據正負值顯示獲利或虧損
        const value = payload[0].value;
        const isProfit = value >= 0;
        const label = isProfit ? '獲利' : '虧損';
        
        return (
          <Paper p="xs" withBorder shadow="md">
            <Text size="sm" fw={500}>{data.name}</Text>
            <Text size="sm" c="dimmed">
              {`${label} ${formatCurrency(Math.abs(value))}`}
            </Text>
          </Paper>
        );
      } else {
        // 對於金額分布，顯示金額和比例
        return (
          <Paper p="xs" withBorder shadow="md">
            <Text size="sm" fw={500}>{data.name}</Text>
            <Text size="sm" c="dimmed">
              金額: {formatCurrency(data.value)}
            </Text>
            <Text size="sm" c="dimmed">
              比例: {formatPercentage(data.percentage / 100)}
            </Text>
          </Paper>
        );
      }
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <Group justify="center" gap="md" mt="md">
        {payload?.map((entry: any, index: number) => (
          <Group key={index} gap="xs">
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: entry.color,
                borderRadius: 2,
              }}
            />
            <Text size="sm">{entry.value}</Text>
            <Text size="sm" c="dimmed">
              {formatPercentage(entry.payload.percentage / 100)}
            </Text>
          </Group>
        ))}
      </Group>
    );
  };

  if (loading) {
    return (
      <Paper p="md" withBorder>
        <Title order={3} mb="md">{title}</Title>
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text c="dimmed">載入中...</Text>
        </div>
      </Paper>
    );
  }

  const data = getCurrentData();
  const isGainLoss = type === 'gainloss';

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3}>{title}</Title>
        <SegmentedControl
          size="xs"
          value={viewMode}
          onChange={(value) => setViewMode(value as 'type' | 'account' | 'market')}
          data={[
            { label: '類別', value: 'type' },
            { label: '帳戶', value: 'account' },
            { label: '區域', value: 'market' },
          ]}
        />
      </Group>
      
      {data.length === 0 ? (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text c="dimmed">{isGainLoss ? '暫無損益數據' : '暫無數據'}</Text>
        </div>
      ) : (
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            {isGainLoss ? (
              // 損益分布使用堆疊直條圖
              <BarChart 
                data={data} 
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                barCategoryGap="30%"  // 控制長條間距
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis 
                  domain={['dataMin', 'dataMax']}  // 允許負值顯示
                  tickFormatter={(value) => value === 0 ? '0' : formatCurrency(Math.abs(value), 'TWD')}
                />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                <Tooltip 
                  formatter={(value, name) => {
                    const numValue = value as number;
                    const isProfit = numValue >= 0;
                    const label = isProfit ? '獲利' : '虧損';
                    return [
                      `${label} ${formatCurrency(Math.abs(numValue), 'TWD')}`, 
                      ''  // 移除標籤
                    ];
                  }}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar 
                  dataKey="value" 
                  name=""
                  maxBarSize={60}  // 限制長條最大寬度
                  shape={(props: any) => {
                    const { payload, ...rest } = props;
                    const fill = payload.value >= 0 ? '#51cf66' : '#ff6b6b';
                    return <rect {...rest} fill={fill} />;
                  }}
                />
              </BarChart>
            ) : (
              // 金額分布使用圓餅圖
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="40%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry as any).fill || '#868e96'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  content={<CustomLegend />}
                  verticalAlign="bottom"
                  height={60}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Paper>
  );
}

