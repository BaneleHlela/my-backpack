// Run with `node --test tests/quiz-regressions.test.cjs` after installing the workspace.
// Exercise the real reducer/thunk and Mongoose validators without a device, API, or database.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const { runInThisContext } = require('node:vm');

const root = path.resolve(__dirname, '..');
const mobileRequire = createRequire(path.join(root, 'apps/mobile/package.json'));
const ts = mobileRequire('typescript');
const { configureStore } = mobileRequire('@reduxjs/toolkit');

function loadSource(relativePath, mocks = {}) {
  const filename = path.join(root, relativePath);
  const localRequire = createRequire(filename);
  const source = readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  const module = { exports: {} };
  const execute = runInThisContext(`(function (require, module, exports) { ${outputText}\n})`, { filename });
  execute((name) => (Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name)), module, module.exports);
  return module.exports;
}

const AnswerRecord = loadSource('apps/api/src/models/learning/answerRecord.model.ts').default;
function answerRecord(overrides = {}) {
  const id = '507f1f77bcf86cd799439011';
  return new AnswerRecord({
    profileId: id,
    questionId: id,
    miniAppId: id,
    sessionId: id,
    responseType: 'text_input',
    rawResponse: 'answer',
    maxPoints: 1,
    pointsAwarded: 0,
    isCorrect: false,
    gradingMethod: 'exact_match',
    timeToAnswerMs: 500,
    confidenceBefore: 0,
    confidenceAfter: 0,
    ...overrides,
  });
}

test('skipped and timed-out answers accept the empty response sent by mobile', async () => {
  for (const flag of ['wasSkipped', 'wasTimedOut']) {
    const record = answerRecord({ rawResponse: '', [flag]: true });
    await record.validate();
    assert.equal(record.rawResponse, '');
  }
});

test('an ordinary answer still requires non-whitespace text', async () => {
  for (const rawResponse of ['', '   ', undefined, null]) {
    await assert.rejects(answerRecord({ rawResponse }).validate(), (error) =>
      Boolean(error.errors.rawResponse)
    );
  }
  await answerRecord({ rawResponse: 'False' }).validate();
});

const question = {
  _id: 'q1',
  type: 'mcq_general',
  maxPoints: 1,
  content: { prompt: 'Choose a letter', correctAnswer: 'A' },
};
const nextQuestion = { ...question, _id: 'q2' };
const success = {
  data: {
    data: {
      answerRecordId: 'answer1',
      isCorrect: true,
      pointsAwarded: 1,
      confidenceAfter: 0,
      sessionComplete: false,
      nextQuestion,
    },
  },
};
const input = { sessionId: 's1', questionId: 'q1', rawResponse: 'A', timeToAnswerMs: 500 };

function quizStore(post) {
  const actions = loadSource('apps/mobile/src/features/quiz/quizSlice.ts', { '../../lib/api': { post } });
  const store = configureStore({ reducer: { quiz: actions.default } });
  store.dispatch(
    actions.startMiniAppQuizSession.fulfilled(
      {
        session: { _id: 's1', questionIds: ['q1', 'q2'], settings: { feedbackMode: 'immediate' } },
        firstQuestion: question,
      },
      'start',
      { miniAppId: 'mini' }
    )
  );
  return { store, actions };
}

test('empty manual submits are ignored without a request or error screen', async () => {
  let calls = 0;
  const { store, actions } = quizStore(async () => {
    calls++;
    return success;
  });
  for (const rawResponse of ['', '   ']) {
    const result = await store.dispatch(actions.submitAnswer({ ...input, rawResponse }));
    assert.equal(result.meta.condition, true);
  }
  assert.equal(calls, 0);
  assert.equal(store.getState().quiz.status, 'active');
  assert.equal(store.getState().quiz.error, null);
});

test('explicit skip posts an empty response and progresses normally', async () => {
  let request;
  const { store, actions } = quizStore(async (_url, body) => {
    request = body;
    return success;
  });
  await store.dispatch(actions.submitAnswer({ ...input, rawResponse: '', wasSkipped: true }));
  assert.equal(request.rawResponse, '');
  assert.equal(request.wasSkipped, true);
  assert.equal(store.getState().quiz.lastAnswer.wasSkipped, true);
  assert.equal(store.getState().quiz.status, 'awaiting_advance');
  store.dispatch(actions.advanceQuestion());
  assert.equal(store.getState().quiz.currentQuestion._id, 'q2');
  assert.equal(store.getState().quiz.status, 'active');
});

test('rapid submit/skip taps only send one request', async () => {
  let calls = 0;
  let finish;
  const { store, actions } = quizStore(() => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const pending = store.dispatch(actions.submitAnswer(input));
  await store.dispatch(actions.submitAnswer(input));
  await store.dispatch(actions.submitAnswer({ ...input, rawResponse: '', wasSkipped: true }));
  assert.equal(calls, 1);
  assert.equal(store.getState().quiz.status, 'submitting');
  finish(success);
  await pending;
  assert.equal(store.getState().quiz.progress.answered, 1);
});

test('a failed answer preserves the question and progress and can be retried', async () => {
  let calls = 0;
  const { store, actions } = quizStore(async () => {
    if (++calls === 1) throw { response: { data: { message: 'Offline' } } };
    return success;
  });
  await store.dispatch(actions.submitAnswer(input));
  assert.equal(store.getState().quiz.status, 'active');
  assert.equal(store.getState().quiz.currentQuestion._id, 'q1');
  assert.equal(store.getState().quiz.progress.answered, 0);
  assert.equal(store.getState().quiz.error, 'Offline');
  await store.dispatch(actions.submitAnswer(input));
  assert.equal(store.getState().quiz.status, 'awaiting_advance');
  assert.equal(store.getState().quiz.error, null);
  assert.equal(store.getState().quiz.progress.answered, 1);
});

test('a stale question or session cannot submit into the current quiz', async () => {
  const { store, actions } = quizStore(() => {
    throw new Error('must not post');
  });
  await store.dispatch(actions.submitAnswer({ ...input, questionId: 'old-question' }));
  await store.dispatch(actions.submitAnswer({ ...input, sessionId: 'old-session' }));
  assert.equal(store.getState().quiz.status, 'active');
  assert.equal(store.getState().quiz.error, null);
});

test('a late response cannot resurrect an abandoned/reset quiz', async () => {
  let finish;
  const { store, actions } = quizStore(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const pending = store.dispatch(actions.submitAnswer(input));
  store.dispatch(actions.resetQuiz());
  finish(success);
  await pending;
  assert.equal(store.getState().quiz.status, 'idle');
  assert.equal(store.getState().quiz.sessionId, null);
  assert.equal(store.getState().quiz.progress.answered, 0);
});

function captureHandler(captureAnswer) {
  return loadSource('apps/api/src/modules/quiz/quiz.controller.ts', {
    '../../utils/AppError': loadSource('apps/api/src/utils/AppError.ts'),
    '../../utils/response': loadSource('apps/api/src/utils/response.ts'),
    '../../services/quizSession.service': { captureAnswer },
    './quiz.service': {},
    './quizHistory.service': {},
    '../../models/learning/quiz.model': {},
  }).captureAnswerHandler;
}

test('a late answer cannot reopen a quiz that is already completing', async () => {
  let finish;
  const { store, actions } = quizStore(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const pending = store.dispatch(actions.submitAnswer(input));
  store.dispatch(actions.completeSession.pending('finish-session', 's1'));
  finish(success);
  await pending;
  assert.equal(store.getState().quiz.status, 'completing');
  assert.equal(store.getState().quiz.lastAnswer, null);
});

test('the API accepts an empty explicit skip through model validation', async () => {
  const handler = captureHandler(async (_sessionId, _profileId, data) => {
    await answerRecord(data).validate();
    return { isCorrect: false, pointsAwarded: 0, sessionComplete: false };
  });
  const req = {
    profile: { _id: 'profile' },
    params: { sessionId: 'session' },
    body: {
      questionId: '507f1f77bcf86cd799439011',
      responseType: 'mcq_selection',
      rawResponse: '',
      timeToAnswerMs: 500,
      wasSkipped: true,
    },
  };
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let error;
  await handler(req, res, (err) => {
    error = err;
  });
  assert.equal(error, undefined);
  assert.equal(res.code, 200);
  assert.equal(res.body.data.pointsAwarded, 0);
});

test('the API rejects malformed or blank ordinary answers before grading', async () => {
  let calls = 0;
  const handler = captureHandler(async () => {
    calls++;
  });
  for (const overrides of [
    { rawResponse: '' },
    { rawResponse: '  ' },
    { rawResponse: null },
    { timeToAnswerMs: -1 },
  ]) {
    const req = {
      profile: { _id: 'profile' },
      params: { sessionId: 'session' },
      body: {
        questionId: 'q1',
        responseType: 'text_input',
        rawResponse: 'A',
        timeToAnswerMs: 500,
        ...overrides,
      },
    };
    let error;
    await handler(req, {}, (err) => {
      error = err;
    });
    assert.equal(error?.statusCode, 400);
  }
  assert.equal(calls, 0);
});
