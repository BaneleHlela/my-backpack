const assert = require('node:assert/strict');
const { test } = require('node:test');
const { waitForServerStartup } = require('../apps/mobile/src/lib/serverStartup.ts');

test('an awake server proceeds immediately without a retry delay', async () => {
  await waitForServerStartup(async () => true, () => 0, async () => assert.fail('Unexpected delay'));
});

test('a server waking after a minute succeeds without surfacing an error', async () => {
  let now = 0;
  let attempts = 0;
  await waitForServerStartup(async (timeout) => {
    attempts++;
    now += timeout;
    return now >= 60_000;
  }, () => now, async (ms) => { now += ms; });
  assert.equal(attempts, 4);
  assert.ok(now < 120_000);
});

test('an unreachable server stops at two minutes and a fresh retry can succeed', async () => {
  let now = 0;
  await assert.rejects(waitForServerStartup(async (timeout) => {
    now += timeout;
    return false;
  }, () => now, async (ms) => { now += ms; }), /Check your internet connection and try again/);
  assert.equal(now, 120_000);
  await waitForServerStartup(async () => true);
});

test('immediate network failures are spaced apart and remain bounded', async () => {
  let now = 0;
  let attempts = 0;
  await assert.rejects(waitForServerStartup(async () => {
    attempts++;
    return false;
  }, () => now, async (ms) => { now += ms; }));
  assert.equal(attempts, 40);
  assert.equal(now, 120_000);
});

test('permanent errors are surfaced immediately', async () => {
  const error = new Error('Invalid server configuration');
  await assert.rejects(waitForServerStartup(async () => { throw error; }), (actual) => actual === error);
});
