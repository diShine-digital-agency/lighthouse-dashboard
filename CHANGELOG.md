# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — 2026-04-14

### Added

- **Performance budgets** — set minimum score thresholds per URL for Performance, Accessibility, Best Practices, and SEO. Scores that fall below the budget are visually flagged with a pulsing red indicator on the dashboard.
- **Audit export** — new `GET /api/urls/:id/export` endpoint supports both JSON and CSV formats (`?format=csv`). CSV files include a header row and all stored metrics.
- **Webhook notifications** — configure a webhook URL per monitored site (`PATCH /api/urls/:id` with `webhook_url`). After each audit completes, a POST request is sent with the audit results and any budget failures.
- **Update URL** — new `PATCH /api/urls/:id` endpoint to update a URL's name, performance budgets, and webhook URL without removing and re-adding it.
- **Budget button** in the dashboard UI — click "Budget" on any card to set score thresholds via a prompt dialog.
- **Budget labels** on score gauges — when a budget is set, the gauge label shows the threshold (e.g., "Perf ≥90").
- **Database migration** — budget and webhook columns are automatically added to existing databases on startup.
- 23 new tests covering export, budgets, webhooks, and the PATCH endpoint (62 total, up from 39).

### Changed

- Dashboard cards now include a "Budget" action button alongside Run, Trend, and Del.
- Gauge circles that fail their budget threshold display a pulsing red shadow animation.
- The `urls` table schema now includes `budget_performance`, `budget_accessibility`, `budget_best_practices`, `budget_seo`, and `webhook_url` columns.

## [1.1.0] — 2026-04-06

### Added

- **Dark mode** with system preference detection and manual toggle.
- **Stats bar** at the top of the dashboard showing total URLs, total audits, and average scores.
- **Toast notifications** replace browser `alert()` dialogs for all user feedback.
- **ARIA attributes** on score gauges, form inputs, and interactive elements for screen reader support.
- **Footer** with links to diShine and the GitHub repository.
- **Favicon** (inline SVG, no external file needed).
- **Graceful shutdown** on `SIGINT` and `SIGTERM`: the scheduler stops, the HTTP server drains, and the database connection closes cleanly.
- **URL validation** in both the CLI and the API — only `http://` and `https://` URLs are accepted.
- **Input bounds** on API query parameters (`limit` capped at 500, `days` capped at 365).
- **Port and interval validation** in the CLI — invalid values are rejected with clear error messages.
- **Rate limiting guard** on the `/api/urls/:id/run` endpoint — concurrent duplicate audits for the same URL are blocked.
- **Scheduler overlap prevention** — if a previous cycle is still running, the next one is skipped.
- **Scheduler error logging** — errors are logged to `stderr` instead of being silently swallowed.
- **API tests** covering all endpoints, validation rules, and error responses (39 total tests, up from 14).
- `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `.github/ISSUE_TEMPLATE/bug_report.md`.
- `meta description` tag in the HTML head.

### Changed

- Auto-refresh interval increased from 30 seconds to 60 seconds to reduce unnecessary network traffic.
- `--no-sandbox` Chrome flag remains (required for many CI/Docker setups); added `--disable-gpu` for broader compatibility.
- Lighthouse install instruction changed from `npm install -g lighthouse` to `npm install lighthouse` (works locally too).
- CLI help text now includes a link to the GitHub repository.
- README rewritten for clarity, consistency, and to remove marketing language.
- GUIDE updated for coherence with the rest of the documentation.

### Fixed

- `resolve` import removed from CLI (was unused).
- `DELETE /api/urls/:id` now returns `400` for non-numeric IDs instead of passing `NaN` to the database.

## [1.0.0] — 2026-04-05

### Added

- Initial release.
- CLI with `start`, `run`, `add`, `list`, `remove` commands.
- Express server with REST API.
- SQLite database with WAL mode.
- Scheduled audits with configurable interval.
- Web dashboard with score cards and Chart.js trend charts.
- Programmatic API (`createServer`, `DB`, `runAudit`, `Scheduler`, `createRouter`).
