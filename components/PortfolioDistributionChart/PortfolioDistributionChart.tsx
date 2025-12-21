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
  index: '#22b8cf',
  growth: '#339af0',
  dividend: '#7950f2',
  fund: '#9775fa',
  shortBond: '#5c7cfa',
  longBond: '#748ffc',
  gold: '#20c997',
  crypto: '#51cf66',
  commodity: '#fd7e14',
  cash: '#94d82d',
};

const TYPE_LABELS = {
  index: '指數與ETF',
  growth: '成長股',
  dividend: '高股息與價值股',
  fund: '基金',
  shortBond: '短債',
  longBond: '中長債',
  gold: '黃金',
  crypto: '加密貨幣',
  commodity: '大宗物資',
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
  JP: '#20c997',
  TW: '#339af0',
  OTHER: '#5c7cfa',
};

const MARKET_LABELS = {
  US: '美國市場',
  JP: '日本市場',
  TW: '台灣市場',
  OTHER: '其他地區',
};

export default function PortfolioDistributionChart({ 
  stats, 
  loading,
  type,
  title
}: PortfolioDistributionChartProps) {
  
  const [viewMode, setViewMode] = useState<'type' | 'account' | 'market' | 'allocation'>('type');

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

  // 準備配置分布數據（五種戰略配置）
  const getAllocationDistributionData = (isGainLoss = false) => {
    if (!stats?.distributionByType) return [];
    
    // 定義五種戰略配置
    const allocations = {
      core: { label: '核心股', types: ['index', 'dividend'], color: '#339af0' },
      offensive: { label: '進攻資產', types: ['growth', 'crypto'], color: '#51cf66' },
      defensive: { label: '防守資產', types: ['gold', 'longBond'], color: '#20c997' },
      hedge: { label: '對沖資產', types: ['commodity'], color: '#fd7e14' },
      cash: { label: '現金', types: ['shortBond', 'cash'], color: '#94d82d' }
    };
    
    if (isGainLoss) {
      // 為損益分布準備數據
      const categories = Object.entries(allocations).map(([key, config]) => {
        const totalGainLoss = config.types.reduce((sum, type) => {
          const typeData = stats.distributionByType[type as keyof typeof stats.distributionByType];
          return sum + (typeData?.totalGainLoss || 0);
        }, 0);
        
        return {
          name: config.label,
          value: totalGainLoss
        };
      }).filter(item => item.value !== 0)
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      
      return categories;
    }
    
    // 為金額分布準備數據
    return Object.entries(allocations).map(([key, config]) => {
      const totalValue = config.types.reduce((sum, type) => {
        const typeData = stats.distributionByType[type as keyof typeof stats.distributionByType];
        return sum + (typeData?.totalValue || 0);
      }, 0);
      
      const percentage = config.types.reduce((sum, type) => {
        const typeData = stats.distributionByType[type as keyof typeof stats.distributionByType];
        return sum + (typeData?.percentage || 0);
      }, 0);
      
      return {
        name: config.label,
        value: totalValue,
        percentage: percentage,
        fill: config.color
      };
    }).filter(item => item.value > 0)
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
      case 'allocation':
        return getAllocationDistributionData(isGainLoss);
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
              比例: {formatPercentage(data.percentage)}
            </Text>
          </Paper>
        );
      }
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    // 只在類型視圖且非損益模式時顯示總和
    const shouldShowTotals = viewMode === 'type' && type === 'amount';
    
    // 定義排序順序
    const typeOrder = ['指數與ETF', '成長股', '高股息與價值股', '中長債', '黃金', '大宗物資', '加密貨幣', '短債', '現金', '基金'];
    
    // 按照指定順序排序 payload
    let sortedPayload = payload ? [...payload] : [];
    if (shouldShowTotals && sortedPayload.length > 0) {
      sortedPayload.sort((a: any, b: any) => {
        const aIndex = typeOrder.indexOf(a.payload?.name || '');
        const bIndex = typeOrder.indexOf(b.payload?.name || '');
        const aPos = aIndex === -1 ? 999 : aIndex;
        const bPos = bIndex === -1 ? 999 : bIndex;
        return aPos - bPos;
      });
    }
    
    // 計算五種戰略配置總和
    const totals = {
      core: { value: 0, percentage: 0, label: '核心股', types: ['index', 'dividend'] },
      offensive: { value: 0, percentage: 0, label: '進攻資產', types: ['growth', 'crypto'] },
      defensive: { value: 0, percentage: 0, label: '防守資產', types: ['gold', 'longBond'] },
      hedge: { value: 0, percentage: 0, label: '對沖資產', types: ['commodity'] },
      cash: { value: 0, percentage: 0, label: '現金', types: ['shortBond', 'cash'] }
    };

    if (shouldShowTotals && payload && Array.isArray(payload)) {
      payload.forEach((entry: any) => {
        if (!entry || !entry.payload || !entry.payload.name) return;
        const originalData = data.find((d: any) => d && d.name === entry.payload.name) as any;
        if (originalData && typeof originalData.value === 'number') {
          const typeKey = Object.keys(TYPE_LABELS).find(key => TYPE_LABELS[key as keyof typeof TYPE_LABELS] === entry.payload.name);
          if (typeKey) {
            // 檢查屬於哪個總和類別
            Object.values(totals).forEach(total => {
              if (total.types.includes(typeKey)) {
                total.value += originalData.value;
                total.percentage += (originalData.percentage || 0);
              }
            });
          }
        }
      });
    }
    


    return (
      <Group justify="center" gap="md" mt="md" wrap="wrap">
        {sortedPayload?.map((entry: any, index: number) => (
          <Group key={index} gap="xs">
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: entry.color,
                borderRadius: 2,
              }}
            />
            <Text size="sm">{entry.payload.name}</Text>
            <Text size="sm" c="dimmed">
              {formatPercentage(entry.payload.percentage)}
            </Text>
          </Group>
        ))}
        {shouldShowTotals && (
          <>
            {totals.core.value > 0 && (
              <Group gap="xs" style={{ borderLeft: '2px solid #dee2e6', paddingLeft: '12px', marginLeft: '8px' }}>
                <div style={{ width: 12, height: 12, backgroundColor: '#868e96', borderRadius: 2 }} />
                <Text size="sm" fw={600}>{totals.core.label}</Text>
                <Text size="sm" c="dimmed" fw={600}>{formatPercentage(totals.core.percentage)}</Text>
              </Group>
            )}
            {totals.offensive.value > 0 && (
              <Group gap="xs" style={{ borderLeft: '2px solid #dee2e6', paddingLeft: '12px', marginLeft: '8px' }}>
                <div style={{ width: 12, height: 12, backgroundColor: '#868e96', borderRadius: 2 }} />
                <Text size="sm" fw={600}>{totals.offensive.label}</Text>
                <Text size="sm" c="dimmed" fw={600}>{formatPercentage(totals.offensive.percentage)}</Text>
              </Group>
            )}
            {totals.defensive.value > 0 && (
              <Group gap="xs" style={{ borderLeft: '2px solid #dee2e6', paddingLeft: '12px', marginLeft: '8px' }}>
                <div style={{ width: 12, height: 12, backgroundColor: '#868e96', borderRadius: 2 }} />
                <Text size="sm" fw={600}>{totals.defensive.label}</Text>
                <Text size="sm" c="dimmed" fw={600}>{formatPercentage(totals.defensive.percentage)}</Text>
              </Group>
            )}
            {totals.hedge.value > 0 && (
              <Group gap="xs" style={{ borderLeft: '2px solid #dee2e6', paddingLeft: '12px', marginLeft: '8px' }}>
                <div style={{ width: 12, height: 12, backgroundColor: '#868e96', borderRadius: 2 }} />
                <Text size="sm" fw={600}>{totals.hedge.label}</Text>
                <Text size="sm" c="dimmed" fw={600}>{formatPercentage(totals.hedge.percentage)}</Text>
              </Group>
            )}
            {totals.cash.value > 0 && (
              <Group gap="xs" style={{ borderLeft: '2px solid #dee2e6', paddingLeft: '12px', marginLeft: '8px' }}>
                <div style={{ width: 12, height: 12, backgroundColor: '#868e96', borderRadius: 2 }} />
                <Text size="sm" fw={600}>{totals.cash.label}</Text>
                <Text size="sm" c="dimmed" fw={600}>{formatPercentage(totals.cash.percentage)}</Text>
              </Group>
            )}
          </>
        )}

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
          onChange={(value) => setViewMode(value as 'type' | 'account' | 'market' | 'allocation')}
          data={[
            { label: '類別', value: 'type' },
            { label: '帳戶', value: 'account' },
            { label: '區域', value: 'market' },
            { label: '配置', value: 'allocation' },
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
                  tickFormatter={(value) => {
                    if (value === 0) return '0';
                    return value > 0 ? formatCurrency(value, 'TWD') : `-${formatCurrency(Math.abs(value), 'TWD')}`;
                  }}
                />
                <ReferenceLine y={0} stroke="#333" strokeWidth={1} strokeDasharray="3 3" />
                <Tooltip 
                  formatter={(value, name) => {
                    const numValue = value as number;
                    const isProfit = numValue >= 0;
                    const label = isProfit ? '獲利' : '虧損';
                    return [
                      `${label} ${formatCurrency(Math.abs(numValue), 'TWD')}`
                    ];
                  }}
                  labelFormatter={(label) => label}
                  separator=""
                />
                <Bar 
                  dataKey="value" 
                  name=""
                  maxBarSize={60}  // 限制長條最大寬度
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#51cf66' : '#ff6b6b'} />
                  ))}
                </Bar>
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

