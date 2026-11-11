// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidReply } from '../../src/comment/replyRules.js';

test('isValidReply：主文留言（parentId 為 null）合法', () => {
  assert.equal(isValidReply({ clipId: 'c1', parentId: null }, []), true);
});

test('isValidReply：parentId 指向其他片段的留言時不合法', () => {
  const existing = [{ id: 'm1', clipId: 'c2', parentId: null }];
  assert.equal(isValidReply({ clipId: 'c1', parentId: 'm1' }, existing), false);
});

test('isValidReply：parentId 指向同一片段的留言時合法', () => {
  const existing = [{ id: 'm1', clipId: 'c1', parentId: null }];
  assert.equal(isValidReply({ clipId: 'c1', parentId: 'm1' }, existing), true);
});

test('isValidReply：parentId 指向不存在的留言時不合法', () => {
  const existing = [{ id: 'm1', clipId: 'c1', parentId: null }];
  assert.equal(isValidReply({ clipId: 'c1', parentId: 'nope' }, existing), false);
});
