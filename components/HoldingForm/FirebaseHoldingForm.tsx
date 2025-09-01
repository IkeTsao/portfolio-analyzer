'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  NumberInput,
  Select,
  Button,
  Stack,
  Group,
  Alert,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { Holding } from '@/types/portfolio';
import { 
  addHolding, 
  updateHolding,
  loadAccounts 
} from '@/utils/firebaseStorage';
import { fetchSingleStockPrice } from '@/utils/priceService';

interface FirebaseHoldingFormProps {
  opened: boolean;
  onClose: () => void;
  editingHolding?: Holding | null;
}

export const FirebaseHoldingForm = ({ 
  opened, 
  onClose, 
  editingHolding 
}: FirebaseHoldingFormProps) => {
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // 表單狀態
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    accountId: '',
    type: '',
    market: '',
    quantity: 0,
    costBasis: 0,
    currentPrice: 0,
    currency: 'USD',
    purchaseDate: new Date(),
  });

  // 載入帳戶列表
  useEffect(() => {
    const loadAccountsList = async () => {
      try {
        const accountsList = await loadAccounts();
        setAccounts(accountsList);
      } catch (error) {
        console.error('載入帳戶列表失敗:', error);
      }
    };

    if (opened) {
      loadAccountsList();
    }
  }, [opened]);

  // 設置編輯數據
  useEffect(() => {
    if (editingHolding) {
      setFormData({
        symbol: editingHolding.symbol,
        name: editingHolding.name,
        accountId: editingHolding.accountId,
        type: editingHolding.type,
        market: editingHolding.market,
        quantity: editingHolding.quantity,
        costBasis: editingHolding.costBasis,
        currentPrice: editingHolding.currentPrice || 0,
        currency: editingHolding.currency,
        purchaseDate: new Date(editingHolding.purchaseDate),
      });
    } else {
      // 重置表單
      setFormData({
        symbol: '',
        name: '',
        accountId: '',
        type: '',
        market: '',
        quantity: 0,
        costBasis: 0,
        currentPrice: 0,
        currency: 'USD',
        purchaseDate: new Date(),
      });
    }
  }, [editingHolding, opened]);

  // 獲取股價函數
  const handleFetchPrice = async () => {
    if (!formData.symbol) {
      notifications.show({
        title: '錯誤',
        message: '請先輸入股票代碼',
        color: 'red',
      });
      return;
    }

    setFetchingPrice(true);
    try {
      const price = await fetchSingleStockPrice(formData.symbol);
      if (price) {
        setFormData({ ...formData, currentPrice: price });
        notifications.show({
          title: '獲取成功',
          message: `${formData.symbol} 當前價格: $${price}`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: '獲取失敗',
          message: `無法獲取 ${formData.symbol} 的股價`,
          color: 'orange',
        });
      }
    } catch (error) {
      console.error('獲取股價失敗:', error);
      notifications.show({
        title: '獲取失敗',
        message: '網路錯誤，請稍後再試',
        color: 'red',
      });
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.symbol || !formData.name || !formData.accountId) {
      notifications.show({
        title: '表單錯誤',
        message: '請填寫所有必填欄位',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      // 如果沒有手動輸入現價，自動獲取股價
      let currentPrice = formData.currentPrice;
      if (!currentPrice || currentPrice === 0) {
        console.log(`🔍 自動獲取 ${formData.symbol} 股價`);
        const fetchedPrice = await fetchSingleStockPrice(formData.symbol);
        if (fetchedPrice) {
          currentPrice = fetchedPrice;
          console.log(`✅ 獲取到股價: ${fetchedPrice}`);
          notifications.show({
            title: '股價已更新',
            message: `${formData.symbol} 當前價格: $${fetchedPrice}`,
            color: 'blue',
          });
        } else {
          console.log(`⚠️ 無法獲取 ${formData.symbol} 股價，使用成本價`);
          currentPrice = formData.costBasis;
        }
      }

      const holdingData: Holding = {
        id: editingHolding?.id || `${formData.symbol}-${Date.now()}`,
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        accountId: formData.accountId,
        type: formData.type as any, // 暫時使用 any 類型
        market: formData.market as any, // 暫時使用 any 類型
        quantity: formData.quantity,
        costBasis: formData.costBasis,
        currentPrice: currentPrice,
        currency: formData.currency,
        purchaseDate: formData.purchaseDate.toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      if (editingHolding) {
        await updateHolding(editingHolding.id, holdingData);
        notifications.show({
          title: '更新成功',
          message: `${formData.symbol} 持倉已更新`,
          color: 'green',
        });
      } else {
        await addHolding(holdingData);
        notifications.show({
          title: '新增成功',
          message: `${formData.symbol} 持倉已新增`,
          color: 'green',
        });
      }

      onClose();
    } catch (error) {
      console.error('保存持倉失敗:', error);
      notifications.show({
        title: '保存失敗',
        message: '無法保存持倉數據到 Firebase',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const accountOptions = accounts.map(account => ({
    value: account.id,
    label: account.name,
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editingHolding ? '編輯持倉' : '新增持倉'}
      size="md"
    >
      <Stack gap="md">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Firebase 存儲"
          color="blue"
          variant="light"
        >
          此表單將數據保存到 Firebase 雲端數據庫
        </Alert>

        <TextInput
          label="股票代碼"
          placeholder="例如: AAPL"
          value={formData.symbol}
          onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
          required
        />

        <TextInput
          label="股票名稱"
          placeholder="例如: Apple Inc."
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <Select
          label="帳戶"
          placeholder="選擇帳戶"
          data={accountOptions}
          value={formData.accountId}
          onChange={(value) => setFormData({ ...formData, accountId: value || '' })}
          required
        />

        <Select
          label="投資類型"
          placeholder="選擇類型"
          data={[
            { value: '股票', label: '股票' },
            { value: 'ETF', label: 'ETF' },
            { value: '債券', label: '債券' },
            { value: '加密貨幣', label: '加密貨幣' },
            { value: '其他', label: '其他' },
          ]}
          value={formData.type}
          onChange={(value) => setFormData({ ...formData, type: value || '' })}
        />

        <Select
          label="市場"
          placeholder="選擇市場"
          data={[
            { value: '美股', label: '美股' },
            { value: '台股', label: '台股' },
            { value: '港股', label: '港股' },
            { value: '其他', label: '其他' },
          ]}
          value={formData.market}
          onChange={(value) => setFormData({ ...formData, market: value || '' })}
        />

        <NumberInput
          label="持有數量"
          placeholder="0"
          value={formData.quantity}
          onChange={(value) => setFormData({ ...formData, quantity: Number(value) || 0 })}
          min={0}
          decimalScale={4}
        />

        <Group grow>
          <NumberInput
            label="成本價格"
            placeholder="0.00"
            value={formData.costBasis}
            onChange={(value) => setFormData({ ...formData, costBasis: Number(value) || 0 })}
            min={0}
            decimalScale={2}
          />
          <NumberInput
            label="現價"
            placeholder="0.00"
            value={formData.currentPrice || 0}
            onChange={(value) => setFormData({ ...formData, currentPrice: Number(value) || 0 })}
            min={0}
            decimalScale={2}
            description="選填，存檔時會自動獲取最新價格"
          />
        </Group>

        <Select
          label="貨幣"
          data={[
            { value: 'USD', label: 'USD (美元)' },
            { value: 'TWD', label: 'TWD (台幣)' },
            { value: 'HKD', label: 'HKD (港幣)' },
            { value: 'EUR', label: 'EUR (歐元)' },
            { value: 'GBP', label: 'GBP (英鎊)' },
          ]}
          value={formData.currency}
          onChange={(value) => setFormData({ ...formData, currency: value || 'USD' })}
        />

        <DateInput
          label="購買日期"
          value={formData.purchaseDate}
          onChange={(date) => setFormData({ ...formData, purchaseDate: date || new Date() })}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={onClose}>
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            loading={loading}
            color="blue"
          >
            {editingHolding ? '更新' : '新增'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

