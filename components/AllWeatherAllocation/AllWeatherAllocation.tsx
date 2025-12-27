'use client';

import { Paper, Title, Table, Text, List } from '@mantine/core';
import { PortfolioStats } from '@/types/portfolio';
import { formatCurrencyNTD, formatPercentage, formatCurrency } from '@/utils/portfolioCalculations';

interface AllWeatherAllocationProps {
  stats: PortfolioStats | null;
  loading?: boolean;
}

export function AllWeatherAllocation({ stats, loading }: AllWeatherAllocationProps) {
  if (loading || !stats) {
    return (
      <Paper p="md" withBorder>
        <Title order={2} mb="md">配置建議</Title>
        <Text c="dimmed">載入中...</Text>
      </Paper>
    );
  }

  // 計算攻擊端資產（成長股 + 指數 ETF + 高股息股票 + 加密貨幣）
  const offensiveValue = (stats.distributionByType.growth?.totalValue || 0) +
                         (stats.distributionByType.index?.totalValue || 0) +
                         (stats.distributionByType.dividend?.totalValue || 0) +
                         (stats.distributionByType.crypto?.totalValue || 0);
  
  const offensivePercentage = (stats.distributionByType.growth?.percentage || 0) +
                              (stats.distributionByType.index?.percentage || 0) +
                              (stats.distributionByType.dividend?.percentage || 0) +
                              (stats.distributionByType.crypto?.percentage || 0);

  // 計算防禦端資產（現金 + 黃金/大宗物資 + 債券）
  const defensiveValue = (stats.distributionByType.cash?.totalValue || 0) +
                         (stats.distributionByType.shortBond?.totalValue || 0) +
                         (stats.distributionByType.gold?.totalValue || 0) +
                         (stats.distributionByType.commodity?.totalValue || 0) +
                         (stats.distributionByType.longBond?.totalValue || 0);
  
  const defensivePercentage = (stats.distributionByType.cash?.percentage || 0) +
                              (stats.distributionByType.shortBond?.percentage || 0) +
                              (stats.distributionByType.gold?.percentage || 0) +
                              (stats.distributionByType.commodity?.percentage || 0) +
                              (stats.distributionByType.longBond?.percentage || 0);

  // 計算現金相關數據
  const cashValue = stats.distributionByType.cash?.totalValue || 0;
  const cashPercentage = stats.distributionByType.cash?.percentage || 0;

  // 計算貴金屬相關數據
  const goldValue = stats.distributionByType.gold?.totalValue || 0;
  const commodityValue = stats.distributionByType.commodity?.totalValue || 0;
  const preciousMetalsValue = goldValue + commodityValue;
  const preciousMetalsPercentage = (stats.distributionByType.gold?.percentage || 0) + 
                                    (stats.distributionByType.commodity?.percentage || 0);
  
  // 白銀佔總資產比例（假設 commodity 主要是白銀）
  const silverPercentage = stats.distributionByType.commodity?.percentage || 0;

  return (
    <Paper p="md" withBorder>
      <Title order={2} mb="md">配置建議</Title>
      
      {/* 50/50 策略核心表格 */}
      <Title order={3} mb="md">50 / 50 策略</Title>
      <Table striped highlightOnHover withTableBorder withColumnBorders mb="xl">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>策略分項</Table.Th>
            <Table.Th>建議比例</Table.Th>
            <Table.Th>包含資產</Table.Th>
            <Table.Th>當前金額</Table.Th>
            <Table.Th>當前佔比</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td style={{ fontWeight: 600 }}>攻擊端<br />(Risk On)</Table.Td>
            <Table.Td style={{ fontWeight: 600 }}>50% +/- 10%</Table.Td>
            <Table.Td>成長股 + 指數 ETF + 高股息股票 + 加密貨幣</Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>{formatCurrencyNTD(offensiveValue)}</Table.Td>
            <Table.Td style={{ textAlign: 'right', color: '#1971c2' }}>{formatPercentage(offensivePercentage)}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td style={{ fontWeight: 600 }}>防禦端<br />(Risk Off)</Table.Td>
            <Table.Td style={{ fontWeight: 600 }}>50% -/+ 10%</Table.Td>
            <Table.Td>現金 + 黃金/大宗物資 + 債券</Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>{formatCurrencyNTD(defensiveValue)}</Table.Td>
            <Table.Td style={{ textAlign: 'right', color: '#1971c2' }}>{formatPercentage(defensivePercentage)}</Table.Td>
          </Table.Tr>
          <Table.Tr style={{ borderTop: '2px solid #dee2e6' }}>
            <Table.Td style={{ fontWeight: 700 }}>總計</Table.Td>
            <Table.Td style={{ fontWeight: 700 }}>100%</Table.Td>
            <Table.Td></Table.Td>
            <Table.Td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrencyNTD(stats.totalValue)}</Table.Td>
            <Table.Td style={{ textAlign: 'right', fontWeight: 700, color: '#1971c2' }}>100.00%</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>

      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        這種分配方式在投資心理學上被稱為<strong>「無憾策略」</strong>——無論市場大漲還是大跌，您都有約一半的部位能應對。
      </Text>
      <List mb="xl" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item><strong>攻擊端 (50%)</strong>：對抗的是「錯失成長」的風險（獲取企業生產力回報）。</List.Item>
        <List.Item><strong>防禦端 (50%)</strong>：對抗的是「貨幣貶值」與「極端動盪」的風險。</List.Item>
      </List>

      {/* 攻擊端說明 */}
      <Title order={3} mt="xl" mb="md">攻擊端</Title>
      
      <Title order={4} mb="sm">高股息在攻擊端的角色：防守型後衛</Title>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        如果把您的攻擊端 (50%) 比喻成一支足球隊：
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item>
          <strong>前鋒 (Growth Stocks)</strong>：如 LITE、MU、TSMC。負責衝鋒陷陣，回報最高，但體力消耗（波動）也最大。
        </List.Item>
        <List.Item>
          <strong>中場/後衛 (High Dividend)</strong>：如 VYMI、0056。它們雖然也上場踢球（承受市場風險），但在大盤下跌時，因為有股息支撐和價值股屬性，跌幅通常會比成長股小。
        </List.Item>
      </List>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        它們讓您的「攻擊端」變得比較耐震，但它們依然是攻擊端。
      </Text>

      <Title order={4} mb="sm">針對 2026 年的建議變化</Title>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        既然 2026 年展望不錯，但金銀又創新高，您可以這樣思考高股息股票：
      </Text>
      <List mb="xl" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item>
          <strong>當市場過熱時</strong>：將「前鋒（成長股）」的獲利轉向「後衛（高股息）」。這雖然還是在攻擊端內部移動，但已經實質降低了組合的波動率。
        </List.Item>
        <List.Item>
          <strong>真正的避險</strong>：只有當您將資金轉向 現金、黃金、白銀 時，才算真正增加了「防禦端」的比例。
        </List.Item>
      </List>

      {/* 防禦端說明 */}
      <Title order={3} mt="xl" mb="md">防禦端</Title>
      
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        大宗物資（金、銀、原油、農產品）屬於<strong>「硬資產（Hard Assets）」</strong>。當法幣（美元、台幣）因為通膨、過度舉債或地緣政治而失去信用時，硬資產的內在價值會顯現。因此，在 50/50 的比例中，它們是用來抵銷積極端（股票）在市場崩盤時的帳面損失。
      </Text>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        雖然同屬防禦端，但大宗物資（白銀、原油等）的脾氣與黃金不太一樣：
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item>
          <strong>黃金</strong>：純粹的避險。波動相對穩定，主要隨利率與避險情緒起伏。
        </List.Item>
        <List.Item>
          <strong>大宗物資（如白銀）</strong>：避險 + 工業需求。
          <List withPadding>
            <List.Item>它具備避險屬性（跟隨黃金漲跌）</List.Item>
            <List.Item>它具備積極屬性（當經濟好、製造業強，銀的需求會暴增）</List.Item>
          </List>
        </List.Item>
      </List>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#fa5252' }}>
        <strong>風險提醒</strong>：雖然白銀在分類上是防禦，但它的<strong>波動率（Volatility）</strong>有時甚至高於 QQQ。只要您的白銀不超過總資產的 10-15%，它都能在維持防禦功能的同時，提供比單純持有黃金更好的回報潛力。
      </Text>

      <Title order={4} mb="sm">貴金屬內部的比例</Title>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        在您的 50% 防禦端中，貴金屬（金+銀）通常建議佔總資產的 10% - 30%。在這部分預算內，金銀的分配比例可分為：
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item><strong>穩健保守型 80：20</strong> - 核心目標是保值，白銀僅作為小幅增益。</List.Item>
        <List.Item><strong>標準平衡型 70：30</strong> - 最推薦。兼顧黃金的穩定與白銀的工業成長潛力。目標：銀佔總資產約 7-8%</List.Item>
      </List>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <strong>您目前的貴金屬配置</strong>：總計 {formatCurrencyNTD(preciousMetalsValue)} ({formatPercentage(preciousMetalsPercentage)})，其中白銀佔總資產 {formatPercentage(silverPercentage)}。
      </Text>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <strong>防禦端的安全性</strong> = 現金 &gt; 黃金 &gt; 白銀/大宗物資
      </Text>

      <Title order={4} mb="sm">為什麼目前的配置 高現金 + 高貴金屬取代債券？</Title>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        您清空了短債中長債，這反映了您對目前債券作為防禦工具的不信任，這在當前環境下是有邏輯的：
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item>
          <strong>通膨風險 vs. 利率風險</strong>：債券最怕通膨。如果 2026 年通膨無法降至目標，利率維持高位，債券價格會持續受壓。此時，黃金與白銀比債券更能對抗通膨。
        </List.Item>
        <List.Item>
          <strong>現金的「期權價值」</strong>：您目前持有 {formatCurrencyNTD(cashValue)} ({formatPercentage(cashPercentage)}) 的現金。雖然現金不生息（或利息低），但它沒有「價格跌損」的風險。在 2026 年展望看好的情況下，現金讓您保有隨時能加碼的權力。債券則會受利率波動影響，流動性雖好但有價差損失風險。
        </List.Item>
      </List>

      <Title order={4} mb="sm">債券風險化傾向</Title>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        並非所有債券都是防禦端。在 50/50 框架下，我們會這樣劃分：
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item>
          <strong>防禦端債券</strong>：政府公債（如美國國庫券 SGOV, TLT）、高評級公司債。
        </List.Item>
        <List.Item>
          <strong>攻擊端債券（甚至不建議放進防禦端）</strong>：高收益債（垃圾債）、新興市場債。這些標的與股市連動性極高，股市崩盤時它們也會跟著崩盤，無法起到防禦作用。
        </List.Item>
      </List>

      <Title order={4} mb="sm">總結建議</Title>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        在您的 50/50 帳本中，債券是「守城門的士兵」。
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item>
          如果您認為 2026 年經濟會硬著陸（大衰退）且通膨消失：您應該把部分現金轉回長債。
        </List.Item>
        <List.Item>
          如果您認為 2026 年通膨會揮之不去，但經濟展望不錯：您目前的配置（現金 + 黃金 + 白銀）其實比債券更適合作為防禦端，因為這三者對利率上升的抗性通常比中長債強。
        </List.Item>
      </List>
      <Text mb="xl" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <strong>簡單來說</strong>：在 50/50 策略裡，債券是「傳統防禦」，而您目前的 現金+貴金屬 是「強硬防禦」。
      </Text>

      {/* 現金管理 */}
      <Title order={4} mb="sm">現金</Title>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        您目前有約 {formatCurrency(cashValue / 1000000, 'TWD')} 百萬台幣現金（佔總資產 {formatPercentage(cashPercentage)}）。建議將其中部分換成美元，並採用以下結構：
      </Text>
      
      <Table striped withTableBorder withColumnBorders mb="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>分配方案</Table.Th>
            <Table.Th>比例</Table.Th>
            <Table.Th>執行方式</Table.Th>
            <Table.Th>目的</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td>1 個月期定存</Table.Td>
            <Table.Td>30%</Table.Td>
            <Table.Td>每月到期自動續存本金</Table.Td>
            <Table.Td>隨時備戰。若美股 2026 年出現 10% 以上拉回，立即解約進場。</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>3 個月期定存</Table.Td>
            <Table.Td>50%</Table.Td>
            <Table.Td>分三梯次進場（階梯式）</Table.Td>
            <Table.Td>鎖定利息。在降息週期中，3 個月期的利率通常比 1 個月更具防禦力。</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>美元活存</Table.Td>
            <Table.Td>20%</Table.Td>
            <Table.Td>放在富邦外幣活存</Table.Td>
            <Table.Td>極致靈活性。配合富邦複委託的「定期定額」或「限價單」。</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>

      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <strong>注意 2026 年的「匯率」與「利率」風險</strong>
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item>
          <strong>匯率變數</strong>：2026 年若美國降息速度快於預期，美元可能走弱（台幣相對升值）。現在換美元雖然有利息，但會有匯損風險。
        </List.Item>
        <List.Item>
          <strong>對策</strong>：既然您是為了「買美股」而換匯，匯損其實是偽命題。因為美元貶值時，您能買到更多單位的股票，這在槓鈴策略中屬於「內部對沖」。
        </List.Item>
      </List>

      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <strong>操作建議清單</strong>
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item><strong>分批換匯</strong>：不要一次將台幣全換成美元。建議分 3-4 個月，趁台幣強勢（美元回檔）時分批撥入富邦。</List.Item>
        <List.Item><strong>開啟「複委託購買力」功能</strong>：確保富邦美元戶頭的錢與複委託帳戶連動，這樣定存一到期，您可以直接下單。</List.Item>
        <List.Item><strong>鎖定 2026 年的進場點</strong>：當您的攻擊端佔比（目前 {formatPercentage(offensivePercentage)}）因為市場修正掉到 48% 以下時，就是動用這筆「循環定存資金」的最佳時機。</List.Item>
      </List>
      <Text mb="xl" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        這是一個非常成熟的「復健」動作。您將原本「死掉的台幣活存」轉換成了「有收益且具戰鬥力的美元彈藥」。
      </Text>

      {/* 再平衡說明 */}
      <Title order={3} mt="xl" mb="md">再平衡</Title>
      
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        「再平衡」（Rebalancing）是 50/50 策略的靈魂。如果沒有再平衡，你的組合只是隨波逐流；有了再平衡，你的組合才是在<strong>「低買高賣」</strong>。
      </Text>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        針對您的 50/50 框架，再平衡的時機主要可以分為以下三種邏輯：
      </Text>

      <Title order={4} mb="sm">1. 定期再平衡 (Time-Based)</Title>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        這是最省心的方法，適合不想頻繁看盤的投資者。
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item><strong>頻率</strong>：每半年（6 月/12 月）或每年一次。</List.Item>
        <List.Item><strong>做法</strong>：不管市場漲跌，時間到了就檢查比例，將「多出來的部分」賣掉，補進「比例縮水的部分」。</List.Item>
        <List.Item><strong>優點</strong>：紀律簡單，避免過度頻繁交易造成的手續費損耗。</List.Item>
      </List>

      <Title order={4} mb="sm">2. 閥值再平衡 (Threshold-Based/Tolerance Bands) – 最推薦</Title>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        這是「永久組合」與專業經理人最常使用的方法。您為 50% 的目標設定一個「偏離容忍度」。
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item>
          <strong>5% 準則</strong>：當資產比例偏離目標超過 5% 時觸及。
          <List withPadding>
            <List.Item>目標：50%</List.Item>
            <List.Item>觸發點：當攻擊端漲到 55%，或跌到 45% 時，立刻進行調整。</List.Item>
          </List>
        </List.Item>
        <List.Item>
          <strong>10% 準則（更寬鬆）</strong>：如果您持有的個股波動極大，可設為 10% 偏離。也就是當攻擊端衝到 60% 時才賣出。
        </List.Item>
      </List>

      <Title order={4} mb="sm">3. ATH (歷史新高) 再平衡</Title>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        現在正是您考慮再平衡的關鍵時刻，因為您的「雙端」都在創新高：
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item>
          <strong>當股票（攻擊端）創新高時</strong>：雖然 2026 展望好，但如果成長股漲到讓你的攻擊端佔了總資產的 60%，依照紀律，你必須賣掉那 10% 的股票。這叫<strong>「收割獲利」</strong>。
        </List.Item>
        <List.Item>
          <strong>當金銀（防禦端）創新高時</strong>：如果金銀價格噴發，讓防禦端比例升高，你應該賣掉部分金銀，轉成現金。這叫<strong>「子彈入庫」</strong>。
        </List.Item>
      </List>
      
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <strong>特殊情況</strong>：
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item>
          <strong>向上再平衡（用現金）</strong>：如果您覺得成長股展望太好，不想賣掉它們，如果攻擊端只有 43.5%（低於 50%），您不需要賣股票，而是動用現金去買股票，直到攻擊端回到 50%。
        </List.Item>
        <List.Item>
          <strong>內部再平衡（金銀切換）</strong>：既然金銀都破新高，目前不需要增加防禦端總量，而是做「內部優化」。若金銀比仍高，將部分黃金換成白銀，這也是一種再平衡。
        </List.Item>
      </List>

      <Title order={4} mb="sm">再平衡時的隱形成本</Title>
      <Text mb="md" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        在執行再平衡時，請務必考量以下兩點，避免獲利被吃掉：
      </Text>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item>
          <strong>稅務問題</strong>：在美股 (Etrade) 賣出獲利部位可能產生資本利得稅。若金額巨大，可以考慮用「新投入的現金」去買進落後的資產，而不是賣出領先的資產。
        </List.Item>
        <List.Item>
          <strong>滑價與手續費</strong>：不要為了 1% 的偏離就去調整。這就是為什麼建議設定 5% 的閥值，只有在大波動發生時，再平衡的收益才會大於交易成本。
        </List.Item>
      </List>

      <Title order={4} mb="sm">總結操作時間表</Title>
      <List mb="md" spacing="xs" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        <List.Item><strong>每季檢查</strong>：看一下比例。</List.Item>
        <List.Item><strong>破 5% 動作</strong>：當 50/50 變成 55/45 或 45/55 時，開始調倉。</List.Item>
        <List.Item><strong>大趨勢轉折</strong>：像 2026 展望與金銀新高，這就是一個<strong>「戰術性檢查點」</strong>。</List.Item>
      </List>
      <Text mb="xl" style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
        您現在的攻擊端是 {formatPercentage(offensivePercentage)}，防禦端（含現金）是 {formatPercentage(defensivePercentage)}。如果按照 50/50 紀律，您可以考慮：「利用現金，稍微補一點攻擊端，或者按兵不動等待股票大漲自動填滿缺口。」
      </Text>
    </Paper>
  );
}
