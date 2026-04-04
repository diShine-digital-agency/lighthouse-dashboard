#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

// ANSI colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function getFlag(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const args = process.argv.slice(2);
const command = args[0];

function printUsage() {
  console.log(`
${c.bold}${c.cyan}Lighthouse Dashboard${c.reset} ${c.dim}v${pkg.version}${c.reset}
${c.dim}by diShine (https://dishine.it)${c.reset}

${c.bold}Usage:${c.reset}
  lighthouse-dashboard ${c.green}<command>${c.reset} [options]

${c.bold}Commands:${c.reset}
  ${c.green}start${c.reset}              Start the dashboard server
  ${c.green}run <url>${c.reset}          Run a single Lighthouse audit
  ${c.green}add <url> [name]${c.reset}   Add a URL to monitoring
  ${c.green}list${c.reset}               List all monitored URLs
  ${c.green}remove <id>${c.reset}        Remove a URL by ID

${c.bold}Options (start):${c.reset}
  --port <number>     Server port (default: 3000)
  --db <path>         Database file path (default: ./lighthouse.db)
  --interval <secs>   Audit interval in seconds (default: 86400)

${c.bold}Global:${c.reset}
  --help              Show this help message
  --version           Show version
`);
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    console.log(pkg.version);
    process.exit(0);
  }

  if (command === 'start') {
    const port = parseInt(getFlag('--port', '3000'), 10);
    const dbPath = getFlag('--db', './lighthouse.db');
    const intervalSecs = parseInt(getFlag('--interval', '86400'), 10);

    const { createServer } = await import('../src/server.js');
    createServer({ port, dbPath, interval: intervalSecs * 1000 });

    console.log(`
${c.bold}${c.cyan}Lighthouse Dashboard${c.reset} ${c.dim}v${pkg.version}${c.reset}
${c.green}Dashboard running at http://localhost:${port}${c.reset}
${c.dim}Database: ${dbPath}${c.reset}
${c.dim}Audit interval: ${intervalSecs}s${c.reset}
`);
    return;
  }

  if (command === 'run') {
    const url = args[1];
    if (!url) {
      console.error(`${c.red}Error: URL is required. Usage: lighthouse-dashboard run <url>${c.reset}`);
      process.exit(1);
    }

    console.log(`${c.dim}Running audit for ${url}...${c.reset}`);
    const { runAudit } = await import('../src/runner.js');

    try {
      const result = await runAudit(url);
      console.log(`
${c.bold}Audit Results for ${c.cyan}${url}${c.reset}
${'─'.repeat(50)}
  ${c.bold}Performance:${c.reset}    ${scoreColor(result.performance)}${result.performance}${c.reset}
  ${c.bold}Accessibility:${c.reset}  ${scoreColor(result.accessibility)}${result.accessibility}${c.reset}
  ${c.bold}Best Practices:${c.reset} ${scoreColor(result.bestPractices)}${result.bestPractices}${c.reset}
  ${c.bold}SEO:${c.reset}            ${scoreColor(result.seo)}${result.seo}${c.reset}
${'─'.repeat(50)}
  ${c.dim}FCP:${c.reset}  ${fmt(result.metrics.fcp)}ms
  ${c.dim}LCP:${c.reset}  ${fmt(result.metrics.lcp)}ms
  ${c.dim}CLS:${c.reset}  ${result.metrics.cls?.toFixed(3) ?? 'N/A'}
  ${c.dim}TBT:${c.reset}  ${fmt(result.metrics.tbt)}ms
  ${c.dim}SI:${c.reset}   ${fmt(result.metrics.si)}ms
  ${c.dim}TTI:${c.reset}  ${fmt(result.metrics.tti)}ms
`);
    } catch (err) {
      console.error(`${c.red}Error: ${err.message}${c.reset}`);
      process.exit(1);
    }
    return;
  }

  if (command === 'add') {
    const url = args[1];
    if (!url) {
      console.error(`${c.red}Error: URL is required. Usage: lighthouse-dashboard add <url> [name]${c.reset}`);
      process.exit(1);
    }
    const name = args[2] || null;
    const dbPath = getFlag('--db', './lighthouse.db');

    const { DB } = await import('../src/db.js');
    const db = new DB(dbPath);
    try {
      const entry = db.addUrl(url, name);
      console.log(`${c.green}Added:${c.reset} ${entry.url} ${entry.name ? `(${entry.name})` : ''} ${c.dim}[id: ${entry.id}]${c.reset}`);
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        console.error(`${c.yellow}URL already exists in the database.${c.reset}`);
      } else {
        console.error(`${c.red}Error: ${err.message}${c.reset}`);
      }
      process.exit(1);
    } finally {
      db.close();
    }
    return;
  }

  if (command === 'list') {
    const dbPath = getFlag('--db', './lighthouse.db');
    const { DB } = await import('../src/db.js');
    const db = new DB(dbPath);
    try {
      const urls = db.listUrls();
      if (urls.length === 0) {
        console.log(`${c.dim}No URLs being monitored. Use "lighthouse-dashboard add <url>" to add one.${c.reset}`);
        return;
      }
      console.log(`\n${c.bold}Monitored URLs${c.reset}\n${'─'.repeat(60)}`);
      for (const u of urls) {
        console.log(`  ${c.cyan}[${u.id}]${c.reset} ${u.url} ${u.name ? c.dim + '(' + u.name + ')' + c.reset : ''}`);
      }
      console.log(`${'─'.repeat(60)}\n${c.dim}${urls.length} URL(s) total${c.reset}\n`);
    } finally {
      db.close();
    }
    return;
  }

  if (command === 'remove') {
    const id = parseInt(args[1], 10);
    if (isNaN(id)) {
      console.error(`${c.red}Error: Valid ID is required. Usage: lighthouse-dashboard remove <id>${c.reset}`);
      process.exit(1);
    }
    const dbPath = getFlag('--db', './lighthouse.db');
    const { DB } = await import('../src/db.js');
    const db = new DB(dbPath);
    try {
      db.removeUrl(id);
      console.log(`${c.green}Removed URL with id ${id}.${c.reset}`);
    } finally {
      db.close();
    }
    return;
  }

  console.error(`${c.red}Unknown command: ${command}${c.reset}`);
  printUsage();
  process.exit(1);
}

function scoreColor(score) {
  if (score >= 90) return c.green;
  if (score >= 50) return c.yellow;
  return c.red;
}

function fmt(val) {
  if (val == null) return 'N/A';
  return Math.round(val).toString();
}

main().catch((err) => {
  console.error(`${c.red}${err.message}${c.reset}`);
  process.exit(1);
});
