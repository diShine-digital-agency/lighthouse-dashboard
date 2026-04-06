import { Router } from 'express';

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function createRouter(db, runAuditFn) {
  const router = Router();
  const runningAudits = new Set();

  // List all URLs with latest audit
  router.get('/api/urls', (req, res) => {
    try {
      const urls = db.listUrls();
      const result = urls.map((u) => {
        const latest = db.getLatestAudit(u.id);
        return { ...u, latestAudit: latest || null };
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add URL
  router.post('/api/urls', (req, res) => {
    try {
      const { url, name } = req.body;
      if (!url) return res.status(400).json({ error: 'url is required' });
      if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL. Must start with http:// or https://' });
      if (name && name.length > 100) return res.status(400).json({ error: 'Name must be 100 characters or fewer' });
      const entry = db.addUrl(url, name);
      res.status(201).json(entry);
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'URL already exists' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Remove URL
  router.delete('/api/urls/:id', (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
      db.removeUrl(id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get audits for URL
  router.get('/api/urls/:id/audits', (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);
      const audits = db.getAudits(id, limit);
      res.json(audits);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get trend data
  router.get('/api/urls/:id/trend', (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
      const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
      const trend = db.getTrend(id, days);
      res.json(trend);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Trigger audit
  router.post('/api/urls/:id/run', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
      const urlEntry = db.getUrl(id);
      if (!urlEntry) return res.status(404).json({ error: 'URL not found' });

      if (runningAudits.has(id)) {
        return res.status(429).json({ error: 'Audit already in progress for this URL' });
      }

      runningAudits.add(id);
      try {
        const result = await runAuditFn(urlEntry.url);
        const saved = db.saveAudit(id, {
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
        res.json(saved);
      } finally {
        runningAudits.delete(id);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Stats
  router.get('/api/stats', (req, res) => {
    try {
      const stats = db.getStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Health
  router.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  return router;
}
