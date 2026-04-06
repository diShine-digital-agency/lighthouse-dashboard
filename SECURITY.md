# Security Policy

## Reporting a vulnerability

If you find a security vulnerability in this project, please report it responsibly.

**Do not open a public issue.** Instead, email [dev@dishine.it](mailto:dev@dishine.it) with:

- A description of the vulnerability.
- Steps to reproduce.
- The potential impact.

We will acknowledge receipt within 48 hours and aim to release a fix within 7 days for critical issues.

## Scope

This policy covers the `@dishine/lighthouse-dashboard` npm package and its source code.

## Known considerations

- The dashboard does not include authentication. If exposed to the internet, place it behind a reverse proxy with access controls (e.g., HTTP Basic Auth, VPN, or IP allowlisting).
- The `--no-sandbox` Chrome flag is used by default because many server and Docker environments require it. On shared systems, consider running the tool in an isolated container.
- The SQLite database file contains audit results only — no credentials or sensitive data are stored.
