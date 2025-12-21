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
        <Title order={3} mb="md">配置建議</Title>
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
      {/* 投資時鐘說明 */}
      <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        {/* 核心+動態調整建議 */}
        <div style={{ marginBottom: '24px' }}>
          <Text size="md" fw={700} mb="md">
            ** 「核心+動態調整」**的方法：
          </Text>
          
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>策略分項</Table.Th>
                <Table.Th>建議比例</Table.Th>
                <Table.Th>包含資產</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>當前金額</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>當前佔比</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td fw={600}>核心地基</Table.Td>
                <Table.Td>50%</Table.Td>
                <Table.Td>大盤 ETF + 高股息價值股</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={500}>
                    {formatCurrencyNTD(
                      (stats.distributionByType['index']?.totalValue || 0) +
                      (stats.distributionByType['dividend']?.totalValue || 0)
                    )}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={500} c="blue">
                    {formatPercentage(
                      (stats.distributionByType['index']?.percentage || 0) +
                      (stats.distributionByType['dividend']?.percentage || 0)
                    )}
                  </Text>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600} rowSpan={2}>攻防切換</Table.Td>
                <Table.Td rowSpan={2}>30%</Table.Td>
                <Table.Td>看好經濟：成長股、加密貨幣</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={500}>
                    {formatCurrencyNTD(
                      (stats.distributionByType['growth']?.totalValue || 0) +
                      (stats.distributionByType['crypto']?.totalValue || 0)
                    )}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={500} c="blue">
                    {formatPercentage(
                      (stats.distributionByType['growth']?.percentage || 0) +
                      (stats.distributionByType['crypto']?.percentage || 0)
                    )}
                  </Text>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>擔心衰退：中長債、黃金</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={500}>
                    {formatCurrencyNTD(
                      (stats.distributionByType['longBond']?.totalValue || 0) +
                      (stats.distributionByType['gold']?.totalValue || 0)
                    )}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={500} c="blue">
                    {formatPercentage(
                      (stats.distributionByType['longBond']?.percentage || 0) +
                      (stats.distributionByType['gold']?.percentage || 0)
                    )}
                  </Text>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>通膨對沖</Table.Td>
                <Table.Td>10%</Table.Td>
                <Table.Td>大宗物資</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={500}>
                    {formatCurrencyNTD(stats.distributionByType['commodity']?.totalValue || 0)}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={500} c="blue">
                    {formatPercentage(stats.distributionByType['commodity']?.percentage || 0)}
                  </Text>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>現金子彈</Table.Td>
                <Table.Td>10%</Table.Td>
                <Table.Td>短債與現金</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={500}>
                    {formatCurrencyNTD(
                      (stats.distributionByType['shortBond']?.totalValue || 0) +
                      (stats.distributionByType['cash']?.totalValue || 0)
                    )}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={500} c="blue">
                    {formatPercentage(
                      (stats.distributionByType['shortBond']?.percentage || 0) +
                      (stats.distributionByType['cash']?.percentage || 0)
                    )}
                  </Text>
                </Table.Td>
              </Table.Tr>
              <Table.Tr style={{ borderTop: '2px solid #dee2e6' }}>
                <Table.Td fw={700}>總計</Table.Td>
                <Table.Td fw={700}>100%</Table.Td>
                <Table.Td></Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={700}>{formatCurrencyNTD(stats.totalValue)}</Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={700} c="blue">100.00%</Text>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
          
          <Text size="xs" c="dimmed" mt="sm" style={{ fontStyle: 'italic' }}>
            註：「攻防切換」的 30% 可依據當前經濟情況，在「看好經濟」與「擔心衰退」兩種配置間靈活調整。
          </Text>
        </div>

        {/* 2026 戰術建議 */}
        <div style={{ marginBottom: '24px' }}>
          <Text size="md" fw={700} mb="md">
            8 種資產的 2026 戰術建議
          </Text>
          
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>資產分類</Table.Th>
                <Table.Th>2026 配置權重</Table.Th>
                <Table.Th>具體建議與理由</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td fw={600}>成長股</Table.Td>
                <Table.Td>策略中性（核心）</Table.Td>
                <Table.Td>決弱弱強。 2026 年市場會變「賣」，只有毛利高、資產負債表強的公司能存活。重點關注「自帶、核能轉型、AI 軟體」。</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>大盤 ETF</Table.Td>
                <Table.Td>核心持有（60%）</Table.Td>
                <Table.Td>區域分散。除了美股，可適度配置包含印度、越南或日本的區域型 ETF，台灣 GDP 預計維持穩健但基期已高，操作需更靈活。</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>高股息價值股</Table.Td>
                <Table.Td>防禦核心（加碼）</Table.Td>
                <Table.Td>防禦波動。當率潰成長回歸平平，穩定的 5-7% 息收將成為資金避風港。特別是受惠於源頭轉型的公用事業股。</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>黃金</Table.Td>
                <Table.Td>避險配置（10%）</Table.Td>
                <Table.Td>地緣政治與財政對沖。 2026 年美國財政赤字可能超過 GDP 的 8%，加上地緣衝突不減，黃金作為「無國籍貨幣」的地位不可動搖。</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>債券</Table.Td>
                <Table.Td>核心穩定（30%）</Table.Td>
                <Table.Td>領取高票息。 2026 年利率已降至中性，債券大漲空間變小，但相較於現金，債券能提供更優質的固定回報。</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>現金</Table.Td>
                <Table.Td>低比重（保持流動性）</Table.Td>
                <Table.Td>2026 年現金存放利率不再誘人，應維持在 5-10% 用於市場過度震盪時的「策略性加碼」。</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>加密貨幣</Table.Td>
                <Table.Td>衛星投機（5%）</Table.Td>
                <Table.Td>隨時美聯儲利率觸底，流動性可能重新外溢，作為數位資產的試金石，可小量持有但須做好 50% 以上波動的心理準備。</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>大宗物資</Table.Td>
                <Table.Td>策略減碼</Table.Td>
                <Table.Td>全球經濟增速放緩（預計 2.7-2.8%），除非發生石油供應衝擊，否則原物料在 2026 年可能表現較平淡。</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </div>

        {/* 全天候配置 */}
        <div style={{ marginBottom: '24px' }}>
          <Text size="md" fw={700} mb="md">
            全天候配置
          </Text>
          
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>戰鬥位置</Table.Th>
                <Table.Th>資產名稱</Table.Th>
                <Table.Th>最強表現時期</Table.Th>
                <Table.Th>扮演角色</Table.Th>
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
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>

        {/* 投資時鐘 */}
        <div style={{ marginBottom: '24px' }}>
          <Text size="md" fw={700} mb="md">
            ** 「投資時鐘」(Investment Clock) ** 將景氣分為四個階段，每一階段都有最適合的「進攻」與「防禦」資產。
          </Text>
          <Text size="md" fw={600} mb="lg">
            依照景氣循環的建議配置整理如下：
          </Text>
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
