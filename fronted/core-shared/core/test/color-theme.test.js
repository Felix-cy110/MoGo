import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COLOR_THEME,
  getNextColorThemeBoundary,
  getScheduledColorTheme,
  isColorThemeOverrideActive,
  resolveColorThemePreference
} from '../src/index.js';

const localDate = (year, month, day, hour, minute = 0, second = 0) =>
  new Date(year, month - 1, day, hour, minute, second);

test('scheduled color theme changes at 08:00 and 18:00 local time', () => {
  assert.equal(getScheduledColorTheme(localDate(2026, 11, 25, 7, 59, 59)), COLOR_THEME.DARK);
  assert.equal(getScheduledColorTheme(localDate(2026, 11, 25, 8)), COLOR_THEME.LIGHT);
  assert.equal(getScheduledColorTheme(localDate(2026, 11, 25, 17, 59, 59)), COLOR_THEME.LIGHT);
  assert.equal(getScheduledColorTheme(localDate(2026, 11, 25, 18)), COLOR_THEME.DARK);
});

test('next color theme boundary uses local calendar boundaries', () => {
  assert.deepEqual(
    getNextColorThemeBoundary(localDate(2026, 11, 25, 7, 59, 59)),
    localDate(2026, 11, 25, 8)
  );
  assert.deepEqual(
    getNextColorThemeBoundary(localDate(2026, 11, 25, 8)),
    localDate(2026, 11, 25, 18)
  );
  assert.deepEqual(
    getNextColorThemeBoundary(localDate(2026, 12, 31, 18)),
    localDate(2027, 1, 1, 8)
  );
});

test('manual color theme override remains active only before its boundary', () => {
  const boundary = localDate(2026, 11, 25, 18).getTime();
  assert.equal(isColorThemeOverrideActive(boundary, localDate(2026, 11, 25, 17, 59, 59)), true);
  assert.equal(isColorThemeOverrideActive(boundary, localDate(2026, 11, 25, 18)), false);
});

test('legacy manual preference is retained until the next boundary', () => {
  const now = localDate(2026, 11, 25, 10);
  assert.deepEqual(resolveColorThemePreference({ storedTheme: COLOR_THEME.DARK, now }), {
    theme: COLOR_THEME.DARK,
    overrideUntil: localDate(2026, 11, 25, 18).getTime(),
    shouldPersistOverride: true,
    shouldClearOverride: false
  });
});

test('expired manual preference resolves to the scheduled theme', () => {
  const now = localDate(2026, 11, 25, 18);
  assert.deepEqual(resolveColorThemePreference({
    storedTheme: COLOR_THEME.LIGHT,
    storedOverrideUntil: localDate(2026, 11, 25, 18).getTime(),
    now
  }), {
    theme: COLOR_THEME.DARK,
    overrideUntil: null,
    shouldPersistOverride: false,
    shouldClearOverride: true
  });
});
