// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidReply } from '../../src/comment/replyRules.js';

test('isValidReply：主文留言（parentId 為 null）合法', () => {
  assert.equal(isValidReply({ clipId: 'c1', parentId: null }, []), true);
});
