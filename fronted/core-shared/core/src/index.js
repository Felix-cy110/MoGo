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
    settingsDescription: '调整语言和界面外观',
    appearance: '界面外观',
    settingsBack: '返回上一页'
  }),
  en: Object.freeze({
    settings: 'Settings',
    settingsDescription: 'Choose the language and appearance',
    appearance: 'Appearance',
    settingsBack: 'Back'
  })
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
