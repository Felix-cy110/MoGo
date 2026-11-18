import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProfilePayload, createProfileApi, createProfileDraft, genderOptions,
  profileMessages, resolveProfileErrorKey, validateProfileDraft
} from '../src/index.js';

test('all profile fields are optional and blank fields clear persisted values', () => {
  const empty = createProfileDraft();
  assert.equal(validateProfileDraft(empty), null);
  assert.deepEqual(buildProfilePayload(empty), { name: null, gender: null, age: null, country: null, occupation: null });
  assert.equal(createProfileDraft({ age: 0 }).age, '0');
  assert.deepEqual(buildProfilePayload({ name: ' 小明 ', gender: 'OTHER', age: '0', country: ' 中国 ', occupation: ' ' }), {
    name: '小明', gender: 'OTHER', age: 0, country: '中国', occupation: null
  });
});

test('validates optional age, gender and Unicode text consistently', () => {
  const empty = createProfileDraft();
  for (const age of ['0', '150', ' 25 ', '']) assert.equal(validateProfileDraft({ ...empty, age }), null);
  for (const age of ['-1', '151', '1.5', 'abc', 'Infinity', '1e2']) assert.equal(validateProfileDraft({ ...empty, age }), 'profileAgeInvalid');
  for (const gender of genderOptions) assert.equal(validateProfileDraft({ ...empty, gender }), null);
  assert.equal(validateProfileDraft({ ...empty, gender: 'invalid' }), 'profileGenderInvalid');
  for (const field of ['name', 'country', 'occupation']) {
    assert.equal(validateProfileDraft({ ...empty, [field]: '中'.repeat(100) }), null);
    assert.equal(validateProfileDraft({ ...empty, [field]: '中'.repeat(101) }), 'profileTextTooLong');
  }
});

test('profile API uses a single local resource and full replacement for clearing', async () => {
  const calls = [];
  const api = createProfileApi({ baseUrl: '/api', fetchImpl: async (url, options) => {
    calls.push([url, options]);
    return { ok: true, json: async () => ({ name: null }) };
  } });
  await api.getProfile();
  const payload = buildProfilePayload(createProfileDraft());
  await api.saveProfile(payload);
  assert.equal(calls[0][0], '/api/profile');
  assert.equal(calls[1][0], '/api/profile');
  assert.equal(calls[1][1].method, 'PUT');
  assert.deepEqual(JSON.parse(calls[1][1].body), payload);
});

test('profile messages cover both languages, all fields and storage failures', () => {
  assert.deepEqual(Object.keys(profileMessages.zh).sort(), Object.keys(profileMessages.en).sort());
  for (const messages of Object.values(profileMessages)) {
    assert.ok(Object.values(messages).every(message => typeof message === 'string' && message.length > 0));
    for (const code of ['PROFILE_READ_FAILED', 'PROFILE_WRITE_FAILED', 'PROFILE_VERSION_UNSUPPORTED', 'PROFILE_AGE_INVALID', 'PROFILE_TEXT_TOO_LONG']) {
      assert.ok(messages[resolveProfileErrorKey(code)]);
    }
  }
  assert.equal(resolveProfileErrorKey('UNKNOWN'), 'profileSaveFailed');
  assert.equal(resolveProfileErrorKey('UNKNOWN', 'profileLoadFailed'), 'profileLoadFailed');
});
