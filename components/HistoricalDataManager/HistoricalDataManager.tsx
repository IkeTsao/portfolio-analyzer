'use client';

import { useState, useEffect } from 'react';
import { Paper, Title, Stack, Group, Button, Text, Badge, Modal, Alert, Table, ActionIcon, Tooltip } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCalendar, IconDownload, IconTrash, IconAlertCircle, IconDatabase, IconTrendingUp } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface HistoricalRecord {
  date: string; // YYYY-MM-DD format
  timestamp: number;
  data: any; // Portfolio data
  exchangeRates?: any; // 新增匯率資料
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  recordCount: number;
}

interface HistoricalDataManagerProps {
  currentPortfolioData?: any;
  onDataSaved?: (date: string) => void;
}

export default function HistoricalDataManager({ currentPortfolioData, onDataSaved }: HistoricalDataManagerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [historicalRecords, setHistoricalRecords] = useState<HistoricalRecord[]>([]);
  const [confirmModalOpened, setConfirmModalOpened] = useState(false);
  const [recordToOverwrite, setRecordToOverwrite] = useState<string | null>(null);
  const [loading, setSaving] = useState(false);

  // 從 localStorage 載入歷史記錄
  useEffect(() => {
    loadHistoricalRecords();
  }, []);

  const loadHistoricalRecords = () => {
    try {
      const saved = localStorage.getItem('portfolioHistoricalData');
      if (saved) {
        const records = JSON.parse(saved);
        setHistoricalRecords(records.sort((a: HistoricalRecord, b: HistoricalRecord) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
      }
    } catch (error) {
      console.error('載入歷史記錄失敗:', error);
    }
  };

  const saveHistoricalRecords = (records: HistoricalRecord[]) => {
    try {
      localStorage.setItem('portfolioHistoricalData', JSON.stringify(records));
      setHistoricalRecords(records.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (error) {
      console.error('儲存歷史記錄失敗:', error);
      notifications.show({
        title: '儲存失敗',
        message: '無法儲存歷史記錄到本地儲存',
        color: 'red',
      });
    }
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const checkDateExists = (dateStr: string): boolean => {
    return historicalRecords.some(record => record.date === dateStr);
  };

  const calculatePortfolioSummary = (data: any, exchangeRates?: any) => {
    if (!data || !Array.isArray(data)) {
      return { totalValue: 0, totalCost: 0, totalGainLoss: 0, recordCount: 0 };
    }

    let totalValue = 0;
    let totalCost = 0;
    let recordCount = data.length;

    data.forEach((item: any) => {
      const quantity = parseFloat(item.quantity) || 0;
      const currentPrice = parseFloat(item.currentPrice) || 0;
      const cost = parseFloat(item.cost) || 0;
      const currency = item.currency || 'TWD';

      // 獲取匯率轉換（與投資總覽邏輯一致）
      let exchangeRate = 1;
      if (currency !== 'TWD' && exchangeRates) {
        // 使用儲存的匯率資料
        if (currency === 'USD' && exchangeRates.USD) {
          exchangeRate = exchangeRates.USD;
        } else if (currency === 'EUR' && exchangeRates.EUR) {
          exchangeRate = exchangeRates.EUR;
        } else if (currency === 'GBP' && exchangeRates.GBP) {
          exchangeRate = exchangeRates.GBP;
        } else if (currency === 'CHF' && exchangeRates.CHF) {
          exchangeRate = exchangeRates.CHF;
        } else if (currency === 'JPY' && exchangeRates.JPY) {
          exchangeRate = exchangeRates.JPY;
        }
      }

      // 轉換為台幣計算
      const currentValueTWD = quantity * currentPrice * exchangeRate;
      const costValueTWD = quantity * cost * exchangeRate;

      totalValue += currentValueTWD;
      totalCost += costValueTWD;
    });

    const totalGainLoss = totalValue - totalCost;

    return { totalValue, totalCost, totalGainLoss, recordCount };
  };

  const handleSaveData = async () => {
    if (!selectedDate) {
      notifications.show({
        title: '請選擇日期',
        message: '請先選擇要儲存的日期',
        color: 'orange',
      });
      return;
    }

    if (!currentPortfolioData) {
      notifications.show({
        title: '無資料可儲存',
        message: '目前沒有投資組合資料可以儲存',
        color: 'orange',
      });
      return;
    }

    const dateStr = formatDate(selectedDate);
    
    if (checkDateExists(dateStr)) {
      setRecordToOverwrite(dateStr);
      setConfirmModalOpened(true);
    } else {
      await saveDataToDate(dateStr);
    }
  };

  const saveDataToDate = async (dateStr: string) => {
    setSaving(true);
    
    try {
      // 獲取匯率資料（與 saveTodayData 相同邏輯）
      let exchangeRates: any = {};
      try {
        const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY']; // 日圓排最後
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        
        const ratePromises = currencies.map(async (currency) => {
          try {
            const response = await fetch(`${baseUrl}/api/scrape-exchange-rate?from=${currency}&to=TWD`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.rate && data.rate > 0) {
                return { currency, rate: data.rate };
              }
            }
          } catch (error) {
            console.warn(`獲取 ${currency} 匯率失敗:`, error);
          }
          return null;
        });
        
        const rateResults = await Promise.all(ratePromises);
        const validRates = rateResults.filter(result => result !== null);
        
        if (validRates.length > 0) {
          exchangeRates = {
            timestamp: Date.now(),
          };
          
          // 設定獲取到的匯率
          validRates.forEach((result) => {
            if (result) {
              exchangeRates[result.currency] = result.rate;
            }
          });
          
          // 補充備用匯率（如果某些匯率獲取失敗）
          const fallbackRates = {
            USD: 32.0,
            EUR: 35.0,
            GBP: 40.0,
            CHF: 35.5,
            JPY: 0.22,
          };
          
          currencies.forEach(currency => {
            if (!exchangeRates[currency]) {
              exchangeRates[currency] = fallbackRates[currency];
            }
          });
        } else {
          // 全部失敗時使用備用匯率
          exchangeRates = {
            USD: 32.0,
            EUR: 35.0,
            GBP: 40.0,
            CHF: 35.5,
            JPY: 0.22,
            timestamp: Date.now(),
          };
        }
      } catch (error) {
        console.warn('獲取匯率資料失敗，使用備用匯率:', error);
        // 使用備用匯率
        exchangeRates = {
          USD: 32.0,
          EUR: 35.0,
          GBP: 40.0,
          CHF: 35.5,
          JPY: 0.22,
          timestamp: Date.now(),
        };
      }

      const summary = calculatePortfolioSummary(currentPortfolioData, exchangeRates);
      
      const newRecord: HistoricalRecord = {
        date: dateStr,
        timestamp: Date.now(),
        data: currentPortfolioData,
        exchangeRates, // 新增匯率資料
        ...summary,
      };

      const updatedRecords = historicalRecords.filter(record => record.date !== dateStr);
      updatedRecords.push(newRecord);
      
      saveHistoricalRecords(updatedRecords);
      
      notifications.show({
        title: '儲存成功',
        message: `${dateStr} 的投資組合資料已儲存（包含匯率資料）`,
        color: 'green',
      });

      if (onDataSaved) {
        onDataSaved(dateStr);
      }
    } catch (error) {
      console.error('儲存資料失敗:', error);
      notifications.show({
        title: '儲存失敗',
        message: '儲存投資組合資料時發生錯誤',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmOverwrite = async () => {
    if (recordToOverwrite) {
      await saveDataToDate(recordToOverwrite);
      setConfirmModalOpened(false);
      setRecordToOverwrite(null);
    }
  };

  const handleDeleteRecord = (dateStr: string) => {
    const updatedRecords = historicalRecords.filter(record => record.date !== dateStr);
    saveHistoricalRecords(updatedRecords);
    
    notifications.show({
      title: '刪除成功',
      message: `${dateStr} 的記錄已刪除`,
      color: 'blue',
    });
  };

  const handleExportRecord = (record: HistoricalRecord) => {
    try {
      if (!record.data || !Array.isArray(record.data)) {
        notifications.show({
          title: '匯出失敗',
          message: '該記錄沒有有效的資料可以匯出',
          color: 'red',
        });
        return;
      }

      // 準備 CSV 標頭（與持倉明細格式一致）
      const headers = [
        'ID',
        '帳戶',
        '代碼',
        '名稱', 
        '類型',
        '市場',
        '數量',
        '成本價',
        '貨幣',
        '購買日期',
        '現價',
        '台幣市值',
        '更新時間'
      ];

      // 如果有匯率資料，新增匯率欄位
      if ((record as any).exchangeRates) {
        headers.push('USD匯率', 'EUR匯率', 'GBP匯率', 'CHF匯率', 'JPY匯率', '匯率時間'); // 日圓排最後
      }

      // 準備 CSV 資料（與持倉明細格式一致）
      const csvData = record.data.map((item: any, index: number) => {
        // 計算台幣市值
        const quantity = item.quantity || 0;
        const currentPrice = item.currentPrice || 0;
        const currency = item.currency || 'TWD';
        
        let exchangeRate = 1;
        const exchangeRates = (record as any).exchangeRates;
        if (currency !== 'TWD' && exchangeRates) {
          if (currency === 'USD' && exchangeRates.USD) {
            exchangeRate = exchangeRates.USD;
          } else if (currency === 'EUR' && exchangeRates.EUR) {
            exchangeRate = exchangeRates.EUR;
          } else if (currency === 'GBP' && exchangeRates.GBP) {
            exchangeRate = exchangeRates.GBP;
          } else if (currency === 'CHF' && exchangeRates.CHF) {
            exchangeRate = exchangeRates.CHF;
          } else if (currency === 'JPY' && exchangeRates.JPY) {
            exchangeRate = exchangeRates.JPY;
          }
        }
        
        const twdValue = quantity * currentPrice * exchangeRate;

        const row = [
          item.id || '',
          item.accountId || '',
          item.symbol || '',
          item.name || '',
          item.type || '',
          item.market || '',
          item.quantity?.toString() || '',
          item.costBasis?.toString() || '',
          item.currency || '',
          item.purchaseDate || '',
          item.currentPrice?.toString() || '',
          twdValue.toFixed(2),
          item.lastUpdated || ''
        ];

        // 如果有匯率資料，新增匯率數據（只在第一行添加）
        if (exchangeRates && index === 0) {
          row.push(
            exchangeRates.USD?.toString() || '',
            exchangeRates.EUR?.toString() || '',
            exchangeRates.GBP?.toString() || '',
            exchangeRates.CHF?.toString() || '',
            exchangeRates.JPY?.toString() || '', // 日圓排最後
            exchangeRates.timestamp ? new Date(exchangeRates.timestamp).toISOString() : ''
          );
        } else if (exchangeRates) {
          // 其他行填入空值
          row.push('', '', '', '', '', '');
        }

        return row;
      });

      // 組合 CSV 內容（與持倉明細格式一致）
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // 下載 CSV 檔案
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `portfolio_${record.date}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notifications.show({
        title: '匯出成功',
        message: `${record.date} 的資料已匯出為 CSV 檔案`,
        color: 'green',
      });
    } catch (error) {
      console.error('匯出失敗:', error);
      notifications.show({
        title: '匯出失敗',
        message: '匯出 CSV 檔案時發生錯誤',
        color: 'red',
      });
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <>
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>
              <Group gap="xs">
                <IconDatabase size={20} />
                歷史資料管理
              </Group>
            </Title>
            <Badge variant="light" color="blue">
              {historicalRecords.length} 筆記錄
            </Badge>
          </Group>

          {/* 儲存新記錄 */}
          <Stack gap="sm">
            <Text size="sm" fw={500}>儲存持倉明細到指定日期</Text>
            <Text size="xs" c="dimmed">
              將當前主頁面的持倉明細資料（包含價格和匯率）儲存到選定的日期
            </Text>
            <Group>
              <DatePickerInput
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="選擇日期"
                leftSection={<IconCalendar size={16} />}
                maxDate={new Date()}
                size="sm"
                style={{ flex: 1 }}
              />
              <Button
                onClick={handleSaveData}
                loading={loading}
                size="sm"
                leftSection={<IconDatabase size={16} />}
              >
                儲存當下持倉明細
              </Button>
            </Group>
            {selectedDate && checkDateExists(formatDate(selectedDate)) && (
              <Alert icon={<IconAlertCircle size={16} />} color="orange">
                該日期已有記錄，儲存將會覆蓋現有資料
              </Alert>
            )}
          </Stack>

          {/* 歷史記錄列表 */}
          {historicalRecords.length > 0 && (
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" fw={500}>歷史記錄</Text>
                <Group gap="xs">
                  <IconTrendingUp size={16} />
                  <Text size="xs" c="dimmed">可用於趨勢分析</Text>
                </Group>
              </Group>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>日期</Table.Th>
                      <Table.Th>總價值</Table.Th>
                      <Table.Th>損益</Table.Th>
                      <Table.Th>筆數</Table.Th>
                      <Table.Th>操作</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {historicalRecords.map((record) => {
                      const gainLossPercent = record.totalCost > 0 
                        ? (record.totalGainLoss / record.totalCost) * 100 
                        : 0;
                      
                      return (
                        <Table.Tr key={record.date}>
                          <Table.Td>
                            <Text size="sm" fw={500}>{record.date}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{formatCurrency(record.totalValue)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text 
                              size="sm" 
                              c={record.totalGainLoss >= 0 ? 'green' : 'red'}
                              fw={500}
                            >
                              {formatCurrency(record.totalGainLoss)}
                              <br />
                              <Text size="xs" span>
                                ({formatPercent(gainLossPercent)})
                              </Text>
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="sm" variant="light">
                              {record.recordCount}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Tooltip label="匯出 CSV">
                                <ActionIcon
                                  size="sm"
                                  variant="light"
                                  color="blue"
                                  onClick={() => handleExportRecord(record)}
                                >
                                  <IconDownload size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="刪除記錄">
                                <ActionIcon
                                  size="sm"
                                  variant="light"
                                  color="red"
                                  onClick={() => handleDeleteRecord(record.date)}
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </div>
            </Stack>
          )}

          {historicalRecords.length === 0 && (
            <Alert icon={<IconDatabase size={16} />} color="blue">
              <Text size="sm">
                尚無歷史記錄。選擇日期並儲存當前投資組合資料，即可開始建立歷史記錄用於趋勢分析。
              </Text>
            </Alert>
          )}

          {/* 顯示已有資料的日期 */}
          {historicalRecords.length > 0 && (
            <Stack gap="sm">
              <Text size="sm" fw={500} c="blue">
                📅 已有資料的日期 ({historicalRecords.length} 筆)
              </Text>
              <Group gap="xs">
                {historicalRecords.slice(0, 10).map((record) => (
                  <Badge 
                    key={record.date} 
                    variant="light" 
                    color="blue" 
                    size="sm"
                  >
                    {record.date}
                  </Badge>
                ))}
                {historicalRecords.length > 10 && (
                  <Badge variant="light" color="gray" size="sm">
                    +{historicalRecords.length - 10} 更多
                  </Badge>
                )}
              </Group>
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* 確認覆蓋 Modal */}
      <Modal
        opened={confirmModalOpened}
        onClose={() => setConfirmModalOpened(false)}
        title="確認覆蓋資料"
        size="sm"
      >
        <Stack gap="md">
          <Alert icon={<IconAlertCircle size={16} />} color="orange">
            <Text size="sm">
              {recordToOverwrite} 已有記錄存在。確定要覆蓋現有資料嗎？
            </Text>
          </Alert>
          <Group justify="flex-end" gap="sm">
            <Button 
              variant="outline" 
              onClick={() => setConfirmModalOpened(false)}
            >
              取消
            </Button>
            <Button 
              color="orange"
              onClick={() => recordToOverwrite && saveDataToDate(recordToOverwrite)}
              loading={loading}
            >
              確認覆蓋
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

