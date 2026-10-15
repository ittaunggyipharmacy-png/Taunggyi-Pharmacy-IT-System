import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completionPercent } from '../src/utils/taskCompletion';
test('counted photo target and empty logs', () => {
 assert.equal(completionPercent({mkt_photos:1}),0);
 assert.equal(completionPercent({mkt_photos:20, checklist:true}),100);
 assert.equal(completionPercent({}),0);
 assert.equal(completionPercent({checklist:false}),0);
});
