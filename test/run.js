import { DB } from '../src/db.js';
import { Scheduler } from '../src/scheduler.js';
import { unlinkSync } from 'fs';

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

db.removeUrl(1);
assert(db.listUrls().length === 0, 'removeUrl works');

db.close();
try { unlinkSync(TEST_DB); } catch {}

console.log('\nScheduler tests:');
const scheduler = new Scheduler();
let callCount = 0;
scheduler.start(50, async () => { callCount++; });
assert(scheduler.isRunning === true, 'scheduler isRunning');

await new Promise(r => setTimeout(r, 180));
scheduler.stop();
assert(scheduler.isRunning === false, 'scheduler stopped');
assert(callCount >= 3, `scheduler callback ran ${callCount} times (expected >= 3)`);

console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
