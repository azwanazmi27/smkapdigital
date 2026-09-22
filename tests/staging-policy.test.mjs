import test from 'node:test';
import assert from 'node:assert/strict';
import { stagingBlock, stagingDocumentActionAllowed } from '../worker/staging-policy.ts';

test('staging blocks jobs, external workflows and unknown APIs for every method', async () => {
  for (const path of ['/api/absence-summary-job', '/api/push', '/api/drive', '/api/etempahan', '/api/unknown', '/api/session/extra', '/api']) {
    for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
      const response = stagingBlock(new Request(`https://staging.example${path}`, { method }), 'isolated-staging');
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal((await response.json()).code, 'STAGING_INTEGRATION_BLOCKED');
    }
  }
});
test('staging leaves existing session and portal-content authorization in place', () => {
  for (const path of ['/', '/api/session', '/api/admin-users', '/api/admin-users?resource=config', '/api/admin-users?resource=me', '/api/portal-content?view=admin', '/logo-smkap.png']) {
    assert.equal(stagingBlock(new Request(`https://staging.example${path}`), 'isolated-staging'), null);
  }
});
test('login config exception never enables admin mutations', () => {
  assert.equal(stagingBlock(new Request('https://staging.example/api/admin-users?resource=config', { method: 'POST' }), 'isolated-staging').status, 503);
});
test('production behavior is unchanged', () => {
  assert.equal(stagingBlock(new Request('https://production.example/api/push')), null);
});

test('isolated SKAS CRUD reaches original authorization handlers', () => {
  for (const method of ['GET','POST','PATCH','DELETE']) {
    assert.equal(stagingBlock(new Request('https://staging.example/api/skas', {method}), 'isolated-staging'), null);
  }
});

test('only local draft writes are enabled; external document actions remain blocked', () => {
 assert.equal(stagingDocumentActionAllowed('isolated-staging','save-draft'),true);
 for(const action of ['delete-draft','register','new-version','approve','unknown','']) assert.equal(stagingDocumentActionAllowed('isolated-staging',action),false);
 assert.equal(stagingDocumentActionAllowed(undefined,'delete-draft'),true);
 for(const path of ['/api/staff-work','/api/portfolio']) {
  assert.equal(stagingBlock(new Request('https://staging.example'+path),'isolated-staging'),null);
  assert.equal(stagingBlock(new Request('https://staging.example'+path,{method:'POST'}),'isolated-staging').status,503);
 }
});
