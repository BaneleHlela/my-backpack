// Exercise the actual mobile reducer/thunk and route resolver without loading React Native.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';

const root = path.resolve(__dirname, '../../../..');
const mobileRequire = createRequire(path.join(root, 'apps/mobile/package.json'));
const { configureStore } = mobileRequire('@reduxjs/toolkit');
function load(relativePath: string, mocks: Record<string, unknown> = {}) {
  const filename = path.join(root, relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: filename,
  });
  const module = { exports: {} as any };
  runInThisContext(`(function(require,module,exports){${outputText}\n})`, { filename })(
    (name: string) => Object.prototype.hasOwnProperty.call(mocks, name) ? mocks[name] : mobileRequire(name), module, module.exports);
  return module.exports;
}
const requests: (() => void)[] = [];
const { default: reducer, fetchXpSummary } = load('apps/mobile/src/features/xp/xpSlice.ts', {
  '../../lib/api': { get: () => new Promise((resolve) => requests.push(() => resolve({ data: { data: summary('a') } }))) },
});
const { resolveXpScope, scopeXp } = load('apps/mobile/src/features/xp/xpScope.ts');
function summary(profileId: string) { return { profileId, total: 18, subjects: [{ id: 'english', name: 'English', total: 18 }],
  courses: [{ id: 'phonics', name: 'Phonics', total: 18 }], miniApps: [], recent: [] }; }

test('late XP response cannot restore the previous profile after switching', () => {
  let state = reducer(undefined, fetchXpSummary.pending('r1', 'a'));
  state = reducer(state, { type: 'auth/selectProfile/pending' });
  state = reducer(state, fetchXpSummary.pending('r2', 'b'));
  state = reducer(state, fetchXpSummary.fulfilled(summary('a'), 'r1', 'a'));
  assert.equal(state.summary, null);
  state = reducer(state, fetchXpSummary.fulfilled(summary('b'), 'r2', 'b'));
  assert.equal(state.summary.profileId, 'b');
});

test('quiz completion invalidates an older pending XP response', () => {
  let state = reducer(undefined, fetchXpSummary.pending('r1', 'a'));
  state = reducer(state, { type: 'quiz/completeSession/fulfilled' });
  assert.equal(state.revision, 1);
  state = reducer(state, fetchXpSummary.fulfilled(summary('a'), 'r1', 'a'));
  assert.equal(state.summary, null);
  assert.equal(state.fetchedAt, 0);
});

test('logout clears all cached XP and ignores its late request', () => {
  let state = reducer(undefined, fetchXpSummary.pending('r1', 'a'));
  state = reducer(state, { type: 'auth/logoutAsync/pending' });
  state = reducer(state, fetchXpSummary.fulfilled(summary('a'), 'r1', 'a'));
  assert.equal(state.profileId, null);
  assert.equal(state.summary, null);
});

test('fetch thunk rejects wrong-profile calls and shares concurrent requests', async () => {
  const store = configureStore({ reducer: { xp: reducer, auth: () => ({ activeProfile: { _id: 'a' } }) } });
  await store.dispatch(fetchXpSummary('b'));
  assert.equal(requests.length, 0);
  const first = store.dispatch(fetchXpSummary('a'));
  await store.dispatch(fetchXpSummary('a'));
  assert.equal(requests.length, 1);
  requests.shift()!(); await first;
  assert.equal(store.getState().xp.summary.total, 18);
});

test('home, subjects, courses and mini-apps resolve independently; unknown is not zero', () => {
  const content = { enrolledSubjects: { fields: [{ subjects: [{ subject: { _id: 'english', slug: 'english', name: 'English' } }] }] },
    coursesByKey: { english: [{ _id: 'phonics', subjectId: 'english', slug: 'phonics', name: 'Phonics' }] },
    courseDetailByKey: {}, miniAppsBySubject: { english: [{ _id: 'dict', name: 'Dictionary' }] } };
  const cases = [ [{}, 'total', 18], [{ subjectSlug: 'english' }, 'subject', 18],
    [{ subjectSlug: 'english', courseSlug: 'phonics' }, 'course', 18],
    [{ miniAppId: 'phonics' }, 'course', 18], [{ miniAppId: 'dict' }, 'miniApp', 0] ] as const;
  for (const [params, type, value] of cases) {
    const scope = resolveXpScope(params, content, summary('a'));
    assert.equal(scope.type, type);
    assert.equal(scopeXp(summary('a'), scope), value);
  }
  assert.equal(scopeXp(null, { type: 'total' }), null);
  assert.equal(scopeXp(summary('a'), { type: 'course' }), null);
});

const { calculateXp } = load('apps/api/src/modules/xp/xp.rules.ts');
test('exact bonus thresholds, fractional credit, empty scores and one rounding step', () => {
  const award = (earned: number, available = 100) => calculateXp({ earned, available, completed: true, allQuestionsRecorded: true, recordedQuestionCount: 10 });
  for (const [earned, rate] of [[74.6, 0], [75, .1], [89.6, .1], [90, .2], [99.6, .2], [100, .25]]) {
    assert.equal(award(earned).bonusRate, rate);
  }
  assert.equal(award(16, 20).total, 18);
  assert.equal(award(7.5, 10).total, 8.5);
  assert.equal(award(0, 0).total, 0);
});
test('all special modes, timed quizzes, early completion and abandonment award base only', () => {
  const input = { earned: 20, available: 20, completed: true, allQuestionsRecorded: true, recordedQuestionCount: 10 };
  for (const playModeId of ['hearts', 'time_run', 'mastery', 'endless', 'perfect', 'survival', 'streak']) {
    assert.equal(calculateXp({ ...input, playModeId }).total, 20);
  }
  assert.equal(calculateXp({ ...input, timeLimit: 60 }).total, 20);
  assert.equal(calculateXp({ ...input, allQuestionsRecorded: false }).total, 20);
  assert.equal(calculateXp({ ...input, completed: false }).total, 20);
  assert.equal(calculateXp({ ...input, playModeId: 'classic' }).total, 25);
});


test('bonus requires ten recorded questions, even for a perfect score', () => {
  const input = { earned: 100, available: 100, completed: true, allQuestionsRecorded: true };
  for (const recordedQuestionCount of [0, 1, 9]) {
    const result = calculateXp({ ...input, recordedQuestionCount });
    assert.equal(result.bonus, 0);
    assert.equal(result.bonusReason, 'too-few-questions');
  }
  for (const recordedQuestionCount of [10, 11]) {
    assert.equal(calculateXp({ ...input, recordedQuestionCount }).bonus, 25);
  }
});
