// Real JWTs, auth services/controllers, Redux thunks and axios interceptors;
// only storage/network/database boundaries are mocked. No live credentials needed.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const { runInThisContext } = require('node:vm');
const root = path.resolve(__dirname, '..');
const mobileRequire = createRequire(path.join(root, 'apps/mobile/package.json'));
const apiRequire = createRequire(path.join(root, 'apps/api/package.json'));
const ts = mobileRequire('typescript');
const axios = mobileRequire('axios');
const jwt = apiRequire('jsonwebtoken');
const { configureStore } = mobileRequire('@reduxjs/toolkit');

function loadSource(relativePath, mocks = {}) {
  const filename = path.join(root, relativePath);
  const localRequire = createRequire(filename);
  const source = readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_URL', "'https://api.example.test/api'");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  });
  const module = { exports: {} };
  const execute = runInThisContext(`(function (require, module, exports) { ${outputText}\n})`, { filename });
  execute((name) => Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name), module, module.exports);
  return module.exports;
}

process.env.ACCESS_TOKEN_SECRET = 'test-only-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-only-refresh-secret';
const tokens = loadSource('apps/api/src/utils/jwt.ts');
const errors = loadSource('apps/api/src/utils/AppError.ts');
const account = { _id: 'account', activeProfile: 'profile', profiles: ['profile', 'other-profile'] };
function authService(findAccount = async () => account) {
  return loadSource('apps/api/src/modules/auth/auth.service.ts', {
    '../../utils/jwt': tokens,
    '../../utils/AppError': errors,
    '../../utils/email': {},
    '../vocab/bucket.service': {},
    '../../models/core/account.model': { findById: findAccount },
    '../../models/core/profile.model': { findById: async (id) => ({ _id: id, ageGroup: 'teen' }) },
  });
}
const DAY = 24 * 60 * 60 * 1000;

test('daily use renews login beyond the original seven days, then seven idle days expire it', async (t) => {
  let now = Date.UTC(2026, 8, 1);
  t.mock.method(Date, 'now', () => now);
  const service = authService();
  let refreshToken = tokens.signRefreshToken({ accountId: 'account' });
  const original = refreshToken;
  for (let day = 1; day <= 30; day++) {
    now += DAY;
    const renewed = await service.refreshAccessToken(refreshToken);
    assert.equal(jwt.decode(renewed.refreshToken).exp, now / 1000 + 7 * DAY / 1000);
    assert.equal(jwt.decode(renewed.accessToken).profileId, 'profile');
    refreshToken = renewed.refreshToken;
  }
  await assert.rejects(service.refreshAccessToken(original), { statusCode: 401 });
  now += 7 * DAY - 1000;
  assert.doesNotThrow(() => tokens.verifyRefreshToken(refreshToken));
  now += 1000;
  await assert.rejects(service.refreshAccessToken(refreshToken), { statusCode: 401 });
});

test('refresh keeps the current device profile and rejects forged or cross-account hints', async (t) => {
  let now = Date.UTC(2026, 8, 1);
  t.mock.method(Date, 'now', () => now);
  const refresh = tokens.signRefreshToken({ accountId: 'account' });
  const hint = tokens.signFullToken({ accountId: 'account', profileId: 'other-profile', ageGroup: 'teen' });
  const foreign = tokens.signFullToken({ accountId: 'foreign', profileId: 'other-profile', ageGroup: 'teen' });
  now += 2 * DAY; // Even a development access token has expired.
  assert.throws(() => tokens.verifyAccessToken(hint));
  const renewed = await authService().refreshAccessToken(refresh, hint);
  assert.equal(jwt.decode(renewed.accessToken).profileId, 'other-profile');
  await assert.rejects(authService().refreshAccessToken(refresh, foreign), { statusCode: 401 });
  await assert.rejects(authService().refreshAccessToken(refresh, 'forged'), { statusCode: 401 });
  await assert.rejects(authService().refreshAccessToken('forged'), { statusCode: 401 });
});

function controller(service) {
  return loadSource('apps/api/src/modules/auth/auth.controller.ts', {
    './auth.service': service,
    '../../utils/AppError': errors,
    '../../utils/response': loadSource('apps/api/src/utils/response.ts'),
    '../../utils/jwt': tokens,
  });
}
function response() {
  return {
    cookie(name, value, options) { this.cookieValue = { name, value, options }; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    redirect(url) { this.redirectUrl = url; },
  };
}

test('web gets a renewed private cookie; native also gets the renewed token in its body', async () => {
  const handlers = controller(authService());
  for (const native of [false, true]) {
    const token = tokens.signRefreshToken({ accountId: 'account' });
    const req = { headers: native ? { 'x-client-type': 'mobile' } : {}, body: native ? { refreshToken: token } : {}, cookies: { refreshToken: token } };
    const res = response();
    let error;
    await handlers.refresh(req, res, (err) => { error = err; });
    assert.equal(error, undefined);
    assert.equal(res.cookieValue.options.httpOnly, true);
    assert.equal(res.cookieValue.options.maxAge, 7 * DAY);
    assert.equal(res.cookieValue.options.sameSite, 'strict');
    assert.equal(Boolean(res.body.data.refreshToken), native);
    if (native) assert.equal(res.cookieValue.value, res.body.data.refreshToken);
  }
});

test('database outages are not mislabeled as expired login credentials', async () => {
  const outage = new Error('Database unavailable');
  const handler = controller(authService(async () => { throw outage; })).refresh;
  let error;
  const res = response();
  await handler({ headers: {}, body: { refreshToken: tokens.signRefreshToken({ accountId: 'account' }) } }, res, (err) => { error = err; });
  assert.equal(error, outage);
  assert.equal(res.cookieValue, undefined);
  await assert.rejects(authService(async () => null).refreshAccessToken(tokens.signRefreshToken({ accountId: 'account' })), { statusCode: 401 });
});

test('OAuth login receives a refresh cookie too', async () => {
  const handler = controller({ getProfilesForAccount: async () => [] }).handleOAuthCallback;
  const res = response();
  await handler(account, res);
  assert.equal(tokens.verifyRefreshToken(res.cookieValue.value).accountId, 'account');
  assert.equal(res.cookieValue.options.maxAge, 7 * DAY);
  assert.ok(res.redirectUrl.includes('/auth/callback?'));
});

const shared = loadSource('packages/shared/utils/sessionRefresh.ts');
const tick = () => new Promise((resolve) => setImmediate(resolve));
function httpError(status, config) {
  return new axios.AxiosError('Request failed', undefined, config, undefined,
    status === undefined ? undefined : { status, data: {}, headers: {}, config });
}

function client(platform, initialSaved = 'original-refresh') {
  const native = platform === 'mobile';
  let saved = initialSaved;
  let impl;
  let refreshCalls = 0;
  const requests = [];
  const storage = {
    getRefreshToken: async () => saved,
    saveRefreshToken: async (token) => { saved = token; },
    deleteRefreshToken: async () => { saved = null; },
  };
  const appState = { currentState: 'active' };
  global.document = { visibilityState: 'visible' };
  let refreshHandler = async () => ({ data: { data: { accessToken: 'renewed-access', refreshToken: 'renewed-refresh' } } });
  let requestHandler = async (config) => ({ data: { success: true, data: config.url === '/profiles' ? [] : { _id: 'profile' } }, status: 200, headers: {}, config });
  const axiosMock = {
    ...axios,
    post: async (...args) => { refreshCalls++; return refreshHandler(...args); },
    create: (config) => axios.create({ ...config, adapter: async (request) => { requests.push(request); return requestHandler(request); } }),
  };
  const proxy = {
    __esModule: true,
    default: { post: (...args) => impl.default.post(...args), get: (...args) => impl.default.get(...args) },
    refreshSession: (...args) => impl.refreshSession(...args),
    finishPendingRefresh: () => impl.finishPendingRefresh(),
  };
  const actions = loadSource(`apps/${platform}/src/features/auth/authSlice.ts`, {
    [native ? '../../lib/api' : '../../lib/axios']: proxy,
    '../../lib/secureStore': storage,
  });
  const store = configureStore({ reducer: { auth: actions.default } });
  impl = loadSource(`apps/${platform}/src/lib/${native ? 'api' : 'axios'}.ts`, {
    axios: axiosMock,
    '@my-backpack/shared': shared,
    '../features/auth/authSlice': actions,
    './secureStore': storage,
    'react-native': { AppState: appState },
  });
  impl.injectStore(store);
  function authenticate() {
    if (native) store.dispatch(actions.setSessionTokens({ accessToken: 'original-access', refreshToken: 'original-refresh' }));
    else store.dispatch(actions.setAccessToken('original-access'));
    store.dispatch((native ? actions.bootstrapAuth : actions.checkAuth).fulfilled(true, 'init'));
  }
  return {
    ...impl, actions, store, storage, appState, requests, authenticate,
    bootstrap: () => store.dispatch(native ? actions.bootstrapAuth() : actions.checkAuth()),
    saved: () => saved,
    calls: () => refreshCalls,
    onRefresh: (handler) => { refreshHandler = handler; },
    onRequest: (handler) => { requestHandler = handler; },
  };
}

for (const platform of ['mobile', 'web']) {
  test(`${platform}: startup renews the login before loading profile data`, async () => {
    const c = client(platform);
    const result = await c.bootstrap();
    assert.equal(result.meta.requestStatus, 'fulfilled');
    assert.equal(c.store.getState().auth.accessToken, 'renewed-access');
    assert.equal(c.store.getState().auth.isAuthenticated, true);
    if (platform === 'mobile') {
      assert.equal(c.saved(), 'renewed-refresh');
      assert.equal(c.store.getState().auth.refreshToken, 'renewed-refresh');
      assert.ok(c.requests.every((r) => r.headers.Authorization === 'Bearer renewed-access'));
    }
  });

  test(`${platform}: offline startup keeps the saved login and can retry`, async () => {
    const c = client(platform);
    c.onRefresh(async () => { throw httpError(undefined); });
    await c.bootstrap();
    assert.ok(c.store.getState().auth.bootstrapError);
    assert.equal(c.saved(), 'original-refresh');
    c.onRefresh(async () => ({ data: { data: { accessToken: 'new', refreshToken: 'new-refresh' } } }));
    await c.bootstrap();
    assert.equal(c.store.getState().auth.bootstrapError, null);
    assert.equal(c.store.getState().auth.isAuthenticated, true);
  });

  test(`${platform}: transient refresh failures preserve auth; a refresh 401 clears it`, async () => {
    for (const status of [undefined, 429, 500, 503, 401]) {
      const c = client(platform);
      c.authenticate();
      c.onRefresh(async () => { throw httpError(status); });
      await assert.rejects(c.refreshSession());
      assert.equal(c.store.getState().auth.isAuthenticated, status !== 401);
      if (platform === 'mobile') assert.equal(c.saved(), status === 401 ? null : 'original-refresh');
    }
  });

  test(`${platform}: concurrent expired requests refresh once and retry with the renewed token`, async () => {
    const c = client(platform);
    c.authenticate();
    // Automatic foreground activity and simultaneous 401s use the same renewal.
    let finish;
    c.onRefresh(() => new Promise((resolve) => { finish = resolve; }));
    c.onRequest(async (config) => {
      if (config.headers.Authorization !== 'Bearer new') throw httpError(401, config);
      return { data: {}, status: 200, headers: {}, config };
    });
    const requests = Promise.all([c.default.get('/one'), c.default.get('/two')]);
    await tick();
    assert.equal(c.calls(), 1);
    finish({ data: { data: { accessToken: 'new', refreshToken: 'new-refresh' } } });
    await requests;
    assert.equal(c.calls(), 1);
    assert.equal(c.requests.length, 4);
  });

  test(`${platform}: activity is throttled and background/idle time does not renew`, async (t) => {
    let now = 0;
    t.mock.method(Date, 'now', () => now);
    const c = client(platform);
    c.authenticate();
    c.noteSessionActivity();
    c.noteSessionActivity();
    await c.finishPendingRefresh();
    assert.equal(c.calls(), 1);
    now += 30_000;
    c.noteSessionActivity();
    assert.equal(c.calls(), 1);
    now += 60_000;
    c.appState.currentState = 'background';
    document.visibilityState = 'hidden';
    c.noteSessionActivity();
    await tick();
    assert.equal(c.calls(), 1);
    now += DAY;
    await tick();
    assert.equal(c.calls(), 1); // No automatic keep-alive timer.
    c.appState.currentState = 'active';
    document.visibilityState = 'visible';
    c.noteSessionActivity();
    await c.finishPendingRefresh();
    assert.equal(c.calls(), 2);
  });

  test(`${platform}: logout waits for an outstanding renewal and cannot be undone by its response`, async () => {
    const c = client(platform);
    c.authenticate();
    let finish;
    c.onRefresh(() => new Promise((resolve) => { finish = resolve; }));
    const refreshing = c.refreshSession();
    const rejected = assert.rejects(refreshing, (error) => axios.isCancel(error));
    await tick();
    const loggingOut = c.store.dispatch(c.actions.logoutAsync());
    assert.equal(c.store.getState().auth.isSigningOut, true);
    assert.equal(c.requests.length, 0);
    finish({ data: { data: { accessToken: 'late-access', refreshToken: 'late-refresh' } } });
    await rejected;
    await loggingOut;
    assert.equal(c.store.getState().auth.accessToken, null);
    assert.equal(c.requests.at(-1).url, '/auth/logout');
    if (platform === 'mobile') assert.equal(c.saved(), null);
  });

  test(`${platform}: a bad password is not retried through token refresh`, async () => {
    const c = client(platform);
    c.authenticate();
    c.onRequest(async (config) => { throw httpError(401, config); });
    await assert.rejects(c.default.post('/auth/login', { email: 'test@example.test', password: 'wrong' }));
    assert.equal(c.calls(), 0);
  });
}

test('native guest signup stores the refresh token in memory as well as SecureStore', async () => {
  const c = client('mobile', null);
  c.onRequest(async (config) => ({ status: 201, headers: {}, config, data: { data: { accessToken: 'guest-access', refreshToken: 'guest-refresh', profile: {} } } }));
  await c.store.dispatch(c.actions.continueAsGuest());
  assert.equal(c.saved(), 'guest-refresh');
  assert.equal(c.store.getState().auth.refreshToken, 'guest-refresh');
  assert.equal(c.store.getState().auth.isAuthenticated, true);
});
