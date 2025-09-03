'use client';

import { useState, useEffect } from 'react';
import { Paper, Title, Stack, Group, Button, Text, TextInput, Badge, Modal, Alert, Table, ActionIcon, Tooltip } from '@mantine/core';
import { IconBuilding, IconEdit, IconCheck, IconX, IconPlus, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { ACCOUNT_TYPES } from '@/types/portfolio';

interface AccountConfig {
  id: string;
  label: string;
  isCustom: boolean;
}

interface AccountManagerProps {
  onAccountsUpdated?: () => void;
}

export default function AccountManager({ onAccountsUpdated }: AccountManagerProps) {
  const [accounts, setAccounts] = useState<AccountConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 從 localStorage 載入帳號配置
  useEffect(() => {
    loadAccountConfigs();
  }, []);

  const loadAccountConfigs = () => {
    try {
      const saved = localStorage.getItem('portfolioAccountConfigs');
      if (saved) {
        const configs = JSON.parse(saved);
        setAccounts(configs);
      } else {
        // 使用預設配置
        const defaultConfigs: AccountConfig[] = [
          { id: 'etrade', label: 'Etrade', isCustom: false },
          { id: 'fubon', label: '富邦銀行', isCustom: false },
          { id: 'esun', label: '玉山銀行', isCustom: false },
          { id: 'account4', label: '帳號4', isCustom: true },
          { id: 'account5', label: '帳號5', isCustom: true },
        ];
        setAccounts(defaultConfigs);
        saveAccountConfigs(defaultConfigs);
      }
    } catch (error) {
      console.error('載入帳號配置失敗:', error);
      notifications.show({
        title: '載入失敗',
        message: '載入帳號配置時發生錯誤',
        color: 'red',
      });
    }
  };

  const saveAccountConfigs = (configs: AccountConfig[]) => {
    try {
      localStorage.setItem('portfolioAccountConfigs', JSON.stringify(configs));
      
      // 同時更新 ACCOUNT_TYPES 的全域配置
      const updatedAccountTypes = configs.map(config => ({
        value: config.id,
        label: config.label,
      }));
      
      // 這裡可以觸發全域更新
      if (onAccountsUpdated) {
        onAccountsUpdated();
      }
      
    } catch (error) {
      console.error('儲存帳號配置失敗:', error);
      throw error;
    }
  };

  const handleStartEdit = (account: AccountConfig) => {
    setEditingId(account.id);
    setEditingLabel(account.label);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingLabel.trim()) {
      notifications.show({
        title: '輸入錯誤',
        message: '帳號名稱不能為空',
        color: 'orange',
      });
      return;
    }

    setLoading(true);
    
    try {
      const updatedAccounts = accounts.map(account => 
        account.id === editingId 
          ? { ...account, label: editingLabel.trim() }
          : account
      );
      
      setAccounts(updatedAccounts);
      saveAccountConfigs(updatedAccounts);
      
      setEditingId(null);
      setEditingLabel('');
      
      notifications.show({
        title: '更新成功',
        message: '帳號名稱已更新',
        color: 'green',
      });
      
    } catch (error) {
      console.error('更新帳號失敗:', error);
      notifications.show({
        title: '更新失敗',
        message: '更新帳號名稱時發生錯誤',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingLabel('');
  };

  const resetToDefault = () => {
    const defaultConfigs: AccountConfig[] = [
      { id: 'etrade', label: 'Etrade', isCustom: false },
      { id: 'fubon', label: '富邦銀行', isCustom: false },
      { id: 'esun', label: '玉山銀行', isCustom: false },
      { id: 'account4', label: '帳號4', isCustom: true },
      { id: 'account5', label: '帳號5', isCustom: true },
    ];
    
    setAccounts(defaultConfigs);
    saveAccountConfigs(defaultConfigs);
    
    notifications.show({
      title: '重設成功',
      message: '帳號配置已重設為預設值',
      color: 'blue',
    });
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={4}>
            <Group gap="xs">
              <IconBuilding size={20} />
              帳號名稱設定
            </Group>
          </Title>
          <Badge variant="light" color="blue">
            {accounts.length} 個帳號
          </Badge>
        </Group>

        <Text size="sm" c="dimmed">
          管理投資組合的帳號設定，前三個為預設帳號，第四和第五個帳號可自訂名稱
        </Text>

        {/* 帳號列表 */}
        <Stack gap="xs">
          {accounts.map((account, index) => (
            <Paper key={account.id} p="sm" withBorder bg={index < 3 ? 'gray.0' : 'white'}>
              <Group justify="space-between">
                <Group gap="sm">
                  <Badge 
                    variant="light" 
                    color={index < 3 ? 'blue' : 'green'}
                    size="sm"
                  >
                    {index + 1}
                  </Badge>
                  
                  {editingId === account.id ? (
                    <TextInput
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      size="sm"
                      style={{ flex: 1, maxWidth: 200 }}
                      placeholder="輸入帳號名稱"
                    />
                  ) : (
                    <Text size="sm" fw={500}>
                      {account.label}
                    </Text>
                  )}
                  
                  {index < 3 && (
                    <Badge variant="outline" color="blue" size="xs">
                      預設
                    </Badge>
                  )}
                </Group>

                <Group gap="xs">
                  {editingId === account.id ? (
                    <>
                      <ActionIcon
                        size="sm"
                        color="green"
                        onClick={handleSaveEdit}
                        loading={loading}
                      >
                        <IconCheck size={14} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        color="red"
                        onClick={handleCancelEdit}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </>
                  ) : (
                    <Tooltip label="編輯帳號名稱">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={() => handleStartEdit(account)}
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>

        {/* 操作按鈕 */}
        <Group justify="flex-end">
          <Button
            variant="light"
            size="sm"
            onClick={resetToDefault}
          >
            重設為預設
          </Button>
        </Group>

        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          <Text size="sm">
            <strong>使用說明：</strong>
            <br />• 前三個帳號（Etrade、富邦銀行、玉山銀行）為預設帳號，可修改名稱
            <br />• 第四和第五個帳號可自訂為任何金融機構名稱
            <br />• 修改後的帳號名稱會立即套用到整個投資組合系統
          </Text>
        </Alert>
      </Stack>
    </Paper>
  );
}

