# Lighthouse Dashboard

**Self-hosted Lighthouse audit dashboard with scheduled monitoring and trend charts.**

Built by [diShine](https://dishine.it) -- a creative tech agency specializing in web performance, automation, and digital strategy.

---

## What it does

- Runs Google Lighthouse audits on any URL and stores results in a local SQLite database
- Displays performance, accessibility, best practices, and SEO scores in a clean web dashboard
- Tracks score trends over time with interactive charts
- Automates audits on a configurable schedule (default: every 24 hours)

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

## CLI commands

| Command | Description |
|---------|-------------|
| `start` | Start the dashboard server |
| `run <url>` | Run a single Lighthouse audit and print results |
| `add <url> [name]` | Add a URL to scheduled monitoring |
| `list` | List all monitored URLs |
| `remove <id>` | Remove a URL by its ID |
| `--help` | Show usage information |
| `--version` | Show version number |

### Start options

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | 3000 | Server port |
| `--db` | ./lighthouse.db | Path to SQLite database file |
| `--interval` | 86400 | Audit interval in seconds (default: 24h) |

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/urls` | List all URLs with latest audit data |
| POST | `/api/urls` | Add a URL (`{ url, name }`) |
| DELETE | `/api/urls/:id` | Remove a URL and its audits |
| GET | `/api/urls/:id/audits` | Get audit history (query: `limit`) |
| GET | `/api/urls/:id/trend` | Get trend data (query: `days`) |
| POST | `/api/urls/:id/run` | Trigger an audit now |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/health` | Health check |

## Configuration

All configuration is done via CLI flags or programmatic options:

```javascript
import { createServer } from '@dishine/lighthouse-dashboard';

const { app, server, db, scheduler } = createServer({
  port: 8080,
  dbPath: '/data/lighthouse.db',
  interval: 3600000, // 1 hour in milliseconds
});
```

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

## Self-hosting tips

### Using pm2

```bash
pm2 start npx --name lighthouse-dashboard -- lighthouse-dashboard start --port 3000
pm2 save
pm2 startup
```

### Using systemd

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

## Requirements

- Node.js >= 18
- Google Chrome or Chromium (for Lighthouse)
- lighthouse >= 12.0.0 (peer dependency)

---

Built with care by [diShine](https://dishine.it) | MIT License
