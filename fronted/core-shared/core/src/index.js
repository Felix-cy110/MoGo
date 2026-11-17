export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

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
