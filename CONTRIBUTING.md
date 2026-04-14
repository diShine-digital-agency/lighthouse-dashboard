# Contributing

Contributions are welcome. This document describes how to get started.

## Development setup

```bash
git clone https://github.com/diShine-digital-agency/lighthouse-dashboard.git
cd lighthouse-dashboard
npm install
```

## Running tests

```bash
npm test
```

Tests cover the database layer, scheduler, and API endpoints (including export, budgets, and webhooks). All tests must pass before submitting a pull request.

## Project structure

```
bin/cli.js          CLI entry point
src/
  index.js          Module exports
  server.js         Express server and scheduler setup
  api.js            REST API routes
  db.js             SQLite database layer
  runner.js         Lighthouse audit runner
  scheduler.js      Interval-based task scheduler
  notify.js         Webhook delivery and budget checking
public/
  index.html        Dashboard HTML shell
  app.js            Frontend application
  style.css         Styles and dark mode
test/
  run.js            Test suite
```

## Guidelines

- Keep changes focused. One pull request per feature or fix.
- Write tests for new functionality.
- Follow the existing code style (ES modules, no build step, vanilla JS frontend).
- Update `CHANGELOG.md` with a summary of your changes.
- Do not add dependencies unless there is a clear need.

## Reporting issues

Open an issue on GitHub with steps to reproduce the problem, the expected behaviour, and the actual behaviour.
