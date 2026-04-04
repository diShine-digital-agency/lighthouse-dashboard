import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DB } from './db.js';
import { runAudit } from './runner.js';
import { Scheduler } from './scheduler.js';
import { createRouter } from './api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createServer(options = {}) {
  const {
    port = 3000,
    dbPath = './lighthouse.db',
    interval = 86400000,
  } = options;

  const db = new DB(dbPath);
  const scheduler = new Scheduler();
  const app = express();

  app.use(express.json());
  app.use(express.static(join(__dirname, '..', 'public')));
  app.use(createRouter(db, runAudit));

  const server = app.listen(port);

  // Schedule audits for all URLs
  scheduler.start(interval, async () => {
    const urls = db.listUrls();
    for (const entry of urls) {
      try {
        const result = await runAudit(entry.url);
        db.saveAudit(entry.id, {
          performance: result.performance,
          accessibility: result.accessibility,
          bestPractices: result.bestPractices,
          seo: result.seo,
          fcp: result.metrics.fcp,
          lcp: result.metrics.lcp,
          cls: result.metrics.cls,
          tbt: result.metrics.tbt,
          si: result.metrics.si,
          tti: result.metrics.tti,
        });
        console.log(`[audit] ${entry.url} - Performance: ${result.performance}`);
      } catch (err) {
        console.error(`[audit] Failed for ${entry.url}: ${err.message}`);
      }
    }
  });

  return { app, server, db, scheduler };
}
