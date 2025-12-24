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

// 攻擊端資產：冷色系（藍、青、紫）
// 防禦端資產：暖色系（橙、黃、綠）
const TYPE_COLORS = {
  // 攻擊端（冷色系）
  growth: '#1971c2',      // 成長股：深藍
  index: '#1098ad',       // 指數ETF：青藍
  dividend: '#5f3dc4',    // 高股息與價值股：紫色
  crypto: '#0c8599',      // 加密貨幣：深青
  
  // 防禦端（暖色系）
  commodity: '#fd7e14',   // 大宗物資：橙色
  gold: '#fab005',        // 黃金：金黃
  longBond: '#fcc419',    // 中長債：亮黃
  shortBond: '#ffd43b',   // 短債：淺黃
  cash: '#74b816',        // 現金：綠色
  
  // 其他
  fund: '#9775fa',
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
  
  const [viewMode, setViewMode] = useState<'type' | 'account' | 'market' | 'allocation'>('allocation');

  // 準備類型分布數據
  const getTypeDistributionData = (isGainLoss = false) => {
    if (!stats?.distributionByType) return [];
    
    if (isGainLoss) {
      // 為直條圖準備數據：按固定順序排列
      const typeOrder = ['成長股', '指數與ETF', '高股息與價值股', '加密貨幣', '大宗物資', '中長債', '短債', '現金'];
      
      const categories = Object.entries(stats.distributionByType)
        .filter(([_, data]) => data.totalGainLoss !== 0)
        .map(([type, data]) => ({
          name: TYPE_LABELS[type as keyof typeof TYPE_LABELS] || type,
          value: data.totalGainLoss,  // 直接使用損益值（正數或負數）
        }))
        .sort((a, b) => {
          const aIndex = typeOrder.indexOf(a.name);
          const bIndex = typeOrder.indexOf(b.name);
          const aPos = aIndex === -1 ? 999 : aIndex;
          const bPos = bIndex === -1 ? 999 : bIndex;
          return aPos - bPos;
        });
      
      return categories;
    }
    
    // 金額分布：按固定順序排列
    const typeOrder = ['成長股', '指數與ETF', '高股息與價值股', '加密貨幣', '大宗物資', '中長債', '短債', '現金'];
    
    return Object.entries(stats.distributionByType)
      .filter(([_, data]) => data.totalValue > 0)
      .map(([type, data]) => ({
        name: TYPE_LABELS[type as keyof typeof TYPE_LABELS] || type,
        value: data.totalValue,
        percentage: data.percentage,
        fill: TYPE_COLORS[type as keyof typeof TYPE_COLORS] || '#868e96',
      }))
      .sort((a, b) => {
        const aIndex = typeOrder.indexOf(a.name);
        const bIndex = typeOrder.indexOf(b.name);
        const aPos = aIndex === -1 ? 999 : aIndex;
        const bPos = bIndex === -1 ? 999 : bIndex;
        return aPos - bPos;
      });
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

  // 準備配置分布數據（攻擊端與防禦端）
  const getAllocationDistributionData = (isGainLoss = false) => {
    if (!stats?.distributionByType) return [];
    
    // 定義政擊端與防禦端（按固定順序）
    const allocations = [
      { key: 'offensive', label: '攻擊端資產', types: ['growth', 'index', 'dividend', 'crypto'], color: '#1971c2' },  // 冷色調：深藍
      { key: 'defensive', label: '防禦端資產', types: ['cash', 'shortBond', 'gold', 'commodity', 'longBond'], color: '#fd7e14' }  // 暖色調：橙色
    ];
    
    if (isGainLoss) {
      // 為損益分布準備數據（保持固定順序）
      const categories = allocations.map((config) => {
        const totalGainLoss = config.types.reduce((sum, type) => {
          const typeData = stats.distributionByType[type as keyof typeof stats.distributionByType];
          return sum + (typeData?.totalGainLoss || 0);
        }, 0);
        
        return {
          name: config.label,
          value: totalGainLoss
        };
      }).filter(item => item.value !== 0);
      
      return categories;
    }
    
    // 為金額分布準備數據（保持固定順序）
    return allocations.map((config) => {
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
    }).filter(item => item.value > 0);
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
    
    // 定義排序順序（攻擊端到防禦端）
    const typeOrder = ['成長股', '指數與ETF', '高股息與價值股', '加密貨幣', '大宗物資', '中長債', '短債', '現金', '黃金', '基金'];
    
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
    
    // 計算攻擊端與防禦端總和
    const totals = {
      offensive: { value: 0, percentage: 0, label: '攻擊端資產', types: ['growth', 'index', 'dividend', 'crypto'] },
      defensive: { value: 0, percentage: 0, label: '防禦端資產', types: ['cash', 'shortBond', 'gold', 'commodity', 'longBond'] }
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
            {totals.offensive.value > 0 && (
              <Group gap="xs" style={{ borderLeft: '2px solid #dee2e6', paddingLeft: '12px', marginLeft: '8px' }}>
                <div style={{ width: 12, height: 12, backgroundColor: '#51cf66', borderRadius: 2 }} />
                <Text size="sm" fw={600}>{totals.offensive.label}</Text>
                <Text size="sm" c="dimmed" fw={600}>{formatPercentage(totals.offensive.percentage)}</Text>
              </Group>
            )}
            {totals.defensive.value > 0 && (
              <Group gap="xs" style={{ borderLeft: '2px solid #dee2e6', paddingLeft: '12px', marginLeft: '8px' }}>
                <div style={{ width: 12, height: 12, backgroundColor: '#20c997', borderRadius: 2 }} />
                <Text size="sm" fw={600}>{totals.defensive.label}</Text>
                <Text size="sm" c="dimmed" fw={600}>{formatPercentage(totals.defensive.percentage)}</Text>
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

