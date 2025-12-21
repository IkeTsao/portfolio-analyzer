'use client';

import { Paper, Title, Table, Text, Group } from '@mantine/core';
import { PortfolioStats } from '@/types/portfolio';
import { formatCurrencyNTD, formatPercentage } from '@/utils/portfolioCalculations';

interface AllWeatherAllocationProps {
  stats: PortfolioStats | null;
  loading?: boolean;
}

// 全天候配置映射
const ALL_WEATHER_ROLES = {
  attack: {
    label: '先鋒 (攻)',
    types: ['growth', 'crypto'],
    assets: '成長股、加密貨幣',
    bestPeriod: '降息、經濟擴張、熱錢多',
    role: '衝刺回報率'
  },
  stable: {
    label: '中鋒 (穩)',
    types: ['index'],
    assets: '大盤 ETF',
    bestPeriod: '經濟穩定成長',
    role: '獲取市場平均利潤'
  },
  defense: {
    label: '後衛 (守/息)',
    types: ['dividend', 'longBond'],
    assets: '高股息、中長債',
    bestPeriod: '景氣末端、利率下滑',
    role: '提供現金流、穩定軍心'
  },
  goalkeeper: {
    label: '守門員 (避)',
    types: ['gold', 'cash'],
    assets: '黃金、現金',
    bestPeriod: '戰爭、金融危機、股市崩盤',
    role: '保命、留子彈'
  },
  special: {
    label: '特殊兵 (變)',
    types: ['commodity'],
    assets: '大宗物資',
    bestPeriod: '高通膨、供應鏈中斷',
    role: '針對通膨進行奇襲'
  }
};

export function AllWeatherAllocation({ stats, loading }: AllWeatherAllocationProps) {
  if (loading || !stats) {
    return (
      <Paper p="md" withBorder>
        <Title order={3} mb="md">全天候配置</Title>
        <Text c="dimmed">載入中...</Text>
      </Paper>
    );
  }

  // 計算各戰鬥位置的統計
  const roleStats = Object.entries(ALL_WEATHER_ROLES).map(([key, role]) => {
    let totalValue = 0;
    let totalPercentage = 0;

    role.types.forEach(type => {
      const typeData = stats.distributionByType[type];
      if (typeData) {
        totalValue += typeData.totalValue;
        totalPercentage += typeData.percentage;
      }
    });

    return {
      key,
      ...role,
      totalValue,
      totalPercentage
    };
  });

  return (
    <Paper p="md" withBorder>
      <Title order={3} mb="md">全天候配置</Title>
      
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>戰鬥位置</Table.Th>
            <Table.Th>資產名稱</Table.Th>
            <Table.Th>最強表現時期</Table.Th>
            <Table.Th>扮演角色</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>金額</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>佔比</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {roleStats.map((role) => (
            <Table.Tr key={role.key}>
              <Table.Td>
                <Text fw={600}>{role.label}</Text>
              </Table.Td>
              <Table.Td>{role.assets}</Table.Td>
              <Table.Td>{role.bestPeriod}</Table.Td>
              <Table.Td>{role.role}</Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text fw={500}>{formatCurrencyNTD(role.totalValue)}</Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text fw={500} c={role.totalPercentage > 0 ? 'blue' : 'dimmed'}>
                  {formatPercentage(role.totalPercentage)}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {/* 總和統計 */}
      <Group justify="flex-end" mt="md" gap="xl">
        <Group gap="xs">
          <Text size="sm" c="dimmed">總金額：</Text>
          <Text size="sm" fw={700}>{formatCurrencyNTD(stats.totalValue)}</Text>
        </Group>
        <Group gap="xs">
          <Text size="sm" c="dimmed">總佔比：</Text>
          <Text size="sm" fw={700}>100.00%</Text>
        </Group>
      </Group>

      {/* 投資時鐘說明 */}
      <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <Text size="md" fw={600} mb="md">
          要根據景氣好壞來配置資產，最經典的架構是參考** 「投資時鐘」(Investment Clock) ** 。它將景氣分為四個階段，每一階段都有最適合的「進攻」與「防禦」資產。
        </Text>
        
        <Text size="md" fw={600} mb="lg">
          以下為您將這 6 種資產，依照景氣循環的建議配置整理如下：
        </Text>

        {/* 核心+動態調整建議 */}
        <div style={{ marginBottom: '32px', padding: '16px', backgroundColor: '#e7f5ff', borderRadius: '8px', borderLeft: '4px solid #228be6' }}>
          <Text size="md" fw={700} mb="md">
            如果您覺得判斷景氣太難，可以採取以下** 「核心+動態調整」**的方法：
          </Text>
          
          <div style={{ marginBottom: '12px' }}>
            <Text size="sm" fw={600} mb="xs">1. 50% 核心地基：無論景氣好壞，永遠持有 大盤 ETF + 高股息價值股。</Text>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <Text size="sm" fw={600} mb="xs">2. 30% 攻防切換：</Text>
            <Text size="sm" ml="md" mb="xs">• 看好經濟時：配置 成長股、加密貨幣。</Text>
            <Text size="sm" ml="md" mb="xs">• 擔心衰退時：配置 中長債、黃金。</Text>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <Text size="sm" fw={600} mb="xs">3. 10% 通膨對沖：配置 大宗物資。</Text>
          </div>
          
          <div>
            <Text size="sm" fw={600} mb="xs">4. 10% 現金子彈：隨時準備在崩盤時買進上述任何一項。</Text>
          </div>
        </div>

        {/* 四個經濟階段 */}
        <div style={{ marginBottom: '24px' }}>
          <Text size="md" fw={700} mb="sm">1. 復甦期 (Recovery)：景氣剛好轉、低利率、低通膨</Text>
          <Text size="sm" mb="xs" fw={600}>【操作建議】：全力進攻，獲取資本利得。此時企業剛開始成長，熱錢多，風險偏好高。</Text>
          <Text size="sm" ml="md" mb="xs">• 核心配置：成長股、大盤 ETF（表現最強）。</Text>
          <Text size="sm" ml="md" mb="xs">• 策略配置：加密貨幣（此時通常會有爆發性行情）。</Text>
          <Text size="sm" ml="md" mb="md">• 建議減碼：現金（因為會錯過漲幅）、債券（利率可能即將開始反彈）。</Text>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <Text size="md" fw={700} mb="sm">2. 擴張期 (Overheat)：景氣火熱、利率走升、通膨增溫</Text>
          <Text size="sm" mb="xs" fw={600}>【操作建議】：轉向實體資產，防範通膨。這時經濟很好，但物價開始飛漲，央行開始升息。</Text>
          <Text size="sm" ml="md" mb="xs">• 核心配置：大盤 ETF、大宗物資（原油、原物料此時最強）。</Text>
          <Text size="sm" ml="md" mb="xs">• 策略配置：高股息價值股（具有抗通膨能力與穩健利支撐）。</Text>
          <Text size="sm" ml="md" mb="md">• 建議減碼：中長債（升息會讓債價大跌）、成長股（估值會受到高利率打壓）。</Text>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <Text size="md" fw={700} mb="sm">3. 滯脹期 (Stagflation)：經濟停滯、高通膨</Text>
          <Text size="sm" mb="xs" fw={600}>【操作建議】：極端防禦，保值第一。最痛苦的階段，物價貴但經濟不增長，股債通常同步下跌。</Text>
          <Text size="sm" ml="md" mb="xs">• 核心配置：黃金、現金（保命錢）。</Text>
          <Text size="sm" ml="md" mb="xs">• 策略配置：大宗物資（通膨最後的餘溫）。</Text>
          <Text size="sm" ml="md" mb="md">• 建議減碼：成長股、大盤 ETF、加密貨幣（風險資產會被大幅拋售）。</Text>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <Text size="md" fw={700} mb="sm">4. 衰退期 (Recession)：經濟負成長、降息循環、通縮風險</Text>
          <Text size="sm" mb="xs" fw={600}>【操作建議】：防守反擊，等待轉折。失業率上升，央行為了救市開始大幅降息。</Text>
          <Text size="sm" ml="md" mb="xs">• 核心配置：中長債（降息時長債漲幅最大）、現金（準備抄底）。</Text>
          <Text size="sm" ml="md" mb="xs">• 策略配置：高股息價值股（抗跌且領息）。</Text>
          <Text size="sm" ml="md" mb="md">• 建議減碼：大宗物資、加密貨幣、成長股。</Text>
        </div>

        {/* 景氣配置速查表 */}
        <div style={{ marginTop: '32px' }}>
          <Text size="md" fw={700} mb="md">景氣配置速查表</Text>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>景氣階段</Table.Th>
                <Table.Th>推薦配置（首選）</Table.Th>
                <Table.Th>推薦配置（次選）</Table.Th>
                <Table.Th>應避開資產</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td fw={600}>1. 復甦期</Table.Td>
                <Table.Td>成長股、加密貨幣</Table.Td>
                <Table.Td>大盤 ETF</Table.Td>
                <Table.Td>現金、債券</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>2. 擴張期</Table.Td>
                <Table.Td>大宗物資</Table.Td>
                <Table.Td>大盤 ETF、高股息</Table.Td>
                <Table.Td>中長債</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>3. 滯脹期</Table.Td>
                <Table.Td>黃金</Table.Td>
                <Table.Td>現金</Table.Td>
                <Table.Td>成長股、債券</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>4. 衰退期</Table.Td>
                <Table.Td>中長債</Table.Td>
                <Table.Td>高股息、現金</Table.Td>
                <Table.Td>大宗物資、加密貨幣</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </div>


      </div>
    </Paper>
  );
}
