import { createJsonRequest } from '@mogo/core-shared';

export const createProfileApi = (options = {}) => {
  const request = createJsonRequest(options);
  return Object.freeze({
    getProfile: () => request('/profile'),
    saveProfile: (profile) => request('/profile', { method: 'PUT', body: JSON.stringify(profile) })
  });
};
