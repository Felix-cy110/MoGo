import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, BACKUP_CONFLICT_POLICY, backupErrorKey, createBackupApi, createJsonRequest, settingsMessages } from '../src/index.js';

test('shares injected HTTP transport without platform dependencies', async () => {
  const request = createJsonRequest({ baseUrl: '/api/', fetchImpl: async (url, options) => {
    assert.equal(url, '/api/profile');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.equal(options.headers['X-Test'], 'test');
    return { ok: true, json: async () => ({ name: 'Test' }) };
  } });
  assert.deepEqual(await request('/profile', { headers: { 'X-Test': 'test' } }), { name: 'Test' });
});

test('keeps structured business errors and tolerates non-JSON error bodies', async () => {
  for (const json of [async () => ({ code: 'CATEGORY_NAME_EXISTS', message: 'Duplicate' }), async () => { throw new Error(); }]) {
    const request = createJsonRequest({ fetchImpl: async () => ({ ok: false, status: 409, json }) });
    await assert.rejects(request('/test'), error => error instanceof ApiError && error.status === 409 && Boolean(error.code));
  }
});

test('shares settings messages across platforms and languages', () => {
  assert.deepEqual(Object.keys(settingsMessages.zh).sort(), Object.keys(settingsMessages.en).sort());
  assert.equal(settingsMessages.zh.settings, '设置');
  assert.equal(settingsMessages.en.settings, 'Settings');
});

test('backup api sends encrypted export and import commands', async () => {
  const calls = [];
  const api = createBackupApi({
    baseUrl: '/api',
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return { ok: true, json: async () => ({}) };
    },
  });
  await api.exportData('password');
  await api.importData({
    content: 'MOGO-BACKUP/1',
    password: 'password',
    conflictPolicy: BACKUP_CONFLICT_POLICY.OVERWRITE,
  });
  assert.equal(calls[0][0], '/api/backup/export');
  assert.deepEqual(JSON.parse(calls[1][1].body), {
    content: 'MOGO-BACKUP/1',
    password: 'password',
    conflictPolicy: 'OVERWRITE',
  });
  assert.equal(backupErrorKey({ code: 'BACKUP_DECRYPT_FAILED' }), 'backupDecryptFailed');
});
