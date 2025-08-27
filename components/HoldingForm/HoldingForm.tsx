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

interface HoldingFormProps {
  opened: boolean;
  onClose: () => void;
  holding?: Holding | null;
  onSave?: () => void;
}

export default function HoldingForm({ opened, onClose, holding, onSave }: HoldingFormProps) {
  const [loading, setLoading] = useState(false);
  
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
      };

      if (holding?.id) {
        updateHolding(holding.id, holdingData);
        notifications.show({
          title: '更新成功',
          message: '持倉資訊已更新',
          color: 'green',
        });
      } else {
        addHolding(holdingData);
        notifications.show({
          title: '新增成功',
          message: '持倉已新增到投資組合',
          color: 'green',
        });
      }

      onSave?.();
      onClose();
      form.reset();
    } catch (error) {
      notifications.show({
        title: '操作失敗',
        message: '請稍後再試',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

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
        
        // 手動觸發輸入事件確保Mantine組件更新
        setTimeout(() => {
          const symbolInput = document.querySelector('input[placeholder*="AAPL"]') as HTMLInputElement;
          const nameInput = document.querySelector('input[placeholder*="蘋果"]') as HTMLInputElement;
          const quantityInput = document.querySelector('input[placeholder="0"]') as HTMLInputElement;
          const costInput = document.querySelector('input[placeholder="0.00"]') as HTMLInputElement;
          
          if (symbolInput && holding.symbol) {
            symbolInput.value = holding.symbol;
            symbolInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (nameInput && holding.name) {
            nameInput.value = holding.name;
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (quantityInput && holding.quantity) {
            quantityInput.value = holding.quantity.toString();
            quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (costInput && holding.costBasis) {
            costInput.value = holding.costBasis.toString();
            costInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 100);
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
            data={ACCOUNT_TYPES}
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

