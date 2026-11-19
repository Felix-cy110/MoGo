import test from 'node:test';
import assert from 'node:assert/strict';
import { leetcodeInterviewMessages } from '../src/index.js';

test('keeps LeetCode interview messages aligned across supported languages', () => {
  assert.deepEqual(
    Object.keys(leetcodeInterviewMessages.zh).sort(),
    Object.keys(leetcodeInterviewMessages.en).sort()
  );
  for (const messages of Object.values(leetcodeInterviewMessages)) {
    assert.ok(Object.values(messages).every(message => typeof message === 'string' && message.length > 0));
  }
});
