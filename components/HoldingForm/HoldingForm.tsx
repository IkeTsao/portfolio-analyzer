'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  NumberInput,
  Button,
  Group,
  Stack,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  Holding, 
  ACCOUNT_TYPES, 
  INVESTMENT_TYPES, 
  MARKET_TYPES, 
  SUPPORTED_CURRENCIES 
} from '@/types/portfolio';
import { addHolding, updateHolding, generateId } from '@/utils/portfolioStorage';
import { getAccountOptions } from '@/utils/accountUtils';

interface HoldingFormProps {
  opened: boolean;
  onClose: () => void;
  holding?: Holding | null;
  onSave?: () => void;
}

export default function HoldingForm({ opened, onClose, holding, onSave }: HoldingFormProps) {
  const [loading, setLoading] = useState(false);
  const [accountOptions, setAccountOptions] = useState(ACCOUNT_TYPES);
  
  const form = useForm({
    initialValues: {
      accountId: '',
      symbol: '',
      name: '',
      type: 'stock',
      market: 'US',
      quantity: 0,
      costBasis: 0,
      currentPrice: 0,
      currency: 'USD',
      purchaseDate: new Date().toISOString().split('T')[0],
    },
    validate: {
      accountId: (value) => (!value ? '請選擇帳戶' : null),
      symbol: (value) => (!value ? '請輸入代碼' : null),
      name: (value) => (!value ? '請輸入名稱' : null),
      quantity: (value) => (value <= 0 ? '數量必須大於0' : null),
      costBasis: (value) => (value <= 0 ? '成本價必須大於0' : null),
      currentPrice: (value) => (value < 0 ? '現價不能為負數' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    if (loading) return; // 防止重複提交
    
    setLoading(true);
    
    try {
      const holdingData: Holding = {
        id: holding?.id || generateId(),
        accountId: values.accountId,
        symbol: values.symbol.toUpperCase(),
        name: values.name,
        type: values.type as any,
        market: values.market as any,
        quantity: values.quantity,
        costBasis: values.costBasis,
        currency: values.currency,
        purchaseDate: values.purchaseDate,
        currentPrice: values.currentPrice > 0 ? values.currentPrice : undefined,
        lastUpdated: values.currentPrice > 0 ? new Date().toISOString() : undefined,
        priceSource: values.currentPrice > 0 ? 'manual' : undefined, // 手動輸入的價格標記為 manual
      };

      if (holding?.id) {
        await updateHolding(holding.id, holdingData);
        notifications.show({
          title: '更新成功',
          message: '持倉資訊已更新',
          color: 'green',
          autoClose: 2000,
        });
      } else {
        await addHolding(holdingData);
        notifications.show({
          title: '新增成功',
          message: '持倉已新增到投資組合',
          color: 'green',
          autoClose: 2000,
        });
      }

      // 延遲執行回調，確保資料保存完成
      setTimeout(() => {
        try {
          onSave?.();
        } catch (error) {
          console.error('onSave 回調執行失敗:', error);
        }
      }, 100);
      
      // 延遲關閉表單
      setTimeout(() => {
        try {
          onClose();
          form.reset();
        } catch (error) {
          console.error('關閉表單失敗:', error);
        }
      }, 150);
      
    } catch (error) {
      console.error('保存持倉失敗:', error);
      notifications.show({
        title: '操作失敗',
        message: error instanceof Error ? error.message : '請稍後再試',
        color: 'red',
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // 載入帳戶配置
  useEffect(() => {
    setAccountOptions(getAccountOptions());
  }, [opened]); // 當對話框打開時重新載入

  // 當holding prop改變時更新表單值
  useEffect(() => {
    if (opened && holding) {
      console.log('設置表單值:', holding);
      // 使用setTimeout確保DOM完全渲染後再設置值
      setTimeout(() => {
        form.setValues({
          accountId: holding.accountId || '',
          symbol: holding.symbol || '',
          name: holding.name || '',
          type: holding.type || 'stock',
          market: holding.market || 'US',
          quantity: holding.quantity || 0,
          costBasis: holding.costBasis || 0,
          currentPrice: holding.currentPrice || 0,
          currency: holding.currency || 'USD',
          purchaseDate: holding.purchaseDate || new Date().toISOString().split('T')[0],
        });
        
        // Mantine表單會自動更新，不需要手動DOM操作
      }, 50);
    } else if (opened && !holding) {
      console.log('重置表單');
      form.setValues({
        accountId: '',
        symbol: '',
        name: '',
        type: 'stock',
        market: 'US',
        quantity: 0,
        costBasis: 0,
        currentPrice: 0,
        currency: 'USD',
        purchaseDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [holding, opened]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={holding ? '編輯持倉' : '新增持倉'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Select
            label="帳戶"
            placeholder="選擇帳戶"
            data={accountOptions}
            required
            {...form.getInputProps('accountId')}
          />

          <Group grow>
            <TextInput
              label="代碼"
              placeholder="例如: AAPL, 2330"
              required
              {...form.getInputProps('symbol')}
            />
            <TextInput
              label="名稱"
              placeholder="例如: 蘋果公司, 台積電"
              required
              {...form.getInputProps('name')}
            />
          </Group>

          <Group grow>
            <Select
              label="投資類型"
              data={INVESTMENT_TYPES}
              required
              {...form.getInputProps('type')}
            />
            <Select
              label="市場"
              data={MARKET_TYPES}
              required
              {...form.getInputProps('market')}
            />
          </Group>

          <Group grow>
            <NumberInput
              label="持有數量"
              placeholder="0"
              min={0}
              decimalScale={6}
              required
              {...form.getInputProps('quantity')}
            />
            <NumberInput
              label="成本價"
              placeholder="0.00"
              min={0}
              decimalScale={2}
              required
              {...form.getInputProps('costBasis')}
            />
          </Group>

          <Group grow>
            <NumberInput
              label="現價"
              placeholder="0.00"
              min={0}
              decimalScale={2}
              description="選填，如不填寫將自動從網路獲取"
              {...form.getInputProps('currentPrice')}
            />
            <Select
              label="計價貨幣"
              data={SUPPORTED_CURRENCIES.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }))}
              required
              {...form.getInputProps('currency')}
            />
          </Group>

          <Group grow>
            <TextInput
              label="購買日期"
              placeholder="YYYY-MM-DD"
              required
              {...form.getInputProps('purchaseDate')}
            />
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={handleClose}>
              取消
            </Button>
            <Button type="submit" loading={loading}>
              {holding ? '更新' : '新增'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

