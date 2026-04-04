# lighthouse-dashboard

**Self-hosted Lighthouse monitoring with trend charts and scheduled audits.**

Running Lighthouse once is easy. Remembering to run it every week, tracking whether scores are improving or getting worse, and sharing results with your team -- that's the annoying part. This tool runs Lighthouse audits on a schedule, stores the results in a local SQLite database, and serves a web dashboard where you can see performance, accessibility, best practices, and SEO scores over time.

It's meant for teams and freelancers who want ongoing visibility into site performance without paying for a SaaS tool or setting up a complex monitoring stack. You install it, point it at your URLs, and it just runs.

Built by [diShine](https://dishine.it)

---

## Quick start

```bash
# Install
npm install @dishine/lighthouse-dashboard

# Lighthouse must be available (peer dependency)
npm install -g lighthouse

# Start the dashboard
npx lighthouse-dashboard start

# Open http://localhost:3000
```

---

## What you get

- **Scheduled audits**: configurable interval (default: every 24 hours), runs automatically in the background
- **Score tracking**: performance, accessibility, best practices, and SEO scores stored in SQLite
- **Trend charts**: interactive charts showing how scores change over time -- useful for proving that your optimization work is actually working
- **Web dashboard**: clean UI at localhost, no build step needed
- **REST API**: add URLs, trigger audits, pull data -- everything the dashboard does is available via API

---

## CLI commands

| Command | What it does |
|---------|--------------|
| `start` | start the dashboard server |
| `run <url>` | run a single Lighthouse audit and print results |
| `add <url> [name]` | add a URL to scheduled monitoring |
| `list` | list all monitored URLs |
| `remove <id>` | remove a URL by its ID |
| `--help` | show usage information |
| `--version` | show version number |

### Start options

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | 3000 | server port |
| `--db` | ./lighthouse.db | path to SQLite database file |
| `--interval` | 86400 | audit interval in seconds (default is 24h) |

---

## API endpoints

If you want to integrate with other tools or build your own frontend, everything's available over HTTP:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/urls` | list all URLs with latest audit data |
| POST | `/api/urls` | add a URL (`{ url, name }`) |
| DELETE | `/api/urls/:id` | remove a URL and its audits |
| GET | `/api/urls/:id/audits` | get audit history (query: `limit`) |
| GET | `/api/urls/:id/trend` | get trend data (query: `days`) |
| POST | `/api/urls/:id/run` | trigger an audit now |
| GET | `/api/stats` | dashboard statistics |
| GET | `/api/health` | health check |

---

## Configuration

All configuration is through CLI flags or programmatic options -- no config files to manage:

```javascript
import { createServer } from '@dishine/lighthouse-dashboard';

const { app, server, db, scheduler } = createServer({
  port: 8080,
  dbPath: '/data/lighthouse.db',
  interval: 3600000, // 1 hour in milliseconds
});
```

---

## Programmatic usage

```javascript
import { DB, runAudit, Scheduler, createRouter } from '@dishine/lighthouse-dashboard';

// Use the database directly
const db = new DB('./my-audits.db');
db.addUrl('https://example.com', 'Example Site');

// Run a single audit
const result = await runAudit('https://example.com');
console.log(result.performance); // 95

// Save results
db.saveAudit(1, {
  performance: result.performance,
  accessibility: result.accessibility,
  bestPractices: result.bestPractices,
  seo: result.seo,
  ...result.metrics,
});
```

---

## Self-hosting tips

### With pm2

```bash
pm2 start npx --name lighthouse-dashboard -- lighthouse-dashboard start --port 3000
pm2 save
pm2 startup
```

### With systemd

```ini
[Unit]
Description=Lighthouse Dashboard
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/lighthouse-dashboard
ExecStart=/usr/bin/node bin/cli.js start --port 3000 --db /data/lighthouse.db
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Either way, the SQLite database is just a single file, so backups are trivial -- just copy it.

---

## Requirements

- **Node.js** 18 or later
- **Google Chrome or Chromium** (Lighthouse needs it)
- **lighthouse** >= 12.0.0 (peer dependency)

---

## License

MIT License -- see [LICENSE](LICENSE) for details.

Copyright (c) 2026 [diShine](https://dishine.it)
