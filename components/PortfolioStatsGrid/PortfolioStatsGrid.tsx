'use client';

import { Grid, Paper, Text, Group, Stack, Loader, ThemeIcon } from '@mantine/core';
import { 
  IconTrendingUp, 
  IconTrendingDown, 
  IconWallet, 
  IconCoins,
  IconRefresh 
} from '@tabler/icons-react';
import { PortfolioStats } from '@/types/portfolio';
import { formatCurrency, formatPercentage } from '@/utils/portfolioCalculations';

interface PortfolioStatsGridProps {
  stats: PortfolioStats | null;
  loading?: boolean;
  lastUpdate?: string | null;
  onRefresh?: () => void;
}

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  loading?: boolean;
}

function StatCard({ title, value, change, changeType, icon, loading }: StatCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'green';
      case 'negative': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed" fw={500}>
          {title}
        </Text>
        <ThemeIcon variant="light" size="sm">
          {icon}
        </ThemeIcon>
      </Group>
      
      <Stack gap="xs">
        {loading ? (
          <Loader size="sm" />
        ) : (
          <>
            <Text size="xl" fw={700}>
              {value}
            </Text>
            {change && (
              <Text size="sm" c={getChangeColor()} fw={500}>
                {change}
              </Text>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}

export default function PortfolioStatsGrid({ 
  stats, 
  loading, 
  lastUpdate, 
  onRefresh 
}: PortfolioStatsGridProps) {
  const formatLastUpdate = (timestamp: string | null) => {
    if (!timestamp) return '尚未更新';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return '剛剛更新';
    if (diffMinutes < 60) return `${diffMinutes}分鐘前更新`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}小時前更新`;
    
    return date.toLocaleDateString('zh-TW');
  };

  const getChangeType = (value: number): 'positive' | 'negative' | 'neutral' => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };

  return (
    <Stack gap="md">
      {/* 更新資訊 */}
      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">
          {formatLastUpdate(lastUpdate || null)}
        </Text>
        {onRefresh && (
          <Group gap="xs">
            <IconRefresh 
              size={16} 
              style={{ cursor: 'pointer' }} 
              onClick={onRefresh}
            />
            <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }} onClick={onRefresh}>
              更新價格
            </Text>
          </Group>
        )}
      </Group>

      {/* 統計卡片 */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatCard
            title="總投資價值"
            value={stats ? formatCurrency(stats.totalValue) : 'NT$0'}
            icon={<IconWallet size={16} />}
            loading={loading}
          />
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatCard
            title="總投資成本"
            value={stats ? formatCurrency(stats.totalCost) : 'NT$0'}
            icon={<IconCoins size={16} />}
            loading={loading}
          />
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatCard
            title="總損益"
            value={stats ? formatCurrency(stats.totalGainLoss) : 'NT$0'}
            changeType={stats ? getChangeType(stats.totalGainLoss) : 'neutral'}
            icon={stats && stats.totalGainLoss >= 0 ? 
              <IconTrendingUp size={16} /> : 
              <IconTrendingDown size={16} />
            }
            loading={loading}
          />
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatCard
            title="總收益率"
            value={stats ? formatPercentage(stats.totalGainLossPercent) : '0%'}
            changeType={stats ? getChangeType(stats.totalGainLossPercent) : 'neutral'}
            icon={stats && stats.totalGainLossPercent >= 0 ? 
              <IconTrendingUp size={16} /> : 
              <IconTrendingDown size={16} />
            }
            loading={loading}
          />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

