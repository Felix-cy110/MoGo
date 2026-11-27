import { createBackupApi } from '@mogo/core-shared';
import { createFinanceApi } from '@mogo/personal-finance-core';

export const api = createFinanceApi({ baseUrl: '/api' });
export const backupApi = createBackupApi({ baseUrl: '/api' });
