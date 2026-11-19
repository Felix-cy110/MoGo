import { createNativeApis } from '../src/services/nativeApi';

test('native adapter keeps shared Hook method contracts without fetch', async () => {
  const bridge = {
    execute: jest.fn(async () =>
      JSON.stringify({ ok: true, data: { saved: true } }),
    ),
  };
  const apis = createNativeApis(bridge);
  await apis.finance.saveBudget('2026-11-19', 20000);
  expect(bridge.execute).toHaveBeenLastCalledWith(
    'finance.saveBudget',
    '{"date":"2026-11-19","amountCents":20000}',
  );
  await apis.finance.updateExpense(7, {
    amountCents: 2000,
    categoryId: 3,
    note: null,
  });
  expect(bridge.execute).toHaveBeenLastCalledWith(
    'finance.updateExpense',
    '{"amountCents":2000,"categoryId":3,"note":null,"id":7}',
  );
  await apis.profile.saveProfile({ name: null, monthlyIncomeCents: 123456 });
  expect(bridge.execute).toHaveBeenLastCalledWith(
    'profile.saveProfile',
    '{"name":null,"monthlyIncomeCents":123456}',
  );
});

test('native errors preserve codes for shared modal feedback', async () => {
  const apis = createNativeApis({
    execute: async () =>
      '{"ok":false,"code":"CATEGORY_NAME_EXISTS","status":409}',
  });
  await expect(
    apis.finance.addCategory({ name: '餐饮' }),
  ).rejects.toMatchObject({ code: 'CATEGORY_NAME_EXISTS', status: 409 });
});

test('missing native module does not silently use HTTP', async () => {
  await expect(createNativeApis(null).capabilities()).rejects.toMatchObject({
    code: 'NATIVE_UNAVAILABLE',
  });
});
