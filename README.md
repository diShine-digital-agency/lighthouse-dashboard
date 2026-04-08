# lighthouse-dashboard, a Self-hosted Lighthouse audit dashboard with scheduled monitoring and trend charts.

<p align="center">
  <img src="images/lighthouse_dashboard_04_trend_analysis.webp" alt="Lighthouse dashboard trend analysis" width="65%">
</p>

Stop running manual [Lighthouse](https://developer.chrome.com/docs/lighthouse/) checks. This self-hosted dashboard automates your web performance monitoring: it runs scheduled audits in the background, logs the results in a local SQLite database, and serves a clean web UI with historical trend charts to help you catch performance regressions before your users do.
Runs  audits on a schedule, stores results in a local SQLite database, and serves a web dashboard with score cards and trend charts.

Built by [diShine](https://dishine.it).

<p align="center">
  <img src="images/lighthouse_dashboard_05_ops_workflow.webp" alt="Lighthouse Dashboard workflow" width="49%">
  <img src="images/lighthouse_dashboard_02_scorecard_closeup.webp" alt="Lighthouse Dashboard scorecard" width="49%">
</p>

---

## Quick start

```bash
# Install the dashboard
npm install @dishine/lighthouse-dashboard

# Install Lighthouse (peer dependency)
npm install lighthouse

# Start the server
npx lighthouse-dashboard start

# Open http://localhost:3000
```

---

## Features

- **Scheduled audits** — runs automatically at a configurable interval (default: 24 hours).
- **Score tracking** — stores performance, accessibility, best practices, and SEO scores in SQLite.
- **Trend charts** — shows how scores change over time using Chart.js.
- **Web dashboard** — responsive UI with dark mode support, served at `localhost`.
- **REST API** — every dashboard action is available over HTTP.
- **CLI** — manage URLs and run one-off audits from the terminal.

---

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
| `--port` | `3000` | Server port |
| `--db` | `./lighthouse.db` | Path to SQLite database file |
| `--interval` | `86400` | Audit interval in seconds |

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/urls` | List all URLs with latest audit data |
| POST | `/api/urls` | Add a URL (`{ url, name }`) |
| DELETE | `/api/urls/:id` | Remove a URL and its audits |
| GET | `/api/urls/:id/audits` | Get audit history (`?limit=50`) |
| GET | `/api/urls/:id/trend` | Get trend data (`?days=30`) |
| POST | `/api/urls/:id/run` | Trigger an audit |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/health` | Health check |

---

## Programmatic usage

```javascript
import { createServer } from '@dishine/lighthouse-dashboard';

const { app, server, db, scheduler } = createServer({
  port: 8080,
  dbPath: '/data/lighthouse.db',
  interval: 3600000, // 1 hour in ms
});
```

Individual modules can also be imported:

```javascript
import { DB, runAudit, Scheduler, createRouter } from '@dishine/lighthouse-dashboard';

const db = new DB('./audits.db');
db.addUrl('https://example.com', 'Example');

const result = await runAudit('https://example.com');
db.saveAudit(1, {
  performance: result.performance,
  accessibility: result.accessibility,
  bestPractices: result.bestPractices,
  seo: result.seo,
  ...result.metrics,
});
```

---

## Self-hosting

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

The SQLite database is a single file — back it up by copying it.

---

## Requirements

- **Node.js** 18 or later
- **Google Chrome** or **Chromium** (Lighthouse runs audits in a headless browser)
- **lighthouse** ≥ 12.0.0 (peer dependency)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE) for details.
