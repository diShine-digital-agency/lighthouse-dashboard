# Lighthouse Dashboard — User Guide

A guide to setting up and using the Lighthouse Dashboard for website performance monitoring.

-—

## 1. What this tool does

Lighthouse Dashboard is a self-hosted web application that monitors website performance over time. It uses Google Lighthouse (the same engine behind Chrome DevTools audits) to score pages on four categories:

- **Performance** — how fast the page loads and becomes interactive
- **Accessibility** — how usable the site is for people with disabilities
- **Best Practices** — whether the site follows modern web standards
- **SEO** — how well search engines can crawl and index the content

Each category is scored from 0 to 100. The dashboard stores every audit result and shows how scores change over time.

-—

## 2. Installation

### Prerequisites

You need two things installed on your computer:

1. **Node.js** (version 18 or higher) — download from https://nodejs.org
2. **Google Chrome** or **Chromium** — Lighthouse needs a browser to run audits

### Install the dashboard

Open your terminal (Terminal on Mac, Command Prompt or PowerShell on Windows) and run:

```bash
npm install @dishine/lighthouse-dashboard
```

Then install Lighthouse:

```bash
npm install lighthouse
```

To verify everything is installed:

```bash
npx lighthouse-dashboard --version
```

You should see a version number printed.

-—

## 3. Adding your first website

Before starting the dashboard, add a website to monitor:

```bash
npx lighthouse-dashboard add https://your-website.com "My Website"
```

The first argument is the full URL (including `https://`). The second argument is an optional friendly name.

You can add as many websites as you want:

```bash
npx lighthouse-dashboard add https://example.com "Example"
npx lighthouse-dashboard add https://blog.example.com "Blog"
npx lighthouse-dashboard add https://shop.example.com "Shop"
```

To see all the websites you have added:

```bash
npx lighthouse-dashboard list
```

-—

## 4. Starting the dashboard

Start the dashboard server:

```bash
npx lighthouse-dashboard start
```

Then open your web browser and go to:

```
http://localhost:3000
```

You will see the dashboard with all your added websites. If no audits have been run yet, each card will show "No audit data yet."

### Customizing the port

If port 3000 is already in use, pick a different one:

```bash
npx lighthouse-dashboard start --port 8080
```

-—

## 5. Understanding Lighthouse scores

Each score uses a color-coded system:

| Score | Color | Meaning |
|-------|-------|---------|
| 90-100 | Green | Good — your site performs well in this area |
| 50-89 | Orange | Needs improvement — there are things to fix |
| 0-49 | Red | Poor — significant issues need attention |

### What each category means

- **Performance**: Measures loading speed, interactivity, and visual stability. Key metrics include First Contentful Paint (FCP), Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), and Total Blocking Time (TBT).

- **Accessibility**: Checks for common accessibility issues like missing alt text on images, poor color contrast, missing form labels, and incorrect ARIA attributes.

- **Best Practices**: Verifies that your site uses HTTPS, avoids deprecated APIs, has no browser errors in the console, and follows security best practices.

- **SEO**: Ensures your pages have proper meta tags, descriptive link text, valid robots.txt, and are mobile-friendly.

-—

## 6. Reading trend charts

Click the **Trend** button on any website card to see a line chart showing how scores have changed over time.

The chart displays four lines (one per category) over the last 30 days. This helps you:

- Spot regressions after a deployment
- Verify that fixes actually improved scores
- Track gradual improvements or degradations

-—

## 7. Scheduling automated audits

By default, the dashboard runs audits every 24 hours for all your monitored URLs. You can change the interval:

```bash
# Run audits every 6 hours (21600 seconds)
npx lighthouse-dashboard start --interval 21600

# Run audits every hour (3600 seconds)
npx lighthouse-dashboard start --interval 3600
```

The first audit runs immediately when the server starts, then repeats on the configured interval.

Audit results appear in the dashboard automatically — no need to refresh.

-—

## 8. Running one-off audits

You can trigger an audit manually in two ways:

### From the dashboard

Click the **Run** button on any website card. The card will show a loading state while the audit runs (typically 30-60 seconds).

### From the command line

```bash
npx lighthouse-dashboard run https://your-website.com
```

This prints the results directly in your terminal without saving them to the database.

-—

## 9. Using the API

The dashboard exposes a REST API you can use from scripts, CI/CD pipelines, or other tools.

### Add a URL

```bash
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "name": "Example"}'
```

### List all URLs

```bash
curl http://localhost:3000/api/urls
```

### Trigger an audit

```bash
curl -X POST http://localhost:3000/api/urls/1/run
```

### Get audit history

```bash
curl http://localhost:3000/api/urls/1/audits?limit=10
```

### Get trend data

```bash
curl http://localhost:3000/api/urls/1/trend?days=30
```

### Get statistics

```bash
curl http://localhost:3000/api/stats
```

### Health check

```bash
curl http://localhost:3000/api/health
```

-—

## 10. Self-hosting on a server

To run the dashboard on a remote server so your team can access it:

### Option A: Using pm2 (recommended)

pm2 is a process manager that keeps your dashboard running even after reboots.

```bash
# Install pm2
npm install -g pm2

# Start the dashboard
pm2 start npx --name lighthouse-dashboard — lighthouse-dashboard start --port 3000

# Save the process list
pm2 save

# Set up auto-start on reboot
pm2 startup
```

### Option B: Using systemd (Linux)

Create a service file at `/etc/systemd/system/lighthouse-dashboard.service`:

```ini
[Unit]
Description=Lighthouse Dashboard
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/lighthouse-dashboard
ExecStart=/usr/bin/node bin/cli.js start --port 3000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then enable and start the service:

```bash
sudo systemctl enable lighthouse-dashboard
sudo systemctl start lighthouse-dashboard
```

### Putting it behind a reverse proxy

For HTTPS and domain-based access, put nginx or Caddy in front of the dashboard:

```nginx
server {
    listen 443 ssl;
    server_name lighthouse.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

-—

## 11. Troubleshooting

### "Lighthouse is not installed"

Make sure Lighthouse is installed:

```bash
npm install lighthouse
```

### "Chrome not found" or headless browser errors

Lighthouse needs Chrome or Chromium. Install it on your system:

- **Mac**: `brew install --cask google-chrome`
- **Ubuntu/Debian**: `sudo apt install chromium-browser`
- **Docker**: Use a base image that includes Chromium

### Audits are timing out

Some pages are very large or slow. Lighthouse has internal timeouts. Make sure the URL is accessible from the machine running the dashboard.

### Port already in use

Use a different port:

```bash
npx lighthouse-dashboard start --port 8080
```

### Database is locked

This can happen if multiple processes try to write simultaneously. The dashboard uses WAL mode to minimize this, but avoid running multiple instances against the same database file.

-—

## 12. FAQ

**Q: How long does an audit take?**
A: Typically 30-60 seconds per URL, depending on page complexity and server speed.

**Q: Does this affect my website's analytics?**
A: Lighthouse runs in a headless browser, so visits may appear in your analytics. You can filter them by user agent if needed.

**Q: Can I audit pages behind a login?**
A: The default setup audits publicly accessible pages only. Authenticated page auditing requires custom Lighthouse configuration.

**Q: How much disk space does the database use?**
A: Each audit record is roughly 200 bytes. Even with thousands of audits, the database stays well under 100 MB.

**Q: Can I export the data?**
A: The SQLite database file can be opened with any SQLite client. You can also use the API to fetch data programmatically.

**Q: Does it support mobile audits?**
A: Lighthouse simulates a mobile device by default. The scores reflect mobile performance.

-—

Built by [diShine](https://dishine.it)
