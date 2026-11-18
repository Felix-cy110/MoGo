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
