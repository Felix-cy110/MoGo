export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export const settingsMessages = Object.freeze({
  zh: Object.freeze({
    settings: '设置',
    settingsDescription: '调整语言、界面外观和本地数据',
    appearance: '界面外观',
    settingsBack: '返回上一页',
    dataManagement: '数据管理',
    dataBackupDescription: '导出文件包含 SQLite 和个人资料 JSON，并使用密码加密。',
    exportData: '导出数据',
    importData: '导入数据',
    exportBackupTitle: '导出加密备份',
    importBackupTitle: '导入加密备份',
    backupPassword: '备份密码',
    backupPasswordConfirm: '确认密码',
    backupPasswordHint: '至少 8 个字符。请妥善保存，密码无法找回。',
    backupFile: '备份文件',
    chooseBackupFile: '选择备份文件',
    conflictPolicy: '冲突处理',
    overwriteExistingData: '覆盖原有数据',
    keepExistingData: '原有数据保持',
    keepExistingDataHint: '保留已经存在的本地文件，只导入缺失的数据文件。',
    confirmExport: '确认导出',
    confirmImport: '确认导入',
    cancel: '取消',
    confirm: '确定',
    backupExported: '数据已加密导出',
    backupImported: '数据已导入',
    backupKeptExisting: '已保留原有数据',
    backupPasswordTooShort: '密码至少需要 8 个字符',
    backupPasswordMismatch: '两次输入的密码不一致',
    backupFileRequired: '请选择 .mogo 备份文件',
    backupFileTooLarge: '备份文件过大，无法导入',
    backupDecryptFailed: '密码错误或备份文件已损坏',
    backupExportFailed: '数据导出失败',
    backupRestoreFailed: '数据导入失败，原有数据未被修改',
    backupInvalid: '无法识别这个备份文件'
  }),
  en: Object.freeze({
    settings: 'Settings',
    settingsDescription: 'Choose the language, appearance, and local data options',
    appearance: 'Appearance',
    settingsBack: 'Back',
    dataManagement: 'Data management',
    dataBackupDescription: 'The export contains SQLite and profile JSON data, encrypted with your password.',
    exportData: 'Export data',
    importData: 'Import data',
    exportBackupTitle: 'Export encrypted backup',
    importBackupTitle: 'Import encrypted backup',
    backupPassword: 'Backup password',
    backupPasswordConfirm: 'Confirm password',
    backupPasswordHint: 'Use at least 8 characters. The password cannot be recovered.',
    backupFile: 'Backup file',
    chooseBackupFile: 'Choose backup file',
    conflictPolicy: 'Conflict handling',
    overwriteExistingData: 'Overwrite existing data',
    keepExistingData: 'Keep existing data',
    keepExistingDataHint: 'Keep local files that already exist and import only missing data files.',
    confirmExport: 'Export',
    confirmImport: 'Import',
    cancel: 'Cancel',
    confirm: 'OK',
    backupExported: 'Encrypted data exported',
    backupImported: 'Data imported',
    backupKeptExisting: 'Existing data kept',
    backupPasswordTooShort: 'Password must contain at least 8 characters',
    backupPasswordMismatch: 'Passwords do not match',
    backupFileRequired: 'Choose a .mogo backup file',
    backupFileTooLarge: 'The backup file is too large to import',
    backupDecryptFailed: 'The password is incorrect or the backup is damaged',
    backupExportFailed: 'Could not export data',
    backupRestoreFailed: 'Could not import data. Existing data was not changed',
    backupInvalid: 'This backup file is not supported'
  })
});

export const BACKUP_CONFLICT_POLICY = Object.freeze({
  OVERWRITE: 'OVERWRITE',
  KEEP_EXISTING: 'KEEP_EXISTING',
});

export const createJsonRequest = ({ baseUrl = '', fetchImpl = globalThis.fetch } = {}) => {
  if (!fetchImpl) throw new Error('fetchImpl is required');
  return async (path, options = {}) => {
    const url = `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    const response = await fetchImpl(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(body.code || 'REQUEST_FAILED', body.message || 'Request failed', response.status);
    }
    return response.json();
  };
};

export const createBackupApi = (options = {}) => {
  const request = createJsonRequest(options);
  return Object.freeze({
    exportData: password => request('backup/export', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
    importData: ({ content, password, conflictPolicy }) => request('backup/import', {
      method: 'POST',
      body: JSON.stringify({ content, password, conflictPolicy }),
    }),
  });
};

export const backupErrorKey = (error, fallback = 'backupRestoreFailed') => ({
  BACKUP_PASSWORD_INVALID: 'backupPasswordTooShort',
  BACKUP_DECRYPT_FAILED: 'backupDecryptFailed',
  BACKUP_EXPORT_FAILED: 'backupExportFailed',
  BACKUP_RESTORE_FAILED: 'backupRestoreFailed',
  BACKUP_INVALID: 'backupInvalid',
}[error?.code] || fallback);

export const createClientRequestId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const COLOR_THEME = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark'
});

const isManualColorTheme = theme => theme === COLOR_THEME.LIGHT || theme === COLOR_THEME.DARK;

export const getScheduledColorTheme = (now = new Date()) => {
  const hour = now.getHours();
  return hour >= 18 || hour < 8 ? COLOR_THEME.DARK : COLOR_THEME.LIGHT;
};

export const getNextColorThemeBoundary = (now = new Date()) => {
  const boundary = new Date(now.getTime());
  const hour = now.getHours();

  if (hour < 8) {
    boundary.setHours(8, 0, 0, 0);
  } else if (hour < 18) {
    boundary.setHours(18, 0, 0, 0);
  } else {
    boundary.setDate(boundary.getDate() + 1);
    boundary.setHours(8, 0, 0, 0);
  }

  return boundary;
};

export const isColorThemeOverrideActive = (overrideUntil, now = new Date()) => {
  const timestamp = Number(overrideUntil);
  return Number.isFinite(timestamp) && timestamp > now.getTime();
};

export const resolveColorThemePreference = ({
  storedTheme,
  storedOverrideUntil,
  now = new Date()
} = {}) => {
  if (!isManualColorTheme(storedTheme)) {
    return {
      theme: getScheduledColorTheme(now),
      overrideUntil: null,
      shouldPersistOverride: false,
      shouldClearOverride: storedTheme != null || storedOverrideUntil != null
    };
  }

  if (storedOverrideUntil == null) {
    return {
      theme: storedTheme,
      overrideUntil: getNextColorThemeBoundary(now).getTime(),
      shouldPersistOverride: true,
      shouldClearOverride: false
    };
  }

  if (isColorThemeOverrideActive(storedOverrideUntil, now)) {
    return {
      theme: storedTheme,
      overrideUntil: Number(storedOverrideUntil),
      shouldPersistOverride: false,
      shouldClearOverride: false
    };
  }

  return {
    theme: getScheduledColorTheme(now),
    overrideUntil: null,
    shouldPersistOverride: false,
    shouldClearOverride: true
  };
};
