import { DB } from '../src/db.js';
import { Scheduler } from '../src/scheduler.js';
import { createRouter } from '../src/api.js';
import { unlinkSync } from 'fs';
import http from 'http';
import express from 'express';

const TEST_DB = '/tmp/lighthouse-test.db';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  \x1b[32mPASS\x1b[0m ${msg}`);
    passed++;
  } else {
    console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
    failed++;
  }
}

/* ── Database tests ──────────────────────────────── */

console.log('\nDatabase tests:');
try { unlinkSync(TEST_DB); } catch {}
const db = new DB(TEST_DB);

const entry = db.addUrl('https://example.com', 'Example');
assert(entry.id === 1, 'addUrl returns id');
assert(entry.url === 'https://example.com', 'addUrl returns url');

const urls = db.listUrls();
assert(urls.length === 1, 'listUrls returns 1 entry');

const fetched = db.getUrl(1);
assert(fetched.url === 'https://example.com', 'getUrl works');

db.saveAudit(1, { performance: 95, accessibility: 88, bestPractices: 92, seo: 100, fcp: 1200, lcp: 2500, cls: 0.05, tbt: 150, si: 3000, tti: 3500 });
const audits = db.getAudits(1);
assert(audits.length === 1, 'saveAudit + getAudits works');
assert(audits[0].performance === 95, 'audit scores stored correctly');

const latest = db.getLatestAudit(1);
assert(latest.seo === 100, 'getLatestAudit works');

const trend = db.getTrend(1, 30);
assert(trend.length === 1, 'getTrend works');

const stats = db.getStats();
assert(stats.totalUrls === 1, 'getStats totalUrls');
assert(stats.totalAudits === 1, 'getStats totalAudits');

// Duplicate URL test
let dupThrew = false;
try { db.addUrl('https://example.com', 'Dup'); } catch (err) {
  dupThrew = err.message.includes('UNIQUE');
}
assert(dupThrew, 'addUrl rejects duplicate URLs');

// getUrl returns null for missing ID
assert(db.getUrl(999) === null, 'getUrl returns null for missing id');

// getLatestAudit returns null when no audits exist
db.addUrl('https://empty.com', 'Empty');
assert(db.getLatestAudit(2) === null, 'getLatestAudit returns null when no audits');

// updateUrl tests
const updated = db.updateUrl(2, { name: 'Updated', budget_performance: 90, budget_seo: 80 });
assert(updated.name === 'Updated', 'updateUrl updates name');
assert(updated.budget_performance === 90, 'updateUrl sets budget_performance');
assert(updated.budget_seo === 80, 'updateUrl sets budget_seo');
assert(updated.budget_accessibility === null, 'updateUrl leaves unset budgets as null');

const cleared = db.updateUrl(2, { budget_performance: null });
assert(cleared.budget_performance === null, 'updateUrl clears budget with null');

db.removeUrl(1);
assert(db.listUrls().length === 1, 'removeUrl works');
db.removeUrl(2);
assert(db.listUrls().length === 0, 'removeUrl cleans up all entries');

db.close();
try { unlinkSync(TEST_DB); } catch {}

/* ── Scheduler tests ─────────────────────────────── */

console.log('\nScheduler tests:');
const scheduler = new Scheduler();
let callCount = 0;
scheduler.start(50, async () => { callCount++; });
assert(scheduler.isRunning === true, 'scheduler isRunning');

await new Promise(r => setTimeout(r, 180));
scheduler.stop();
assert(scheduler.isRunning === false, 'scheduler stopped');
assert(callCount >= 3, `scheduler callback ran ${callCount} times (expected >= 3)`);

// Scheduler error handling: errors are caught, not thrown
const errScheduler = new Scheduler();
let errCallCount = 0;
errScheduler.start(50, async () => {
  errCallCount++;
  throw new Error('test error');
});
await new Promise(r => setTimeout(r, 180));
errScheduler.stop();
assert(errCallCount >= 2, `scheduler continues after errors (ran ${errCallCount} times)`);

/* ── API tests ───────────────────────────────────── */

console.log('\nAPI tests:');
try { unlinkSync(TEST_DB); } catch {}
const apiDb = new DB(TEST_DB);

const mockRunAudit = async () => ({
  performance: 90,
  accessibility: 85,
  bestPractices: 88,
  seo: 95,
  metrics: { fcp: 1000, lcp: 2000, cls: 0.1, tbt: 100, si: 2500, tti: 3000 },
});

const app = express();
app.use(express.json());
app.use(createRouter(apiDb, mockRunAudit));

const server = await new Promise((resolve) => {
  const s = app.listen(0, () => resolve(s));
});
const port = server.address().port;
const base = `http://localhost:${port}`;

async function request(path, opts = {}) {
  const res = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// POST /api/urls — missing url
let r = await request('/api/urls', { method: 'POST', body: JSON.stringify({}) });
assert(r.status === 400, 'POST /api/urls without url returns 400');

// POST /api/urls — invalid url
r = await request('/api/urls', { method: 'POST', body: JSON.stringify({ url: 'not-a-url' }) });
assert(r.status === 400, 'POST /api/urls with invalid url returns 400');

// POST /api/urls — valid
r = await request('/api/urls', { method: 'POST', body: JSON.stringify({ url: 'https://example.com', name: 'Test' }) });
assert(r.status === 201, 'POST /api/urls with valid url returns 201');
assert(r.body.url === 'https://example.com', 'POST /api/urls returns created entry');

// POST /api/urls — duplicate
r = await request('/api/urls', { method: 'POST', body: JSON.stringify({ url: 'https://example.com' }) });
assert(r.status === 409, 'POST /api/urls duplicate returns 409');

// POST /api/urls — name too long
r = await request('/api/urls', { method: 'POST', body: JSON.stringify({ url: 'https://toolong.com', name: 'A'.repeat(101) }) });
assert(r.status === 400, 'POST /api/urls with long name returns 400');

// GET /api/urls
r = await request('/api/urls');
assert(r.status === 200, 'GET /api/urls returns 200');
assert(r.body.length === 1, 'GET /api/urls returns 1 entry');

// GET /api/health
r = await request('/api/health');
assert(r.status === 200, 'GET /api/health returns 200');
assert(r.body.status === 'ok', 'GET /api/health has status ok');

// GET /api/stats
r = await request('/api/stats');
assert(r.status === 200, 'GET /api/stats returns 200');
assert(r.body.totalUrls === 1, 'GET /api/stats has correct totalUrls');

// POST /api/urls/:id/run — trigger audit
r = await request('/api/urls/1/run', { method: 'POST' });
assert(r.status === 200, 'POST /api/urls/1/run returns 200');
assert(r.body.performance === 90, 'POST /api/urls/1/run returns audit data');

// POST /api/urls/:id/run — not found
r = await request('/api/urls/999/run', { method: 'POST' });
assert(r.status === 404, 'POST /api/urls/999/run returns 404');

// GET /api/urls/:id/audits
r = await request('/api/urls/1/audits?limit=10');
assert(r.status === 200, 'GET /api/urls/1/audits returns 200');
assert(r.body.length >= 1, 'GET /api/urls/1/audits returns audit data');

// GET /api/urls/:id/trend
r = await request('/api/urls/1/trend?days=7');
assert(r.status === 200, 'GET /api/urls/1/trend returns 200');

// GET /api/urls/:id/export — JSON format
r = await request('/api/urls/1/export');
assert(r.status === 200, 'GET /api/urls/1/export returns 200');
assert(r.body.url && r.body.audits, 'GET /api/urls/1/export returns url and audits');

// GET /api/urls/:id/export — CSV format
{
  const csvRes = await fetch(base + '/api/urls/1/export?format=csv');
  assert(csvRes.status === 200, 'GET /api/urls/1/export?format=csv returns 200');
  const csvText = await csvRes.text();
  assert(csvText.startsWith('id,url,'), 'CSV export starts with correct header');
  assert(csvText.split('\n').length >= 2, 'CSV export contains header and data rows');
}

// GET /api/urls/:id/export — not found
r = await request('/api/urls/999/export');
assert(r.status === 404, 'GET /api/urls/999/export returns 404 for missing URL');

// PATCH /api/urls/:id — set budgets
r = await request('/api/urls/1', { method: 'PATCH', body: JSON.stringify({ budget_performance: 90, budget_seo: 80 }) });
assert(r.status === 200, 'PATCH /api/urls/1 returns 200');
assert(r.body.budget_performance === 90, 'PATCH sets budget_performance');
assert(r.body.budget_seo === 80, 'PATCH sets budget_seo');

// PATCH /api/urls/:id — invalid budget value
r = await request('/api/urls/1', { method: 'PATCH', body: JSON.stringify({ budget_performance: 150 }) });
assert(r.status === 400, 'PATCH with budget > 100 returns 400');

// PATCH /api/urls/:id — not found
r = await request('/api/urls/999', { method: 'PATCH', body: JSON.stringify({ budget_performance: 90 }) });
assert(r.status === 404, 'PATCH /api/urls/999 returns 404');

// PATCH /api/urls/:id — clear budget
r = await request('/api/urls/1', { method: 'PATCH', body: JSON.stringify({ budget_performance: null }) });
assert(r.status === 200, 'PATCH clears budget with null');
assert(r.body.budget_performance === null, 'PATCH cleared budget is null');

// PATCH /api/urls/:id — set webhook_url
r = await request('/api/urls/1', { method: 'PATCH', body: JSON.stringify({ webhook_url: 'https://hooks.example.com/test' }) });
assert(r.status === 200, 'PATCH sets webhook_url');
assert(r.body.webhook_url === 'https://hooks.example.com/test', 'PATCH webhook_url value correct');

// PATCH /api/urls/:id — invalid webhook_url
r = await request('/api/urls/1', { method: 'PATCH', body: JSON.stringify({ webhook_url: 'not-a-url' }) });
assert(r.status === 400, 'PATCH with invalid webhook_url returns 400');

// PATCH /api/urls/:id — clear webhook_url
r = await request('/api/urls/1', { method: 'PATCH', body: JSON.stringify({ webhook_url: null }) });
assert(r.status === 200, 'PATCH clears webhook_url with null');
assert(r.body.webhook_url === null, 'PATCH cleared webhook_url is null');

// DELETE /api/urls/:id
r = await request('/api/urls/1', { method: 'DELETE' });
assert(r.status === 200, 'DELETE /api/urls/1 returns 200');

// DELETE /api/urls/:id — invalid id
r = await request('/api/urls/abc', { method: 'DELETE' });
assert(r.status === 400, 'DELETE /api/urls/abc returns 400');

server.close();
apiDb.close();
try { unlinkSync(TEST_DB); } catch {}

/* ── Results ─────────────────────────────────────── */

console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
