// 帳戶配置工具函數

interface AccountConfig {
  id: string;
  label: string;
  isCustom: boolean;
}

// 預設帳戶配置
const DEFAULT_ACCOUNT_CONFIGS: AccountConfig[] = [
  { id: 'etrade', label: 'Etrade', isCustom: false },
  { id: 'fubon', label: '富邦銀行', isCustom: false },
  { id: 'esun', label: '玉山銀行', isCustom: false },
  { id: 'account4', label: '帳號4', isCustom: true },
  { id: 'account5', label: '帳號5', isCustom: true },
];

/**
 * 從 localStorage 載入帳戶配置
 * @returns 帳戶配置陣列
 */
export function loadAccountConfigs(): AccountConfig[] {
  // 檢查是否在客戶端環境
  if (typeof window === 'undefined') {
    return DEFAULT_ACCOUNT_CONFIGS;
  }
  
  try {
    const saved = localStorage.getItem('portfolioAccountConfigs');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('載入帳戶配置失敗:', error);
  }
  return DEFAULT_ACCOUNT_CONFIGS;
}

/**
 * 取得帳戶名稱對應表
 * @returns { [accountId: string]: accountLabel }
 */
export function getAccountLabels(): { [key: string]: string } {
  const configs = loadAccountConfigs();
  const labels: { [key: string]: string } = {};
  
  configs.forEach(config => {
    labels[config.id] = config.label;
  });
  
  return labels;
}

/**
 * 根據帳戶ID取得帳戶名稱
 * @param accountId 帳戶ID
 * @returns 帳戶名稱，如果找不到則返回原ID
 */
export function getAccountLabel(accountId: string): string {
  const labels = getAccountLabels();
  return labels[accountId] || accountId;
}

/**
 * 取得帳戶選項（用於下拉選單）
 * @returns 帳戶選項陣列 [{ value, label }]
 */
export function getAccountOptions(): Array<{ value: string; label: string }> {
  const configs = loadAccountConfigs();
  return configs.map(config => ({
    value: config.id,
    label: config.label,
  }));
}
