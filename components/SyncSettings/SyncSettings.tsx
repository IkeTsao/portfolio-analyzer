'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  TextInput,
  PasswordInput,
  Switch,
  Group,
  Stack,
  Text,
  Alert,
  Tabs,
  Card,
  Badge,
  ActionIcon,
  Tooltip,
  Code,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { 
  IconCloud, 
  IconKey, 
  IconCopy, 
  IconDownload, 
  IconUpload,
  IconShield,
  IconDevices,
  IconRefresh,
  IconSettings
} from '@tabler/icons-react';
import {
  generateSyncCode,
  createSyncCode,
  loadFromSyncCode,
  updateSyncCode,
  checkSyncCode,
  saveSyncSettings,
  loadSyncSettings,
  clearSyncSettings
} from '@/utils/syncService';
import { Holding, Account } from '@/types/portfolio';

interface SyncSettingsProps {
  opened: boolean;
  onClose: () => void;
  holdings: Holding[];
  accounts: Account[];
  onDataImported: (holdings: Holding[], accounts: Account[]) => void;
}

export function SyncSettings({ 
  opened, 
  onClose, 
  holdings, 
  accounts, 
  onDataImported 
}: SyncSettingsProps) {
  const [activeTab, setActiveTab] = useState<string>('setup');
  const [syncCode, setSyncCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSyncCode, setCurrentSyncCode] = useState<string>('');
  const [autoSync, setAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');

  // 載入同步設置
  useEffect(() => {
    const settings = loadSyncSettings();
    setCurrentSyncCode(settings.syncCode || '');
    setAutoSync(settings.autoSync);
    setLastSync(settings.lastSync || '');
    
    if (settings.syncCode) {
      setActiveTab('manage');
    }
  }, [opened]);

  // 創建新的同步碼
  const handleCreateSync = async () => {
    if (!password || password !== confirmPassword) {
      notifications.show({
        title: '錯誤',
        message: '請輸入相同的密碼',
        color: 'red',
      });
      return;
    }

    if (password.length < 6) {
      notifications.show({
        title: '錯誤',
        message: '密碼至少需要6個字符',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const newSyncCode = await createSyncCode(holdings, accounts, password);
      
      // 保存設置
      saveSyncSettings({
        syncCode: newSyncCode,
        autoSync: true,
        lastSync: new Date().toISOString()
      });

      setCurrentSyncCode(newSyncCode);
      setAutoSync(true);
      setLastSync(new Date().toISOString());
      setActiveTab('manage');

      notifications.show({
        title: '同步碼創建成功',
        message: `您的同步碼是: ${newSyncCode}`,
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: '創建失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // 連接現有同步碼
  const handleConnectSync = async () => {
    if (!syncCode || !password) {
      notifications.show({
        title: '錯誤',
        message: '請輸入同步碼和密碼',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const syncData = await loadFromSyncCode(syncCode.toUpperCase(), password);
      
      // 導入數據
      onDataImported(syncData.holdings, syncData.accounts);

      // 保存設置
      saveSyncSettings({
        syncCode: syncCode.toUpperCase(),
        autoSync: true,
        lastSync: new Date().toISOString()
      });

      setCurrentSyncCode(syncCode.toUpperCase());
      setAutoSync(true);
      setLastSync(new Date().toISOString());
      setActiveTab('manage');

      notifications.show({
        title: '同步成功',
        message: `已從同步碼 ${syncCode.toUpperCase()} 載入數據`,
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: '連接失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // 手動同步
  const handleManualSync = async () => {
    if (!currentSyncCode || !password) {
      notifications.show({
        title: '錯誤',
        message: '請輸入密碼',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await updateSyncCode(currentSyncCode, holdings, accounts, password);
      
      const newLastSync = new Date().toISOString();
      saveSyncSettings({
        syncCode: currentSyncCode,
        autoSync,
        lastSync: newLastSync
      });
      setLastSync(newLastSync);

      notifications.show({
        title: '同步成功',
        message: '數據已上傳到雲端',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: '同步失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // 複製同步碼
  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentSyncCode);
    notifications.show({
      title: '已複製',
      message: '同步碼已複製到剪貼板',
      color: 'blue',
    });
  };

  // 斷開同步
  const handleDisconnect = () => {
    clearSyncSettings();
    setCurrentSyncCode('');
    setAutoSync(false);
    setLastSync('');
    setActiveTab('setup');
    
    notifications.show({
      title: '已斷開同步',
      message: '本地數據已保留，雲端同步已停用',
      color: 'orange',
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <IconCloud size={20} />
          <Text fw={600}>跨瀏覽器同步設置</Text>
        </Group>
      }
      size="lg"
    >
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'setup')}>
        <Tabs.List>
          <Tabs.Tab value="setup" leftSection={<IconSettings size={16} />}>
            設置同步
          </Tabs.Tab>
          {currentSyncCode && (
            <Tabs.Tab value="manage" leftSection={<IconDevices size={16} />}>
              管理同步
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="setup" pt="md">
          <Stack>
            <Alert icon={<IconShield size={16} />} color="blue">
              <Text size="sm">
                <strong>隱私保護：</strong>您的數據使用軍用級 AES-256 加密，
                只有您知道密碼，服務器無法讀取您的數據。
              </Text>
            </Alert>

            <Tabs defaultValue="create">
              <Tabs.List>
                <Tabs.Tab value="create">創建新同步</Tabs.Tab>
                <Tabs.Tab value="connect">連接現有同步</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="create" pt="md">
                <Stack>
                  <Text size="sm" c="dimmed">
                    創建新的同步碼，將當前數據上傳到雲端
                  </Text>
                  
                  <PasswordInput
                    label="設置同步密碼"
                    placeholder="至少6個字符"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  
                  <PasswordInput
                    label="確認密碼"
                    placeholder="再次輸入密碼"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />

                  <Button
                    leftSection={<IconUpload size={16} />}
                    onClick={handleCreateSync}
                    loading={loading}
                    disabled={!password || password !== confirmPassword}
                  >
                    創建同步碼
                  </Button>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="connect" pt="md">
                <Stack>
                  <Text size="sm" c="dimmed">
                    輸入現有的同步碼，從雲端下載數據
                  </Text>
                  
                  <TextInput
                    label="同步碼"
                    placeholder="6位字母數字組合"
                    value={syncCode}
                    onChange={(e) => setSyncCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    required
                  />
                  
                  <PasswordInput
                    label="同步密碼"
                    placeholder="輸入同步密碼"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <Button
                    leftSection={<IconDownload size={16} />}
                    onClick={handleConnectSync}
                    loading={loading}
                    disabled={!syncCode || !password}
                  >
                    連接同步
                  </Button>
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Tabs.Panel>

        {currentSyncCode && (
          <Tabs.Panel value="manage" pt="md">
            <Stack>
              <Card withBorder>
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>同步碼</Text>
                    <Group>
                      <Code>{currentSyncCode}</Code>
                      <Tooltip label="複製同步碼">
                        <ActionIcon 
                          variant="light" 
                          size="sm"
                          onClick={handleCopyCode}
                        >
                          <IconCopy size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </div>
                  <Badge color="green" variant="light">
                    已連接
                  </Badge>
                </Group>
              </Card>

              <Group justify="space-between">
                <div>
                  <Text fw={500}>自動同步</Text>
                  <Text size="sm" c="dimmed">
                    數據變更時自動上傳到雲端
                  </Text>
                </div>
                <Switch
                  checked={autoSync}
                  onChange={(e) => {
                    const newAutoSync = e.target.checked;
                    setAutoSync(newAutoSync);
                    saveSyncSettings({
                      syncCode: currentSyncCode,
                      autoSync: newAutoSync,
                      lastSync
                    });
                  }}
                />
              </Group>

              {lastSync && (
                <Text size="sm" c="dimmed">
                  最後同步：{new Date(lastSync).toLocaleString()}
                </Text>
              )}

              <Divider />

              <Group>
                <PasswordInput
                  placeholder="輸入密碼進行手動同步"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  flex={1}
                />
                <Button
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleManualSync}
                  loading={loading}
                  disabled={!password}
                >
                  手動同步
                </Button>
              </Group>

              <Button
                variant="light"
                color="red"
                onClick={handleDisconnect}
              >
                斷開同步
              </Button>
            </Stack>
          </Tabs.Panel>
        )}
      </Tabs>
    </Modal>
  );
}

